import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
  const ratingParam = searchParams.get("rating");
  const rating = ratingParam !== null ? parseInt(ratingParam) : undefined;

  const where = {
    ...(rating !== undefined ? { rating } : {}),
    comment: { not: null },
  };

  const [reviews, total, sellerStats] = await Promise.all([
    prisma.ebayReview.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        rating: true,
        comment: true,
        reviewerName: true,
        itemTitle: true,
        transactionDate: true,
      },
    }),
    prisma.ebayReview.count({ where }),
    prisma.ebaySellerStats.findUnique({
      where: { id: "singleton" },
      select: {
        positiveFeedbackPercent: true,
        totalFeedbackCount: true,
        positiveFeedbackCount: true,
        negativeFeedbackCount: true,
        neutralFeedbackCount: true,
      },
    }),
  ]);

  const positivePct = (() => {
    if (!sellerStats) return 0;
    const stored = Number(sellerStats.positiveFeedbackPercent);
    if (stored > 0) return stored;
    const denom =
      sellerStats.positiveFeedbackCount +
      sellerStats.negativeFeedbackCount +
      sellerStats.neutralFeedbackCount;
    return denom > 0 ? Math.round((sellerStats.positiveFeedbackCount / denom) * 1000) / 10 : 0;
  })();

  return NextResponse.json({
    reviews,
    total,
    page,
    sellerStats: sellerStats
      ? {
          positivePct,
          totalCount: sellerStats.totalFeedbackCount,
          positiveCount: sellerStats.positiveFeedbackCount,
        }
      : null,
  });
}
