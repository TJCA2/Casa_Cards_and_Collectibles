import { NextRequest, NextResponse } from "next/server";
import { authRatelimit, apiRatelimit } from "@/lib/ratelimit";

const AUTH_PATTERN = /^\/api\/auth\//;
const API_PATTERN = /^\/api\/(checkout|contact|ebay-sync)(\/|$)/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

  const isAuth = AUTH_PATTERN.test(pathname);
  const isApi = API_PATTERN.test(pathname);

  if (!isAuth && !isApi) return NextResponse.next();

  const limiter = isAuth ? authRatelimit : apiRatelimit;
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*", "/api/checkout/:path*", "/api/contact", "/api/ebay-sync"],
};
