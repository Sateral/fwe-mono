/**
 * Stable identity for cart lines so identical meal + customizations merge quantities.
 */

type SubKey = { groupId: string; optionId: string };
type ModKey = { groupId: string; optionId: string };

export function normalizeSubsForKey(
  raw: Array<{ groupId?: string | null; optionId?: string | null }>,
): SubKey[] {
  const out: SubKey[] = [];
  for (const entry of raw) {
    if (entry.groupId && entry.optionId) {
      out.push({
        groupId: entry.groupId,
        optionId: entry.optionId,
      });
    }
  }
  return out.sort((a, b) => a.groupId.localeCompare(b.groupId));
}

export function normalizeModsForKey(
  raw: Array<{ groupId?: string | null; optionId?: string | null }>,
): ModKey[] {
  const out: ModKey[] = [];
  for (const entry of raw) {
    if (entry.groupId && entry.optionId) {
      out.push({
        groupId: entry.groupId,
        optionId: entry.optionId,
      });
    }
  }
  return out.sort((a, b) => {
    const cmp = a.groupId.localeCompare(b.groupId);
    return cmp !== 0 ? cmp : a.optionId.localeCompare(b.optionId);
  });
}

export function cartLineFingerprint(params: {
  mealId: string;
  notes: string | null | undefined;
  substitutions: Array<{ groupId?: string | null; optionId?: string | null }>;
  modifiers: Array<{ groupId?: string | null; optionId?: string | null }>;
}): string {
  return JSON.stringify({
    mealId: params.mealId,
    notes: (params.notes ?? "").trim(),
    substitutions: normalizeSubsForKey(params.substitutions),
    modifiers: normalizeModsForKey(params.modifiers),
  });
}
