// Exact legacy export duplicates absent from the newer regional CSV.
// Resolve only these verified identities, not arbitrary duplicate suffixes.
export const CARDIOVASCULAR_ALIASES: ReadonlyMap<string, string> = new Map([
  ['parietal branch middle meningeal artery.r.001', 'parietal branch middle meningeal artery.r'],
  ['parietal branch middle meningeal artery.l.001', 'parietal branch middle meningeal artery.l'],
  ['middle meningeal artery.r.002', 'middle meningeal artery.r'],
  ['frontal branch middle meningeal artery.r.001', 'frontal branch middle meningeal artery.r'],
  ['frontal branch middle meningeal artery.l.001', 'frontal branch middle meningeal artery.l'],
  // The creator identified the question-mark-labelled object as vena cardiaca
  // parva. Support the reported spelling and the eight-mark CSV spelling.
  ['??????', '????????'],
]);

export function cardiovascularObjectAlias(rawName: string): string | null {
  const key = rawName.trim().toLowerCase();
  return CARDIOVASCULAR_ALIASES.get(key)
    ?? CARDIOVASCULAR_ALIASES.get(key.replace(/_\d+$/, '').trimEnd())
    ?? null;
}
