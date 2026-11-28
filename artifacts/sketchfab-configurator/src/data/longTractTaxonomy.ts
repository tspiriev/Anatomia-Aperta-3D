import { normalizeAdvancedObjectName } from './advancedCollection';
import { LONG_TRACT_DEFINITIONS, type PathwayDefinition } from './longTractDefinitions';
import { MIDBRAIN_GAZE_ID, MIDBRAIN_GAZE_ORIENTATION } from './midbrainGazeDefinition';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

export const LONG_TRACT_ROOT_PATH = ['advanced-neuroanatomy', 'long-tracts'] as const;
export const isLongTractExcludedNode = (node: Pick<SceneNode, 'rawName'>, section?: string) =>
  normalizeAdvancedObjectName(node.rawName) === 'superior colliculus'
    && section !== MIDBRAIN_GAZE_ID && section !== 'descending-motor';
const memberships = new Map<string, string[][]>();
const optionalMenuEntries = new Map<string, readonly string[]>();
const requirements = new Map<string, { label: string; names: readonly string[] }[]>();
const notes = new Map<string, string>();
const within = (path: readonly string[], requested: readonly string[]) =>
  requested.every((part, i) => path[i] === part);
function register(def: PathwayDefinition, parent: readonly string[], inherited: readonly string[] = [],
  expected: readonly { label: string; names: readonly string[] }[] = []): NervousGroup {
  const path = [...parent, def.id];
  const complete = [...inherited, ...def.complete ?? []];
  const required = [...expected, ...def.expected ?? []];
  if (def.optional) optionalMenuEntries.set(path.join('/'), def.primary ?? []);
  if (def.primary?.length && !def.optional) required.push({ label: def.label, names: def.primary });
  requirements.set(path.join('/'), required);
  if (def.note) notes.set(path.join('/'), def.note);
  for (const name of [...def.primary ?? [], ...complete]) {
    const key = normalizeAdvancedObjectName(name);
    const paths = memberships.get(key) ?? [];
    if (!paths.some(p => p.join('/') === path.join('/'))) paths.push(path);
    memberships.set(key, paths);
  }
  return { id: path.join('/'), label: def.label,
    ...(def.children ? { children: def.children.map(child => register(child, path, complete,
      [...expected, ...def.expected ?? []])) } : {}) };
}
export const LONG_TRACT_GROUPS: readonly NervousGroup[] =
  LONG_TRACT_DEFINITIONS.map(def => register(def, LONG_TRACT_ROOT_PATH));

/** Presentation only: retain scene orientation, omit unavailable optional meshes. */
export function longTractMenuGroups(nodes: readonly SceneNode[]): readonly NervousGroup[] {
  const available = new Set(nodes.filter(node => !node.systemId || node.systemId === 'nervous')
    .map(node => normalizeAdvancedObjectName(node.rawName)));
  const visible = (group: NervousGroup): boolean => !group.id.endsWith('/context')
    && (!optionalMenuEntries.has(group.id) || optionalMenuEntries.get(group.id)!
      .some(name => available.has(normalizeAdvancedObjectName(name))));
  const adapt = (group: NervousGroup): NervousGroup => ({
    ...group, ...(group.children ? { children: group.children.filter(visible).map(adapt) } : {}),
  });
  return LONG_TRACT_GROUPS.map(adapt);
}

// Orientation is retained in the scene, not a fourth submenu. Gray matter uses
// the actual exported horns when no separate whole-gray-matter mesh is present.
register({ id: 'context', label: 'Orientation anatomy', primary: MIDBRAIN_GAZE_ORIENTATION },
  [...LONG_TRACT_ROOT_PATH, MIDBRAIN_GAZE_ID]);

