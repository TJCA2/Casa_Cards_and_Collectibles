import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAbandonedCartEmail, type AbandonedCartItem } from "@/lib/email";

// GET /api/cron/abandoned-cart
// Protected by Authorization: Bearer CRON_SECRET
// Runs every hour via Vercel Cron.
// Sends a cart recovery email to opted-in subscribers who abandoned their cart
// at least 1 hour ago and haven't received a reminder yet.

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Only send to opted-in subscribers
  const subscribers = await prisma.emailSubscriber.findMany({
    where: { isActive: true },
    select: { email: true },
  });
  const subscribedEmails = new Set(subscribers.map((s) => s.email.toLowerCase()));

  const carts = await prisma.abandonedCart.findMany({
    where: {
      reminderSentAt: null,
      createdAt: { lte: oneHourAgo },
    },
    take: 50,
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const cart of carts) {
    // Opt-in check
    if (!subscribedEmails.has(cart.email.toLowerCase())) {
      skipped++;
      // Still mark so we don't keep re-checking
      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { reminderSentAt: new Date() },
      });
      continue;
    }

    // Check they haven't completed a purchase since abandoning
    const recentOrder = await prisma.order.findFirst({
      where: {
        customerEmail: cart.email,
        createdAt: { gte: cart.createdAt },
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
    });
    if (recentOrder) {
      await prisma.abandonedCart.delete({ where: { id: cart.id } });
      skipped++;
      continue;
    }

    const payload = cart.itemsJson as { items: AbandonedCartItem[]; subtotal: number } | null;
    if (!payload?.items?.length) {
      await prisma.abandonedCart.delete({ where: { id: cart.id } });
      skipped++;
      continue;
    }

    try {
      await sendAbandonedCartEmail({
        customerEmail: cart.email,
        items: payload.items,
        subtotal: payload.subtotal,
      });

      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { reminderSentAt: new Date() },
      });

      sent++;
    } catch (err) {
      console.error(`[cron/abandoned-cart] Failed for ${cart.email}:`, err);
      failed++;
    }
  }

  console.warn(`[cron/abandoned-cart] Sent ${sent}, skipped ${skipped}, failed ${failed}`);
  return NextResponse.json({ sent, skipped, failed });
}
