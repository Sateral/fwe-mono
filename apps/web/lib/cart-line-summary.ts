import type { ApiCartItem } from "@fwe/types";

/**
 * Human-readable bullets for cart rows so similar meals stay distinguishable.
 */
export function getCartLineSummaryLines(line: ApiCartItem): string[] {
  const lines: string[] = [];

  for (const sub of line.substitutions ?? []) {
    const label = sub.groupName ? `${sub.groupName}: ${sub.optionName}` : sub.optionName;
    if (label.trim()) {
      lines.push(label);
    }
  }

  // Modifiers are now flat: one row per option
  const modsByGroup = new Map<string, string[]>();
  for (const mod of line.modifiers ?? []) {
    if (!mod.optionName) continue;
    const existing = modsByGroup.get(mod.groupName) ?? [];
    existing.push(mod.optionName);
    modsByGroup.set(mod.groupName, existing);
  }
  for (const [groupName, optionNames] of modsByGroup) {
    const label = groupName ? `${groupName}: ${optionNames.join(", ")}` : optionNames.join(", ");
    lines.push(label);
  }

  if (line.notes?.trim()) {
    lines.push(`Note: ${line.notes.trim()}`);
  }

  return lines;
}
