import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/schemas";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  // Return same error whether user not found or wrong password — prevent enumeration
  const valid = user?.passwordHash
    ? await bcrypt.compare(currentPassword, user.passwordHash)
    : false;

  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  // Updating passwordChangedAt invalidates all existing JWT sessions (see auth.ts)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash, passwordChangedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
