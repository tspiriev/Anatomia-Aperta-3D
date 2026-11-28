import { normalizeAdvancedObjectName } from './advancedCollection';
import { vagusContextSystem } from './vagusTargets';
import type { SceneNode } from '../types/sketchfab';

/** Reuse reviewed thoracic great vessels, not abdominal vessels, coronary
 * structures or nerve plexuses. Stomach surfaces retain organ ownership. */
export function parasympatheticVisceralContextSystem(rawName: string): 'vascular' | 'organs' | null {
  if (vagusContextSystem(rawName) === 'vascular') return 'vascular';
  return ['stomach', 'mucosa of stomach'].includes(normalizeAdvancedObjectName(rawName)) ? 'organs' : null;
}

export function isParasympatheticVisceralContextNode(node: SceneNode): boolean {
  const system = parasympatheticVisceralContextSystem(node.rawName);
  return system !== null && (!node.systemId || node.systemId === system);
}

export function parasympatheticVisceralPath(node: SceneNode, scope: readonly string[]): readonly string[] | null {
  if (!isParasympatheticVisceralContextNode(node)) return null;
  const group = parasympatheticVisceralContextSystem(node.rawName) === 'vascular' ? 'thoracic-vessels' : 'stomach';
  const path = ['advanced-neuroanatomy', 'autonomic-nervous-system', 'parasympathetic', 'vagus', group];
  return scope.every((part, i) => path[i] === part) ? path : null;
}
