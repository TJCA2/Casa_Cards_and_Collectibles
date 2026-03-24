"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const CONSENT_KEY = "cc_cookie_consent";
export type ConsentValue = "all" | "essential";

/** Dispatch this event after writing to localStorage so GoogleAnalytics can react. */
export function dispatchConsentUpdate() {
  window.dispatchEvent(new Event("cc_consent_update"));
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show banner only if user hasn't decided yet (localStorage is client-only)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(CONSENT_KEY)) setShow(true);

    // Allow footer "Cookie Preferences" link to re-open the banner
    function handleShow() {
      setShow(true);
    }
    window.addEventListener("cc_show_banner", handleShow);
    return () => window.removeEventListener("cc_show_banner", handleShow);
  }, []);

  function handleAcceptAll() {
    localStorage.setItem(CONSENT_KEY, "all");
    dispatchConsentUpdate();
    setShow(false);
  }

  function handleEssentialOnly() {
    localStorage.setItem(CONSENT_KEY, "essential");
    dispatchConsentUpdate();
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-4 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Message */}
        <p className="text-sm text-gray-600">
          We use cookies to keep you signed in and to understand how visitors use our site.
          Analytics cookies are only set with your consent.{" "}
          <Link href="/privacy" className="font-medium text-red-600 underline hover:text-red-700">
            Privacy Policy
          </Link>
        </p>

        {/* Actions */}
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={handleEssentialOnly}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Essential Only
          </button>
          <button
            onClick={handleAcceptAll}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
