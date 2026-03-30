export interface SubstitutionItem {
  groupName: string;
  optionName: string;
}

export interface ModifierItem {
  groupName: string;
  optionName: string;
}

/**
 * Formats a list of substitutions into a concise summary string.
 */
export function formatSubstitutionsSummary(
  substitutions?: SubstitutionItem[],
): string {
  if (!substitutions?.length) return "";
  return substitutions.map((s) => `${s.groupName}: ${s.optionName}`).join(", ");
}

/**
 * Formats a list of modifiers into a concise summary string.
 * Each modifier row is a single option (flat, not nested).
 * Groups them by groupName for display.
 */
export function formatModifiersSummary(modifiers?: ModifierItem[]): string {
  if (!modifiers?.length) return "";
  // Group by groupName to produce "Add-Ons: Extra Chicken, Avocado"
  const grouped = new Map<string, string[]>();
  for (const m of modifiers) {
    const existing = grouped.get(m.groupName) ?? [];
    existing.push(m.optionName);
    grouped.set(m.groupName, existing);
  }
  return Array.from(grouped.entries())
    .map(([groupName, optionNames]) => `${groupName}: ${optionNames.join(", ")}`)
    .join(", ");
}

/**
 * Builds the full human-readable description for a Stripe line item.
 */
export function formatLineItemDescription(
  meal: { description?: string | null },
  substitutions?: SubstitutionItem[],
  modifiers?: ModifierItem[],
  notes?: string,
  deliveryMethod?: "DELIVERY" | "PICKUP",
  pickupLocation?: string,
): string {
  const parts: string[] = [];

  const subs = formatSubstitutionsSummary(substitutions);
  if (subs) parts.push(subs);

  const mods = formatModifiersSummary(modifiers);
  if (mods) parts.push(mods);

  if (deliveryMethod === "PICKUP") {
    parts.push(`Pickup: ${pickupLocation || "Xtreme Couture"}`);
  }

  if (notes) parts.push(`Notes: ${notes}`);

  if (parts.length === 0) {
    return meal.description || "Chef-prepared meal";
  }

  return parts.join(" | ");
}
