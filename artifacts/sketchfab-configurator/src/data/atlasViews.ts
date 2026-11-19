import type { SystemGroupId } from './anatomicalSystems';
import type { SceneNode } from '../types/sketchfab';
import { SKULL_BASE_MODEL_UID, isExcludedFromSkullBase } from './skullBaseTaxonomy';
import { isHeadTopographyNode } from './headTopography';
import { isNeckTopographyNode, NECK_TOPOGRAPHY_MODEL_UID } from './neckTopography';
import { isLowerLimbTopographyNode, LOWER_LIMB_TOPOGRAPHY_MODEL_UID } from './lowerLimbTopography';
import { isUpperLimbTopographyNode, UPPER_LIMB_TOPOGRAPHY_MODEL_UID } from './upperLimbRegionalAtlas';
import { classifyAdvancedNeuroanatomy } from './advancedNeuroanatomy';
import { classifyNervousObject } from './nervousTaxonomy';
import { isCranialSkeletalName, isCranialOrganName } from './cranialNerveTaxonomy';
import { trigeminalEarRole } from './trigeminalEar';
import { vagusContextSystem } from './vagusTargets';
import { isParasympatheticVisceralContextNode } from './parasympatheticVisceralContext';
import { sympatheticVertebralRegion, isParasympatheticBoneName } from './autonomicTaxonomy';
import { headNeckLandmarkSystem } from './headNeckAutonomicLandmarks';
import { plexusContextSystem, isAbdominalSympatheticVesselName } from './autonomicPlexusContext';
import { isEntericVisceralContextNode } from './entericVisceralContext';
import { isBrachialNode } from './brachialPlexusTaxonomy';
import { isLumbosacralNode } from './lumbosacralPlexusTaxonomy';
import { isLongTractNode } from './longTractTaxonomy';
import { isThalamusCapsuleNode } from './thalamusCapsuleTaxonomy';
import { isTemporalAssociationNode } from './temporalAssociationTaxonomy';
import { isBrainstemCerebellumNode } from './brainstemCerebellumAtlas';
import { MUSCULOSKELETAL_MODEL_UID, classifyMusculoskeletalNode } from './musculoskeletalTaxonomy';
import { SPINAL_ATLAS_HREF, SPINAL_REFERENCE_MODELS, spinalReferenceHref, isSpinalCordAtlasNode } from './spinalCordAtlas';

export type AtlasView = {
  id: string;
  label: string;
  href: string;
  description: string;
  resourceNotice?: string;
  modelUid: string;
  initialSystemId: SystemGroupId;
  systemIds?: readonly SystemGroupId[];
  showAdvancedCollections?: boolean;
  excludedNeuroanatomyGroupIds?: readonly string[];
  menuExcludedNeuroanatomyGroupIds?: readonly string[];
  brainGrossAnatomy?: boolean;
  cranialNerves?: boolean;
  autonomicNerves?: boolean;
  brachialPlexus?: boolean;
  lumbosacralPlexus?: boolean;
  longTracts?: boolean;
  thalamusCapsule?: boolean;
  temporalAssociation?: boolean;
  brainstemCerebellum?: boolean;
  skullBase?: boolean;
  /** Topographic head and neck atlas: strict source-backed regional scope. */
  headNeckTopography?: boolean;
  neckTopography?: boolean;
  upperLimbTopography?: boolean;
  lowerLimbTopography?: boolean;
  musculoskeletal?: boolean;
  spinalCord?: boolean;
  spinalReferenceModelUid?: string;
  preserveAnnotations?: boolean;
};

export const FULL_ANATOMY_VIEW: AtlasView = {
  id: 'full-anatomy',
  label: 'Full anatomy',
  href: '/atlas',
  description: 'The complete combined anatomy model',
  resourceNotice: 'High processing power and memory required. The full atlas may take time to load. For focused exploration, use the individual system menus.',
  modelUid: 'a7654718603c4cd58111b4dd52213d4a',
  initialSystemId: 'muscular',
};

export const CENTRAL_NERVOUS_SYSTEM_VIEW: AtlasView = {
  id: 'central-nervous-system',
  label: 'Central nervous system',
  href: '/atlas/central-nervous-system',
  description: 'Bones and nervous-system anatomy',
  modelUid: '3041be6d447e40f6bb8220e9999e16a9',
  initialSystemId: 'nervous',
  systemIds: ['skeletal', 'nervous'],
  showAdvancedCollections: true,
};

