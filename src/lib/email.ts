import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "orders@casa-cards.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://casa-cards.com";

// Lazy-initialize so missing key throws at call time, not at build time
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${SITE_URL}/api/auth/verify-email?token=${token}`;

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

export interface OrderConfirmationData {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: { title: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  shippingAddress: { line1: string; line2?: string; city: string; state: string; zip: string };
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<void> {
  const itemRows = data.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${i.title}</td><td style="padding:4px 0;text-align:right">×${i.quantity}</td><td style="padding:4px 0;text-align:right">$${(i.unitPrice * i.quantity).toFixed(2)}</td></tr>`,
    )
    .join("");

  const addr = [
    data.shippingAddress.line1,
    data.shippingAddress.line2,
    `${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}`,
  ]
    .filter(Boolean)
    .join("<br>");

  await getResend().emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: `Order Confirmed — ${data.orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-size:24px;font-weight:bold;margin-bottom:4px">Order Confirmed!</h1>
        <p style="color:#555;margin-top:0">Order <strong>${data.orderNumber}</strong></p>
        <p>Hi ${data.customerName}, thank you for your order. We'll send a shipping notification once your items are on their way.</p>
        <table style="width:100%;border-top:1px solid #eee;margin:16px 0;border-collapse:collapse">
          ${itemRows}
          <tr><td colspan="3" style="border-top:1px solid #eee;padding-top:8px"></td></tr>
          <tr><td>Subtotal</td><td></td><td style="text-align:right">$${data.subtotal.toFixed(2)}</td></tr>
          <tr><td>Shipping</td><td></td><td style="text-align:right">${data.shippingCost === 0 ? "Free" : "$" + data.shippingCost.toFixed(2)}</td></tr>
          ${data.discountAmount > 0 ? `<tr><td>Discount</td><td></td><td style="text-align:right;color:green">−$${data.discountAmount.toFixed(2)}</td></tr>` : ""}
          <tr style="font-weight:bold"><td>Total</td><td></td><td style="text-align:right">$${data.total.toFixed(2)}</td></tr>
        </table>
        <p><strong>Shipping to:</strong><br>${addr}</p>
        <p style="color:#888;font-size:12px">Questions? Reply to this email or visit <a href="${SITE_URL}">${SITE_URL}</a>.</p>
      </div>
    `,
  });
}

export async function sendEmailChangeEmail(newEmail: string, token: string): Promise<void> {
  const url = `${SITE_URL}/api/account/verify-email-change?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: newEmail,
    subject: "Confirm your new email address — Casa Cards",
    html: `
      <p>You requested to change your email address on Casa Cards &amp; Collectibles.</p>
      <p>Click the link below to confirm <strong>${newEmail}</strong> as your new email address.</p>
      <p><a href="${url}">Confirm New Email</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this change, you can safely ignore this email — your current address will remain unchanged.</p>
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
