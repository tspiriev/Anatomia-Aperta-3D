import csv from '@assets/Final_Muscles_fused__1791343224663.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { NervousGroup } from './nervousTaxonomy';

const rows = [...csvRows(csv)];
const collections = rows.filter((row) => row[0] === 'COLLECTION');

// Preserve the creator's corrected hierarchy. Fasciae and bursae are part of
// this system, not forced into muscles or assigned by name-based guesses.
export const MUSCULAR_GROUPS: readonly NervousGroup[] = collections
  .filter((row) => row[2] === 'MUSCULAR SYSTEM')
  .map((row) => ({
    id: `muscular-${row[1].slice(0, 2)}`,
    label: row[1],
    children: collections.filter((child) => child[2] === row[1]).map((child) => ({
      id: child[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      label: child[1],
    })),
  }));

const pathByCollection = new Map<string, readonly string[]>();
for (const group of MUSCULAR_GROUPS) {
  pathByCollection.set(group.label, [group.id]);
  for (const child of group.children ?? []) {
    if (pathByCollection.has(child.label)) {
      throw new Error(`Muscular collection is ambiguous: ${child.label}`);
    }
    pathByCollection.set(child.label, [group.id, child.id]);
  }
}

const pathByObject = new Map<string, readonly string[]>();
for (const row of rows) {
  if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5]) || !row[4]) continue;
  const path = pathByCollection.get(row[1]);
  if (!path) continue;
  const key = row[4].trim().toLowerCase();
  const previous = pathByObject.get(key);
  if (previous && previous.join('/') !== path.join('/')) {
    throw new Error(`Muscular region is ambiguous for ${row[4]}`);
  }
  pathByObject.set(key, path);
}

// This exact duplicate is present in the older combined export. Do not strip
// arbitrary Blender .001 suffixes or infer assignments from anatomical keywords.
const legacyAliases = new Map([
  ['common tendinous ring.r.001', 'common tendinous ring.r'],
]);

export function classifyMuscularObject(rawName: string): readonly string[] | null {
  const key = rawName.trim().toLowerCase();
  const exportedKey = key.replace(/_\d+$/, '').trimEnd();
  const alias = legacyAliases.get(key) ?? legacyAliases.get(exportedKey);
  return pathByObject.get(key)
    ?? pathByObject.get(exportedKey)
    ?? (alias ? pathByObject.get(alias) : undefined)
    ?? null;
}
