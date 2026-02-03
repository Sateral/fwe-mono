export interface MealPricingOptions {
  price: number;
  modifierGroups: Array<{
    id: string;
    options: Array<{ id: string; extraPrice: number }>;
  }>;
  substitutionGroups: Array<{
    id: string;
    options: Array<{ id: string; priceAdjustment: number }>;
  }>;
}

/**
 * Calculates the total price for a single meal configuration.
 */
export function calculateMealUnitPrice(
  meal: MealPricingOptions,
  selectedModifiers: Record<string, string[]>,
  selectedSubstitutions: Record<string, string>,
  proteinBoost: boolean,
): number {
  const basePrice = meal.price;
  const proteinBoostPrice = proteinBoost ? 2.0 : 0;

  const substitutionAdjustment = Object.entries(selectedSubstitutions).reduce(
    (total, [groupId, optionId]) => {
      const group = meal.substitutionGroups.find((g) => g.id === groupId);
      if (!group) return total;
      const option = group.options.find((o) => o.id === optionId);
      return total + (option?.priceAdjustment || 0);
    },
    0,
  );

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
    0,
  );

  return basePrice + proteinBoostPrice + substitutionAdjustment + addOnsTotal;
}

/**
 * Calculates the total price for a line item (unit price * quantity).
 */
export function calculateLineItemTotal(
  unitPrice: number,
  quantity: number,
): number {
  return unitPrice * quantity;
}
