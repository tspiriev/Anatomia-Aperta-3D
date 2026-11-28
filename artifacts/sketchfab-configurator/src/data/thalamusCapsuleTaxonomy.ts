import { normalizeAdvancedObjectName as normalize } from './advancedCollection';
import { THALAMUS_CAPSULE_DEFINITIONS, THALAMUS_COMPONENTS, THALAMIC_NUCLEUS_IDS, type ComponentId, type ThalamusEntry } from './thalamusCapsuleDefinition';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

export const THALAMUS_CAPSULE_ROOT_PATH = ['advanced-neuroanatomy', 'thalamus-internal-capsule'] as const;
const within = (path: readonly string[], parent: readonly string[]) => parent.every((part, i) => path[i] === part);
const componentsByPath = new Map<string, readonly ComponentId[]>();
const sidesByPath = new Map<string, 'left' | 'right'>();
const componentName = (rawName: string) => normalize(rawName
  .replace(/\s*\((?:left|right)\)(?=(?:[._]\d+)*$)/i, ''));
const names = new Map<ComponentId, Set<string>>(
  Object.entries(THALAMUS_COMPONENTS).map(([id, component]) => [id as ComponentId, new Set(component.names.map(componentName))]),
);
function register(entry: ThalamusEntry, parent: readonly string[]): NervousGroup {
  const path = [...parent, entry.id];
  const children = entry.children?.map(child => register(child, path));
  const all = [...new Set([
    ...entry.components ?? [],
    ...entry.children?.flatMap(child => componentsByPath.get([...path, child.id].join('/')) ?? []) ?? [],
  ])];
  // Retain the thalamic shell with every thalamic nucleus, in all three
  // sections and their individual views, without a separate orientation menu.
  if (all.some(id => THALAMIC_NUCLEUS_IDS.has(id)) && !all.includes('thalamusOutline'))
    all.push('thalamusOutline');
  componentsByPath.set(path.join('/'), all);
  if (entry.side) sidesByPath.set(path.join('/'), entry.side);
  return { id: path.join('/'), label: entry.label, ...(children ? { children } : {}) };
}
export const THALAMUS_CAPSULE_GROUPS = THALAMUS_CAPSULE_DEFINITIONS.map(entry => register(entry, THALAMUS_CAPSULE_ROOT_PATH));
componentsByPath.set(THALAMUS_CAPSULE_ROOT_PATH.join('/'), [...names.keys()]);
// Registration is child-first. Keep parent paths too, so adding a subgroup
// does not leave a parent's original direct meshes unclassified.
const collectionPaths = [...componentsByPath];

function componentsFor(path: readonly string[]): readonly ComponentId[] {
  return within(path, THALAMUS_CAPSULE_ROOT_PATH) ? componentsByPath.get(path.join('/')) ?? [] : [];
}
function matches(node: Pick<SceneNode, 'rawName'>, id: ComponentId): boolean {
  return names.get(id)!.has(componentName(node.rawName));
}
function matchesSide(node: Pick<SceneNode, 'rawName'>, path: string): boolean {
  const requestedSide = sidesByPath.get(path);
  if (!requestedSide) return true;
  const raw = node.rawName.trim().replace(/(?:[._]\d+)+$/, '').replace(/[.\s]+$/, '');
  const side = raw.match(/(?:[._\s-](l|r)|\b(left|right)\)?)$/i);
  const value = (side?.[1] ?? side?.[2])?.toLowerCase();
  return value === requestedSide || value === requestedSide[0];
}
/** Explicit overlapping memberships; only independently exported temporal optic fibers qualify. */
export function thalamusCapsulePathForGroup(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  if (!within(requested, THALAMUS_CAPSULE_ROOT_PATH)) return null;
  if (!matchesSide(node, requested.join('/'))) return null;
  if (!componentsFor(requested).some(id => matches(node, id))) return null;
  // Return a leaf path for shared collection browsing and mesh visibility controls.
  return collectionPaths.find(([key, ids]) => {
    const path = key.split('/');
    return within(path, requested) && matchesSide(node, key) && ids.some(id => matches(node, id));
  })?.[0].split('/') ?? requested;
}
export const isThalamusCapsuleNode = (node: SceneNode) => thalamusCapsulePathForGroup(node, THALAMUS_CAPSULE_ROOT_PATH) !== null;
/** Cerebral surfaces only; never combine nuclei, fibers or infratentorial context. */
const cortexComponentIds = Object.entries(THALAMUS_COMPONENTS)
  .filter(([, component]) => 'cortex' in component).map(([id]) => id as ComponentId);
export const isThalamusCapsuleCortexNode = (node: SceneNode) =>
  node.systemId === 'nervous' && cortexComponentIds.some(id => matches(node, id));

export function thalamusCapsuleContextIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  const context = componentsFor(path).filter(id => 'cortex' in THALAMUS_COMPONENTS[id] || 'context' in THALAMUS_COMPONENTS[id]);
  return nodes.filter(node => matchesSide(node, path.join('/')) && context.some(id => matches(node, id))).map(node => node.instanceID);
}
export function thalamusCapsuleMissingComponents(nodes: readonly SceneNode[], path: readonly string[]): string[] {
  return componentsFor(path).filter(id => !nodes.some(node => matchesSide(node, path.join('/')) && matches(node, id))).map(id => THALAMUS_COMPONENTS[id].label);
}
