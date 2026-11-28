import { lowerLimbName } from './lowerLimbNames';
import { LOWER_LIMB_TOPOGRAPHY_MODEL_UID } from './lowerLimbTopographyRegions';
import type { SceneNode } from '../types/sketchfab';

export const isLegFascialSheet = (raw: string): boolean =>
  /crural fascia|intermuscular septum of leg/.test(lowerLimbName(raw));

const side = (raw: string) => raw.replace(/_\d+$/, '')
  .match(/\.(l|r)(?:\.\d+)?$/i)?.[1]?.toLowerCase();

/** Copy the actual ipsilateral fascia colour, including texture-driven colour.
 * The existing material controller clones per geometry, protecting muscles that
 * share the septum's red source material. Never guess a replacement RGB value.
 */
export function lowerLimbLegColorMatches(modelUid: string, nodes: readonly SceneNode[]) {
  if (modelUid !== LOWER_LIMB_TOPOGRAPHY_MODEL_UID) return [];
  return nodes.filter(node => lowerLimbName(node.rawName) === 'transverse intermuscular septum of leg')
    .flatMap(node => {
      const lateral = side(node.rawName);
      const reference = lateral && nodes.find(candidate => side(candidate.rawName) === lateral
        && lowerLimbName(candidate.rawName) === 'crural fascia');
      return reference ? [{ instanceID: node.instanceID, referenceID: reference.instanceID }] : [];
    });
}
