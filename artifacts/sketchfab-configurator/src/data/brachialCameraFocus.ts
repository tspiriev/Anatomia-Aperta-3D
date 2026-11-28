import type { SceneNode } from '../types/sketchfab';
import { brachialPathForGroup, BRACHIAL_ROOT_PATH } from './brachialPlexusTaxonomy';
import { brachialTrunkContextPart } from './brachialTrunkContext';
import { isBrachialCordName } from './brachialCordContext';

/** Fit the teaching subject, not its larger transparent contextual anatomy.
 * A null result preserves normal framing for other sections/context controls. */
export function brachialCameraTargets(nodes: readonly SceneNode[], path: readonly string[]): number[] | null {
  if (!BRACHIAL_ROOT_PATH.every((part, i) => path[i] === part)
    || !['divisions', 'cords'].includes(path[2]) || path[3] === 'context') return null;
  const targets = nodes.filter(node => brachialPathForGroup(node, path)
    && (path[2] === 'divisions' ? brachialTrunkContextPart(node.rawName) === 'divisions'
      : isBrachialCordName(node.rawName))).map(node => node.instanceID);
  return targets.length ? targets : null;
}
