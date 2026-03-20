import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { authRatelimit, apiRatelimit } from "@/lib/ratelimit";

// Rate-limit only real auth actions — not the session read endpoint (polled by SessionProvider on every page load)
const AUTH_PATTERN = /^\/api\/auth\/(?!session$)/;
const API_PATTERN =
  /^\/api\/(checkout|contact|ebay-sync|ebay|admin|newsletter|products|cart|orders|account|offers)(\/|$)/;
const ADMIN_PAGE_PATTERN = /^\/admin(\/|$)/;
const ADMIN_API_PATTERN = /^\/api\/admin\//;

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

  if (!isAuth && !isApi) return NextResponse.next();

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/auth/:path*",
    "/api/admin/:path*",
    "/api/checkout/:path*",
    "/api/contact",
    "/api/ebay-sync",
    "/api/ebay/:path*",
    "/api/newsletter/:path*",
    "/api/products/:path*",
    "/api/cart/:path*",
    "/api/orders/:path*",
    "/api/account/:path*",
    "/api/account/verify-email-change",
    "/api/offers/:path*",
  ],
};
