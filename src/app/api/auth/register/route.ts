import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/schemas";
import { sendVerificationEmail } from "@/lib/email";

// Same response regardless of whether email exists — prevents user enumeration
const SUCCESS_RESPONSE = {
  message: "Check your email for a verification link.",
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { email, password, name } = parsed.data;

  // Check for existing user — but return same message to prevent enumeration
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Don't reveal that the email is taken
    return NextResponse.json(SUCCESS_RESPONSE, { status: 200 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash, emailVerified: false },
  });

  // Generate verification token
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  await sendVerificationEmail(email, rawToken);

  // name is validated but stored later when profile is built (Phase 4+)
  void name;

  return NextResponse.json(SUCCESS_RESPONSE, { status: 201 });
}