/** Match exact source names and exported side/duplicate aliases; no folder inference. */
export function longTractPathForGroup(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  if (!within(requested, LONG_TRACT_ROOT_PATH)) return null;
  if (node.systemId && node.systemId !== 'nervous') return null;
  const key = normalizeAdvancedObjectName(node.rawName);
  if (requested.length > 2 && isLongTractExcludedNode(node, requested[2])) return null;
  const sided = /[._][lr](?:[._]\d+)*\.*$/i.test(node.rawName.trim());
  return memberships.get(key)?.find(path => within(path, requested)
    && !(path[2] === 'cerebellar' && path[3] === 'spinocerebellar' && path[4] === 'posterior'
      && key === 'posterior spinocerebellar tract'
      && ((path[5] === 'brainstem' && !sided) || (path[5] === 'spinal-cord' && sided)))
    && !(path[2] === 'cerebellar' && path[3] === 'spinocerebellar' && path[4] === 'anterior'
      && ((path[5] === 'brainstem' && key === 'anterior spinocerebellar tract')
        || (path[5] === 'spinal-cord' && key === 'anterior spinocerebellar tract (gowers)')))
    && !(path[2] === MIDBRAIN_GAZE_ID && path[3] === 'tectospinal-pathway' && key === 'tectospinal tract'
      && ((path[4] === 'brainstem' && !sided) || (path[4] === 'spinal-cord' && sided)))) ?? null;
}
export const isLongTractNode = (node: SceneNode) => longTractPathForGroup(node, LONG_TRACT_ROOT_PATH) !== null;

const sections = new Set(LONG_TRACT_GROUPS.map(group => group.id.split('/')[2]));
const translucentNames = new Set([
  'Midbrain', 'Pons', 'Medulla oblongata', 'White matter of spinal cord', 'Reticular formation brainstem', 'Thalamus',
].map(normalizeAdvancedObjectName));
const spinalCordOrientationNames = new Set([
  'White matter of spinal cord', 'Anterior horn of spinal cord',
  'Posterior horn of spinal cord', 'Lateral intermediate substance',
].map(normalizeAdvancedObjectName));
export function isLongTractRetainedContext(node: SceneNode, requested: readonly string[]): boolean {
  // Cranial pathways do not inherit the broader system's spinal orientation.
  // Their own spinal trigeminal tract/nucleus memberships remain unchanged.
  const withoutSpinalOrientation = (requested[2] === 'descending-motor' && requested[3] === 'corticobulbar')
    || (requested[2] === 'ascending-sensory' && requested[3] === 'trigeminal');
  if (withoutSpinalOrientation && spinalCordOrientationNames.has(normalizeAdvancedObjectName(node.rawName))) return false;
  return within(requested, LONG_TRACT_ROOT_PATH) && sections.has(requested[2])
    && requested.length > 3 && requested[3] !== 'context'
    && longTractPathForGroup(node, [...LONG_TRACT_ROOT_PATH, requested[2], 'context']) !== null;
}
export function longTractContextIds(nodes: readonly SceneNode[], requested: readonly string[]): number[] {
  if (!within(requested, LONG_TRACT_ROOT_PATH)) return [];
  const fadePeduncularBases = requested.length === LONG_TRACT_ROOT_PATH.length || requested[2] === 'descending-motor';
  return nodes.filter(node => (translucentNames.has(normalizeAdvancedObjectName(node.rawName))
    || (fadePeduncularBases && normalizeAdvancedObjectName(node.rawName) === 'base of cerebral peduncle (midbrain)'))
    && (longTractPathForGroup(node, requested) || isLongTractRetainedContext(node, requested)))
    .map(node => node.instanceID);
}

export function longTractMissingComponents(nodes: readonly SceneNode[], path: readonly string[]): string[] {
  if (!within(path, LONG_TRACT_ROOT_PATH) || path.length <= LONG_TRACT_ROOT_PATH.length) return [];
  const available = new Set(nodes.filter(node => !node.systemId || node.systemId === 'nervous')
    .map(node => normalizeAdvancedObjectName(node.rawName)));
  const expected = [...requirements].filter(([id]) => within(id.split('/'), path)).flatMap(([, items]) => items);
  return [...new Set(expected.filter(item => !item.names.some(name => available.has(normalizeAdvancedObjectName(name))))
    .map(item => item.label))];
}
export function longTractSourceNote(path: readonly string[]): string {
  if (!within(path, LONG_TRACT_ROOT_PATH)) return '';
  return [...notes].filter(([id]) => within(path, id.split('/')))
    .map(([, note]) => note).join(' ');
}
