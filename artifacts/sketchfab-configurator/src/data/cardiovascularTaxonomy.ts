import csv from '@assets/Cardiovascular_system_final_1790945714118.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { NervousGroup } from './nervousTaxonomy';
import { reviewedCardiovascularPath } from './cardiovascularCorrections';
import { cardiovascularObjectAlias } from './cardiovascularAliases';

const rows = [...csvRows(csv)];

// Navigation regions come from the declared hierarchy. Reviewed corrections
// fix misplaced anatomy; explicit creator-approved placements cover objects
// exported outside it.
export const CARDIOVASCULAR_GROUPS: readonly NervousGroup[] = rows
  .filter((row) => row[0] === 'COLLECTION' && row[2] === 'CARDIOVASCULAR SYSTEM')
  .map((row) => ({
    id: `cardiovascular-${row[1].slice(0, 2)}`,
    label: row[1],
  }));

const pathByCollection = new Map(
  CARDIOVASCULAR_GROUPS.map((group) => [group.label, [group.id] as readonly string[]]),
);
// Creator-approved placements for these exact exported objects. Keep the
// original names (including spelling) and collection provenance; never infer
// regional assignments from partial anatomical keywords.
const reviewedPlacements: readonly (readonly [string, string, string])[] = [
  ['Collection 1', 'HCS_RV_Purkinje_05', '01 Heart & Great Vessels'],
  ['Collection 1', 'HCS_LV_Purkinje_04', '01 Heart & Great Vessels'],
  ['Basilar venous plexus', 'Anterior_Intercavernous_Sinus', '02 Brain Vessels'],
  ['Basilar venous plexus', 'Basilar venous plexus clivus', '02 Brain Vessels'],
  ['Basilar venous plexus', 'Cavernous_Sinus_L', '02 Brain Vessels'],
  ['Basilar venous plexus', 'Cavernous_Sinus_R', '02 Brain Vessels'],
  ['Basilar venous plexus', 'FJ5120_BP28747_FMA52210_Right marginal sinus', '02 Brain Vessels'],
  ['Basilar venous plexus', 'Posterior_Intercavernous_Sinus', '02 Brain Vessels'],
  ['Basilar venous plexus', 'Sphenoid venous plexus', '02 Brain Vessels'],
  ['Basilar venous plexus', 'Cervical vertebral venous pleus', '04 Cervical Vessels'],
  ['Basilar venous plexus', 'Thoracic vertebral venosu plexus', '05 Thoracic Vessels'],
  ['Basilar venous plexus', 'Lumbar vertebral venous plexus', '06 Abdominal Vessels'],
];
const pathByObject = new Map<string, readonly string[]>();
for (const row of rows) {
  if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5]) || !row[4]) continue;
  const path = reviewedCardiovascularPath(row[4], pathByCollection.get(row[1]) ?? null);
  if (!path) continue;
  const key = row[4].trim().toLowerCase();
  const previous = pathByObject.get(key);
  if (previous && previous.join('/') !== path.join('/')) {
    throw new Error(`Cardiovascular region is ambiguous for ${row[4]}`);
  }
  pathByObject.set(key, path);
}

for (const [collection, rawName, region] of reviewedPlacements) {
  const exported = rows.some((row) =>
    row[0] === 'OBJECT' && row[1] === collection && row[4] === rawName
    && ['MESH', 'CURVE'].includes(row[5]));
  const path = pathByCollection.get(region);
  if (!exported || !path) {
    throw new Error(`Reviewed cardiovascular placement no longer matches the export: ${rawName}`);
  }
  const key = rawName.trim().toLowerCase();
  const previous = pathByObject.get(key);
  if (previous && previous.join('/') !== path.join('/')) {
    throw new Error(`Reviewed cardiovascular placement conflicts with existing corrections: ${rawName}`);
  }
  pathByObject.set(key, path);
}

/** Match exported curves as well as meshes, when present in the live viewer. */
export function classifyCardiovascularObject(rawName: string): readonly string[] | null {
  const key = rawName.trim().toLowerCase();
  const alias = cardiovascularObjectAlias(rawName);
  return pathByObject.get(key)
    ?? pathByObject.get(key.replace(/_\d+$/, '').trimEnd())
    ?? (alias ? pathByObject.get(alias) : undefined)
    ?? null;
}