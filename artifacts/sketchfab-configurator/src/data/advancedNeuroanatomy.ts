import type { NervousGroup } from './nervousTaxonomy';
import { classifyNervousObject } from './nervousTaxonomy';
import { DIENCEPHALON_GROUP, classifyDiencephalonObject } from './diencephalonTaxonomy';
import { BRAINSTEM_GROUP, classifyBrainstemObject } from './brainstemTaxonomy';
import { brainstemCerebellumPathForGroup } from './brainstemCerebellumAtlas';
import { SPINAL_CORD_GROUP, classifySpinalCordObject } from './spinalCordTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import fiberMemberships from './advancedFiberMemberships.json';
import somatosensoryMemberships from './somatosensoryFiberMemberships.json';
import { brainGrossAnatomyPathForNode } from './brainGrossAnatomy';
import { MENINGES_GROUP, classifyMeningesObject } from './meningesTaxonomy';
import { LIMBIC_GROUP, classifyLimbicObject, limbicPathForGroup } from './limbicTaxonomy';
import { BASAL_FOREBRAIN_GROUP, BASAL_FOREBRAIN_FIBER_GROUP, classifyBasalForebrainFiber, classifyBasalForebrainObject, basalForebrainPathForGroup, WHOLE_BRAIN_CONTEXT_NAME } from './basalForebrainTaxonomy';
import { VENTRICULAR_GROUP, classifyVentricularObject, ventricularPathForGroup } from './ventricularTaxonomy';
import { cranialNervePathForGroup } from './cranialNerveTaxonomy';
import { autonomicPathForGroup } from './autonomicTaxonomy';
import { brachialPathForGroup } from './brachialPlexusTaxonomy';
import { lumbosacralPathForGroup } from './lumbosacralPlexusTaxonomy';
import { thalamusCapsulePathForGroup } from './thalamusCapsuleTaxonomy';
import { temporalAssociationPathForGroup } from './temporalAssociationTaxonomy';
import { longTractPathForGroup } from './longTractTaxonomy';
import { whiteMatterSupplementPath, withWhiteMatterContext } from './whiteMatterContext';
import { skullBasePathForGroup } from './skullBaseTaxonomy';
import { WHITE_MATTER_FIBER_GROUPS, whiteMatterFiberPath } from './whiteMatterFiberTaxonomy';
import { neckTopographyPathForGroup } from './neckTopography';
import { lowerLimbPathForGroup } from './lowerLimbTopography';

export type NeuroanatomyMode = 'standard' | 'advanced';
export const ADVANCED_NEUROANATOMY_ROOT = 'advanced-neuroanatomy';

// Custom collection memberships follow the supplied Nervous_system_CLean CSV,
// including descendant collections. They are not a corrected anatomical
// classification and do not change the standard anatomy taxonomy.
const tractDefinitions = [
  {
    id: 'association',
    label: 'Association fibers',
    names: fiberMemberships.association,
  },
  {
    id: 'projection',
    label: 'Projection fibers',
    names: fiberMemberships.projection,
  },
  {
    id: 'commissural',
    label: 'Commissural fibers',
    names: fiberMemberships.commissural,
  },
  {
    id: 'ascending-brainstem',
    label: 'Ascending fibers from brainstem',
    names: fiberMemberships['ascending-brainstem'],
  },
  {
    id: 'thalamic',
    label: 'Thalamic fibers',
    names: fiberMemberships.thalamic,
  },
] as const;

