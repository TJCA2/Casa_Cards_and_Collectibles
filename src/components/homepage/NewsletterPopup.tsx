"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "cc_newsletter_popup";

export default function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    // Don't show if already dismissed or subscribed
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setVisible(true), 10_000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
        localStorage.setItem(STORAGE_KEY, "subscribed");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-popup-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {status === "success" ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-7 w-7 text-green-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Check your inbox!</h2>
            <p className="mt-2 text-sm text-gray-500">
              We sent a confirmation link to <strong>{email}</strong>. Click it to complete your
              subscription.
            </p>
          </div>
        ) : (
          <>
            {/* Header bar */}
            <div className="mb-6 text-center">
              <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-red-600">
                Exclusive Deals
              </span>
              <h2 id="newsletter-popup-title" className="mt-3 text-2xl font-bold text-gray-900">
                Don&apos;t miss out
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                New arrivals, restocks, and deals — straight to your inbox. No spam, ever.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-red-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition"
              >
                {status === "loading" ? "Sending…" : "Subscribe"}
              </button>
              {status === "error" && (
                <p className="text-center text-xs text-red-500">
                  Something went wrong. Please try again.
                </p>
              )}
            </form>

            <button
              onClick={dismiss}
              className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition"
            >
              No thanks
            </button>
          </>
        )}
      </div>
    </>
  );
}
