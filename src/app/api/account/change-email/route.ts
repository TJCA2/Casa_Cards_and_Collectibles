import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailChangeEmail } from "@/lib/email";

const schema = z.object({
  newEmail: z.string().email("Enter a valid email address").max(254),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.newEmail?.[0] ?? "Invalid input" },
      { status: 422 },
    );
  }

  const { newEmail } = parsed.data;
  const normalised = newEmail.toLowerCase().trim();

  // Rate limit: one email change request per 5 minutes
  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lastEmailChangeRequestAt: true },
  });
  const COOLDOWN_MS = 5 * 60 * 1000;
  if (
    userRecord?.lastEmailChangeRequestAt &&
    Date.now() - userRecord.lastEmailChangeRequestAt.getTime() < COOLDOWN_MS
  ) {
    return NextResponse.json(
      { error: "Please wait a few minutes before requesting another email change." },
      { status: 429 },
    );
  }

  // Same response whether email is taken or not — prevent enumeration
  const taken = await prisma.user.findUnique({ where: { email: normalised } });
  if (taken) {
    return NextResponse.json({ ok: true }); // silent — user sees "check your email"
  }

  // Delete any previous pending email change token for this user
  await prisma.emailVerificationToken.deleteMany({ where: { userId: session.user.id } });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { pendingEmail: normalised, lastEmailChangeRequestAt: new Date() },
    }),
    prisma.emailVerificationToken.create({
      data: { userId: session.user.id, tokenHash, expiresAt },
    }),
  ]);

  await sendEmailChangeEmail(normalised, rawToken);

  return NextResponse.json({ ok: true });
}
