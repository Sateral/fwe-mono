import type { ApiCartItem } from "@fwe/types";

/**
 * Human-readable bullets for cart rows so similar meals stay distinguishable.
 */
export function getCartLineSummaryLines(line: ApiCartItem): string[] {
  const lines: string[] = [];

  if (line.proteinBoost) {
    lines.push("Protein boost (+30%)");
  }

  for (const sub of line.substitutions ?? []) {
    const label = sub.groupName ? `${sub.groupName}: ${sub.optionName}` : sub.optionName;
    if (label.trim()) {
      lines.push(label);
    }
  }

  for (const mod of line.modifiers ?? []) {
    const names = mod.optionNames?.filter(Boolean).join(", ");
    if (!names) {
      continue;
    }
    const label = mod.groupName ? `${mod.groupName}: ${names}` : names;
    lines.push(label);
  }

  if (line.notes?.trim()) {
    lines.push(`Note: ${line.notes.trim()}`);
  }

  return lines;
}
