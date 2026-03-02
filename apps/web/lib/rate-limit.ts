/**
 * Rate Limiting Module
 *
 * Provides rate limiting for API endpoints to prevent abuse.
 *
 * Current implementation uses in-memory storage (suitable for single-server deployment).
 * For production with multiple servers, upgrade to Redis using @upstash/ratelimit.
 *
 * Usage:
 * ```ts
 * const limiter = createRateLimiter({ interval: 60_000, limit: 10 });
 *
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await limiter.check(request);
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response;
 *   }
 *   // ... rest of handler
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";

// ============================================
// Types
// ============================================

interface RateLimitConfig {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  interval: number;
  /** Maximum requests per interval (default: 10) */
  limit: number;
  /** Identifier function (default: uses IP address) */
  getIdentifier?: (request: NextRequest) => string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  response?: NextResponse;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ============================================
// In-Memory Store (Development)
// ============================================

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 60_000); // Clean every minute

// ============================================
// Rate Limiter Factory
// ============================================

/**
 * Creates a rate limiter with the specified configuration.
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const {
    interval = 60_000, // 1 minute default
    limit = 10, // 10 requests per minute default
    getIdentifier = defaultGetIdentifier,
  } = config;

  return {
    /**
     * Check if the request should be rate limited.
     * Returns success: true if allowed, success: false with response if blocked.
     */
    async check(request: NextRequest): Promise<RateLimitResult> {
      const identifier = getIdentifier(request);
      const now = Date.now();
      const key = `ratelimit:${identifier}`;

      let entry = store.get(key);

      // Initialize or reset if expired
      if (!entry || entry.resetTime < now) {
        entry = {
          count: 0,
          resetTime: now + interval,
        };
      }

      // Increment count
      entry.count++;
      store.set(key, entry);

      const remaining = Math.max(0, limit - entry.count);
      const reset = Math.ceil((entry.resetTime - now) / 1000);

      // Check if over limit
      if (entry.count > limit) {
        return {
          success: false,
          remaining: 0,
          reset,
          response: NextResponse.json(
            {
              error: "Too many requests",
              message: `Rate limit exceeded. Try again in ${reset} seconds.`,
              retryAfter: reset,
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(reset),
                "X-RateLimit-Limit": String(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": String(entry.resetTime),
              },
            },
          ),
        };
      }

      return {
        success: true,
        remaining,
        reset,
      };
    },
  };
}

// ============================================
// Default Identifier (IP-based)
// ============================================

function defaultGetIdentifier(request: NextRequest): string {
  // Try various headers for the real IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0] ?? "";
    return firstIp.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Try CF-Connecting-IP for Cloudflare
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp;
  }

  // Fallback to a hash of user-agent + other headers as identifier
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `anon-${hashString(userAgent)}`;
}

/**
 * Simple string hash for anonymous identifier generation.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// ============================================
// Pre-configured Limiters
// ============================================

/**
 * Strict rate limiter for checkout/payment endpoints.
 * 5 requests per minute per IP.
 */
export const checkoutRateLimiter = createRateLimiter({
  interval: 60_000,
  limit: 5,
});
