import { buildAdvancedCollection, collection, structures, normalizeAdvancedObjectName } from './advancedCollection';
import { DIENCEPHALON_DEFINITION } from './diencephalonTaxonomy';
import gross from './brainGrossAnatomyMemberships.json';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

export const WHOLE_BRAIN_CONTEXT_NAME = 'Whole brain (semitransparent)';
const excludedObjects = new Set(['fornix', 'dentate gyrus', 'uncinate fascicle',
  'stria terminalis', 'stria medullaris thalami']);
const isExcluded = (name: string) => excludedObjects.has(normalizeAdvancedObjectName(name));
const diencephalicGroups = DIENCEPHALON_DEFINITION.children!
  .filter(group => group.id === 'hypothalamus' || group.id === 'thalamus')
  .map(group => ({
    ...group,
    objects: undefined,
    children: group.children,
  }));
const definition = collection('basal-forebrain', 'Basal forebrain',
  collection('nuclei', 'Basal forebrain nuclei',
    structures('septal', 'Septal nuclei', 'Septal nucleus'),
    structures('meynert', 'Basal nuclei of Meynert', 'Basal nucleus of Maynert'),
    structures('accumbens', 'Nuclei accumbens', 'Nucleus accumbens'),
  ),
  collection('structures', 'Basal forebrain and amygdala',
    structures('perforated-substance', 'Anterior perforated substance', 'Substantia perforata anterior'),
    structures('amygdala', 'Amygdaloid bodies (amygdala)', 'Amygdaloid body'),
  ),
  collection('white-matter', 'Associated white matter fibers',
    structures('anterior-commissure', 'Anterior commissure', 'Anterior commissure'),
    structures('amygdaloseptal', 'Amygdaloseptal fibers', 'Ansa peduncularis Amygdaloseptal fibers'),
    structures('amygdalohypothalamic', 'Amygdalohypothalamic fibers', 'Ansa peduncularis Amygdalohypothalamic fibers'),
    structures('amygdalothalamic', 'Amygdalothalamic fibers', 'Ansa peduncularis Amygdalothalamic fibers'),
    structures('stria-terminalis', 'Stria terminalis', 'Stria terminalis'),
    structures('stria-medullaris', 'Stria medullaris thalami', 'Stria medullaris thalami'),
    collection('medial-forebrain-bundle', 'Medial forebrain bundle',
      structures('dopamine', 'Dopaminergic fibers', 'Medial forebrain bundle dopamine'),
      structures('serotonin', 'Serotonergic fibers', 'Medial forebrain bundle serotonin'),
    ),
  ),
  ...diencephalicGroups,
  collection('brainstem-nuclei', 'Associated brainstem nuclei',
    structures('reticular', 'Reticular formation (combined)', 'Reticular formation brainstem'),
    structures('vta', 'Ventral tegmental areas', 'Ventral tegmental area'),
    structures('substantia-nigra-compacta', 'Substantia nigra pars compacta', 'Substantia nigra pars compacta'),
  ),
);

// Preserve source-numbered lobe assignments; numbered meshes can be distinct.
const contextPaths = new Map<string, readonly string[]>();
const built = buildAdvancedCollection(definition);
// White matter retains the full shared fiber hierarchy even when structures
// are excluded from the separate Basal forebrain category.
export const BASAL_FOREBRAIN_FIBER_GROUP = built.group.children!.find(group => group.id.endsWith('/white-matter'))!;
export function classifyBasalForebrainFiber(rawName: string): readonly string[] | null {
  const path = built.classify(rawName);
  return path?.[2] === 'white-matter' ? path : null;
}
export const BASAL_FOREBRAIN_GROUP: NervousGroup = {
  ...built.group,
  children: [...built.group.children!.map(group => group === BASAL_FOREBRAIN_FIBER_GROUP
    ? { ...group, children: group.children!.filter(child =>
      !child.id.endsWith('/stria-terminalis') && !child.id.endsWith('/stria-medullaris')) }
    : group), { id: `${built.group.id}/context`, label: WHOLE_BRAIN_CONTEXT_NAME }],
};
const wholeBrainPath = [...built.group.id.split('/'), 'context'];
const capsuleNames = new Set(DIENCEPHALON_DEFINITION.children!
  .filter(group => group.id === 'hypothalamus' || group.id === 'thalamus')
  .flatMap(group => group.objects!).map(normalizeAdvancedObjectName));
function contextKey(name: string) {
  return name.trim().toLowerCase().replace(/(?:_\d+)+$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ');
}
for (const id of ['frontal', 'parietal', 'occipital', 'temporal', 'insula',
  'midbrain', 'pons', 'medulla-oblongata', 'cerebellar-hemispheres', 'vermis'] as const) {
  for (const name of gross[id]) contextPaths.set(contextKey(name), wholeBrainPath);
}
export function basalForebrainContextPath(rawName: string): readonly string[] | null {
  if (isExcluded(rawName)) return null;
  if (rawName === WHOLE_BRAIN_CONTEXT_NAME || capsuleNames.has(normalizeAdvancedObjectName(rawName))) return wholeBrainPath;
  let key = contextKey(rawName);
  while (key) {
    const path = contextPaths.get(key);
    if (path) return path;
    const shorter = key.replace(/\.\d+$/, '');
    if (shorter === key) break;
    key = shorter;
  }
  return null;
}
export function classifyBasalForebrainObject(rawName: string): readonly string[] | null {
  if (isExcluded(rawName)) return null;
  const path = built.classify(rawName);
  // Capsule objects participate in this menu, but are context rather than
  // opaque foreground structures.
  return path?.[3] === 'capsule' ? null : path;
}
export const isBasalForebrainOpaqueStructure = (node: SceneNode) =>
  node.systemId === 'nervous' && classifyBasalForebrainObject(node.rawName) !== null;
export function isBasalForebrainOpaqueNucleus(node: SceneNode): boolean {
  if (node.systemId !== 'nervous') return false;
  const group = classifyBasalForebrainObject(node.rawName)?.at(-1);
  return group === 'accumbens' || group === 'septal';
}
export const isBasalForebrainContext = (node: SceneNode) =>
  node.systemId === 'nervous' && basalForebrainContextPath(node.rawName) !== null;
export function basalForebrainPathForGroup(rawName: string): readonly string[] | null {
  // Context has its own menu branch, never duplicate hundreds of cortex rows
  // under every nucleus. The isolation planner adds it to the visible scene.
  return basalForebrainContextPath(rawName) ?? classifyBasalForebrainObject(rawName);
}
