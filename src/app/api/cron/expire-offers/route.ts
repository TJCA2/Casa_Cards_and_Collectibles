import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/expire-offers
// Protected by Authorization: Bearer CRON_SECRET
// Runs daily at midnight UTC via Vercel Cron.
// Expires:
//   - PENDING offers older than 72 hours
//   - ACCEPTED offers whose purchaseToken has passed tokenExpiresAt

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const pendingCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago

  const [expiredPending, expiredAccepted] = await Promise.all([
    // Expire stale PENDING offers (no response within 72 hours)
    prisma.offer.updateMany({
      where: {
        status: "PENDING",
        createdAt: { lt: pendingCutoff },
      },
      data: { status: "EXPIRED" },
    }),
    // Expire ACCEPTED offers whose purchase window has passed
    prisma.offer.updateMany({
      where: {
        status: "ACCEPTED",
        tokenExpiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    }),
  ]);

  const expired = expiredPending.count + expiredAccepted.count;
  console.warn(
    `[cron/expire-offers] Expired ${expired} offers (${expiredPending.count} pending, ${expiredAccepted.count} accepted)`,
  );

  return NextResponse.json({ expired });
}
