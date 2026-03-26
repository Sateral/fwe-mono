/**
 * Shared prep aggregation for CMS dashboard and prep-sheet API.
 * Groups paid order lines by meal and canonical customization signature.
 */

import type {
  OrderModifier,
  OrderSubstitution,
} from "@/lib/types/order-types";

// ============================================
// Parsing (aligned with production-summary)
// ============================================

export function parseOrderSubstitutions(value: unknown): OrderSubstitution[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { groupName: string; optionName: string } =>
        typeof item === "object" &&
        item !== null &&
        "groupName" in item &&
        "optionName" in item &&
        typeof item.groupName === "string" &&
        typeof item.optionName === "string",
    )
    .map((item) => ({
      groupName: item.groupName,
      optionName: item.optionName,
    }));
}

export function parseOrderModifiers(value: unknown): OrderModifier[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { groupName: string; optionNames: string[] } =>
        typeof item === "object" &&
        item !== null &&
        "groupName" in item &&
        "optionNames" in item &&
        typeof item.groupName === "string" &&
        Array.isArray(item.optionNames) &&
        item.optionNames.every((name: string) => typeof name === "string"),
    )
    .map((item) => ({
      groupName: item.groupName,
      optionNames: item.optionNames,
    }));
}

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
 * Checkout often persists defaults in JSON; prep grouping should match chef "standard" build.
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
  proteinBoost: boolean;
  notes: string;
}): string {
  const sortedSubs = [...input.substitutions].sort(
    (a, b) =>
      a.groupName.localeCompare(b.groupName) ||
      a.optionName.localeCompare(b.optionName),
  );
  const sortedMods = [...input.modifiers]
    .map((m) => ({
      groupName: m.groupName,
      optionNames: [...m.optionNames].sort((x, y) => x.localeCompare(y)),
    }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName));

  return JSON.stringify({
    s: sortedSubs,
    m: sortedMods,
    b: input.proteinBoost,
    n: input.notes,
  });
}

export function buildPrepConfigLabel(input: {
  substitutions: OrderSubstitution[];
  modifiers: OrderModifier[];
  proteinBoost: boolean;
  notes: string;
}): string {
  const hasAny =
    input.proteinBoost ||
    input.substitutions.length > 0 ||
    input.modifiers.length > 0 ||
    input.notes.length > 0;
  if (!hasAny) return "Standard";

  const parts: string[] = [];
  if (input.proteinBoost) parts.push("Protein boost");
  for (const s of input.substitutions) {
    parts.push(`${s.groupName}: ${s.optionName}`);
  }
  for (const m of input.modifiers) {
    parts.push(`${m.groupName}: ${m.optionNames.join(", ")}`);
  }
  if (input.notes.length > 0) {
    const truncated =
      input.notes.length > 80
        ? `${input.notes.slice(0, 77)}...`
        : input.notes;
    parts.push(`Note: ${truncated}`);
  }
  return parts.join(" · ");
}

// ============================================
// Aggregation
// ============================================

export interface PrepOrderLike {
  mealId: string;
  meal?: ({ name: string } & MealSubstitutionDefaultContext) | null;
  quantity: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  substitutions: unknown;
  modifiers: unknown;
  proteinBoost?: boolean;
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
  proteinBoost: boolean;
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

export function aggregatePrepByMeal(orders: PrepOrderLike[]): MealPrepSummary[] {
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

    if (!summary.has(order.mealId)) {
      summary.set(order.mealId, {
        mealId: order.mealId,
        mealName: order.meal?.name ?? "Unknown meal",
        totalQuantity: 0,
        assignedQuantity: 0,
        variationMap: new Map(),
      });
    }

    const entry = summary.get(order.mealId)!;
    entry.totalQuantity += order.quantity;

    if (
      order.settlementMethod === "MEAL_PLAN_CREDITS" &&
      (order.orderIntentId === null || order.orderIntentId === undefined)
    ) {
      entry.assignedQuantity += order.quantity;
    }

    const rawSubs = parseOrderSubstitutions(order.substitutions);
    const substitutions = effectiveSubstitutionsForPrepGrouping(
      rawSubs,
      order.meal,
    );
    const modifiers = parseOrderModifiers(order.modifiers);
    const proteinBoost = Boolean(order.proteinBoost);
    const note = (order.notes ?? "").trim();

    const configKey = canonicalPrepConfigKey({
      substitutions,
      modifiers,
      proteinBoost,
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
          proteinBoost,
          notes: note,
        }),
        substitutions,
        modifiers,
        proteinBoost,
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
    for (const sub of parseOrderSubstitutions(order.substitutions)) {
      const key = `${sub.groupName}: ${sub.optionName}`;
      substitutionDemand.set(key, (substitutionDemand.get(key) ?? 0) + q);
    }
    for (const mod of parseOrderModifiers(order.modifiers)) {
      for (const optionName of mod.optionNames) {
        const key = `${mod.groupName}: ${optionName}`;
        modifierDemand.set(key, (modifierDemand.get(key) ?? 0) + q);
      }
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

  return out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
