import { ANATOMICAL_SYSTEMS } from './anatomicalSystems';
import { ATLAS_VIEWS, isNodeAllowedInAtlasView, type AtlasView } from './atlasViews';
import { ATLAS_NAVIGATION_MENUS } from './atlasNavigation';
import { regionMenuForSystem } from './regionMenus';
import { getAdvancedNeuroanatomyGroups, advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { classifyNervousObject, type NervousGroup } from './nervousTaxonomy';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import { classifyMuscularObject } from './muscularTaxonomy';
import { classifyCardiovascularObject } from './cardiovascularTaxonomy';
import { classifyVisceraObject } from './visceraTaxonomy';
import { classifyAttachmentObject } from './attachmentTaxonomy';
import { classifyLymphaticObject } from './lymphaticTaxonomy';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup, isCranialSkeletalName } from './cranialNerveTaxonomy';
import { AUTONOMIC_GROUPS, autonomicPathForGroup } from './autonomicTaxonomy';
import { BRACHIAL_GROUPS, brachialPathForGroup } from './brachialPlexusTaxonomy';
import { LUMBOSACRAL_GROUPS, lumbosacralPathForGroup } from './lumbosacralPlexusTaxonomy';
import { LONG_TRACT_GROUPS, longTractPathForGroup } from './longTractTaxonomy';
import { SPINAL_NERVE_GROUP, SPINAL_TOPOGRAPHIC_GROUP, spinalCordPathForGroup } from './spinalCordAtlas';
import { THALAMUS_CAPSULE_GROUPS, thalamusCapsulePathForGroup } from './thalamusCapsuleTaxonomy';
import { TEMPORAL_ASSOCIATION_GROUPS, temporalAssociationPathForGroup } from './temporalAssociationTaxonomy';
import { BRAINSTEM_CEREBELLUM_GROUPS, brainstemCerebellumPathForGroup } from './brainstemCerebellumAtlas';
import { SKULL_BASE_GROUPS, skullBasePathForGroup, skullBaseSystemForNode } from './skullBaseTaxonomy';
import { headNeckTopographySystemForNode } from './headNeckTopography';
import { HEAD_TOPOGRAPHY_GROUPS, headTopographyCataloguePathForGroup } from './headTopography';
import { NECK_TOPOGRAPHY_GROUPS, neckTopographyCataloguePathForGroup, neckTopographySystemForNode } from './neckTopography';
import { UPPER_LIMB_TOPOGRAPHY_GROUPS, upperLimbCataloguePathForGroup, upperLimbSystemForNode } from './upperLimbRegionalAtlas';
import { LOWER_LIMB_TOPOGRAPHY_GROUPS, lowerLimbCataloguePathForGroup, lowerLimbSystemForNode } from './lowerLimbTopography';
import { MUSCULOSKELETAL_GROUPS, musculoskeletalPathForGroup } from './musculoskeletalTaxonomy';
import type { SceneNode } from '../types/sketchfab';

export type AnatomySearchDestination = {
  atlasId: string;
  atlasLabel: string;
  menuLabel: string;
  href: string;
  collections: string[];
};
type Resolver = (node: SceneNode, requested: readonly string[]) => readonly string[] | null;
type Menu = { groups: readonly NervousGroup[]; resolve: Resolver };
const specialized: Record<string, Menu> = {
  'cranial-nerves': { groups: CRANIAL_NERVE_GROUPS, resolve: cranialNervePathForGroup },
  'autonomic-nervous-system': { groups: AUTONOMIC_GROUPS, resolve: autonomicPathForGroup },
  'brachial-plexus': { groups: BRACHIAL_GROUPS, resolve: brachialPathForGroup },
  'lumbar-sacral-plexuses': { groups: LUMBOSACRAL_GROUPS, resolve: lumbosacralPathForGroup },
  'long-tracts': { groups: LONG_TRACT_GROUPS, resolve: longTractPathForGroup },
  'spinal-cord-anatomy': { groups: [SPINAL_TOPOGRAPHIC_GROUP, SPINAL_NERVE_GROUP, ...LONG_TRACT_GROUPS], resolve: spinalCordPathForGroup },
  'thalamus-internal-capsule': { groups: THALAMUS_CAPSULE_GROUPS, resolve: thalamusCapsulePathForGroup },
  'temporal-stem-sagittal-stratum': { groups: TEMPORAL_ASSOCIATION_GROUPS, resolve: temporalAssociationPathForGroup },
  'brainstem-and-cerebellum': { groups: BRAINSTEM_CEREBELLUM_GROUPS, resolve: brainstemCerebellumPathForGroup },
  'skull-base': { groups: SKULL_BASE_GROUPS, resolve: skullBasePathForGroup },
  'head-neck-topography': { groups: HEAD_TOPOGRAPHY_GROUPS, resolve: headTopographyCataloguePathForGroup },
  'neck-topography': { groups: NECK_TOPOGRAPHY_GROUPS, resolve: neckTopographyCataloguePathForGroup },
  'upper-limb-topography': { groups: UPPER_LIMB_TOPOGRAPHY_GROUPS, resolve: upperLimbCataloguePathForGroup },
  'lower-limb-topography': { groups: LOWER_LIMB_TOPOGRAPHY_GROUPS, resolve: lowerLimbCataloguePathForGroup },
  'musculoskeletal-system': { groups: MUSCULOSKELETAL_GROUPS, resolve: musculoskeletalPathForGroup },
};

