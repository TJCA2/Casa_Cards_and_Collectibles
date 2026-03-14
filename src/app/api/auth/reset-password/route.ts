import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true } } },
  });

  // Generic error — don't distinguish "not found" from "already used"
  if (!record || record.used) {
    return NextResponse.json({ error: "Invalid or already-used reset link." }, { status: 400 });
  }

  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { tokenHash } });
    return NextResponse.json(
      { error: "This reset link has expired. Please request a new one." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  // Atomically mark the token used (only if still unused) and update the password.
  // updateMany returns a count — if 0, a concurrent request already consumed the token.
  try {
    await prisma.$transaction(async (tx) => {
      const marked = await tx.passwordResetToken.updateMany({
        where: { tokenHash, used: false },
        data: { used: true },
      });
      if (marked.count === 0) {
        throw new Error("TOKEN_ALREADY_USED");
      }
      await tx.user.update({
        where: { id: record.user.id },
        data: { passwordHash, passwordChangedAt: now },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "TOKEN_ALREADY_USED") {
      return NextResponse.json({ error: "Invalid or already-used reset link." }, { status: 400 });
    }
    throw err;
  }

  return NextResponse.json({ message: "Password updated successfully." });
}
