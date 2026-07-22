import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash REST client requires an https:// URL. The existing
// UPSTASH_REDIS_REST_URL in production is a rediss:// URL used by
// BullMQ/IORedis, so only initialize when we actually have a REST URL
// (either a proper https URL, or a separate env var).
const REST_URL =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_URL.startsWith("https://")
    ? process.env.UPSTASH_REDIS_REST_URL
    : undefined;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
try {
  if (REST_URL && REST_TOKEN) {
    redis = new Redis({ url: REST_URL, token: REST_TOKEN });
  }
} catch {
  redis = null;
}

export const authLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "60 s"), prefix: "rl:auth" })
  : null;

export const mutationLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "60 s"), prefix: "rl:mutate" })
  : null;

export const readLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "60 s"), prefix: "rl:read" })
  : null;

/**
 * Fail-open wrapper — if the rate limiter throws (network error, misconfigured
 * URL, Upstash outage), we allow the request through. Rate limiting is a
 * defense layer, not the authoritative auth check, so it must never break
 * the site.
 */
export async function checkLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<{ success: true } | { success: false; limit: number; reset: number }> {
  if (!limiter) return { success: true };
  try {
    const r = await limiter.limit(key);
    if (r.success) return { success: true };
    return { success: false, limit: r.limit, reset: r.reset };
  } catch (err) {
    console.error("[ratelimit] limiter threw, allowing request:", err);
    return { success: true };
  }
}