/** Resolve every overlapping branch with the SAME membership functions as the
 * viewer. A permissive atlas-level scope alone is not evidence of membership. */
function collectionLabels(node: SceneNode, menu: Menu): string[] {
  const labels: string[] = [];
  function visit(group: NervousGroup, ancestors: readonly string[], parentPath: readonly string[]): boolean {
    const parts = group.id.split('/');
    const requested = parts.length > 1 ? parts : [...parentPath, ...parts];
    const resolved = menu.resolve(node, requested);
    if (!resolved || !requested.every((part, i) => resolved[i] === part)) return false;
    const breadcrumb = [...ancestors, group.label];
    const childMatches = group.children?.map(child => visit(child, breadcrumb, requested)) ?? [];
    if (!childMatches.some(Boolean)) labels.push(breadcrumb.join(' › '));
    return true;
  }
  for (const group of menu.groups) visit(group, [], []);
  return [...new Set(labels)];
}

function standardPath(node: SceneNode, view: AtlasView): readonly string[] | null {
  switch (node.systemId) {
    case 'nervous': return view.brainGrossAnatomy
      ? classifyBrainGrossAnatomy(node.rawName) : classifyNervousObject(node.rawName);
    case 'muscular': return classifyMuscularObject(node.rawName);
    case 'vascular': return classifyCardiovascularObject(node.rawName);
    case 'organs': return classifyVisceraObject(node.rawName);
    case 'attachments': return classifyAttachmentObject(node.rawName);
    case 'lymphatic': return classifyLymphaticObject(node.rawName);
    default: return null;
  }
}
function ordinaryCollections(node: SceneNode, view: AtlasView): string[] {
  const result: string[] = [];
  const standard = node.systemId && regionMenuForSystem(node.systemId, view.brainGrossAnatomy);
  if (standard) {
    const resolved = standardPath(node, view);
    result.push(...collectionLabels(node, { groups: standard.groups,
      resolve: (_n, requested) => resolved && requested.every((p, i) => resolved[i] === p) ? resolved : null }));
  }
  if (node.systemId === 'nervous') {
    const groups = getAdvancedNeuroanatomyGroups(view.brainGrossAnatomy)
      .filter(group => !view.excludedNeuroanatomyGroupIds?.includes(group.id.split('/').at(-1)!));
    result.push(...collectionLabels(node, { groups, resolve: advancedNeuroanatomyPathForGroup }));
  }
  if (!result.length && (view.id === 'full-anatomy' || node.systemId === 'skeletal')
    && (!view.systemIds || view.systemIds.includes(node.systemId!))) {
    const system = ANATOMICAL_SYSTEMS.find(item => item.id === node.systemId);
    if (system) result.push(system.label);
  }
  return [...new Set(result)];
}

export function anatomySearchDestinations(nodes: readonly SceneNode[]): AnatomySearchDestination[] {
  const destinations: AnatomySearchDestination[] = [];
  for (const view of ATLAS_VIEWS) {
    const memberships = new Set<string>();
    for (const source of nodes) {
      const node = view.lowerLimbTopography ? { ...source, systemId: lowerLimbSystemForNode(source) }
        : view.upperLimbTopography ? { ...source, systemId: upperLimbSystemForNode(source) }
        : view.neckTopography ? { ...source, systemId: neckTopographySystemForNode(source) }
        : view.headNeckTopography ? { ...source, systemId: headNeckTopographySystemForNode(source) }
        : view.skullBase ? { ...source, systemId: skullBaseSystemForNode(source) ?? source.systemId } : source;
      if (!isNodeAllowedInAtlasView(node, view)) continue;
      // Dedicated models only have local skeletal references. Their viewer
      // predicates operate on a live node map and deliberately accept unknown
      // source bones; that is not evidence that a hip/femur exists in a skull.
      if (node.systemId === 'skeletal' && ['skull-base', 'brain', 'central-nervous-system'].includes(view.id)
        && !isCranialSkeletalName(node.rawName)
        && !(view.id !== 'brain' && /vertebra c[1-7]|atlas \(c1\)|axis \(c2\)/i.test(node.rawName))) continue;
      const menu = specialized[view.id];
      for (const label of menu ? collectionLabels(node, menu) : ordinaryCollections(node, view)) memberships.add(label);
    }
    if (!memberships.size) continue;
    const nav = ATLAS_NAVIGATION_MENUS.find(menu => menu.views.some(item => item.id === view.id));
    destinations.push({
      atlasId: view.id, atlasLabel: view.label, menuLabel: nav?.label ?? view.label,
      href: view.href, collections: [...memberships].sort(),
    });
  }
  // Smaller focused atlases first; the computationally heavy full atlas is last.
  return destinations.sort((a, b) => Number(a.atlasId === 'full-anatomy') - Number(b.atlasId === 'full-anatomy'));
}
