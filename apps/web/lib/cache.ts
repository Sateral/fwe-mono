/**
 * Caching Module
 *
 * Provides caching utilities for frequently accessed data like meals.
 * Uses Next.js unstable_cache for server-side caching with automatic
 * revalidation.
 *
 * Benefits:
 * - Reduces database/API load
 * - Faster page loads
 * - Automatic cache invalidation via revalidation
 *
 * Usage:
 * ```ts
 * const meals = await getCachedMeals();
 * const meal = await getCachedMealBySlug('teriyaki-bowl');
 * ```
 *
 * Cache Invalidation:
 * - Time-based: Automatically revalidates after TTL
 * - On-demand: Call revalidateTag('meals') after CMS updates
 */

import { unstable_cache } from "next/cache";
import { mealsApi } from "@/lib/cms-api";

// ============================================
// Configuration
// ============================================

/**
 * Default cache TTL in seconds.
 * Meals don't change frequently, so 5 minutes is reasonable.
 */
const DEFAULT_REVALIDATE = 300; // 5 minutes

// ============================================
// Cached Meal Functions
// ============================================

/**
 * Get all meals with caching.
 * Revalidates every 5 minutes or on-demand via 'meals' tag.
 */
export const getCachedMeals = unstable_cache(
  async () => {
    console.log("[Cache] Fetching all meals from CMS");
    return mealsApi.getAll();
  },
  ["all-meals"],
  {
    revalidate: DEFAULT_REVALIDATE,
    tags: ["meals"],
  }
);

/**
 * Get a single meal by slug with caching.
 * Each slug gets its own cache entry.
 */
export const getCachedMealBySlug = unstable_cache(
  async (slug: string) => {
    console.log(`[Cache] Fetching meal by slug: ${slug}`);
    return mealsApi.getBySlug(slug);
  },
  ["meal-by-slug"],
  {
    revalidate: DEFAULT_REVALIDATE,
    tags: ["meals"],
  }
);

/**
 * Get a single meal by ID with caching.
 */
export const getCachedMealById = unstable_cache(
  async (id: string) => {
    console.log(`[Cache] Fetching meal by ID: ${id}`);
    return mealsApi.getById(id);
  },
  ["meal-by-id"],
  {
    revalidate: DEFAULT_REVALIDATE,
    tags: ["meals"],
  }
);

/**
 * Get featured meals with caching.
 */
export const getCachedFeaturedMeals = unstable_cache(
  async () => {
    console.log("[Cache] Fetching featured meals");
    return mealsApi.getFeatured();
  },
  ["featured-meals"],
  {
    revalidate: DEFAULT_REVALIDATE,
    tags: ["meals", "featured"],
  }
);

/**
 * Available meals for ordering — not wrapped in unstable_cache.
 * Next.js 16 forbids `revalidate: 0`; long TTL would hide CMS rotation updates
 * without a cross-app revalidateTag.
 */
export async function getCachedAvailableMeals() {
  console.log("[Cache] Fetching available meals");
  return mealsApi.getAvailable();
}

/** Active rotation for checkout — same rationale as {@link getCachedAvailableMeals}. */
export async function getCachedActiveRotation() {
  console.log("[Cache] Fetching active rotation");
  return mealsApi.getActiveRotation();
}

// ============================================
// Cache Invalidation Helpers
// ============================================

/**
 * Helper to invalidate meal caches.
 * Call this from CMS after meal updates.
 *
 * Note: In Next.js App Router, use revalidateTag('meals')
 * in a Server Action or API route.
 *
 * Example API route for CMS to call:
 * ```ts
 * // app/api/revalidate/route.ts
 * import { revalidateTag } from 'next/cache';
 *
 * export async function POST(request: Request) {
 *   const { tag } = await request.json();
 *   revalidateTag(tag);
 *   return Response.json({ revalidated: true });
 * }
 * ```
 */
export const CACHE_TAGS = {
  MEALS: "meals",
  FEATURED: "featured",
  ROTATION: "rotation",
} as const;
