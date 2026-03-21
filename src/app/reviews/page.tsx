import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EbayReviewCard from "@/components/reviews/EbayReviewCard";

// ── Constants ──────────────────────────────────────────────────────────────────

const PER_PAGE = 21;
const EBAY_FEEDBACK_URL = "https://www.ebay.com/usr/casa_cards_and_collectibles?_tab=feedback";

// Detailed Seller Ratings — average for last 12 months (from eBay seller dashboard)
const DETAILED_RATINGS = [
  { label: "Accurate description", score: 5.0 },
  { label: "Reasonable shipping cost", score: 4.9 },
  { label: "Shipping speed", score: 5.0 },
  { label: "Communication", score: 5.0 },
];

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = { searchParams: Promise<{ page?: string }> };

// ── Helpers ────────────────────────────────────────────────────────────────────

function derivePositivePct(stats: {
  positiveFeedbackPercent: unknown;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  neutralFeedbackCount: number;
}): number {
  const stored = Number(stats.positiveFeedbackPercent);
  if (stored > 0) return stored;
  const denom =
    stats.positiveFeedbackCount + stats.negativeFeedbackCount + stats.neutralFeedbackCount;
  return denom > 0 ? Math.round((stats.positiveFeedbackCount / denom) * 1000) / 10 : 0;
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const stats = await prisma.ebaySellerStats.findUnique({
    where: { id: "singleton" },
    select: {
      positiveFeedbackPercent: true,
      totalFeedbackCount: true,
      positiveFeedbackCount: true,
      negativeFeedbackCount: true,
      neutralFeedbackCount: true,
    },
  });

  const pct = stats ? derivePositivePct(stats) : null;
  const total = stats?.totalFeedbackCount ?? null;

  return {
    title: "Customer Reviews | Casa Cards & Collectibles",
    description:
      pct && total
        ? `See what ${total.toLocaleString()} satisfied eBay buyers say about Casa Cards & Collectibles — ${pct.toFixed(1)}% positive feedback.`
        : "Read verified customer reviews for Casa Cards & Collectibles.",
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ReviewsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(parseInt(pageParam ?? "1"), 1);

  const where = { comment: { not: null } };

  const [reviews, total, stats] = await Promise.all([
    prisma.ebayReview.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
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

  const totalPages = Math.ceil(total / PER_PAGE);
  const positivePct = stats ? derivePositivePct(stats) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* ── Header ── */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Customer Reviews</h1>
        <a
          href={EBAY_FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition"
        >
          Verified feedback from our eBay store
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      {/* ── Stats card ── */}
      {stats && (
        <div className="mb-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
            {/* Overall score */}
            <div className="flex flex-col items-center text-center sm:w-44 sm:flex-shrink-0">
              <span className="text-5xl font-extrabold text-gray-900">
                {positivePct.toFixed(1)}%
              </span>
              <div className="mt-2 flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <svg
                    key={i}
                    className="h-5 w-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="mt-1.5 text-sm text-gray-500">
                {stats.totalFeedbackCount.toLocaleString()} ratings
              </p>
              <a
                href={EBAY_FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
              >
                View on eBay ↗
              </a>
            </div>

            {/* Divider */}
            <div className="hidden w-px bg-gray-100 sm:block" />

            {/* Detailed Seller Ratings */}
            <div className="flex-1">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Detailed Seller Ratings · Average last 12 months
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DETAILED_RATINGS.map(({ label, score }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <span className="text-sm text-gray-700">{label}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <svg
                        className="h-4 w-4 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-bold text-gray-900">{score.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Review grid ── */}
      {reviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <EbayReviewCard
              key={review.id}
              review={{
                ...review,
                transactionDate: review.transactionDate?.toISOString() ?? null,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-gray-400">No reviews found.</p>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/reviews?page=${page - 1}`}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/reviews?page=${page + 1}`}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Next →
            </Link>
          )}
        </div>
      )}

      {/* ── CTA banner ── */}
      <div className="mt-14 flex flex-col items-center gap-3 rounded-2xl bg-gray-50 px-6 py-8 text-center">
        <p className="text-lg font-semibold text-gray-900">
          Bought from us? We&apos;d love your feedback.
        </p>
        <p className="text-sm text-gray-500">
          Leave a review on our eBay store — it helps other buyers and means the world to us.
        </p>
        <a
          href={EBAY_FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          <span className="font-extrabold tracking-tight leading-none" aria-hidden="true">
            <span className="text-[#e53238]">e</span>
            <span className="text-[#0064d2]">B</span>
            <span className="text-[#f5af02]">a</span>
            <span className="text-[#86b817]">y</span>
          </span>
          Leave Feedback on eBay
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
