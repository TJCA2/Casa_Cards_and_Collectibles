import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.paypal.com https://www.paypalobjects.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com`,
    `style-src 'self' 'unsafe-inline' https://www.paypalobjects.com`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' https://www.paypalobjects.com`,
    `frame-src https://www.paypal.com https://www.sandbox.paypal.com https://challenges.cloudflare.com`,
    `connect-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://api.paypal.com https://api.sandbox.paypal.com https://challenges.cloudflare.com https://www.google-analytics.com https://region1.analytics.google.com https://analytics.google.com https://www.googletagmanager.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  // Forward nonce to server components via request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
