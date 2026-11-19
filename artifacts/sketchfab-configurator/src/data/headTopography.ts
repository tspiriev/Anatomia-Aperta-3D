import {
  HEAD_NECK_TOPOGRAPHY_GROUPS, HEAD_NECK_TOPOGRAPHY_ROOT,
  headNeckTopographyPathForGroup, headNeckTopographyCataloguePathForGroup,
  HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES,
} from './headNeckTopography';
import { headNeckPetrosalSettings } from './headNeckPetrosalSettings';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

// Keep the reviewed source taxonomy intact for the future separate neck atlas.
// Promote the existing Head children without changing their membership paths.
export const HEAD_TOPOGRAPHY_GROUPS =
  HEAD_NECK_TOPOGRAPHY_GROUPS.find(group =>
    group.id === [...HEAD_NECK_TOPOGRAPHY_ROOT, 'head'].join('/'))!.children!.map(headGroup);

function headGroup(group: NervousGroup): NervousGroup {
  if (!group.children) return group;
  return { ...group, children: group.children.filter(child =>
    HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES.some(source =>
      headTopographyPathForGroup({ rawName: source.name }, child.id.split('/'))))
    .map(headGroup) };
}

function headRequest(requested: readonly string[]): readonly string[] | null {
  if (requested.length < HEAD_NECK_TOPOGRAPHY_ROOT.length
    || !HEAD_NECK_TOPOGRAPHY_ROOT.every((part, i) => requested[i] === part)
    || (requested[2] && requested[2] !== 'head')) return null;
  return requested.length === HEAD_NECK_TOPOGRAPHY_ROOT.length
    ? [...requested, 'head'] : requested;
}

export function headTopographyPathForGroup(node: Pick<SceneNode, 'rawName'>, requested: readonly string[]) {
  // The former parotid boundary included this whole cervical muscle.
  if (/sternocleidomastoid/i.test(node.rawName)) return null;
  const path = headRequest(requested);
  return path ? headNeckTopographyPathForGroup(node, path) : null;
}

export function headTopographyCataloguePathForGroup(node: Pick<SceneNode, 'rawName'>, requested: readonly string[]) {
  if (/sternocleidomastoid/i.test(node.rawName)) return null;
  const path = headRequest(requested);
  return path ? headNeckTopographyCataloguePathForGroup(node, path) : null;
}

export const isHeadTopographyNode = (node: Pick<SceneNode, 'rawName'>) =>
  headTopographyPathForGroup(node, HEAD_NECK_TOPOGRAPHY_ROOT) !== null;

/** Regional context must not restore the removed neck collections. */
export function headTopographySettings(nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[]) {
  return headNeckPetrosalSettings(nodes.filter(isHeadTopographyNode), ids, path);
}
