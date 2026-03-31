/**
 * Shared prep aggregation for CMS dashboard and prep-sheet API.
 * Groups paid order lines by meal and canonical customization signature.
 *
 * With the relational schema, substitutions and modifiers are typed arrays
 * from junction tables — no JSON parsing required.
 */

import type { OrderModifier, OrderSubstitution } from "@/lib/types/order-types";

// ============================================
// Defaults: explicit "white rice" on an order still counts as standard
// ============================================

/** Meal slice needed to treat default substitution options as non-custom. */
export type MealSubstitutionDefaultContext = {
  substitutionGroups?: Array<{
    name: string;
    options: Array<{ name: string; isDefault: boolean }>;
  }>;
};

/**
 * Removes substitution choices that match the meal's default option for that group.
 * Checkout often persists defaults; prep grouping should match chef "standard" build.
 */
export function effectiveSubstitutionsForPrepGrouping(
  raw: OrderSubstitution[],
  meal: MealSubstitutionDefaultContext | null | undefined,
): OrderSubstitution[] {
  const groups = meal?.substitutionGroups;
  if (!groups?.length) return raw;

  return raw.filter((sub) => {
    const gn = sub.groupName.trim();
    const on = sub.optionName.trim();
    const group = groups.find((g) => g.name.trim() === gn);
    if (!group?.options?.length) return true;

    const defaultOptions = group.options.filter((o) => o.isDefault);
    if (defaultOptions.length === 0) return true;

    const matchesDefault = defaultOptions.some((o) => o.name.trim() === on);
    return !matchesDefault;
  });
}

// ============================================
// Canonical config key
// ============================================

export function canonicalPrepConfigKey(input: {
  substitutions: OrderSubstitution[];
  modifiers: OrderModifier[];
  notes: string;
}): string {
  const sortedSubs = [...input.substitutions].sort(
    (a, b) =>
      a.groupName.localeCompare(b.groupName) ||
      a.optionName.localeCompare(b.optionName),
  );

  // Group flat modifier rows back into a map per group for canonical keying
  const modByGroup = new Map<string, string[]>();
  for (const m of input.modifiers) {
    const existing = modByGroup.get(m.groupName) ?? [];
    existing.push(m.optionName);
    modByGroup.set(m.groupName, existing);
  }
  const sortedMods = Array.from(modByGroup.entries())
    .map(([groupName, optionNames]) => ({
      groupName,
      optionNames: [...optionNames].sort((x, y) => x.localeCompare(y)),
    }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName));

  return JSON.stringify({
    s: sortedSubs,
    m: sortedMods,
    n: input.notes,
  });
}

export function buildPrepConfigLabel(input: {
  substitutions: OrderSubstitution[];
  modifiers: OrderModifier[];
  notes: string;
}): string {
  const hasAny =
    input.substitutions.length > 0 ||
    input.modifiers.length > 0 ||
    input.notes.length > 0;
  if (!hasAny) return "Standard";

  const parts: string[] = [];
  for (const s of input.substitutions) {
    parts.push(`${s.groupName}: ${s.optionName}`);
  }

  // Group flat modifier rows for display
  const modByGroup = new Map<string, string[]>();
  for (const m of input.modifiers) {
    const existing = modByGroup.get(m.groupName) ?? [];
    existing.push(m.optionName);
    modByGroup.set(m.groupName, existing);
  }
  for (const [groupName, optionNames] of modByGroup) {
    parts.push(`${groupName}: ${optionNames.join(", ")}`);
  }

  if (input.notes.length > 0) {
    const truncated =
      input.notes.length > 80 ? `${input.notes.slice(0, 77)}...` : input.notes;
    parts.push(`Note: ${truncated}`);
  }
  return parts.join(" · ");
}

// ============================================
// Aggregation
// ============================================

export interface PrepOrderLike {
  mealId: string | null;
  mealName: string;
  meal?: ({ name: string } & MealSubstitutionDefaultContext) | null;
  quantity: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  substitutions: OrderSubstitution[];
  modifiers: OrderModifier[];
  notes?: string | null;
  settlementMethod?: string;
  orderIntentId?: string | null;
}

