import { BASAL_FOREBRAIN_GROUP, basalForebrainPathForGroup } from './basalForebrainTaxonomy';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import { normalizeAdvancedObjectName } from './advancedCollection';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

export const OLFACTORY_BRAIN_CONTEXT_NAME = 'Thalamus capsule (semitransparent)';
const basalRoot = BASAL_FOREBRAIN_GROUP.id.split('/');
const thalamusSurfaces = new Set([
  'thalamus', 'thalamus capsule', 'thalamic capsule', 'thalamic outer surface',
  '00 thalamic background core',
]);
const supratentorialSurfaces = new Set([
  'frontal lobe', 'temporal lobe', 'occipital lobe', 'parietal lobe', 'insular lobe',
  'supratentorial brain', 'cerebrum', 'cerebral hemisphere', 'cerebral hemispheres',
]);

// Keep recognizing existing live whole-lobe names for scene classification,
// but olfactoryBasalForebrainPath excludes them from I's thalamus-only context.
export function olfactoryAnatomyAliasPath(rawName: string): readonly string[] | null {
  const key = normalizeAdvancedObjectName(rawName)
    .replace(/^(left|right) /, '').replace(/ (left|right)$/, '');
  if (key === 'amygdala' || key === 'amygdaloid body') return [...basalRoot, 'structures', 'amygdala'];
  if (rawName === OLFACTORY_BRAIN_CONTEXT_NAME || thalamusSurfaces.has(key) || supratentorialSurfaces.has(key))
    return [...basalRoot, 'context'];
  const nucleus = key.replace(/^\d+ /, '');
  if (['anterior ventral av', 'anterior ventral nucleus', 'anteroventral nucleus',
    'anterior ventral (av) nucleus', 'anteroventral nucleus (av)'].includes(nucleus))
    return [...basalRoot, 'thalamus', 'anterior', 'av'];
  return null;
}
// Curate I only: the main Brain → Basal forebrain collection stays intact.
// The creator restricts I to the anteroventral nucleus (AV), not ventral anterior (VA).
function curate(group: NervousGroup): NervousGroup | null {
  const path = group.id.split('/');
  if (path[2] === 'brainstem-nuclei') return null;
  if (path[2] === 'thalamus' && path.length > 3) {
    if (path[3] !== 'anterior') return null;
    if (path.length > 4 && path[4] !== 'av') return null;
  }
  return { ...group,
    ...(path[2] === 'context' ? { label: OLFACTORY_BRAIN_CONTEXT_NAME } : {}),
    ...(group.children ? { children: group.children.map(curate).filter((child): child is NervousGroup => child !== null) } : {}),
  };
}
export const OLFACTORY_BASAL_FOREBRAIN_GROUP = curate(BASAL_FOREBRAIN_GROUP)!;

export function olfactoryBasalForebrainPath(rawName: string): readonly string[] | null {
  const key = normalizeAdvancedObjectName(rawName)
    .replace(/^(left|right) /, '').replace(/ (left|right)$/, '');
  const path = olfactoryAnatomyAliasPath(rawName) ?? basalForebrainPathForGroup(rawName);
  if (!path || path[2] === 'brainstem-nuclei') return null;
  // Replace the inherited whole brain with only the thalamic outer surface.
  // AV is a separate opaque target, never part of this grouped capsule.
  if (path[2] === 'context' && rawName !== OLFACTORY_BRAIN_CONTEXT_NAME && !thalamusSurfaces.has(key)) return null;
  const gross = classifyBrainGrossAnatomy(rawName);
  if (gross?.[2] === 'brainstem' || gross?.[2] === 'cerebellum') return null;
  if (path[2] === 'thalamus' && !(path[3] === 'anterior' && path[4] === 'av')) return null;
  return path;
}
export const isOlfactoryBrainContext = (node: SceneNode) =>
  node.systemId === 'nervous' && olfactoryBasalForebrainPath(node.rawName)?.[2] === 'context';
