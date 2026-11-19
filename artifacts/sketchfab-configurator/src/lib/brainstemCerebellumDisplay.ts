import { basalWholeBrainDisplay } from './basalWholeBrain';
import { cerebellarSurfacePart, CEREBELLAR_HEMISPHERES_NAME, CEREBELLAR_VERMIS_NAME } from '../data/brainstemCerebellumAtlas';
import type { SceneNode } from '../types/sketchfab';

export type CerebellarDisplayGroup = { name: string; memberIds: number[]; representativeId: number };
export function brainstemCerebellumDisplay(nodes: readonly SceneNode[], path: readonly string[]) {
  let displayed = [...nodes];
  const groups: CerebellarDisplayGroup[] = [];
  if (path[2] !== 'gross-anatomy') for (const [part, name] of [
    ['hemispheres', CEREBELLAR_HEMISPHERES_NAME], ['vermis', CEREBELLAR_VERMIS_NAME],
  ] as const) {
    const result = basalWholeBrainDisplay(displayed, true,
      node => cerebellarSurfacePart(node.rawName) === part, name, name);
    displayed = result.nodes;
    if (result.representativeId !== null) groups.push({
      name, memberIds: result.memberIds, representativeId: result.representativeId,
    });
  }
  return { nodes: displayed, groups };
}
export function expandCerebellarDisplayIds(ids: readonly number[], groups: readonly CerebellarDisplayGroup[]): number[] {
  return [...new Set(ids.flatMap(id => groups.find(g => g.memberIds.includes(id))?.memberIds ?? [id]))];
}
