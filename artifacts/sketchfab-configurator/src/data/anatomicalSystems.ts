import csv from '@assets/First_combinedblend_1790668070052.csv?raw';
import cardiovascularCsv from '@assets/Cardiovascular_system_final_1790945714118.csv?raw';
import attachmentCsv from '@assets/Skeletal_system_and_muscle_attachments_1791278212022.csv?raw';
import muscularCsv from '@assets/Final_Muscles_fused__1791343224663.csv?raw';
import lymphaticCsv from '@assets/Lymphoid_tissue_1791545390897.csv?raw';
import { cardiovascularObjectAlias } from './cardiovascularAliases';
import { classifyAdvancedNeuroanatomy } from './advancedNeuroanatomy';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import { systemOverrideForMeshName } from './anatomicalSystemOverrides';
import { isCranialMuscleName, isCranialSkeletalName, isCranialNervousName, isCranialOrganName } from './cranialNerveTaxonomy';
import { isAutonomicNervousName } from './autonomicTaxonomy';
import { brachialSystemForName } from './brachialPlexusTaxonomy';
import { lumbosacralSystemForName } from './lumbosacralPlexusTaxonomy';
import { headNeckLandmarkSystem } from './headNeckAutonomicLandmarks';
import { plexusContextSystem, isAbdominalSympatheticVesselName } from './autonomicPlexusContext';
import { isAssignedVisceralName } from './entericVisceralContext';
import { vagusContextSystem } from './vagusTargets';

export const ANATOMICAL_SYSTEMS = [
  { id: 'skeletal', label: 'Skeletal system' },
  { id: 'muscular', label: 'Muscular system' },
  { id: 'joints', label: 'Ligaments & joints' },
  { id: 'attachments', label: 'Muscle attachments' },
  { id: 'vascular', label: 'Vascular system' },
  { id: 'nervous', label: 'Nervous system' },
  { id: 'organs', label: 'Internal organs' },
  { id: 'lymphatic', label: 'Lymphatic system' },
] as const;

export type AnatomicalSystemId = (typeof ANATOMICAL_SYSTEMS)[number]['id'];
export type SystemGroupId = AnatomicalSystemId;

// These are the collection names exported from Blender, including the
// tendon/ligament attachment collection nested under Muscle attachments.
const SYSTEM_BY_COLLECTION: Record<string, AnatomicalSystemId> = {
  BONES: 'skeletal',
  CARTILAGE: 'skeletal',
  'Muscular system': 'muscular',
  'Joints and cartilage': 'joints',
  'Vascular system': 'vascular',
  'Nervous system': 'nervous',
  'Visceral organs': 'organs',
  MUSCLE_ATTACHMENTS: 'attachments',
  TENDON_LIGAMENT_ATTACHMENTS: 'attachments',
};

/** Read quoted CSV fields correctly, including commas and escaped quotes. */
export function* csvRows(contents: string): Generator<string[]> {
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < contents.length; i++) {
    const char = contents[i];
    if (char === '"') {
      if (quoted && contents[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if (char === '\n' && !quoted) {
      row.push(field.replace(/\r$/, ''));
      yield row;
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    yield row;
  }
}

const systemByObjectName = new Map<string, AnatomicalSystemId>();
for (const row of csvRows(csv)) {
  if (row[0] !== 'OBJECT') continue;
  const system = SYSTEM_BY_COLLECTION[row[1]];
  if (!system || !row[4]) continue;
  const key = row[4].trim().toLowerCase();
  const previous = systemByObjectName.get(key);
  if (previous && previous !== system) {
    throw new Error(`Anatomical system is ambiguous for ${row[4]}`);
  }
  systemByObjectName.set(key, system);
}

// The newer cardiovascular export explicitly includes meningeal arteries
// previously filed under Nervous system. Follow its updated assignments.
for (const row of csvRows(cardiovascularCsv)) {
  if (row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5]) && row[4]) {
    systemByObjectName.set(row[4].trim().toLowerCase(), 'vascular');
  }
}

// Refresh only attachment membership from the supplied skeletal export.
// Bones and cartilage keep their existing system assignments.
for (const row of csvRows(attachmentCsv)) {
  if (row[0] === 'OBJECT' && ['MUSCLE_ATTACHMENTS', 'TENDON_LIGAMENT_ATTACHMENTS'].includes(row[1])
    && ['MESH', 'CURVE'].includes(row[5]) && row[4]) {
    systemByObjectName.set(row[4].trim().toLowerCase(), 'attachments');
  }
}

// The final muscular export includes muscles, fasciae and bursae. Refresh only
// its explicitly exported objects, leaving other combined-model systems intact.
for (const row of csvRows(muscularCsv)) {
  if (row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5]) && row[4]) {
    systemByObjectName.set(row[4].trim().toLowerCase(), 'muscular');
  }
}

// The supplied lymphoid export includes nodes, spleen, thymus, and tonsils.
// Its generic "Collection" label is not used to classify unrelated objects.
for (const row of csvRows(lymphaticCsv)) {
  if (row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5]) && row[4]) {
    systemByObjectName.set(row[4].trim().toLowerCase(), 'lymphatic');
  }
}

/** Sketchfab can add a terminal _number to a Blender object name on export. */
export function systemForMeshName(rawName: string): AnatomicalSystemId | null {
  const key = rawName.trim().toLowerCase();
  const alias = cardiovascularObjectAlias(rawName);
  return systemOverrideForMeshName(rawName)
    ?? headNeckLandmarkSystem(rawName)
    ?? plexusContextSystem(rawName)
    ?? (isAbdominalSympatheticVesselName(rawName) ? 'vascular' : undefined)
    ?? (isAssignedVisceralName(rawName) ? 'organs' : undefined)
    ?? (isAutonomicNervousName(rawName) ? 'nervous' : undefined)
    ?? brachialSystemForName(rawName)
    ?? lumbosacralSystemForName(rawName)
    ?? systemByObjectName.get(key)
    ?? systemByObjectName.get(key.replace(/_\d+$/, '').trimEnd())
    ?? (alias ? systemByObjectName.get(alias) : undefined)
    ?? (isCranialMuscleName(rawName) ? 'muscular' : undefined)
    ?? (isCranialSkeletalName(rawName) ? 'skeletal' : undefined)
    ?? vagusContextSystem(rawName)
    ?? (isCranialOrganName(rawName) ? 'organs' : undefined)
    ?? (isCranialNervousName(rawName) ? 'nervous' : undefined)
    // Newer cleaned-CSV meshes (including somatosensory fibers) may be absent
    // from the original combined export. Recognize all explicitly mapped
    // Advanced anatomy, not just nuclei/brainstem/spinal structures.
    ?? (classifyAdvancedNeuroanatomy(rawName) || classifyBrainGrossAnatomy(rawName) ? 'nervous' : null);
}