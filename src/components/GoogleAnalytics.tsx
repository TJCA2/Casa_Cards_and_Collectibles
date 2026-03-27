"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_KEY } from "@/components/CookieConsent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Loads Google Analytics 4 only when the user has accepted analytics cookies.
 * Responds to consent changes dispatched by CookieConsent via "cc_consent_update".
 * If GA_ID is not set, renders nothing — safe for dev environments.
 */
export default function GoogleAnalytics({ nonce }: { nonce?: string | undefined }) {
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    // Read initial stored consent on mount (localStorage is client-only)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(localStorage.getItem(CONSENT_KEY));

    // Re-evaluate when the user accepts or declines via the banner
    function handleUpdate() {
      setConsent(localStorage.getItem(CONSENT_KEY));
    }
    window.addEventListener("cc_consent_update", handleUpdate);
    return () => window.removeEventListener("cc_consent_update", handleUpdate);
  }, []);

  // Only load GA4 when: env var is set AND user explicitly accepted analytics
  if (!GA_ID || consent !== "all") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
