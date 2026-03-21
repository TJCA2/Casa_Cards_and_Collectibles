import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReviewRequestEmail } from "@/lib/email";

// GET /api/cron/review-request
// Protected by Authorization: Bearer CRON_SECRET
// Runs daily at 10:00 UTC via Vercel Cron.
// Sends a review request email to customers whose orders were marked DELIVERED
// at least 7 days ago and haven't received a review request yet.

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      deliveredAt: { lte: sevenDaysAgo },
      reviewRequestSentAt: null,
      customerEmail: { not: null },
    },
    select: {
      id: true,
      orderNumber: true,
      customerEmail: true,
      shippingAddress: { select: { name: true } },
    },
    take: 50, // process in batches to avoid timeouts
  });

  let sent = 0;
  let failed = 0;

  for (const order of orders) {
    if (!order.customerEmail) continue;

    try {
      await sendReviewRequestEmail({
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerName: order.shippingAddress.name,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { reviewRequestSentAt: new Date() },
      });

      sent++;
    } catch (err) {
      console.error(`[cron/review-request] Failed for order ${order.orderNumber}:`, err);
      failed++;
    }
  }

  console.warn(`[cron/review-request] Sent ${sent}, failed ${failed}`);
  return NextResponse.json({ sent, failed });
}
