"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  productId: string;
  productTitle: string;
  price: number; // buy-now price in dollars
  onClose: () => void;
  onSuccess: () => void;
}

export default function OfferModal({ productId, productTitle, price, onClose, onSuccess }: Props) {
  const minimum = Math.ceil(price * 0.7 * 100) / 100;
  const [offerPrice, setOfferPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus input and trap scroll on mount
  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = parseFloat(offerPrice);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid offer amount.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, offerPrice: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError("You already have a pending offer on this item.");
        } else if (res.status === 400 && data.minimum) {
          setError(
            `Offer must be at least $${Number(data.minimum).toFixed(2)} (70% of asking price).`,
          );
        } else {
          setError(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }
      setSuccess(true);
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Make an Offer</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-7 w-7 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900">Offer Submitted!</p>
              <p className="mt-1 text-sm text-gray-500">
                {"We'll email you when the seller responds."}
              </p>
              <button
                onClick={onClose}
                className="mt-5 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product info */}
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Item</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900 line-clamp-2">
                  {productTitle}
                </p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Buy now price</span>
                  <span className="font-semibold text-gray-900">${price.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Minimum offer</span>
                  <span className="font-semibold text-red-600">${minimum.toFixed(2)}</span>
                </div>
              </div>

              {/* Offer input */}
              <div>
                <label
                  htmlFor="offer-price"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Your offer
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    $
                  </span>
                  <input
                    ref={inputRef}
                    id="offer-price"
                    type="number"
                    step="0.01"
                    min={minimum}
                    max={price}
                    value={offerPrice}
                    onChange={(e) => {
                      setOfferPrice(e.target.value);
                      setError(null);
                    }}
                    placeholder={minimum.toFixed(2)}
                    className="w-full rounded-xl border border-gray-200 pl-7 pr-4 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                    required
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  Minimum ${minimum.toFixed(2)} · Maximum ${price.toFixed(2)}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? "Submitting…" : "Submit Offer"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
