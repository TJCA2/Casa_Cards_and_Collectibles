import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "orders@casa-cards.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://casa-cards.com";
const BUSINESS_ADDRESS =
  process.env.BUSINESS_ADDRESS ?? "Casa Cards &amp; Collectibles &bull; Pittsburgh, PA";

const bodySchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  imageUrl: z.string().url().optional().or(z.literal("")),
  testEmail: z.string().email().optional(),
});

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function buildHtml(
  subject: string,
  body: string,
  imageUrl: string | undefined,
  unsubscribeUrl: string,
): string {
  const year = new Date().getFullYear();
  const htmlBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px">')
    .replace(/\n/g, "<br>");

  const imageBlock = imageUrl
    ? `<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 0 0">
        <img src="${imageUrl}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0" />
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr>
          <td bgcolor="#111827" style="background-color:#111827;padding:24px 32px;text-align:center;border-radius:12px 12px 0 0">
            <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif">Casa Cards &amp; Collectibles</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif">Sports Cards &amp; Collectibles</p>
          </td>
        </tr>
        <tr><td bgcolor="#dc2626" style="background-color:#dc2626;height:3px;font-size:1px;line-height:1px">&nbsp;</td></tr>
        ${imageBlock}
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#374151">
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#111827">${subject}</h1>
            <p style="margin:0 0 16px">${htmlBody}</p>
            <p style="margin:28px 0 0">
              <a href="${SITE_URL}/shop" style="display:inline-block;background-color:#dc2626;color:#ffffff;padding:14px 28px;text-decoration:none;font-weight:bold;font-size:15px;border-radius:8px;font-family:Arial,Helvetica,sans-serif">Shop Now →</a>
            </p>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f9fafb" style="background-color:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px">
            <p style="margin:0;font-size:12px;color:#6b7280;font-family:Arial,Helvetica,sans-serif">
              <strong style="color:#374151">Casa Cards &amp; Collectibles</strong><br>${BUSINESS_ADDRESS}
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif">
              <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif">&copy; ${year} Casa Cards &amp; Collectibles. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { subject, body: emailBody, imageUrl, testEmail } = parsed.data;
  const resend = getResend();

  // Test mode — send only to the specified email
  if (testEmail) {
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(testEmail)}`;
    await resend.emails.send({
      from: FROM,
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html: buildHtml(subject, emailBody, imageUrl || undefined, unsubscribeUrl),
      text: `[TEST] ${subject}\n\n${emailBody}\n\nShop: ${SITE_URL}/shop`,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    return NextResponse.json({ sent: 1, failed: 0, test: true });
  }

  // Real send — confirmed subscribers only
  const subscribers = await prisma.emailSubscriber.findMany({
    where: { isActive: true, confirmedAt: { not: null } },
    select: { email: true },
  });

  if (subscribers.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, noSubscribers: true });
  }

  let sent = 0;
  let failed = 0;

  const BATCH = 50;
  for (let i = 0; i < subscribers.length; i += BATCH) {
    const batch = subscribers.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ email }) => {
        const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}`;
        try {
          await resend.emails.send({
            from: FROM,
            to: email,
            subject,
            html: buildHtml(subject, emailBody, imageUrl || undefined, unsubscribeUrl),
            text: `${subject}\n\n${emailBody}\n\nShop: ${SITE_URL}/shop\n\nUnsubscribe: ${unsubscribeUrl}`,
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });
          sent++;
        } catch (err) {
          console.error(`[newsletter/send] Failed for ${email}:`, err);
          failed++;
        }
      }),
    );
  }

  return NextResponse.json({ sent, failed });
}