export function normalizeTractName(rawName: string): string {
  return rawName.trim().toLowerCase()
    .replace(/\.+$/, '')
    // Remove export/duplicate IDs, even before a laterality suffix, but keep
    // .l/.r: a whole spinal tract is not its sided brainstem segment.
    .replace(/(?:\.+\d+\.*|_\d+)(?=(?:\.+[lr]\.*)?(?:\.+\d+\.*|_\d+)*$)/g, '')
    .replace(/\.+([lr])$/, '.$1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

const tractPaths = new Map<string, readonly string[]>();
// CSV: Sensory tract / Sensory tract left are descendants of Projection fibers.
const somatosensoryNames = new Set(somatosensoryMemberships.map(normalizeTractName));
for (const group of tractDefinitions) {
  for (const name of group.names) {
    const normalized = normalizeTractName(name);
    if (tractPaths.has(normalized)) throw new Error(`Duplicate tract assignment: ${name}`);
    const path = whiteMatterFiberPath(group.id, normalized);
    if (!path) throw new Error(`Missing white matter subdivision for CSV object: ${name}`);
    tractPaths.set(normalized, path);
  }
}

const basalFiberSource = BASAL_FOREBRAIN_FIBER_GROUP;
function whiteMatterBasalGroup(group: NervousGroup): NervousGroup {
  return {
    ...group,
    id: group.id.replace(`${ADVANCED_NEUROANATOMY_ROOT}/basal-forebrain/white-matter`,
      `${ADVANCED_NEUROANATOMY_ROOT}/white-matter/basal-forebrain`),
    ...(group.children ? { children: group.children.map(whiteMatterBasalGroup) } : {}),
  };
}

export const ADVANCED_NEUROANATOMY_GROUPS: readonly NervousGroup[] = [
  withWhiteMatterContext({
    id: `${ADVANCED_NEUROANATOMY_ROOT}/white-matter`,
    label: 'White matter fibers',
    children: [...WHITE_MATTER_FIBER_GROUPS,
    { ...whiteMatterBasalGroup(basalFiberSource), label: 'Basal forebrain fibers' },
    { id: `${ADVANCED_NEUROANATOMY_ROOT}/white-matter/serotonergic`, label: 'Serotonergic fibers',
      children: [{ id: `${ADVANCED_NEUROANATOMY_ROOT}/white-matter/serotonergic/medial-forebrain-bundle`,
        label: 'Medial forebrain bundle — serotonergic fibers' }] }],
  }),
  DIENCEPHALON_GROUP,
  BRAINSTEM_GROUP,
  SPINAL_CORD_GROUP,
];

export function classifyAdvancedNeuroanatomy(rawName: string): readonly string[] | null {
  return tractPaths.get(normalizeTractName(rawName)) ?? classifyDiencephalonObject(rawName)
    ?? classifyBrainstemObject(rawName) ?? classifySpinalCordObject(rawName) ?? classifyMeningesObject(rawName)
    ?? classifyLimbicObject(rawName) ?? classifyBasalForebrainObject(rawName) ?? classifyVentricularObject(rawName);
}

export function getAdvancedNeuroanatomyGroups(includeBrainCollections = false): readonly NervousGroup[] {
  return includeBrainCollections ? [MENINGES_GROUP, LIMBIC_GROUP, BASAL_FOREBRAIN_GROUP, VENTRICULAR_GROUP, ...ADVANCED_NEUROANATOMY_GROUPS] : ADVANCED_NEUROANATOMY_GROUPS;
}

// Standard classifications supply names for anatomy outside the advanced
// collections. Advanced isolation also hides unknown meshes (see its planner).
export function advancedNeuroanatomyPathForNode(node: SceneNode): readonly string[] | null {
  if (node.systemId !== 'nervous') return null;
  if (node.rawName === WHOLE_BRAIN_CONTEXT_NAME) return basalForebrainPathForGroup(node.rawName);
  return classifyAdvancedNeuroanatomy(node.rawName) ?? classifyNervousObject(node.rawName);
}

// Shared anatomy remains accessible in its existing collections. Use the
// brainstem/spinal path when browsing or isolating that branch, not the legacy fiber
// or basal-ganglia path. Other known nervous anatomy still participates in
// isolation. Unknown and out-of-system structures are excluded by the planner.
export function advancedNeuroanatomyPathForGroup(node: SceneNode, groupPath: readonly string[]): readonly string[] | null {
  if (groupPath[1] === 'neck-topography') return neckTopographyPathForGroup(node, groupPath);
  if (groupPath[1] === 'lower-limb-topography') return lowerLimbPathForGroup(node, groupPath);
  if (groupPath[1] === 'skull-base') return skullBasePathForGroup(node, groupPath);
  if (groupPath[1] === 'cranial-nerves') return cranialNervePathForGroup(node, groupPath);
  if (groupPath[1] === 'brainstem-and-cerebellum') return brainstemCerebellumPathForGroup(node, groupPath);
  if (groupPath[1] === 'autonomic-nervous-system') return autonomicPathForGroup(node, groupPath);
  if (groupPath[1] === 'brachial-plexus') return brachialPathForGroup(node, groupPath);
  if (groupPath[1] === 'lumbar-sacral-plexuses') return lumbosacralPathForGroup(node, groupPath);
  if (groupPath[1] === 'long-tracts') return longTractPathForGroup(node, groupPath);
  if (groupPath[1] === 'thalamus-internal-capsule') return thalamusCapsulePathForGroup(node, groupPath);
  if (groupPath[1] === 'temporal-stem-sagittal-stratum') return temporalAssociationPathForGroup(node, groupPath);
  if (node.systemId !== 'nervous') return null;
  if (groupPath[0] === ADVANCED_NEUROANATOMY_ROOT && groupPath[1] === 'ventricular-system') {
    return ventricularPathForGroup(node.rawName);
  }
  if (groupPath[0] === ADVANCED_NEUROANATOMY_ROOT && groupPath[1] === 'basal-forebrain') {
    return basalForebrainPathForGroup(node.rawName);
  }
  if (groupPath[0] === ADVANCED_NEUROANATOMY_ROOT && groupPath[1] === 'limbic-system') {
    return limbicPathForGroup(node.rawName, groupPath);
  }
  if (groupPath[0] === ADVANCED_NEUROANATOMY_ROOT && groupPath[1] === 'brain-gross-anatomy') {
    return brainGrossAnatomyPathForNode(node, groupPath);
  }
  if (groupPath[0] === ADVANCED_NEUROANATOMY_ROOT && groupPath[1] === 'white-matter') {
    const supplement = whiteMatterSupplementPath(node, groupPath);
    if (supplement) return supplement;
    const basalPath = classifyBasalForebrainFiber(node.rawName);
    if (basalPath?.[2] === 'white-matter') {
      if (groupPath[2] === 'serotonergic') {
        return basalPath.at(-1) === 'serotonin'
          ? [ADVANCED_NEUROANATOMY_ROOT, 'white-matter', 'serotonergic', 'medial-forebrain-bundle'] : null;
      }
      if (groupPath.length === 2 || groupPath[2] === 'basal-forebrain') {
        return [ADVANCED_NEUROANATOMY_ROOT, 'white-matter', 'basal-forebrain', ...basalPath.slice(3)];
      }
    }
  }
  // Expose the requested peer-level menu without removing the CSV's existing
  // Projection membership or duplicating meshes in White matter isolation.
  if (groupPath[0] === ADVANCED_NEUROANATOMY_ROOT && groupPath[1] === 'white-matter'
    && groupPath[2] === 'somatosensory' && somatosensoryNames.has(normalizeTractName(node.rawName))) {
    return whiteMatterFiberPath('somatosensory', normalizeTractName(node.rawName));
  }
  if (groupPath[0] === ADVANCED_NEUROANATOMY_ROOT && groupPath[1] === 'brainstem') {
    return classifyBrainstemObject(node.rawName) ?? advancedNeuroanatomyPathForNode(node);
  }
  if (groupPath[0] === ADVANCED_NEUROANATOMY_ROOT && groupPath[1] === 'spinal-cord') {
    return classifySpinalCordObject(node.rawName) ?? advancedNeuroanatomyPathForNode(node);
  }
  return advancedNeuroanatomyPathForNode(node);
}

