/**
 * eBay review sync — Phase 9.03
 *
 * Uses the eBay Sell Feedback REST API with OAuth.
 * Upserts reviews by ebayFeedbackId (idempotent).
 * Updates the EbaySellerStats singleton on every sync.
 */

import { prisma } from "@/lib/prisma";
import { getEbayAccessToken } from "@/lib/ebay/oauth";

const FEEDBACK_BASE = "https://api.ebay.com/sell/feedback/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EbayFeedbackEntry {
  feedbackId: string;
  creationDate?: string;
  listingId?: string;
  listingTitle?: string;
  comment?: {
    commentText?: string;
    commentType?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  };
  transactingMember?: {
    userId?: string;
  };
}

interface EbayFeedbackResponse {
  feedbackEntries?: EbayFeedbackEntry[];
  total?: number;
  next?: string;
  href?: string;
}

interface EbaySummaryResponse {
  feedbackScoreSummary?: {
    positiveFeedbackPercent?: string | number;
    totalFeedbackScore?: number;
    annualPositiveFeedbackCount?: number;
    annualNegativeFeedbackCount?: number;
    annualNeutralFeedbackCount?: number;
  };
}

// ── Fetch all feedback pages ──────────────────────────────────────────────────

interface RawFeedback {
  feedbackId: string;
  rating: 1 | 0 | -1;
  comment: string | null;
  reviewerName: string | null;
  itemTitle: string | null;
  itemId: string | null;
  transactionDate: Date | null;
}

export async function fetchEbayFeedback(): Promise<{
  feedback: RawFeedback[];
  positivePct: number;
  totalCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}> {
  const accessToken = await getEbayAccessToken();

  async function get<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`eBay Feedback API error (${res.status}): ${text.slice(0, 400)}`);
    }
    return res.json();
  }

  // Fetch stats
  const summary = await get<EbaySummaryResponse>(`${FEEDBACK_BASE}/feedback_summary`);
  const s = summary.feedbackScoreSummary ?? {};
  const positivePct = parseFloat(String(s.positiveFeedbackPercent ?? 0));
  const totalCount = s.totalFeedbackScore ?? 0;
  const positiveCount = s.annualPositiveFeedbackCount ?? 0;
  const negativeCount = s.annualNegativeFeedbackCount ?? 0;
  const neutralCount = s.annualNeutralFeedbackCount ?? 0;

  // Fetch all feedback pages
  const allFeedback: RawFeedback[] = [];
  let url: string | null = `${FEEDBACK_BASE}/feedback?feedback_type=RECEIVED_AS_SELLER&limit=200`;

  while (url) {
    const page = await get<EbayFeedbackResponse>(url);

    for (const entry of page.feedbackEntries ?? []) {
      if (!entry.feedbackId) continue;

      const commentType = entry.comment?.commentType ?? "NEUTRAL";
      const rating: 1 | 0 | -1 =
        commentType === "POSITIVE" ? 1 : commentType === "NEGATIVE" ? -1 : 0;

      const rawDate = entry.creationDate;
      const transactionDate = rawDate ? new Date(rawDate) : null;

      allFeedback.push({
        feedbackId: entry.feedbackId,
        rating,
        comment: entry.comment?.commentText ?? null,
        reviewerName: entry.transactingMember?.userId ?? null,
        itemTitle: entry.listingTitle ?? null,
        itemId: entry.listingId ?? null,
        transactionDate:
          transactionDate && !isNaN(transactionDate.getTime()) ? transactionDate : null,
      });
    }

    // Follow next page cursor if present
    url = page.next ?? null;
  }

  return {
    feedback: allFeedback,
    positivePct,
    totalCount,
    positiveCount,
    negativeCount,
    neutralCount,
  };
}

// ── Sync entry point ──────────────────────────────────────────────────────────

export interface ReviewSyncResult {
  created: number;
  skipped: number;
  total: number;
  errors: string[];
}

export async function syncEbayReviews(): Promise<ReviewSyncResult> {
  const result: ReviewSyncResult = { created: 0, skipped: 0, total: 0, errors: [] };

  const { feedback, positivePct, totalCount, positiveCount, negativeCount, neutralCount } =
    await fetchEbayFeedback();

  result.total = feedback.length;

  for (const item of feedback) {
    try {
      const existing = await prisma.ebayReview.findUnique({
        where: { ebayFeedbackId: item.feedbackId },
        select: { id: true },
      });

      if (existing) {
        result.skipped++;
        continue;
      }

      await prisma.ebayReview.create({
        data: {
          ebayFeedbackId: item.feedbackId,
          rating: item.rating,
          comment: item.comment,
          reviewerName: item.reviewerName,
          itemTitle: item.itemTitle,
          itemId: item.itemId,
          transactionDate: item.transactionDate,
        },
      });

      result.created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`feedbackId=${item.feedbackId}: ${msg}`);
    }
  }

  // Update EbaySellerStats
  await prisma.ebaySellerStats.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      positiveFeedbackPercent: positivePct,
      totalFeedbackCount: totalCount,
      positiveFeedbackCount: positiveCount,
      negativeFeedbackCount: negativeCount,
      neutralFeedbackCount: neutralCount,
    },
    update: {
      positiveFeedbackPercent: positivePct,
      totalFeedbackCount: totalCount,
      positiveFeedbackCount: positiveCount,
      negativeFeedbackCount: negativeCount,
      neutralFeedbackCount: neutralCount,
    },
  });

  return result;
}
