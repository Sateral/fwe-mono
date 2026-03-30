import type { ApiCartItem } from "@fwe/types";

import type { Meal } from "@/types";

function defaultSubstitutionSelection(meal: Meal): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const group of meal.substitutionGroups) {
    const defaultOption = group.options.find((o) => o.isDefault);
    if (defaultOption) {
      defaults[group.id] = defaultOption.id;
    } else if (group.options[0]) {
      defaults[group.id] = group.options[0].id;
    }
  }
  return defaults;
}

/**
 * Maps a saved cart line onto OrderBuilder state for the same meal.
 */
export function hydrateOrderBuilderFromCartLine(
  line: ApiCartItem,
  meal: Meal,
): {
  quantity: number;
  selectedSubstitutions: Record<string, string>;
  selectedModifiers: Record<string, string[]>;
  notes: string;
} {
  const baseSubs = defaultSubstitutionSelection(meal);

  for (const s of line.substitutions ?? []) {
    let groupId = s.groupId;
    if (!groupId) {
      const g = meal.substitutionGroups.find((x) => x.name === s.groupName);
      groupId = g?.id ?? null;
    }
    let optionId = s.optionId;
    if (groupId && !optionId) {
      const g = meal.substitutionGroups.find((x) => x.id === groupId);
      const o = g?.options.find((x) => x.name === s.optionName);
      optionId = o?.id ?? null;
    }
    if (groupId && optionId) {
      baseSubs[groupId] = optionId;
    }
  }

  const selectedModifiers: Record<string, string[]> = {};
  for (const m of line.modifiers ?? []) {
    let groupId = m.groupId;
    if (!groupId) {
      const g = meal.modifierGroups.find((x) => x.name === m.groupName);
      groupId = g?.id ?? null;
    }
    if (!groupId) {
      continue;
    }
    const group = meal.modifierGroups.find((x) => x.id === groupId);
    if (!group) {
      continue;
    }

    // Flat structure: each row has one optionId/optionName
    let optionId = m.optionId;
    if (!optionId && m.optionName) {
      optionId = group.options.find((o) => o.name === m.optionName)?.id ?? null;
    }
    if (optionId) {
      const existing = selectedModifiers[groupId] ?? [];
      existing.push(optionId);
      selectedModifiers[groupId] = existing;
    }
  }

  return {
    quantity: line.quantity,
    selectedSubstitutions: baseSubs,
    selectedModifiers,
    notes: line.notes?.trim() ?? "",
  };
}
