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
} from "@fwe/types";

// Re-export for backwards compatibility
export type {
  ApiMeal,
  ApiOrder,
  FulfillmentStatus,
  ModifierType,
  PaymentStatus,
} from "@fwe/types";
export type { CreateOrderInput } from "@fwe/validators";
