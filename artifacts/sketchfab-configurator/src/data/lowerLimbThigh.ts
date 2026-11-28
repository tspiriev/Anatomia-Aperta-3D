import { lowerLimbName } from './lowerLimbNames';
import type { SceneNode } from '../types/sketchfab';

/** Only classify fascial sheets after confirming membership in Thigh/Fasciae,
 * so tensor fasciae latae remains a normal opaque muscle.
 */
export const isThighFascialSheet = (raw: string): boolean =>
  /fascia|iliotibial tract|aponeurosis|septum/.test(lowerLimbName(raw));

/** Preserve the anterior groin boundary when inspecting its nerves/vessels,
 * without changing muscle-only, bone-only or connective-only inspections.
 */
export function thighSupportIds(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
  belongs: (node: SceneNode) => boolean,
): number[] {
  if (!ids.length || path[1] !== 'lower-limb-topography' || path[2] !== 'thigh'
    || !['anterior', 'femoral-triangle'].includes(path[3])
    || path.some(part => ['muscles', 'bones', 'fasciae', 'joints', 'bursae'].includes(part))) return [];
  return nodes.filter(node => belongs(node)
    && /^(?:hip bone|inguinal ligament)$/.test(lowerLimbName(node.rawName)))
    .map(node => node.instanceID);
}
