/**
 * Meal Services
 *
 * This module provides meal data fetching functions for the commerce app.
 * All data is fetched from the CMS API with caching for performance.
 */

import { mealsApi, type ApiMeal } from "@/lib/cms-api";
import {
  getCachedMeals,
  getCachedMealById,
  getCachedMealBySlug,
  getCachedFeaturedMeals,
  getCachedAvailableMeals,
} from "@/lib/cache";

// Re-export the ApiMeal type for convenience
export type { ApiMeal };
export type Meal = ApiMeal;

/**
 * Get all meals (cached, 5 min TTL).
 */
export async function getMeals(): Promise<ApiMeal[]> {
  return getCachedMeals();
}

/**
 * Get a meal by ID (cached, 5 min TTL).
 */
export async function getMealById(id: string): Promise<ApiMeal | null> {
  return getCachedMealById(id);
}

/**
 * Get a meal by slug (cached, 5 min TTL).
 */
export async function getMealBySlug(slug: string): Promise<ApiMeal | null> {
  return getCachedMealBySlug(slug);
}

/**
 * Get featured meals for homepage (cached, 5 min TTL).
 */
export async function getFeaturedMeals(): Promise<ApiMeal[]> {
  return getCachedFeaturedMeals();
}

/**
 * Get meals by dietary tag (not cached - less common query).
 */
export async function getMealsByTag(tag: string): Promise<ApiMeal[]> {
  return mealsApi.getByTag(tag);
}

/**
 * Get available meals for ordering (revalidates every request; rotation-driven menu).
 */
export async function getAvailableMeals() {
  return getCachedAvailableMeals();
}
