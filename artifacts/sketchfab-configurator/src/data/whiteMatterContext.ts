import { normalizeAdvancedObjectName } from './advancedCollection';
import { isBasalForebrainContext, WHOLE_BRAIN_CONTEXT_NAME } from './basalForebrainTaxonomy';
import { classifyDiencephalonObject, DIENCEPHALON_GROUP } from './diencephalonTaxonomy';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

export const WHITE_MATTER_ROOT = ['advanced-neuroanatomy', 'white-matter'] as const;
const markers = new Set(['brain-context', 'thalamus-capsule', 'thalamic-nuclei', 'amygdala', 'hypothalamus', 'av-nucleus']);
const keyFor = (name: string) => normalizeAdvancedObjectName(name)
  .replace(/^(left|right) /, '').replace(/ (left|right)$/, '');
const thalamusNames = new Set(['thalamus', '00 thalamic background core', 'thalamus capsule', 'thalamic capsule', 'thalamic outer surface']);
const lobeNames = new Set(['frontal lobe', 'temporal lobe', 'occipital lobe', 'parietal lobe',
  'insular lobe', 'supratentorial brain', 'cerebrum', 'cerebral hemisphere', 'cerebral hemispheres']);
export const isWhiteMatterPath = (path: readonly string[]) =>
  WHITE_MATTER_ROOT.every((part, i) => path[i] === part);
export const isWhiteMatterCapsule = (node: SceneNode) =>
  node.systemId === 'nervous' && thalamusNames.has(keyFor(node.rawName));
export const isWhiteMatterBrainContext = (node: SceneNode) =>
  node.systemId === 'nervous' && !isWhiteMatterCapsule(node) && keyFor(node.rawName) !== 'hypothalamus'
  && (isBasalForebrainContext(node) || lobeNames.has(keyFor(node.rawName)));

function nuclearPath(rawName: string): readonly string[] | null {
  const path = classifyDiencephalonObject(rawName);
  if (path?.[2] === 'thalamus' && path.length > 3) return path.slice(3);
  const key = keyFor(rawName).replace(/^\d+ /, '');
  if (['anterior ventral av', 'anterior ventral nucleus', 'anteroventral nucleus',
    'anterior ventral (av) nucleus', 'anteroventral nucleus (av)'].includes(key)) return ['anterior', 'av'];
  return null;
}

/** Scope orientation anatomy to the requested fiber branch, never globally. */
export function whiteMatterSupplementPath(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  if (!isWhiteMatterPath(requested) || node.systemId !== 'nervous') return null;
  const marker = requested.findIndex((part, i) => i > 1 && markers.has(part));
  const owner = marker < 0 ? requested : requested.slice(0, marker);
  if (isWhiteMatterBrainContext(node)) return [...owner, 'brain-context'];
  const branch = owner[2];
  const supportsThalamus = !branch || branch === 'thalamic' || branch === 'basal-forebrain';
  if (supportsThalamus && isWhiteMatterCapsule(node)) return [...owner, 'thalamus-capsule'];
  const nucleus = nuclearPath(node.rawName);
  if ((!branch || branch === 'thalamic') && nucleus) return [...owner, 'thalamic-nuclei', ...nucleus];
  if (branch === 'basal-forebrain' || !branch) {
    const key = keyFor(node.rawName);
    if (key === 'amygdala' || key === 'amygdaloid body') return [...owner, 'amygdala'];
    if (key === 'hypothalamus') return [...owner, 'hypothalamus'];
    if (nucleus?.join('/') === 'anterior/av') return [...owner, 'av-nucleus'];
  }
  return null;
}

function rebase(group: NervousGroup, from: string, to: string): NervousGroup {
  return { ...group, id: group.id.replace(from, to),
    ...(group.children ? { children: group.children.map(child => rebase(child, from, to)) } : {}) };
}

/** Every fiber selection gets orientation controls, including nested selections. */
export function withWhiteMatterContext(group: NervousGroup): NervousGroup {
  const path = group.id.split('/');
  const child = (id: string, label: string): NervousGroup => ({ id: `${group.id}/${id}`, label });
  const children = (group.children ?? []).map(withWhiteMatterContext);
  children.push(child('brain-context', WHOLE_BRAIN_CONTEXT_NAME));
  if (path.length === 2 || path[2] === 'thalamic' || path[2] === 'basal-forebrain')
    children.push(child('thalamus-capsule', 'Thalamus capsule (semitransparent)'));
  if (path.length === 2 || path[2] === 'thalamic') {
    const thalamus = DIENCEPHALON_GROUP.children!.find(group => group.id.endsWith('/thalamus'))!;
    children.push({ id: `${group.id}/thalamic-nuclei`, label: 'Thalamic nuclei',
      children: thalamus.children!.map(group => rebase(group, thalamus.id, `${path.join('/')}/thalamic-nuclei`)) });
  }
  if (path.length === 2 || path[2] === 'basal-forebrain') children.push(
    child('amygdala', 'Amygdalae'), child('hypothalamus', 'Hypothalamus'));
  if (path[2] === 'basal-forebrain') children.push(child('av-nucleus', 'Anterior ventral (AV) nucleus'));
  return { ...group, children };
}

export function isWhiteMatterRetainedContext(node: SceneNode, path: readonly string[]): boolean {
  if (!isWhiteMatterPath(path)) return false;
  const selection = path.find((part, i) => i > 1 && markers.has(part));
  return Boolean(selection && selection !== 'brain-context' && selection !== 'thalamus-capsule'
    && whiteMatterSupplementPath(node, path)
    && (isWhiteMatterBrainContext(node) || isWhiteMatterCapsule(node)));
}

export function whiteMatterContextIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node => {
    const member = whiteMatterSupplementPath(node, path);
    return member && (path.every((part, i) => member[i] === part) || isWhiteMatterRetainedContext(node, path))
      && (isWhiteMatterBrainContext(node) || isWhiteMatterCapsule(node));
  }).map(node => node.instanceID);
}
