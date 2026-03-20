import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// No-op limiter used when Upstash is not configured — always allows the request through.
// The Supabase-based login attempt tracking still provides brute-force protection.
const noopLimiter = {
  limit: async () => ({
    success: true as const,
    limit: 0,
    reset: 0,
    remaining: 0,
    pending: Promise.resolve(),
  }),
};

function makeRatelimit(
  prefix: string,
  max: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1] = "1 m",
) {
  if (!url || !token) return noopLimiter;
  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    analytics: true,
    prefix,
  });
}

// 10 requests / minute — auth endpoints
export const authRatelimit = makeRatelimit("ratelimit:auth", 10);

// 30 requests / minute — general API endpoints
export const apiRatelimit = makeRatelimit("ratelimit:api", 30);

// Contact form — 3 per hour per IP
export const contactIpRatelimit = makeRatelimit("ratelimit:contact:ip", 3, "1 h");

// Contact form — 10 per day per email address
export const contactEmailRatelimit = makeRatelimit("ratelimit:contact:email", 10, "24 h");
