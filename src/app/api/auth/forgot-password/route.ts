import { type NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/schemas";
import { sendPasswordResetEmail } from "@/lib/email";

// Always return this — prevents user enumeration
const SUCCESS_RESPONSE = {
  message: "If that email is registered, you'll receive a reset link shortly.",
};

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  // No user or unverified — return same response to prevent enumeration
  if (!user || !user.emailVerified) {
    return NextResponse.json(SUCCESS_RESPONSE);
  }

  // Remove any existing reset tokens for this user before creating a new one
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + ONE_HOUR_MS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  await sendPasswordResetEmail(email, rawToken);

  return NextResponse.json(SUCCESS_RESPONSE);
}
