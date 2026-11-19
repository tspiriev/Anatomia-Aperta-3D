import type { SceneNode } from '../types/sketchfab';
import type { SystemGroupId } from '../data/anatomicalSystems';
import { isUpperLimbHandWristBoneContext } from '../data/upperLimbRegionalAtlas';
import { ADVANCED_NEUROANATOMY_ROOT, advancedNeuroanatomyPathForGroup } from '../data/advancedNeuroanatomy';
import { isBasalForebrainContext } from '../data/basalForebrainTaxonomy';
import { isWhiteMatterRetainedContext } from '../data/whiteMatterContext';
import { cranialNervePathForGroup, isCranialNerveRetainedContextPath } from '../data/cranialNerveTaxonomy';
import { isHeadNeckRetainedContextNode } from '../data/headNeckAutonomicLandmarks';
import { isPlexusVertebralName } from '../data/autonomicPlexusContext';
import { isBrachialOverviewRetainedContext, isBrachialRootsRetainedContext } from '../data/brachialOverview';
import { isBrachialTrunkRetainedContext, isBrachialDivisionRetainedContext, isBrachialCordRetainedContext, isBrachialTerminalRetainedContext } from '../data/brachialPlexusTaxonomy';
import { isLumbosacralPlexusRetainedContext } from '../data/lumbosacralPlexusTaxonomy';
import { isLongTractRetainedContext } from '../data/longTractTaxonomy';
import { isSpinalRootWhiteMatterContext } from '../data/spinalCordAtlas';
import { isTemporalBrainContextPath, isTemporalBrainContext, isTemporalLobePath, isTemporalBrainstemContext } from '../data/temporalAssociationTaxonomy';
import { isSkullBaseVascularContext } from '../data/skullBaseVascularContext';
import { isBrainstemRetainedContext } from '../data/brainstemTaxonomy';
import { isBrainstemCerebellumRetained } from '../data/brainstemCerebellumAtlas';
import { isPetrosalAutonomicContext, isPetrosalIIICompanion, isPetrosalVIICompanion } from '../data/skullBasePetrosalAutonomic';

function isRetainedContext(node: SceneNode, path: readonly string[]): boolean {
  if (isUpperLimbHandWristBoneContext(node, path)) return true;
  if (isBrainstemCerebellumRetained(node, path)) return true;
  if (isPetrosalAutonomicContext(node, path) || isPetrosalIIICompanion(node, path)
    || isPetrosalVIICompanion(node, path)) return true;
  if (isBrainstemRetainedContext(node, path)) return true;
  if (isSkullBaseVascularContext(node, path)) return true;
  if (isWhiteMatterRetainedContext(node, path)) return true;
  if (isSpinalRootWhiteMatterContext(node, path)) return true;
  if (isTemporalBrainContextPath(path) && isTemporalBrainContext(node)) return true;
  if (isTemporalLobePath(path) && isTemporalBrainstemContext(node)) return true;
  if (isLongTractRetainedContext(node, path)) return true;
  if (isLumbosacralPlexusRetainedContext(node, path)) return true;
  if (isBrachialDivisionRetainedContext(node, path)) return true;
  if (isBrachialCordRetainedContext(node, path)) return true;
  if (isBrachialTerminalRetainedContext(node, path)) return true;
  if (isBrachialTrunkRetainedContext(node, path)) return true;
  if (isBrachialOverviewRetainedContext(node, path)) return true;
  if (isBrachialRootsRetainedContext(node, path)) return true;
  if (path[0] === ADVANCED_NEUROANATOMY_ROOT && path[1] === 'autonomic-nervous-system' && path[2] === 'plexuses') {
    return (!node.systemId || node.systemId === 'skeletal') && isPlexusVertebralName(node.rawName);
  }
  if (path[0] === ADVANCED_NEUROANATOMY_ROOT && path[1] === 'autonomic-nervous-system' && path[2] === 'head-neck') {
    return isHeadNeckRetainedContextNode(node);
  }
  if (path[1] === 'cranial-nerves') return !isCranialNerveRetainedContextPath(path)
    && isCranialNerveRetainedContextPath(cranialNervePathForGroup(node, path));
  return path[0] === ADVANCED_NEUROANATOMY_ROOT && ['basal-forebrain', 'ventricular-system'].includes(path[1])
    && path[2] !== 'context' && isBasalForebrainContext(node);
}

