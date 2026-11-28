import type { SceneNode } from '../types/sketchfab';
import { isSkullBaseCerebellarSurface, isSkullBaseCerebellumDetailPath } from '../data/skullBaseCerebellum';
import { basalWholeBrainDisplay } from './basalWholeBrain';

export const WHOLE_CEREBELLUM_NAME = 'Cerebellum — whole';

/** One click/visibility target for the shell; detailed teaching views keep lobules independent. */
export function skullBaseCerebellumDisplay(
  nodes: readonly SceneNode[],
  activePath: readonly string[],
  isolatedPath: readonly string[],
) {
  const combine = !isSkullBaseCerebellumDetailPath(activePath)
    && !isSkullBaseCerebellumDetailPath(isolatedPath);
  return basalWholeBrainDisplay(nodes, combine,
    node => isSkullBaseCerebellarSurface(node.rawName), WHOLE_CEREBELLUM_NAME, 'Cerebellum');
}
