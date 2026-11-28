import type { SceneNode } from '../types/sketchfab';
import { skullBaseContextIds, skullBasePathForGroup } from './skullBaseTaxonomy';

export const SKULL_BASE_ORBIT_PATH = ['advanced-neuroanatomy', 'skull-base', 'anterior-fossa-orbit', 'orbit'];

/** Source Orbit settings, not the autonomic-only Petrosal interpretation of III/V. */
export function headNeckOrbitSettings(nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[]) {
  const requested = new Set(ids);
  if (!requested.size) return { supportIds: [], contextIds: [] };
  const context = skullBaseContextIds(nodes, SKULL_BASE_ORBIT_PATH);
  const overview = path.length === 4;
  const nerveView = path[4] === 'nerves';
  // The complete region retains the same source Orbit anatomy. Its nerve views
  // retain transparent orientation; tissue-only controls keep their membership.
  const supportIds = overview
    ? nodes.filter(node => skullBasePathForGroup(node, SKULL_BASE_ORBIT_PATH)).map(node => node.instanceID)
    : nerveView ? context : [];
  const shown = new Set([...ids, ...supportIds]);
  return { supportIds, contextIds: context.filter(id => shown.has(id)) };
}
