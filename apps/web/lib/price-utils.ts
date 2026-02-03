import type { ApiMeal } from "@/lib/cms-api";

/**
 * Calculates the total price for a single meal configuration.
 *
 * @param meal The meal object from the API
 * @param selectedModifiers Record of groupId -> array of optionIds
 * @param selectedSubstitutions Record of groupId -> optionId
 * @param proteinBoost Whether protein boost is enabled
 * @returns The calculated price for a single unit
 */
export function calculateMealUnitPrice(
  meal: ApiMeal,
  selectedModifiers: Record<string, string[]>,
  selectedSubstitutions: Record<string, string>,
  proteinBoost: boolean
): number {
  const basePrice = meal.price;
  const proteinBoostPrice = proteinBoost ? 2.0 : 0;

  // Calculate substitution adjustments
  const substitutionAdjustment = Object.entries(selectedSubstitutions).reduce(
    (total, [groupId, optionId]) => {
      const group = meal.substitutionGroups.find((g) => g.id === groupId);
      if (!group) return total;
      const option = group.options.find((o) => o.id === optionId);
      return total + (option?.priceAdjustment || 0);
    },
    0
  );

  // Calculate modifier (add-on) costs
  const addOnsTotal = Object.entries(selectedModifiers).reduce(
    (total, [groupId, optionIds]) => {
      const group = meal.modifierGroups.find((g) => g.id === groupId);
      if (!group) return total;

      return (
        total +
        optionIds.reduce((optionTotal, optionId) => {
          const option = group.options.find((o) => o.id === optionId);
          return optionTotal + (option?.extraPrice || 0);
        }, 0)
      );
    },
    0
  );

  return basePrice + proteinBoostPrice + substitutionAdjustment + addOnsTotal;
}

/**
 * Calculates the total price for a line item (unit price * quantity).
 */
export function calculateLineItemTotal(
  unitPrice: number,
  quantity: number
): number {
  return unitPrice * quantity;
}
