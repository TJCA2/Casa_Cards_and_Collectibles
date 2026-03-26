import { Resend } from "resend";

const RAW_FROM = process.env.EMAIL_FROM ?? "orders@casa-cards.com";
const FROM = `Casa Cards & Collectibles <${RAW_FROM}>`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://casa-cards.com";
// Admin reply-to — customer replies go here (e.g. your Gmail)
const ADMIN_REPLY_TO = process.env.ADMIN_REPLY_TO ?? RAW_FROM;
// Logo must always point to the live domain — emails are opened externally so localhost never works
const LOGO_URL = "https://casa-cards.com/image.png";
// Add BUSINESS_ADDRESS to env vars before launch (required for CAN-SPAM compliance)
const BUSINESS_ADDRESS =
  process.env.BUSINESS_ADDRESS ?? "Casa Cards &amp; Collectibles &bull; Pittsburgh, PA";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendEmail(payload: Parameters<ReturnType<typeof getResend>["emails"]["send"]>[0]) {
  const { data, error } = await getResend().emails.send(payload);
  if (error) {
    console.error("[email] Resend error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
  return data;
}

// ── Template helpers ────────────────────────────────────────────────────────────

function btn(url: string, label: string): string {
  return `<p style="margin:28px 0 0">
    <a href="${url}" style="display:inline-block;background-color:#dc2626;color:#ffffff;padding:14px 28px;text-decoration:none;font-weight:bold;font-size:15px;border-radius:8px;font-family:Arial,Helvetica,sans-serif">${label}</a>
  </p>`;
}

function emailHtml(body: string, unsubscribeUrl?: string): string {
  const year = new Date().getFullYear();
  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="margin:6px 0 0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif">
        <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">Unsubscribe from marketing emails</a>
       </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f4f6;padding:24px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%">

          <!-- Header -->
          <tr>
            <td bgcolor="#111827" style="background-color:#111827;padding:24px 32px;text-align:center;border-radius:12px 12px 0 0">
              <img src="${LOGO_URL}" alt="Casa Cards &amp; Collectibles" width="60" height="60" style="display:block;margin:0 auto 12px;border:0">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif">
                Casa Cards &amp; Collectibles
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.04em">
                Sports Cards &amp; Collectibles
              </p>
            </td>
          </tr>

          <!-- Red accent bar -->
          <tr>
            <td bgcolor="#dc2626" style="background-color:#dc2626;height:3px;font-size:1px;line-height:1px">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#374151">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#f9fafb" style="background-color:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px">
              <p style="margin:0;font-size:12px;color:#6b7280;font-family:Arial,Helvetica,sans-serif">
                <strong style="color:#374151">Casa Cards &amp; Collectibles</strong><br>
                ${BUSINESS_ADDRESS}
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif">
                <a href="${SITE_URL}" style="color:#9ca3af;text-decoration:none">${SITE_URL}</a>
              </p>
              ${unsubscribeHtml}
              <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif">
                &copy; ${year} Casa Cards &amp; Collectibles. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email functions ─────────────────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${SITE_URL}/api/auth/verify-email?token=${token}`;

  await sendEmail({
    from: FROM,
    to: email,
    subject: "Verify your Casa Cards account",
    html: emailHtml(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:bold;color:#111827">Verify your email address</h1>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px">One quick step to get started</p>
      <p>Thanks for signing up! Click the button below to verify your email address and activate your account.</p>
      ${btn(url, "Verify Email Address")}
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    `),
    text: `Verify your Casa Cards account\n\nThanks for signing up! Click the link below to verify your email address:\n\n${url}\n\nThis link expires in 24 hours. If you didn't create an account, you can safely ignore this email.\n\n— Casa Cards & Collectibles\n${SITE_URL}`,
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
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px">${i.title}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:center;font-size:14px;color:#6b7280">×${i.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px">$${(i.unitPrice * i.quantity).toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  const addrLines = [
    data.shippingAddress.line1,
    data.shippingAddress.line2,
    `${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}`,
  ]
    .filter(Boolean)
    .join("<br>");

  const addrText = [
    data.shippingAddress.line1,
    data.shippingAddress.line2,
    `${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}`,
  ]
    .filter(Boolean)
    .join(", ");

  const itemsText = data.items
    .map((i) => `  ${i.title} ×${i.quantity} — $${(i.unitPrice * i.quantity).toFixed(2)}`)
    .join("\n");

  await sendEmail({
    from: FROM,
    to: data.customerEmail,
    subject: `Order Confirmed — ${data.orderNumber}`,
    html: emailHtml(`
      <h1 style="margin:0 0 4px;font-size:24px;font-weight:bold;color:#111827">Order Confirmed!</h1>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Order <strong style="color:#374151">${data.orderNumber}</strong></p>
      <p>Hi ${data.customerName}, thank you for your order! We&apos;ll send a shipping notification once your items are on their way.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:2px solid #111827">
        ${itemRows}
        <tr>
          <td style="padding-top:12px;font-size:14px;color:#6b7280">Subtotal</td><td></td>
          <td style="padding-top:12px;text-align:right;font-size:14px">$${data.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#6b7280">Shipping</td><td></td>
          <td style="padding:4px 0;text-align:right;font-size:14px">${data.shippingCost === 0 ? "Free" : "$" + data.shippingCost.toFixed(2)}</td>
        </tr>
        ${data.discountAmount > 0 ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280">Discount</td><td></td><td style="padding:4px 0;text-align:right;font-size:14px;color:#16a34a">−$${data.discountAmount.toFixed(2)}</td></tr>` : ""}
        <tr>
          <td style="padding-top:8px;font-weight:bold;font-size:15px;border-top:1px solid #e5e7eb">Total</td><td></td>
          <td style="padding-top:8px;text-align:right;font-weight:bold;font-size:15px;border-top:1px solid #e5e7eb">$${data.total.toFixed(2)}</td>
        </tr>
      </table>
      <p style="font-size:14px"><strong>Shipping to:</strong><br><span style="color:#6b7280">${addrLines}</span></p>
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">Questions? Reply to this email or <a href="${SITE_URL}/contact" style="color:#9ca3af">contact us</a>.</p>
    `),
    text: `Order Confirmed — ${data.orderNumber}\n\nHi ${data.customerName}, thank you for your order!\n\nItems:\n${itemsText}\n\nSubtotal: $${data.subtotal.toFixed(2)}\nShipping: ${data.shippingCost === 0 ? "Free" : "$" + data.shippingCost.toFixed(2)}${data.discountAmount > 0 ? `\nDiscount: -$${data.discountAmount.toFixed(2)}` : ""}\nTotal: $${data.total.toFixed(2)}\n\nShipping to: ${addrText}\n\nQuestions? Reply to this email.\n\n— Casa Cards & Collectibles\n${SITE_URL}`,
  });
}

export async function sendEmailChangeEmail(newEmail: string, token: string): Promise<void> {
  const url = `${SITE_URL}/api/account/verify-email-change?token=${token}`;

  await sendEmail({
    from: FROM,
    to: newEmail,
    subject: "Confirm your new email address — Casa Cards",
    html: emailHtml(`
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#111827">Confirm your new email</h1>
      <p>You requested to change your email address on Casa Cards &amp; Collectibles.</p>
      <p>Click the button below to confirm <strong>${newEmail}</strong> as your new email address.</p>
      ${btn(url, "Confirm New Email")}
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">This link expires in 1 hour. If you didn&apos;t request this change, you can safely ignore this email — your current address will remain unchanged.</p>
    `),
    text: `Confirm your new email address\n\nYou requested to change your email address on Casa Cards & Collectibles.\n\nClick the link below to confirm ${newEmail}:\n\n${url}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\n— Casa Cards & Collectibles`,
  });
}

export interface ShippingNotificationData {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  trackingNumber: string;
}

export async function sendShippingNotificationEmail(data: ShippingNotificationData): Promise<void> {
  await sendEmail({
    from: FROM,
    to: data.customerEmail,
    subject: `Your order ${data.orderNumber} has shipped!`,
    html: emailHtml(`
      <h1 style="margin:0 0 4px;font-size:24px;font-weight:bold;color:#111827">Your Order Has Shipped!</h1>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Order <strong style="color:#374151">${data.orderNumber}</strong></p>
      <p>Hi ${data.customerName}, great news — your order is on its way!</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#f9fafb;border-radius:8px">
        <tr>
          <td style="padding:16px 20px;font-size:14px;color:#6b7280">Tracking Number</td>
          <td style="padding:16px 20px;font-size:14px;font-weight:bold;color:#111827;text-align:right">${data.trackingNumber}</td>
        </tr>
      </table>
      <p style="font-size:14px;color:#6b7280">Use your tracking number to follow your package&apos;s progress with the carrier.</p>
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">Questions? Reply to this email or <a href="${SITE_URL}/contact" style="color:#9ca3af">contact us</a>.</p>
    `),
    text: `Your Order Has Shipped!\n\nOrder ${data.orderNumber}\n\nHi ${data.customerName}, your order is on its way!\n\nTracking Number: ${data.trackingNumber}\n\nUse your tracking number to follow your package's progress with the carrier.\n\nQuestions? Reply to this email.\n\n— Casa Cards & Collectibles\n${SITE_URL}`,
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

  // Admin notification — minimal template, no branded wrapper needed
  await sendEmail({
    from: FROM,
    to: RAW_FROM,
    replyTo: data.customerEmail,
    subject: `[New Offer] ${data.productTitle} — $${data.offerPrice.toFixed(2)} (${pct}%)`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;font-size:15px;color:#374151">
        <h2 style="margin:0 0 16px;font-size:18px">New Offer Received</h2>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:6px 0;color:#6b7280;width:120px">Product</td><td style="padding:6px 0;font-weight:bold"><a href="${productUrl}">${data.productTitle}</a></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Asking price</td><td style="padding:6px 0">$${data.askingPrice.toFixed(2)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Offer price</td><td style="padding:6px 0;font-weight:bold;color:#dc2626">$${data.offerPrice.toFixed(2)} (${pct}%)</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Customer</td><td style="padding:6px 0">${data.customerName} &lt;${data.customerEmail}&gt;</td></tr>
        </table>
        <a href="${SITE_URL}/admin/offers" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Review Offer in Admin</a>

        <div style="margin-top:32px;border-top:2px dashed #e5e7eb;padding-top:20px">
          <p style="margin:0 0 8px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af">— Hit Reply to respond to ${data.customerName} —</p>
          <div style="background:#f9fafb;border-left:3px solid #dc2626;padding:16px;border-radius:0 8px 8px 0;font-size:14px;color:#374151;white-space:pre-wrap">Hi ${data.customerName},

Thank you for your offer on ${data.productTitle}.

[Write your response here]

Best regards,
Casa Cards &amp; Collectibles
${RAW_FROM} | ${SITE_URL}</div>
        </div>
      </div>
    `,
    text: `New Offer Received\n\nProduct: ${data.productTitle}\nAsking: $${data.askingPrice.toFixed(2)}\nOffer: $${data.offerPrice.toFixed(2)} (${pct}%)\nCustomer: ${data.customerName} <${data.customerEmail}>\n\nReview: ${SITE_URL}/admin/offers\n\n---\nHit Reply to respond to ${data.customerName}:\n\nHi ${data.customerName},\n\nThank you for your offer on ${data.productTitle}.\n\n[Write your response here]\n\nBest regards,\nCasa Cards & Collectibles\n${RAW_FROM} | ${SITE_URL}`,
  });
}

export async function sendOfferConfirmationEmail(
  customerEmail: string,
  customerName: string,
  productTitle: string,
  offerPrice: number,
): Promise<void> {
  await sendEmail({
    from: FROM,
    to: customerEmail,
    subject: `We received your offer on ${productTitle}`,
    html: emailHtml(`
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#111827">Offer Received!</h1>
      <p>Hi ${customerName},</p>
      <p>We received your offer of <strong>$${offerPrice.toFixed(2)}</strong> on <strong>${productTitle}</strong>.</p>
      <p>The seller will review your offer and respond within 48 hours. We&apos;ll email you as soon as a decision is made.</p>
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">Questions? Reply to this email or <a href="${SITE_URL}/contact" style="color:#9ca3af">contact us</a>.</p>
    `),
    text: `Offer Received!\n\nHi ${customerName},\n\nWe received your offer of $${offerPrice.toFixed(2)} on ${productTitle}.\n\nThe seller will review and respond within 48 hours. We'll email you once a decision is made.\n\nQuestions? Reply to this email.\n\n— Casa Cards & Collectibles\n${SITE_URL}`,
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

  await sendEmail({
    from: FROM,
    to: customerEmail,
    subject: `Your offer on ${productTitle} was accepted!`,
    html: emailHtml(`
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#16a34a">Offer Accepted!</h1>
      <p>Hi ${customerName},</p>
      <p>Great news — your offer of <strong>$${offerPrice.toFixed(2)}</strong> on <strong>${productTitle}</strong> was accepted!</p>
      <p>Use the link below to complete your purchase. This offer is reserved for you for <strong>48 hours</strong>.</p>
      ${btn(checkoutUrl, "Complete Your Purchase →")}
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">This link expires in 48 hours and can only be used once. Questions? Reply to this email.</p>
    `),
    text: `Offer Accepted!\n\nHi ${customerName},\n\nYour offer of $${offerPrice.toFixed(2)} on ${productTitle} was accepted!\n\nComplete your purchase here (expires in 48 hours):\n${checkoutUrl}\n\nQuestions? Reply to this email.\n\n— Casa Cards & Collectibles`,
  });
}

export async function sendOfferDeclinedEmail(
  customerEmail: string,
  customerName: string,
  productTitle: string,
  adminNote?: string,
): Promise<void> {
  await sendEmail({
    from: FROM,
    to: customerEmail,
    subject: `Update on your offer for ${productTitle}`,
    html: emailHtml(`
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#111827">Offer Update</h1>
      <p>Hi ${customerName},</p>
      <p>Thank you for your interest in <strong>${productTitle}</strong>. Unfortunately, we were unable to accept your offer at this time.</p>
      ${adminNote ? `<p style="background:#f9fafb;border-left:3px solid #e5e7eb;padding:12px 16px;border-radius:0 8px 8px 0;font-size:14px"><strong>Note from seller:</strong> ${adminNote}</p>` : ""}
      <p>Browse our shop for other great cards:</p>
      ${btn(`${SITE_URL}/shop`, "Browse Our Shop")}
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">Questions? Reply to this email.</p>
    `),
    text: `Offer Update\n\nHi ${customerName},\n\nThank you for your interest in ${productTitle}. Unfortunately we were unable to accept your offer at this time.${adminNote ? `\n\nNote from seller: ${adminNote}` : ""}\n\nBrowse our shop: ${SITE_URL}/shop\n\n— Casa Cards & Collectibles`,
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
    ? `<tr><td style="padding:6px 0;color:#6b7280;width:80px">Product</td><td style="padding:6px 0"><a href="${SITE_URL}/product/${data.productId}">${data.productTitle ?? data.productId}</a></td></tr>`
    : "";

  await sendEmail({
    from: FROM,
    to: RAW_FROM,
    replyTo: data.email,
    subject: `[New Message] ${data.subject} — from ${data.name}`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;font-size:15px;color:#374151">
        <h2 style="margin:0 0 16px;font-size:18px">New Customer Message</h2>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr><td style="padding:6px 0;color:#6b7280;width:80px">From</td><td style="padding:6px 0;font-weight:bold">${data.name} &lt;${data.email}&gt;</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Subject</td><td style="padding:6px 0">${data.subject}</td></tr>
          ${productLine}
        </table>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;font-size:14px;color:#374151;white-space:pre-wrap">${data.body}</div>
        <p style="margin-top:20px"><a href="${SITE_URL}/admin/messages" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">View in Admin Inbox</a></p>

        <div style="margin-top:32px;border-top:2px dashed #e5e7eb;padding-top:20px">
          <p style="margin:0 0 8px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af">— Hit Reply to respond to ${data.name} —</p>
          <div style="background:#f9fafb;border-left:3px solid #dc2626;padding:16px;border-radius:0 8px 8px 0;font-size:14px;color:#374151;white-space:pre-wrap">Hi ${data.name},

Thank you for reaching out to Casa Cards &amp; Collectibles.

[Write your response here]

Best regards,
Casa Cards &amp; Collectibles
${RAW_FROM} | ${SITE_URL}</div>
        </div>
      </div>
    `,
    text: `New Customer Message\n\nFrom: ${data.name} <${data.email}>\nSubject: ${data.subject}${data.productTitle ? `\nProduct: ${data.productTitle}` : ""}\n\n${data.body}\n\n---\nHit Reply to respond to ${data.name}:\n\nHi ${data.name},\n\nThank you for reaching out to Casa Cards & Collectibles.\n\n[Write your response here]\n\nBest regards,\nCasa Cards & Collectibles\n${RAW_FROM} | ${SITE_URL}`,
  });
}

export async function sendContactAutoReplyEmail(
  customerEmail: string,
  customerName: string,
  body: string,
): Promise<void> {
  const excerpt = body.length > 300 ? body.slice(0, 297) + "…" : body;

  await sendEmail({
    from: FROM,
    to: customerEmail,
    subject: "We received your message — Casa Cards & Collectibles",
    html: emailHtml(`
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#111827">Message Received!</h1>
      <p>Hi ${customerName},</p>
      <p>Thanks for reaching out! We received your message and will respond within 1–2 business days.</p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;color:#6b7280;white-space:pre-wrap">${excerpt}</div>
      <p style="font-size:13px;color:#9ca3af">Questions? Reply to this email or <a href="${SITE_URL}/contact" style="color:#9ca3af">visit our contact page</a>.</p>
    `),
    text: `Message Received!\n\nHi ${customerName},\n\nThanks for reaching out! We received your message and will respond within 1-2 business days.\n\nYour message:\n${body.slice(0, 300)}${body.length > 300 ? "…" : ""}\n\n— Casa Cards & Collectibles\n${SITE_URL}`,
  });
}

export interface ReviewRequestData {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
}

export async function sendReviewRequestEmail(data: ReviewRequestData): Promise<void> {
  const ebayFeedbackUrl = "https://www.ebay.com/usr/casa_cards_and_collectibles?_tab=feedback";

  await sendEmail({
    from: FROM,
    to: data.customerEmail,
    subject: "How was your order? Leave us a review!",
    html: emailHtml(`
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:bold;color:#111827">How did we do?</h1>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Order <strong style="color:#374151">${data.orderNumber}</strong></p>
      <p>Hi ${data.customerName}, we hope your order arrived in perfect condition!</p>
      <p>If you have a moment, we&apos;d love to hear what you thought. Your feedback helps other collectors find us and means the world to our small business.</p>
      ${btn(ebayFeedbackUrl, "Leave Feedback on eBay →")}
      <p style="margin-top:16px;font-size:14px;color:#6b7280">You can also read what other buyers have said at <a href="${SITE_URL}/reviews" style="color:#6b7280">${SITE_URL}/reviews</a>.</p>
      <p style="margin-top:24px;font-size:11px;color:#9ca3af">This is a one-time email related to your recent order. Reply to unsubscribe from future review requests.</p>
    `),
    text: `How did we do?\n\nOrder ${data.orderNumber}\n\nHi ${data.customerName}, we hope your order arrived in perfect condition!\n\nIf you have a moment, we'd love your feedback:\n${ebayFeedbackUrl}\n\nRead what other buyers say: ${SITE_URL}/reviews\n\nThis is a one-time email. Reply to unsubscribe.\n\n— Casa Cards & Collectibles`,
  });
}

export interface AbandonedCartItem {
  title: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
}

export interface AbandonedCartData {
  customerEmail: string;
  items: AbandonedCartItem[];
  subtotal: number;
}

export async function sendAbandonedCartEmail(data: AbandonedCartData): Promise<void> {
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(data.customerEmail)}`;

  const itemRows = data.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px">${i.title}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:center;font-size:14px;color:#6b7280">×${i.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px">$${(i.price * i.quantity).toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  const itemsText = data.items
    .map((i) => `  ${i.title} ×${i.quantity} — $${(i.price * i.quantity).toFixed(2)}`)
    .join("\n");

  await sendEmail({
    from: FROM,
    to: data.customerEmail,
    subject: "You left something behind!",
    html: emailHtml(
      `
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#111827">Still thinking it over?</h1>
      <p>You left some items in your cart at Casa Cards &amp; Collectibles. They&apos;re still waiting for you!</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:2px solid #111827">
        ${itemRows}
        <tr>
          <td style="padding-top:12px;font-weight:bold;font-size:15px">Total</td><td></td>
          <td style="padding-top:12px;text-align:right;font-weight:bold;font-size:15px">$${data.subtotal.toFixed(2)}</td>
        </tr>
      </table>
      ${btn(`${SITE_URL}/checkout`, "Complete Your Order →")}
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">Questions? Reply to this email or <a href="${SITE_URL}/contact" style="color:#9ca3af">contact us</a>.</p>
    `,
      unsubscribeUrl,
    ),
    text: `Still thinking it over?\n\nYou left some items in your cart:\n\n${itemsText}\n\nTotal: $${data.subtotal.toFixed(2)}\n\nComplete your order: ${SITE_URL}/checkout\n\nQuestions? Reply to this email.\n\nUnsubscribe: ${unsubscribeUrl}\n\n— Casa Cards & Collectibles`,
  });
}

export async function sendNewsletterConfirmationEmail(email: string, token: string): Promise<void> {
  const url = `${SITE_URL}/api/newsletter/confirm?token=${token}`;

  await sendEmail({
    from: FROM,
    to: email,
    subject: "Confirm your Casa Cards newsletter subscription",
    html: emailHtml(`
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#111827">One more step!</h1>
      <p>Thanks for signing up for the Casa Cards &amp; Collectibles newsletter.</p>
      <p>Click the button below to confirm your subscription and start receiving new arrivals, restocks, and exclusive deals.</p>
      ${btn(url, "Confirm Subscription")}
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">If you didn&apos;t sign up for this, you can safely ignore this email.</p>
    `),
    text: `Confirm your newsletter subscription\n\nThanks for signing up! Click the link below to confirm:\n\n${url}\n\nIf you didn't sign up, ignore this email.\n\n— Casa Cards & Collectibles`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${SITE_URL}/auth/reset-password?token=${token}`;

  await sendEmail({
    from: FROM,
    to: email,
    subject: "Reset your Casa Cards password",
    html: emailHtml(`
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#111827">Reset your password</h1>
      <p>You requested a password reset for your Casa Cards &amp; Collectibles account.</p>
      <p>Click the button below to set a new password:</p>
      ${btn(url, "Reset Password")}
      <p style="margin-top:24px;font-size:13px;color:#9ca3af">This link expires in 1 hour. If you didn&apos;t request a reset, you can safely ignore this email — your password won&apos;t change.</p>
    `),
    text: `Reset your password\n\nYou requested a password reset for your Casa Cards & Collectibles account.\n\nClick the link below to set a new password (expires in 1 hour):\n\n${url}\n\nIf you didn't request this, ignore this email.\n\n— Casa Cards & Collectibles`,
  });
}

export async function sendAdminReplyEmail({
  toName,
  toEmail,
  subject,
  originalBody,
  replyText,
}: {
  toName: string;
  toEmail: string;
  subject: string;
  originalBody: string;
  replyText: string;
}): Promise<void> {
  await sendEmail({
    from: FROM,
    replyTo: ADMIN_REPLY_TO,
    to: toEmail,
    subject: `Re: ${subject}`,
    html: emailHtml(`
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#111827">Re: ${subject}</h1>
      <p>Hi ${toName},</p>
      <div style="white-space:pre-wrap;line-height:1.6">${replyText.replace(/\n/g, "<br>")}</div>
      <p style="margin-top:28px">Best regards,<br><strong>Casa Cards &amp; Collectibles</strong></p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb">
      <div style="font-size:12px;color:#9ca3af">
        <p style="margin:0 0 4px;font-weight:600">Original message:</p>
        <p style="margin:0;white-space:pre-wrap">${originalBody}</p>
      </div>
    `),
    text: `Hi ${toName},\n\n${replyText}\n\nBest regards,\nCasa Cards & Collectibles\n\n---\nOriginal message:\n${originalBody}`,
  });
}
