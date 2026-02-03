/**
 * Shared Types for Commerce Application
 *
 * These types mirror the API response types from the CMS.
 * They are re-exported from cms-api.ts for convenience.
 */

export type {
  ApiMeal as Meal,
  ApiSubstitutionGroup as SubstitutionGroup,
  ApiSubstitutionOption as SubstitutionOption,
  ApiModifierGroup as ModifierGroup,
  ApiModifierOption as ModifierOption,
  ApiDietaryTag as DietaryTag,
  ApiOrder as Order,
} from "@/lib/cms-api";

// Re-export for backwards compatibility
export type { ApiMeal, ApiOrder, CreateOrderInput } from "@/lib/cms-api";

// Modifier type enum (matches CMS)
export type ModifierType = "SINGLE_SELECT" | "MULTI_SELECT";

// Order status enum (matches CMS)
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PREPARING"
  | "DELIVERED"
  | "CANCELLED";
