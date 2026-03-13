import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "orders@casa-cards.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://casa-cards.com";

// Lazy-initialize so missing key throws at call time, not at build time
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${SITE_URL}/auth/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Verify your Casa Cards account",
    html: `
      <p>Thanks for signing up! Click the link below to verify your email address.</p>
      <p><a href="${url}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${SITE_URL}/auth/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Casa Cards password",
    html: `
      <p>You requested a password reset. Click the link below to set a new password.</p>
      <p><a href="${url}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
