import type { SceneNode } from '../types/sketchfab';
import { skullBasePathForGroup, skullBaseSystemForNode } from './skullBaseTaxonomy';
import { skullBaseName, skullBaseVesselKind } from './skullBaseSources';

export const NASAL_ANTERIOR_SKULL_BASE_SOURCE_PATH = [
  'advanced-neuroanatomy', 'skull-base', 'anterior-fossa-orbit',
] as const;
export const NASAL_ANTERIOR_SKULL_BASE_REGION = 'head/nasal-pterygopalatine';

/** The creator chose ALL nerves/vessels in this source menu, not a nasal-only
 * anatomical subset. Reuse its reviewed memberships rather than broad names. */
export function nasalAnteriorSkullBaseTissue(
  node: Pick<SceneNode, 'rawName'>,
): 'nerves' | 'arteries' | 'veins' | null {
  // Local removal requested by the creator; keep the sulcus available in its
  // original brain/skull-base collections rather than deleting the structure.
  if (skullBaseName(node.rawName) === 'olfactory sulcus') return null;
  const sceneNode: SceneNode = {
    instanceID: 0, rawName: node.rawName, name: node.rawName,
    type: 'MatrixTransform', visible: true, systemId: null,
  };
  if (!skullBasePathForGroup(sceneNode, NASAL_ANTERIOR_SKULL_BASE_SOURCE_PATH)) return null;
  const system = skullBaseSystemForNode(sceneNode);
  if (system === 'nervous') {
    const name = skullBaseName(node.rawName);
    // Brainstem shells and central nuclei are source context, not nerves.
    return /nerve|gangli|plexus|olfactory/.test(name) && !/nucle|neucle/.test(name) ? 'nerves' : null;
  }
  if (system !== 'vascular') return null;
  const kind = skullBaseVesselKind(node.rawName);
  return kind === 'arterial' ? 'arteries' : kind === 'venous' ? 'veins' : null;
}
