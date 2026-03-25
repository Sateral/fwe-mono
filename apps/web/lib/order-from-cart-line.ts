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
  proteinBoost: boolean;
  notes: string;
} {
  const baseSubs = defaultSubstitutionSelection(meal);

  for (const s of line.substitutions ?? []) {
    let groupId = s.groupId;
    if (!groupId) {
      const g = meal.substitutionGroups.find((x) => x.name === s.groupName);
      groupId = g?.id;
    }
    let optionId = s.optionId;
    if (groupId && !optionId) {
      const g = meal.substitutionGroups.find((x) => x.id === groupId);
      const o = g?.options.find((x) => x.name === s.optionName);
      optionId = o?.id;
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
      groupId = g?.id;
    }
    if (!groupId) {
      continue;
    }
    const group = meal.modifierGroups.find((x) => x.id === groupId);
    if (!group) {
      continue;
    }

    let optionIds = m.optionIds?.length ? [...m.optionIds] : [];
    if (optionIds.length === 0 && m.optionNames?.length) {
      optionIds = m.optionNames
        .map((name) => group.options.find((o) => o.name === name)?.id)
        .filter(Boolean) as string[];
    }
    if (optionIds.length > 0) {
      selectedModifiers[groupId] = optionIds;
    }
  }

  return {
    quantity: line.quantity,
    selectedSubstitutions: baseSubs,
    selectedModifiers,
    proteinBoost: line.proteinBoost,
    notes: line.notes?.trim() ?? "",
  };
}