export const BRAIN_VIEW: AtlasView = {
  ...CENTRAL_NERVOUS_SYSTEM_VIEW,
  id: 'brain',
  label: 'Brain',
  href: '/atlas/brain',
  description: 'Focused brain anatomy with white matter, basal ganglia and diencephalon',
  modelUid: 'fe9c919b91c04fd8b2147106b07e5566',
  systemIds: ['nervous'],
  excludedNeuroanatomyGroupIds: ['spinal', 'spinal-cord'],
  // Hide the duplicate standalone collection, not the brainstem landmarks
  // needed by Brain gross anatomy, basal forebrain and shared pathways.
  menuExcludedNeuroanatomyGroupIds: ['spinal', 'spinal-cord', 'brainstem'],
  brainGrossAnatomy: true,
};

export const BRAINSTEM_CEREBELLUM_VIEW: AtlasView = {
  ...BRAIN_VIEW,
  modelUid: '7f0c31427e24481797eba7369bc4c505',
  id: 'brainstem-and-cerebellum',
  label: 'Brainstem and cerebellum',
  href: '/atlas/brainstem-and-cerebellum',
  description: 'Brainstem and cerebellar nuclei, white matter pathways and gross anatomy',
  brainGrossAnatomy: false,
  brainstemCerebellum: true,
  menuExcludedNeuroanatomyGroupIds: undefined,
};

export const CRANIAL_NERVES_VIEW: AtlasView = {
  ...BRAIN_VIEW,
  id: 'cranial-nerves',
  label: 'Cranial nerves',
  href: '/atlas/cranial-nerves',
  description: 'Cranial nerves I-XII with nuclei, brain context, and muscular endpoints',
  modelUid: '320acf193b8f484c88f4bac7624fed37',
  initialSystemId: 'nervous',
  systemIds: ['nervous', 'muscular', 'skeletal', 'vascular', 'organs'],
  excludedNeuroanatomyGroupIds: undefined,
  menuExcludedNeuroanatomyGroupIds: undefined,
  brainGrossAnatomy: false,
  showAdvancedCollections: false,
  cranialNerves: true,
};

export const AUTONOMIC_NERVOUS_SYSTEM_VIEW: AtlasView = {
  id: 'autonomic-nervous-system',
  label: 'Autonomic nervous system',
  href: '/atlas/autonomic-nervous-system',
  description: 'Sympathetic, parasympathetic, head and neck, visceral plexus, and enteric anatomy',
  modelUid: '2b5e229dd6994f67869e73d6e2466f29',
  initialSystemId: 'nervous',
  systemIds: ['nervous', 'skeletal', 'vascular', 'organs'],
  showAdvancedCollections: false,
  autonomicNerves: true,
};

export const BRACHIAL_PLEXUS_VIEW: AtlasView = {
  id: 'brachial-plexus',
  label: 'Brachial plexus',
  href: '/atlas/brachial-plexus',
  description: 'Whole-system overview, roots C5–T1, trunks, divisions, cords, terminal nerves and innervated muscles',
  modelUid: 'd327ffccd7464160badb73687e02eac6',
  initialSystemId: 'nervous',
  systemIds: ['nervous', 'muscular', 'skeletal'],
  showAdvancedCollections: false,
  brachialPlexus: true,
};

// Keep Full anatomy first. Additional targeted atlases extend this list.
export const LUMBOSACRAL_PLEXUS_VIEW: AtlasView = {
  id: 'lumbar-sacral-plexuses',
  label: 'Lumbar and sacral plexuses',
  href: '/atlas/lumbar-sacral-plexuses',
  description: 'Lumbar plexus L1–L4, sacral plexus L4–S4, lower limb nerves, cauda equina and supporting anatomy',
  modelUid: '95150214a50c40d78a845399448b7ccb',
  initialSystemId: 'nervous',
  systemIds: ['nervous', 'muscular', 'skeletal'],
  showAdvancedCollections: false,
  lumbosacralPlexus: true,
};

export const LONG_TRACTS_VIEW: AtlasView = {
  id: 'long-tracts',
  label: 'Long Tracts and Brainstem–Cerebellar Pathways',
  href: '/atlas/long-tracts',
  description: 'Descending motor, ascending sensory, cerebellar, vestibular and brainstem pathways',
  modelUid: '5b43a33add0f417384c10677fe117fc6',
  initialSystemId: 'nervous',
  systemIds: ['nervous'],
  showAdvancedCollections: false,
  longTracts: true,
};

export const THALAMUS_CAPSULE_VIEW: AtlasView = {
  id: 'thalamus-internal-capsule',
  label: 'Thalamus and internal capsule',
  href: '/atlas/thalamus-internal-capsule',
  description: 'Internal capsule subdivisions, thalamic nuclei and their available cortical projections',
  modelUid: '8abdb885c8c146068ca1c801a16f2b9f',
  initialSystemId: 'nervous',
  systemIds: ['nervous'],
  showAdvancedCollections: false,
  thalamusCapsule: true,
};

