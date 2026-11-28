import type { SceneNode } from '../types/sketchfab';
import { isBasalForebrainContext, WHOLE_BRAIN_CONTEXT_NAME } from '../data/basalForebrainTaxonomy';

export function basalWholeBrainDisplay(
  nodes: readonly SceneNode[],
  active: boolean,
  isContext = isBasalForebrainContext,
  displayName = WHOLE_BRAIN_CONTEXT_NAME,
  rawName = WHOLE_BRAIN_CONTEXT_NAME,
) {
  const members = active ? nodes.filter(isContext) : [];
  const memberIds = members.map(node => node.instanceID);
  const representative = members[0];
  if (!representative) return { nodes: [...nodes], memberIds, representativeId: null };
  const memberSet = new Set(memberIds);
  const wholeBrain: SceneNode = {
    ...representative,
    name: displayName,
    rawName,
    visible: members.some(node => node.visible),
  };
  return {
    nodes: [...nodes.filter(node => !memberSet.has(node.instanceID)), wholeBrain],
    memberIds, representativeId: representative.instanceID,
  };
}

export function expandWholeBrainIds(ids: readonly number[], memberIds: readonly number[]): number[] {
  const members = new Set(memberIds);
  return [...new Set(ids.flatMap(id => members.has(id) ? [...memberIds] : [id]))];
}
