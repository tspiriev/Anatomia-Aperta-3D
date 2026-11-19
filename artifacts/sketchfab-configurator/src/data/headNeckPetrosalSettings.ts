import type { SceneNode } from '../types/sketchfab';
import { skullBaseName } from './skullBaseSources';
import { PETROSAL_AUTONOMIC_RULES as rules, petrosalAutonomicShowSupportIds, petrosalAutonomicShowContextIds } from './skullBasePetrosalAutonomic';
import { headNeckTopographyPathForGroup } from './headNeckTopography';
import { headNeckOrbitSettings } from './headNeckOrbitSettings';
import { anteriorTriangleSettings } from './headNeckAnteriorTriangle';
import { lateralNeckSettings } from './headNeckLateralNeck';

const root = ['advanced-neuroanatomy', 'skull-base', 'petrosal-autonomic'];

/** For copied Skull base contexts use its normal context opacity, not the
 * head/neck refraction override. Bones retain their atlas-wide refraction.
 * allowSourceContext must stay true: this atlas otherwise protects all source
 * materials and would silently discard the imported muscles/brainstem context. */
export function headNeckContextArguments(
  settings: ReturnType<typeof headNeckPetrosalSettings>, shownIds: readonly number[], merge: boolean,
): readonly [number[], boolean, boolean, number[] | undefined, number[], [], boolean, number[]] {
  const context = settings.contextIds;
  return settings.skullBaseStyle
    ? [context, merge, true, shownIds.filter(id => !context.includes(id)), context, [], true, []]
    : [context, merge, false, undefined, context, [], true, context];
}

/** Adapt existing Head nerve selections, never their taxonomy or Hide membership. */
export function headNeckPetrosalSettings(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
): { supportIds: number[]; contextIds: number[]; skullBaseStyle?: boolean } {
  if (path[2] === 'lateral-neck') return lateralNeckSettings(nodes, ids, path);
  if (path[2] === 'anterior-triangle') return anteriorTriangleSettings(nodes, ids, path);
  if (path[0] === 'advanced-neuroanatomy' && path[1] === 'head-neck-topography'
    && path[2] === 'head' && path[3] === 'orbit') return headNeckOrbitSettings(nodes, ids, path);
  if (path[0] !== 'advanced-neuroanatomy' || path[1] !== 'head-neck-topography'
    || path[2] !== 'head'
    || !(path[4] === 'nerves' || (path.length === 4 && path[3] === 'temporal-infratemporal')))
    return { supportIds: [], contextIds: [] };
  const requested = new Set(ids);
  const support = new Set<number>(), context = new Set<number>();
  for (const node of nodes.filter(node => requested.has(node.instanceID))) {
    // The whole regional collection contains vessels/muscles/bones too. Only
    // its existing nerve members may request Petrosal teaching companions.
    if (path.length === 4 && !headNeckTopographyPathForGroup(node, [...path, 'nerves'])) continue;
    const name = skullBaseName(node.rawName);
    const trigeminal = [rules.autonomicTrigeminalRoot, rules.autonomicV1, rules.autonomicV2Root,
      rules.autonomicV2, rules.autonomicV3, rules.autonomicLingual,
      rules.autonomicSubmandibularBranches, rules.autonomicAuriculotemporal]
      .some(matches => matches(name));
    const selectedPath = trigeminal ? [...root, 'v-connections'] : root;
    for (const id of petrosalAutonomicShowSupportIds(nodes, [node.instanceID], selectedPath)) support.add(id);
    for (const id of petrosalAutonomicShowContextIds(nodes, [node.instanceID], selectedPath)) context.add(id);
  }
  return { supportIds: [...support], contextIds: [...context] };
}
