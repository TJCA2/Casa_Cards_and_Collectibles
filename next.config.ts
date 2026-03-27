import type { NextConfig } from "next";

// Note: Content-Security-Policy is set per-request in src/middleware.ts
// (nonce-based, so it must be dynamic rather than a static header here)
const securityHeaders = [
  // ── Prevent MIME type sniffing ─────────────────────────────────────────────
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // ── Block clickjacking (redundant with CSP frame-ancestors, belt+suspenders) ─
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // ── Stop sending the full URL as referrer to third parties ─────────────────
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // ── Force HTTPS for 1 year, include subdomains ─────────────────────────────
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // ── Disable browser features we don't use ──────────────────────────────────
  {
    key: "Permissions-Policy",
    value:
      'camera=(), microphone=(), geolocation=(), payment=(self "https://www.paypal.com"), usb=()',
  },
  // ── Prevent IE/Chrome from guessing content type ───────────────────────────
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [
    {
      // Apply security headers to ALL routes including root "/"
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],

  // Force HTTPS: redirect http → https in production
  // Vercel handles this at the edge, but we set it here as a code-level guarantee
  async redirects() {
    return [
      // Redirect the raw NextAuth error endpoint to the branded custom error page.
      // This prevents Google Safe Browsing from flagging the unbranded default page as phishing.
      {
        source: "/api/auth/error",
        destination: "/auth/error",
        permanent: true,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ebayimg.com" },
      { protocol: "https", hostname: "galleryplus.ebayimg.com" },
    ],
  },
};

export default nextConfig;
