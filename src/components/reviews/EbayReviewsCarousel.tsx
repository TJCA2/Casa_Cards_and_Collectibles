"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import EbayReviewCard, { type ReviewCardData } from "./EbayReviewCard";

export interface SellerStats {
  positivePct: number;
  totalCount: number;
  positiveCount: number;
}

interface Props {
  reviews: ReviewCardData[];
  sellerStats: SellerStats | null;
}

const CARDS_PER_PAGE = 3;
const INTERVAL_DESKTOP_MS = 6000;
const INTERVAL_MOBILE_MS = 4800; // 1.25× faster on mobile

export default function EbayReviewsCarousel({ reviews, sellerStats }: Props) {
  const [page, setPage] = useState(0);
  const pausedRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const [intervalMs, setIntervalMs] = useState(() => {
    if (typeof window === "undefined") return INTERVAL_DESKTOP_MS;
    return window.matchMedia("(max-width: 1023px)").matches
      ? INTERVAL_MOBILE_MS
      : INTERVAL_DESKTOP_MS;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) =>
      setIntervalMs(e.matches ? INTERVAL_MOBILE_MS : INTERVAL_DESKTOP_MS);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const totalPages = Math.ceil(reviews.length / CARDS_PER_PAGE);

  const next = useCallback(() => setPage((p) => (p + 1) % totalPages), [totalPages]);
  const prev = useCallback(() => setPage((p) => (p - 1 + totalPages) % totalPages), [totalPages]);

  useEffect(() => {
    if (totalPages <= 1) return;
    const id = setInterval(() => {
      if (!pausedRef.current) next();
    }, intervalMs);
    return () => clearInterval(id);
  }, [next, totalPages, intervalMs]);

  if (reviews.length === 0) return null;

  const visible = reviews.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);

  return (
    <div
      style={{ touchAction: "pan-y" }}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
        pausedRef.current = true;
      }}
      onTouchEnd={(e) => {
        if (touchStartXRef.current === null) return;
        const endX = e.changedTouches[0]?.clientX;
        if (endX !== undefined) {
          const delta = touchStartXRef.current - endX;
          if (Math.abs(delta) > 50) {
            delta > 0 ? next() : prev();
          }
        }
        touchStartXRef.current = null;
        pausedRef.current = false;
      }}
    >
      {/* Seller stats bar */}
      {sellerStats && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <strong className="text-gray-900">{sellerStats.positivePct.toFixed(1)}%</strong>{" "}
            positive feedback
          </span>
          <span className="text-gray-400">·</span>
          <span>
            <strong className="text-gray-900">{sellerStats.totalCount.toLocaleString()}</strong>{" "}
            eBay ratings
          </span>
        </div>
      )}

      {/* Cards grid + arrows */}
      <div className="relative">
        {totalPages > 1 && (
          <button
            onClick={prev}
            aria-label="Previous reviews"
            className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-sm transition hover:bg-gray-50 sm:-left-5"
          >
            <svg
              className="h-4 w-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div className="grid grid-cols-1 gap-4 px-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((review) => (
            <EbayReviewCard key={review.id} review={review} />
          ))}
        </div>

        {totalPages > 1 && (
          <button
            onClick={next}
            aria-label="Next reviews"
            className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-sm transition hover:bg-gray-50 sm:-right-5"
          >
            <svg
              className="h-4 w-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Page dots */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`Page ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === page ? "w-5 bg-red-600" : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}

      {/* Link to full eBay feedback page */}
      <div className="mt-5 text-center">
        <a
          href="https://www.ebay.com/usr/casa_cards_and_collectibles?_tab=feedback"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-800"
        >
          {sellerStats && (
            <span>View all {sellerStats.totalCount.toLocaleString()} reviews on</span>
          )}
          {!sellerStats && <span>View all feedback on</span>}
          <span className="font-extrabold tracking-tight" aria-hidden="true">
            <span className="text-[#e53238]">e</span>
            <span className="text-[#0064d2]">B</span>
            <span className="text-[#f5af02]">a</span>
            <span className="text-[#86b817]">y</span>
          </span>
          <svg
            className="h-3 w-3"
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
