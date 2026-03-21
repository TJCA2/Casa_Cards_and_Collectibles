"use client";

import { useState } from "react";

export interface ReviewCardData {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string | null;
  itemTitle: string | null;
  transactionDate: string | Date | null;
}

function StarRow({ rating }: { rating: number }) {
  // 1 = positive = 5 stars, 0 = neutral = 3 stars, -1 = negative = 1 star
  const filled = rating === 1 ? 5 : rating === 0 ? 3 : 1;
  return (
    <div className="flex gap-0.5" aria-label={`${filled} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < filled ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function maskName(name: string | null): string {
  if (!name) return "eBay buyer";
  return name.slice(0, 3) + "***";
}

function formatDate(date: string | Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const MAX_CHARS = 200;

export default function EbayReviewCard({ review }: { review: ReviewCardData }) {
  const [expanded, setExpanded] = useState(false);
  const comment = review.comment ?? "";
  const isTruncated = comment.length > MAX_CHARS;
  const displayComment = isTruncated && !expanded ? comment.slice(0, MAX_CHARS) + "…" : comment;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {/* Stars + date */}
      <div className="flex items-center justify-between">
        <StarRow rating={review.rating} />
        <span className="text-xs text-gray-400">{formatDate(review.transactionDate)}</span>
      </div>

      {/* Comment */}
      {comment && (
        <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-700">
          &ldquo;{displayComment}&rdquo;
          {isTruncated && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 text-xs font-medium text-red-600 hover:text-red-700"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </p>
      )}

      {/* Reviewer + item */}
      <div className="mt-4 border-t border-gray-50 pt-3">
        <p className="text-sm font-semibold text-gray-900">{maskName(review.reviewerName)}</p>
        {review.itemTitle && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{review.itemTitle}</p>
        )}
      </div>
    </div>
  );
}
