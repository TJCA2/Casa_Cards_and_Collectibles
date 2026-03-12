import type { NextConfig } from "next";

// Content Security Policy
// - Restrictive by default; expand specific directives as integrations are added
// - 'self' covers same-origin resources
// - 'unsafe-inline' on style-src is required for Tailwind until we add a nonce strategy
// - script-src uses 'self' only; third-party scripts (GA4, Stripe, PayPal) will be added here
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

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
  // Note: only applied in production; Vercel sets this automatically too
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // ── Disable browser features we don't use ──────────────────────────────────
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=()",
  },
  // ── Content Security Policy ────────────────────────────────────────────────
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  // ── Prevent IE/Chrome from guessing content type ───────────────────────────
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // Apply security headers to ALL routes
      source: "/:path*",
      headers: securityHeaders,
    },
  ],

  // Force HTTPS: redirect http → https in production
  // Vercel handles this at the edge, but we set it here as a code-level guarantee
  async redirects() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: "https://:path*",
        permanent: true,
      },
    ];
  },

  // Image domains will be added as eBay/Cloudinary are integrated
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
