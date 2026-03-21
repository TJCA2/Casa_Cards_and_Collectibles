/**
 * POST /api/newsletter/subscribe
 *
 * Double opt-in: creates a pending subscriber and sends a confirmation email.
 * The subscriber is only marked active after clicking the confirmation link.
 * Idempotent: resends the confirmation if already pending; silent if already confirmed.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendNewsletterConfirmationEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Invalid email address").max(254),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 422 },
    );
  }

  const { email } = parsed.data;

  const existing = await prisma.emailSubscriber.findUnique({ where: { email } });

  // Already confirmed — silent success (don't reveal subscription status)
  if (existing?.isActive && existing.confirmedAt) {
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString("hex");

  await prisma.emailSubscriber.upsert({
    where: { email },
    update: { confirmToken: token, isActive: false },
    create: { email, confirmToken: token, isActive: false },
  });

  try {
    await sendNewsletterConfirmationEmail(email, token);
  } catch (err) {
    console.error("[newsletter/subscribe] Failed to send confirmation email:", err);
    return NextResponse.json({ error: "Failed to send confirmation email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
