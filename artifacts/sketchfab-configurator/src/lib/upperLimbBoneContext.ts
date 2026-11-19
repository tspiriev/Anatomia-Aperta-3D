import { UPPER_LIMB_TOPOGRAPHY_MODEL_UID, UPPER_LIMB_TOPOGRAPHY_ROOT,
  isUpperLimbTopographyNode, upperLimbPathForGroup } from '../data/upperLimbRegionalAtlas';
import type { SceneNode } from '../types/sketchfab';

export function upperLimbBoneContextPlan(modelUid: string, nodes: readonly SceneNode[]) {
  const empty = { transparentBoneIds: [] as number[], opaqueBoneIds: [] as number[] };
  if (modelUid !== UPPER_LIMB_TOPOGRAPHY_MODEL_UID) return empty;
  const visible = nodes.filter(node => node.visible && isUpperLimbTopographyNode(node));
  const bones = visible.filter(node =>
    upperLimbPathForGroup(node, UPPER_LIMB_TOPOGRAPHY_ROOT)?.includes('bones'));
  const ids = bones.map(node => node.instanceID);
  return visible.length > bones.length
    ? { transparentBoneIds: ids, opaqueBoneIds: [] as number[] }
    : { transparentBoneIds: [] as number[], opaqueBoneIds: ids };
}
