/**
 * Stable identity for cart lines so identical meal + customizations merge quantities.
 */

type SubKey = { groupId: string; optionId: string };
type ModKey = { groupId: string; optionIds: string[] };

export function normalizeSubsForKey(raw: unknown): SubKey[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: SubKey[] = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === "object" &&
      "groupId" in entry &&
      "optionId" in entry &&
      typeof (entry as { groupId: unknown }).groupId === "string" &&
      typeof (entry as { optionId: unknown }).optionId === "string"
    ) {
      out.push({
        groupId: (entry as { groupId: string }).groupId,
        optionId: (entry as { optionId: string }).optionId,
      });
    }
  }
  return out.sort((a, b) => a.groupId.localeCompare(b.groupId));
}

export function normalizeModsForKey(raw: unknown): ModKey[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ModKey[] = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === "object" &&
      "groupId" in entry &&
      "optionIds" in entry &&
      typeof (entry as { groupId: unknown }).groupId === "string" &&
      Array.isArray((entry as { optionIds: unknown }).optionIds)
    ) {
      const optionIds = [...(entry as { optionIds: string[] }).optionIds].sort();
      out.push({
        groupId: (entry as { groupId: string }).groupId,
        optionIds,
      });
    }
  }
  return out.sort((a, b) => a.groupId.localeCompare(b.groupId));
}

export function cartLineFingerprint(params: {
  mealId: string;
  proteinBoost: boolean;
  notes: string | null | undefined;
  substitutions: unknown;
  modifiers: unknown;
}): string {
  return JSON.stringify({
    mealId: params.mealId,
    proteinBoost: params.proteinBoost,
    notes: (params.notes ?? "").trim(),
    substitutions: normalizeSubsForKey(params.substitutions),
    modifiers: normalizeModsForKey(params.modifiers),
  });
}
