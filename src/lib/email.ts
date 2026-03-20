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

export interface ShippingNotificationData {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  trackingNumber: string;
}

export async function sendShippingNotificationEmail(data: ShippingNotificationData): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: `Your order ${data.orderNumber} has shipped!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-size:24px;font-weight:bold;margin-bottom:4px">Your Order Has Shipped!</h1>
        <p style="color:#555;margin-top:0">Order <strong>${data.orderNumber}</strong></p>
        <p>Hi ${data.customerName}, great news — your order is on its way!</p>
        <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
        <p>You can use your tracking number to follow your package's progress with the carrier.</p>
        <p style="color:#888;font-size:12px">Questions? Reply to this email or visit <a href="${SITE_URL}">${SITE_URL}</a>.</p>
      </div>
    `,
  });
}

export interface OfferReceivedAdminData {
  productTitle: string;
  productId: string;
  offerPrice: number;
  askingPrice: number;
  customerName: string;
  customerEmail: string;
}

export async function sendOfferReceivedAdminEmail(data: OfferReceivedAdminData): Promise<void> {
  const pct = ((data.offerPrice / data.askingPrice) * 100).toFixed(1);
  const productUrl = `${SITE_URL}/product/${data.productId}`;

  await getResend().emails.send({
    from: FROM,
    to: FROM,
    replyTo: data.customerEmail,
    subject: `[New Offer] ${data.productTitle} — $${data.offerPrice.toFixed(2)} (${pct}%)`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;font-weight:bold;margin-bottom:4px">New Offer Received</h1>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 0;color:#555">Product</td><td style="padding:4px 0;font-weight:bold"><a href="${productUrl}">${data.productTitle}</a></td></tr>
          <tr><td style="padding:4px 0;color:#555">Asking price</td><td style="padding:4px 0">$${data.askingPrice.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;color:#555">Offer price</td><td style="padding:4px 0;font-weight:bold;color:#dc2626">$${data.offerPrice.toFixed(2)} (${pct}% of asking)</td></tr>
          <tr><td style="padding:4px 0;color:#555">Customer</td><td style="padding:4px 0">${data.customerName} &lt;${data.customerEmail}&gt;</td></tr>
        </table>
        <p><a href="${SITE_URL}/admin/offers" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Review Offer in Admin</a></p>
      </div>
    `,
  });
}

export async function sendOfferConfirmationEmail(
  customerEmail: string,
  customerName: string,
  productTitle: string,
  offerPrice: number,
): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: customerEmail,
    subject: `We received your offer on ${productTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;font-weight:bold">Offer Received!</h1>
        <p>Hi ${customerName},</p>
        <p>We received your offer of <strong>$${offerPrice.toFixed(2)}</strong> on <strong>${productTitle}</strong>.</p>
        <p>The seller will review your offer and respond within 48 hours. We'll email you as soon as a decision is made.</p>
        <p style="color:#888;font-size:12px">Questions? Reply to this email or visit <a href="${SITE_URL}">${SITE_URL}</a>.</p>
      </div>
    `,
  });
}

export async function sendOfferAcceptedEmail(
  customerEmail: string,
  customerName: string,
  productTitle: string,
  offerPrice: number,
  purchaseToken: string,
): Promise<void> {
  const checkoutUrl = `${SITE_URL}/checkout?offerToken=${purchaseToken}`;

  await getResend().emails.send({
    from: FROM,
    to: customerEmail,
    subject: `Your offer on ${productTitle} was accepted!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;font-weight:bold;color:#16a34a">Offer Accepted!</h1>
        <p>Hi ${customerName},</p>
        <p>Great news — your offer of <strong>$${offerPrice.toFixed(2)}</strong> on <strong>${productTitle}</strong> was accepted!</p>
        <p>Use the link below to complete your purchase. This offer is reserved for you for <strong>48 hours</strong>.</p>
        <p style="margin:24px 0">
          <a href="${checkoutUrl}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Complete Your Purchase →</a>
        </p>
        <p style="color:#888;font-size:12px">This link expires in 48 hours and can only be used once. If you have questions, reply to this email.</p>
      </div>
    `,
  });
}

export async function sendOfferDeclinedEmail(
  customerEmail: string,
  customerName: string,
  productTitle: string,
  adminNote?: string,
): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: customerEmail,
    subject: `Update on your offer for ${productTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;font-weight:bold">Offer Update</h1>
        <p>Hi ${customerName},</p>
        <p>Thank you for your interest in <strong>${productTitle}</strong>. Unfortunately, we were unable to accept your offer at this time.</p>
        ${adminNote ? `<p><strong>Note from seller:</strong> ${adminNote}</p>` : ""}
        <p>Browse our shop for other great cards: <a href="${SITE_URL}/shop">${SITE_URL}/shop</a></p>
        <p style="color:#888;font-size:12px">Questions? Reply to this email.</p>
      </div>
    `,
  });
}

export interface ContactAdminEmailData {
  name: string;
  email: string;
  subject: string;
  body: string;
  productTitle?: string;
  productId?: string;
}

export async function sendContactAdminEmail(data: ContactAdminEmailData): Promise<void> {
  const productLine = data.productId
    ? `<tr><td style="padding:4px 0;color:#555">Product</td><td style="padding:4px 0"><a href="${SITE_URL}/product/${data.productId}">${data.productTitle ?? data.productId}</a></td></tr>`
    : "";

  await getResend().emails.send({
    from: FROM,
    to: FROM,
    replyTo: data.email,
    subject: `[New Message] ${data.subject} — from ${data.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;font-weight:bold;margin-bottom:4px">New Customer Message</h1>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 0;color:#555">From</td><td style="padding:4px 0;font-weight:bold">${data.name} &lt;${data.email}&gt;</td></tr>
          <tr><td style="padding:4px 0;color:#555">Subject</td><td style="padding:4px 0">${data.subject}</td></tr>
          ${productLine}
        </table>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;white-space:pre-wrap;font-size:14px;color:#374151">${data.body}</div>
        <p><a href="${SITE_URL}/admin/messages" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">View in Admin Inbox</a></p>
        <p style="color:#888;font-size:12px">Hit Reply to respond directly to ${data.email}.</p>
      </div>
    `,
  });
}

export async function sendContactAutoReplyEmail(
  customerEmail: string,
  customerName: string,
  body: string,
): Promise<void> {
  const excerpt = body.length > 300 ? body.slice(0, 297) + "…" : body;

  await getResend().emails.send({
    from: FROM,
    to: customerEmail,
    subject: "We received your message — Casa Cards & Collectibles",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;font-weight:bold">Message Received!</h1>
        <p>Hi ${customerName},</p>
        <p>Thanks for reaching out! We received your message and will respond within 1–2 business days.</p>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#374151;white-space:pre-wrap">${excerpt}</div>
        <p style="color:#888;font-size:12px">Questions? Reply to this email or visit <a href="${SITE_URL}">${SITE_URL}</a>.</p>
      </div>
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