// Structure focus is nested inside the current collection view. A previous-view
// action must unwind only the innermost level, leaving the collection snapshot.
export function restorePreviousIsolation(
  hasStructureIsolation: boolean,
  restoreStructure: () => void,
  restoreCollection: () => void,
): void {
  if (hasStructureIsolation) restoreStructure();
  else restoreCollection();
}

// Selection must use the same collection context as isolation. Standard paths
// cannot determine membership in Advanced groups, especially shared structures.
export function isNodeInRegion(
  node: SceneNode,
  groupPath: readonly string[],
  standardPathForNode: (node: SceneNode) => readonly string[] | null,
): boolean {
  if (isRetainedContext(node, groupPath)) return true;
  const path = groupPath[0] === ADVANCED_NEUROANATOMY_ROOT
    ? advancedNeuroanatomyPathForGroup(node, groupPath)
    : standardPathForNode(node);
  return path !== null && groupPath.every((part, index) => path[index] === part);
}

export type RegionIsolationSnapshot<TCamera> = {
  path: readonly string[];
  visibility: Map<number, boolean>;
  camera: TCamera;
  parent?: RegionIsolationSnapshot<TCamera> | null;
};

/** Capture the current composition, not the original all-model snapshot. */
export function captureRegionIsolation<TCamera>(
  nodes: readonly SceneNode[], path: readonly string[], camera: TCamera,
  parent: RegionIsolationSnapshot<TCamera> | null,
): RegionIsolationSnapshot<TCamera> {
  return {
    path: [...path], visibility: new Map(nodes.map(node => [node.instanceID, node.visible])),
    camera, parent,
  };
}

export function planRegionIsolation(
  nodes: readonly SceneNode[],
  systemId: SystemGroupId,
  groupPath: readonly string[],
  pathForNode: (node: SceneNode) => readonly string[] | null,
  allowRetainedContext: (node: SceneNode) => boolean = () => true,
) {
  // Advanced CNS isolation means only this collection. Preserve a complete
  // snapshot so restoring also recovers unknown meshes and other systems.
  const musculoskeletal = groupPath[0] === 'musculoskeletal-system';
  const strict = musculoskeletal || (systemId === 'nervous' && groupPath[0] === ADVANCED_NEUROANATOMY_ROOT);
  const classified = nodes
    .filter((node) => strict || node.systemId === systemId)
    .map((node) => ({ node, path: musculoskeletal || node.systemId === systemId
        || (strict && ['skull-base', 'head-neck-topography', 'neck-topography', 'upper-limb-topography', 'lower-limb-topography', 'cranial-nerves', 'autonomic-nervous-system', 'brachial-plexus', 'lumbar-sacral-plexuses', 'long-tracts', 'thalamus-internal-capsule'].includes(groupPath[1])) ? pathForNode(node) : null }));
  // Cardiovascular and attachment isolation must not leave unmatched geometry
  // visible everywhere. Advanced CNS collections likewise exclude all
  // nonmembers; standard anatomy keeps its conservative unmatched policy.
  const affected = classified.filter(({ path }) =>
    strict || systemId === 'vascular' || systemId === 'attachments' || path !== null);
  const members = affected.filter(({ path }) =>
    path !== null && groupPath.every((part, index) => path[index] === part));
  if (!members.length) return null;
  const memberIds = new Set(members.map(({ node }) => node.instanceID));
  // Context belongs in the scene and selection scope, not in nucleus/fiber
  // menu membership or its Hide/Show action.
  for (const { node } of affected)
    if (allowRetainedContext(node) && isRetainedContext(node, groupPath)) memberIds.add(node.instanceID);
  return {
    affected: affected.map(({ node }) => node),
    show: [...memberIds],
    hide: affected.filter(({ node }) => !memberIds.has(node.instanceID)).map(({ node }) => node.instanceID),
  };
}