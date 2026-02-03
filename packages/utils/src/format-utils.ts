export interface SubstitutionItem {
  groupName: string;
  optionName: string;
}

export interface ModifierItem {
  groupName: string;
  optionNames: string[];
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
 */
export function formatModifiersSummary(modifiers?: ModifierItem[]): string {
  if (!modifiers?.length) return "";
  return modifiers
    .map((m) => `${m.groupName}: ${m.optionNames.join(", ")}`)
    .join(", ");
}

/**
 * Builds the full human-readable description for a Stripe line item.
 */
export function formatLineItemDescription(
  meal: { description?: string | null },
  substitutions?: SubstitutionItem[],
  modifiers?: ModifierItem[],
  proteinBoost?: boolean,
  notes?: string,
  deliveryMethod?: "DELIVERY" | "PICKUP",
  pickupLocation?: string,
): string {
  const parts: string[] = [];

  const subs = formatSubstitutionsSummary(substitutions);
  if (subs) parts.push(subs);

  const mods = formatModifiersSummary(modifiers);
  if (mods) parts.push(mods);

  if (proteinBoost) parts.push("+30% Protein");

  if (deliveryMethod === "PICKUP") {
    parts.push(`Pickup: ${pickupLocation || "Xtreme Couture"}`);
  }

  if (notes) parts.push(`Notes: ${notes}`);

  if (parts.length === 0) {
    return meal.description || "Chef-prepared meal";
  }

  return parts.join(" | ");
}
