import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { authRatelimit, apiRatelimit } from "@/lib/ratelimit";

// Rate-limit only real auth actions — not the session read endpoint (polled by SessionProvider on every page load)
const AUTH_PATTERN = /^\/api\/auth\/(?!session$)/;
const API_PATTERN =
  /^\/api\/(checkout|contact|ebay-sync|ebay|admin|newsletter|products|cart|orders|account|offers)(\/|$)/;
const ADMIN_PAGE_PATTERN = /^\/admin(\/|$)/;
const ADMIN_API_PATTERN = /^\/api\/admin\//;

function buildCsp(nonce: string): string {
  return [
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
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

  // ── Admin route protection ─────────────────────────────────────────────────
  // Exempt the bootstrap promote endpoint — it has its own secret-based auth
  const isBootstrap = pathname === "/api/admin/promote";
  if (!isBootstrap && (ADMIN_PAGE_PATTERN.test(pathname) || ADMIN_API_PATTERN.test(pathname))) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET!,
      secureCookie: process.env.NODE_ENV === "production",
    });

    const isAdmin = token?.role === "ADMIN";

    if (!isAdmin) {
      if (ADMIN_API_PATTERN.test(pathname)) {
        // Return JSON 403 for API routes
        return NextResponse.json({ error: "Forbidden: admin access required." }, { status: 403 });
      }
      // Redirect page requests to 403 — never reveal that admin routes exist
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const isAuth = AUTH_PATTERN.test(pathname);
  const isApi = API_PATTERN.test(pathname);

  if (isAuth || isApi) {
    const limiter = isAuth ? authRatelimit : apiRatelimit;
    try {
      const { success, limit, reset } = await limiter.limit(ip);
      if (!success) {
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(reset),
          },
        });
      }
    } catch {
      // Upstash unavailable — fail open so auth routes still work.
      // Supabase-based login attempt tracking still provides brute-force protection.
    }
  }

  // ── CSP nonce (applied to all passing requests) ────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
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
