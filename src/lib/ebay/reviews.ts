/**
 * eBay review sync — Phase 9.03
 *
 * Uses the eBay Trading API (XML) with an OAuth user access token.
 * The base scope (https://api.ebay.com/oauth/api_scope) is sufficient.
 * Upserts reviews by ebayFeedbackId (idempotent).
 */

import { prisma } from "@/lib/prisma";
import { getEbayAccessToken } from "@/lib/ebay/oauth";

const TRADING_API_URL = "https://api.ebay.com/ws/api.dll";

// ── XML helpers ───────────────────────────────────────────────────────────────

function extractText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
  return m && m[1] !== undefined ? m[1].trim() : "";
}

function extractBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\/${tag}>`, "g");
  const results: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[0] !== undefined) results.push(m[0]);
  }
  return results;
}

// ── Trading API call ──────────────────────────────────────────────────────────

async function callTradingApi(callName: string, token: string, body: string): Promise<string> {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  ${body}
</${callName}Request>`;

  const res = await fetch(TRADING_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "X-EBAY-API-CALL-NAME": callName,
      "X-EBAY-API-COMPATIBILITY-LEVEL": "1201",
      "X-EBAY-API-SITEID": "0",
      "X-EBAY-API-APP-NAME": process.env.EBAY_CLIENT_ID ?? "",
    },
    body: xml,
  });

  const text = await res.text();

  if (text.includes("<Ack>Failure</Ack>")) {
    const msg = extractText(text, "LongMessage") || extractText(text, "ShortMessage");
    console.error(`[eBay Trading API] Failure:`, text.slice(0, 800));
    throw new Error(`eBay ${callName} failed: ${msg}`);
  }

  return text;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawFeedback {
  feedbackId: string;
  rating: 1 | 0 | -1;
  comment: string | null;
  reviewerName: string | null;
  itemTitle: string | null;
  itemId: string | null;
  transactionDate: Date | null;
}

// ── Fetch feedback via Trading API ────────────────────────────────────────────

export async function fetchEbayFeedback(): Promise<{
  feedback: RawFeedback[];
  positivePct: number;
  totalCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}> {
  const accessToken = await getEbayAccessToken();

  const allFeedback: RawFeedback[] = [];
  let page = 1;
  const pageSize = 200;
  let hasMore = true;
  let positivePct = 0;
  let totalCount = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  while (hasMore) {
    const xml = await callTradingApi(
      "GetFeedback",
      accessToken,
      `
      <FeedbackType>FeedbackReceivedAsSeller</FeedbackType>
      <Pagination>
        <EntriesPerPage>${pageSize}</EntriesPerPage>
        <PageNumber>${page}</PageNumber>
      </Pagination>
    `,
    );

    if (page === 1) {
      const detailIdx = xml.indexOf("FeedbackDetail");
      console.log("[ebay/reviews] XML length:", xml.length, "| FeedbackDetail index:", detailIdx);
      console.log(
        "[ebay/reviews] XML around FeedbackDetail:",
        xml.slice(Math.max(0, detailIdx - 50), detailIdx + 500),
      );
    }

    // Parse stats from first page
    if (page === 1) {
      positivePct = parseFloat(extractText(xml, "PositiveFeedbackPercent") || "0");
      totalCount = parseInt(extractText(xml, "FeedbackScore") || "0", 10);

      const summaryBlocks = extractBlocks(xml, "FeedbackSummaryType");
      for (const block of summaryBlocks) {
        const type = extractText(block, "FeedbackRatingStarColor");
        const count = parseInt(extractText(block, "Count") || "0", 10);
        if (type === "Yellow") positiveCount += count;
        else if (type === "Red") negativeCount += count;
        else neutralCount += count;
      }

      // Simpler: count from entries directly if summary unavailable
    }

    const entries = extractBlocks(xml, "FeedbackDetail");

    for (const entry of entries) {
      const feedbackId = extractText(entry, "FeedbackID");
      if (!feedbackId) continue;

      const commentType = extractText(entry, "CommentType");
      const rating: 1 | 0 | -1 =
        commentType === "Positive" ? 1 : commentType === "Negative" ? -1 : 0;

      const rawDate = extractText(entry, "CommentTime");
      const transactionDate = rawDate ? new Date(rawDate) : null;

      allFeedback.push({
        feedbackId,
        rating,
        comment: extractText(entry, "CommentText") || null,
        reviewerName: extractText(entry, "CommentingUser") || null,
        itemTitle: extractText(entry, "ItemTitle") || null,
        itemId: extractText(entry, "ItemID") || null,
        transactionDate:
          transactionDate && !isNaN(transactionDate.getTime()) ? transactionDate : null,
      });
    }

    const totalPages = parseInt(extractText(xml, "TotalNumberOfPages") || "1", 10);
    hasMore = page < totalPages;
    page++;
  }

  // Derive counts from entries if API summary wasn't available
  if (positiveCount === 0 && negativeCount === 0) {
    positiveCount = allFeedback.filter((f) => f.rating === 1).length;
    negativeCount = allFeedback.filter((f) => f.rating === -1).length;
    neutralCount = allFeedback.filter((f) => f.rating === 0).length;
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