export interface MealPrepVariation {
  configKey: string;
  count: number;
  label: string;
  substitutions: OrderSubstitution[];
  modifiers: OrderModifier[];
  note: string;
}

export interface MealPrepSummary {
  mealId: string;
  mealName: string;
  totalQuantity: number;
  assignedQuantity: number;
  variations: MealPrepVariation[];
}

export function isOrderActiveForPrep(order: PrepOrderLike): boolean {
  return (
    order.paymentStatus === "PAID" && order.fulfillmentStatus !== "CANCELLED"
  );
}

export function aggregatePrepByMeal(
  orders: PrepOrderLike[],
): MealPrepSummary[] {
  const summary = new Map<
    string,
    {
      mealId: string;
      mealName: string;
      totalQuantity: number;
      assignedQuantity: number;
      variationMap: Map<string, MealPrepVariation>;
    }
  >();

  for (const order of orders) {
    if (!isOrderActiveForPrep(order)) continue;
    // Skip orders where the meal was deleted
    if (!order.mealId) continue;

    const mealId = order.mealId;
    if (!summary.has(mealId)) {
      summary.set(mealId, {
        mealId,
        mealName: order.mealName || order.meal?.name || "Unknown meal",
        totalQuantity: 0,
        assignedQuantity: 0,
        variationMap: new Map(),
      });
    }

    const entry = summary.get(mealId)!;
    entry.totalQuantity += order.quantity;

    if (
      order.settlementMethod === "MEAL_PLAN_CREDITS" &&
      (order.orderIntentId === null || order.orderIntentId === undefined)
    ) {
      entry.assignedQuantity += order.quantity;
    }

    const substitutions = effectiveSubstitutionsForPrepGrouping(
      order.substitutions,
      order.meal,
    );
    const modifiers = order.modifiers;
    const note = (order.notes ?? "").trim();

    const configKey = canonicalPrepConfigKey({
      substitutions,
      modifiers,
      notes: note,
    });

    let variation = entry.variationMap.get(configKey);
    if (!variation) {
      variation = {
        configKey,
        count: 0,
        label: buildPrepConfigLabel({
          substitutions,
          modifiers,
          notes: note,
        }),
        substitutions,
        modifiers,
        note,
      };
      entry.variationMap.set(configKey, variation);
    }
    variation.count += order.quantity;
  }

  return Array.from(summary.values())
    .map((e) => ({
      mealId: e.mealId,
      mealName: e.mealName,
      totalQuantity: e.totalQuantity,
      assignedQuantity: e.assignedQuantity,
      variations: Array.from(e.variationMap.values()).sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
      ),
    }))
    .sort((a, b) =>
      b.totalQuantity === a.totalQuantity
        ? a.mealName.localeCompare(b.mealName)
        : b.totalQuantity - a.totalQuantity,
    );
}

export interface GrocerySignal {
  type: "Substitution" | "Modifier";
  label: string;
  count: number;
}

/**
 * Counts every chosen substitution/modifier on orders (including defaults).
 * Use this for grocery demand; prep grouping uses effectiveSubstitutionsForPrepGrouping instead.
 */
export function buildGrocerySignalsFromOrders(
  orders: PrepOrderLike[],
): GrocerySignal[] {
  const substitutionDemand = new Map<string, number>();
  const modifierDemand = new Map<string, number>();

  for (const order of orders) {
    if (!isOrderActiveForPrep(order)) continue;
    const q = order.quantity;
    for (const sub of order.substitutions) {
      const key = `${sub.groupName}: ${sub.optionName}`;
      substitutionDemand.set(key, (substitutionDemand.get(key) ?? 0) + q);
    }
    for (const mod of order.modifiers) {
      const key = `${mod.groupName}: ${mod.optionName}`;
      modifierDemand.set(key, (modifierDemand.get(key) ?? 0) + q);
    }
  }

  const out: GrocerySignal[] = [
    ...Array.from(substitutionDemand.entries()).map(([label, count]) => ({
      type: "Substitution" as const,
      label,
      count,
    })),
    ...Array.from(modifierDemand.entries()).map(([label, count]) => ({
      type: "Modifier" as const,
      label,
      count,
    })),
  ];

  return out.sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}