export const SPINAL_CORD_VIEW: AtlasView = {
  ...LONG_TRACTS_VIEW,
  id: 'spinal-cord-anatomy', label: 'Spinal cord anatomy', href: SPINAL_ATLAS_HREF,
  description: 'Axial spinal cord anatomy, spinal nerve roots, gray matter and complete long pathways',
  spinalCord: true,
};
export const SPINAL_REFERENCE_VIEWS: readonly AtlasView[] = SPINAL_REFERENCE_MODELS.map(model => ({
  ...SPINAL_CORD_VIEW, id: `spinal-cord-model-${model.uid}`, label: model.label,
  href: spinalReferenceHref(model.uid), modelUid: model.uid,
  longTracts: false, systemIds: undefined,
  spinalReferenceModelUid: model.uid, preserveAnnotations: true,
}));

export const TEMPORAL_ASSOCIATION_VIEW: AtlasView = {
  id: 'temporal-stem-sagittal-stratum',
  label: 'Temporal Stem, Sagittal Stratum and Association Fibers',
  href: '/atlas/temporal-stem-sagittal-stratum',
  description: 'Temporal stem fibers, sagittal stratum with adjacent ILF, and association fiber systems',
  modelUid: '79c954faa6284383902122319ecc136a',
  initialSystemId: 'nervous',
  systemIds: ['nervous'],
  showAdvancedCollections: false,
  temporalAssociation: true,
};

export const MUSCULOSKELETAL_VIEW: AtlasView = {
  id: 'musculoskeletal-system',
  label: 'Musculoskeletal system',
  href: '/atlas/musculoskeletal-system',
  description: 'Regional bones, articular structures, muscles, fasciae, bursae and optional muscle attachments',
  modelUid: MUSCULOSKELETAL_MODEL_UID,
  musculoskeletal: true,
  initialSystemId: 'muscular',
  systemIds: ['skeletal', 'muscular', 'attachments'],
};

export const SKULL_BASE_VIEW: AtlasView = {
  id: 'skull-base',
  label: 'Skull base',
  href: '/atlas/skull-base',
  description: 'Cranial fossae, temporal bone, skull-base vessels, petrosal nerves and autonomic ganglia',
  modelUid: SKULL_BASE_MODEL_UID,
  initialSystemId: 'nervous',
  systemIds: ['nervous', 'skeletal', 'muscular', 'vascular', 'organs', 'joints'],
  showAdvancedCollections: false,
  skullBase: true,
};

export const HEAD_NECK_TOPOGRAPHY_VIEW: AtlasView = {
  id: 'head-neck-topography',
  label: 'Head',
  href: '/atlas/head-neck',
  description: 'Topographic head anatomy: scalp and face, temporal and infratemporal regions, parotid region, orbit, nasal cavity, oral cavity and ear',
  modelUid: '29052deaffee44c0997dfbcfea4eb219',
  initialSystemId: 'nervous',
  systemIds: ['nervous', 'skeletal', 'muscular', 'vascular', 'organs', 'joints'],
  showAdvancedCollections: false,
  headNeckTopography: true,
};

export const UPPER_LIMB_TOPOGRAPHY_VIEW: AtlasView = {
  id: 'upper-limb-topography', label: 'Upper limb', href: '/atlas/upper-limb',
  description: 'Topographic upper limb anatomy: shoulder girdle, axilla, arm, elbow, forearm, wrist and hand',
  modelUid: UPPER_LIMB_TOPOGRAPHY_MODEL_UID, initialSystemId: 'nervous',
  systemIds: ['nervous', 'skeletal', 'muscular', 'vascular', 'joints'],
  showAdvancedCollections: false, upperLimbTopography: true,
};

export const LOWER_LIMB_TOPOGRAPHY_VIEW: AtlasView = {
  id: 'lower-limb-topography', label: 'Lower limb', href: '/atlas/lower-limb',
  description: 'Topographic lower limb anatomy: lumbar and pelvic region, hip, thigh, knee, leg, ankle and foot',
  modelUid: LOWER_LIMB_TOPOGRAPHY_MODEL_UID, initialSystemId: 'nervous',
  systemIds: ['nervous', 'skeletal', 'muscular', 'vascular', 'joints'],
  showAdvancedCollections: false, lowerLimbTopography: true,
};

export const NECK_TOPOGRAPHY_VIEW: AtlasView = {
  id: 'neck-topography', label: 'Neck', href: '/atlas/neck',
  description: 'Topographic neck anatomy: anterior and posterior triangles, deep neck, cervical plexus, brachial roots and trunks, foramen magnum and suboccipital region',
  modelUid: NECK_TOPOGRAPHY_MODEL_UID, initialSystemId: 'nervous',
  systemIds: ['nervous', 'skeletal', 'muscular', 'vascular', 'organs', 'joints'],
  showAdvancedCollections: false, neckTopography: true,
};

