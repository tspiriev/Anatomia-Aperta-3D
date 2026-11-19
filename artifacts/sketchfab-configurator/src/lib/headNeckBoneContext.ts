import { HEAD_NECK_TOPOGRAPHY_MODEL_UID, headNeckTopographySystemForNode } from '../data/headNeckTopography';
import { isHeadTopographyNode } from '../data/headTopography';
import { NECK_TOPOGRAPHY_MODEL_UID, neckBoneContextIds } from '../data/neckTopography';
import type { SceneNode } from '../types/sketchfab';

/** Only the dedicated atlas's source-backed bones receive default refraction. */
export function headNeckBoneContextIds(modelUid: string, nodes: readonly SceneNode[]): number[] {
  if (modelUid === NECK_TOPOGRAPHY_MODEL_UID) return neckBoneContextIds(modelUid, nodes);
  if (modelUid !== HEAD_NECK_TOPOGRAPHY_MODEL_UID) return [];
  return nodes.filter(node => isHeadTopographyNode(node)
    && headNeckTopographySystemForNode(node) === 'skeletal').map(node => node.instanceID);
}