export const ATLAS_VIEWS: readonly AtlasView[] = [
  FULL_ANATOMY_VIEW,
  CENTRAL_NERVOUS_SYSTEM_VIEW,
  BRAIN_VIEW,
  BRAINSTEM_CEREBELLUM_VIEW,
  CRANIAL_NERVES_VIEW,
  AUTONOMIC_NERVOUS_SYSTEM_VIEW,
  BRACHIAL_PLEXUS_VIEW,
  LUMBOSACRAL_PLEXUS_VIEW,
  LONG_TRACTS_VIEW,
  SPINAL_CORD_VIEW,
  THALAMUS_CAPSULE_VIEW,
  TEMPORAL_ASSOCIATION_VIEW,
  MUSCULOSKELETAL_VIEW,
  SKULL_BASE_VIEW,
  HEAD_NECK_TOPOGRAPHY_VIEW,
  NECK_TOPOGRAPHY_VIEW,
  UPPER_LIMB_TOPOGRAPHY_VIEW,
  LOWER_LIMB_TOPOGRAPHY_VIEW,
];

export function filterAtlasGroups<T extends { id: string }>(
  groups: readonly T[], excludedIds?: readonly string[],
): T[] {
  return groups.filter((group) => !excludedIds?.includes(group.id.split('/').at(-1)!));
}

export const atlasMenuGroupExclusions = (view: AtlasView) =>
  view.menuExcludedNeuroanatomyGroupIds ?? view.excludedNeuroanatomyGroupIds;

export function isNodeAllowedInAtlasView(node: SceneNode, view: AtlasView): boolean {
  // Keep the dedicated source opening except explicitly excluded anatomy;
  // collection isolation below enforces precise cross-system scope.
  if (view.skullBase) return !isExcludedFromSkullBase(node.rawName);
  if (view.headNeckTopography) return isHeadTopographyNode(node);
  if (view.neckTopography) return isNeckTopographyNode(node);
  if (view.upperLimbTopography) return isUpperLimbTopographyNode(node);
  if (view.lowerLimbTopography) return isLowerLimbTopographyNode(node);
  if (view.spinalReferenceModelUid) return true;
  if (view.spinalCord) return isSpinalCordAtlasNode(node);
  if (view.id === MUSCULOSKELETAL_VIEW.id) return classifyMusculoskeletalNode(node.rawName).length > 0;
  if (view.temporalAssociation) return isTemporalAssociationNode(node);
  if (view.brainstemCerebellum) return isBrainstemCerebellumNode(node);
  if (view.thalamusCapsule) return isThalamusCapsuleNode(node);
  if (view.longTracts) return isLongTractNode(node);
  if (view.lumbosacralPlexus) return isLumbosacralNode(node);
  if (view.brachialPlexus) return isBrachialNode(node);
  // The existing atlas treats unmatched source objects as nervous-system
  // structures without guessing a more precise anatomical grouping.
  if (view.systemIds && !view.systemIds.includes(node.systemId ?? 'nervous')) return false;
  if (view.autonomicNerves && node.systemId === 'skeletal') {
    return sympatheticVertebralRegion(node.rawName) !== null || isParasympatheticBoneName(node.rawName);
  }
  if (view.autonomicNerves && (node.systemId === 'vascular' || node.systemId === 'organs')) {
    return headNeckLandmarkSystem(node.rawName) === node.systemId || plexusContextSystem(node.rawName) === node.systemId
      || (node.systemId === 'vascular' && isAbdominalSympatheticVesselName(node.rawName))
      || isParasympatheticVisceralContextNode(node)
      || isEntericVisceralContextNode(node);
  }
  if (view.cranialNerves && node.systemId === 'skeletal') return isCranialSkeletalName(node.rawName)
    || trigeminalEarRole(node.rawName) === 'middle-ear';
  if (view.cranialNerves && (node.systemId === 'vascular' || node.systemId === 'organs')) {
    return vagusContextSystem(node.rawName) === node.systemId
      || (node.systemId === 'organs' && (isCranialOrganName(node.rawName) || trigeminalEarRole(node.rawName) !== null));
  }
  if (!view.excludedNeuroanatomyGroupIds?.length) return true;
  // Resolve shared brain fibers before Standard anatomy's broad spinal labels.
  // A corticospinal brain segment is not the whole spinal-cord tract mesh.
  const advanced = classifyAdvancedNeuroanatomy(node.rawName);
  const groupId = advanced?.[1] ?? classifyNervousObject(node.rawName)?.[0];
  return !groupId || !view.excludedNeuroanatomyGroupIds.includes(groupId);
}
