import { normalizeAdvancedObjectName } from './advancedCollection';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import { classifyDiencephalonObject } from './diencephalonTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const root = ['advanced-neuroanatomy', 'cranial-nerves', 'viii'];
const nuclei = new Set([
  'Anterior cochlear nucleus', 'Posterior cochlear nucleus', 'Superior olivary complex',
  'N. of the lateral lemniscus', 'Inferior colliculus', 'Medial geniculate body',
].map(normalizeAdvancedObjectName));
const fibers = new Set([
  'Auditory fibers', 'Auditory decussation inferior colliculus',
  'Auditory decussation nucleus lateral lemnniscus',
].map(normalizeAdvancedObjectName));
const ossicles = new Set(['incus', 'malleus', 'stapes']);
function isSuperiorTemporalGyrus(rawName: string): boolean {
  const key = normalizeAdvancedObjectName(rawName);
  return key === 'superior temporal gyrus (lateral part)' || key === 'superior temporal gyrus';
}
function vestibularContextRole(rawName: string): string | null {
  const key = normalizeAdvancedObjectName(rawName);
  if (key === 'vestibular nuclei') return 'nuclei-context';
  if (isSuperiorTemporalGyrus(rawName)) return 'temporal-context';
  return null;
}
const cochlearLabels = {
  nerves: 'Cochlear nerve and shared VIII trunk',
  ear: 'Cochleae and tympanic membranes',
  ossicles: 'Auditory ossicles',
  tracts: 'Auditory fibers and decussations',
  nuclei: 'Auditory brainstem and thalamic relays',
  ventricles: 'Lateral and third ventricles',
  brainstem: 'Brainstem (semitransparent)',
  'bone-context': 'Temporal bones (semitransparent)',
  'basal-ganglia': 'Basal ganglia (semitransparent)',
  'temporal-context': 'Temporal lobes and auditory cortex (semitransparent)',
  'superior-temporal-context': 'Superior temporal gyrus (lateral part, semitransparent)',
  'transverse-temporal-context': 'Transverse temporal gyri (auditory cortex, semitransparent)',
};

export const VESTIBULOCOCHLEAR_GROUP: NervousGroup = {
  id: root.join('/'), label: 'VIII Vestibulocochlear nerve',
  children: [
    { id: [...root, 'cochlear'].join('/'), label: 'Cochlear nerve — auditory pathway',
      children: Object.entries(cochlearLabels).map(([role, label]) => ({ id: [...root, 'cochlear', role].join('/'), label })) },
    { id: [...root, 'vestibular'].join('/'), label: 'Vestibular nerve',
      children: [
        { id: [...root, 'vestibular', 'nerves'].join('/'), label: 'Vestibular nerve and shared VIII trunk' },
        { id: [...root, 'vestibular', 'nuclei-context'].join('/'), label: 'Vestibular nuclei (semitransparent)' },
        { id: [...root, 'vestibular', 'temporal-context'].join('/'), label: 'Superior temporal gyrus (lateral part, semitransparent)' },
      ] },
  ],
};

export function cochlearBasalGangliaName(rawName: string): boolean {
  const key = normalizeAdvancedObjectName(rawName);
  return classifyDiencephalonObject(rawName)?.[2] === 'basal-ganglia'
    || ['nucleus accumbens', 'ventral pallidum'].includes(key);
}

function roleForName(rawName: string): string | null {
  const key = normalizeAdvancedObjectName(rawName);
  if (key === 'cochlear nerve' || key === 'vestibulocochlear nerve (viii)') return 'nerves';
  if (key === 'cochlea' || key === 'tympanic membrane') return 'ear';
  if (ossicles.has(key)) return 'ossicles';
  if (nuclei.has(key)) return 'nuclei';
  if (fibers.has(key)) return 'tracts';
  if (key === 'temporal bone') return 'bone-context';
  if (key === 'lateral ventricle' || key === 'third ventricle') return 'ventricles';
  if (cochlearBasalGangliaName(rawName)) return 'basal-ganglia';
  if (isSuperiorTemporalGyrus(rawName)) return 'superior-temporal-context';
  if (key === 'transverse temporal gyri' || key === 'transverse temporal gyrus') return 'transverse-temporal-context';
  const brain = classifyBrainGrossAnatomy(rawName);
  if (brain?.[2] === 'brainstem') return 'brainstem';
  if (brain?.[3] === 'temporal') return 'temporal-context';
  return null;
}

export function vestibulocochlearPathForGroup(node: SceneNode, path: readonly string[]): readonly string[] | null {
  const key = normalizeAdvancedObjectName(node.rawName);
  const shared = key === 'vestibulocochlear nerve (viii)';
  const vestibular = key === 'vestibular nerve' || (shared && path[3] === 'vestibular');
  if (vestibular) return path[3] === 'cochlear' || (node.systemId && node.systemId !== 'nervous')
    ? null : [...root, 'vestibular', 'nerves'];
  const contextRole = vestibularContextRole(node.rawName);
  if (contextRole && path[3] !== 'cochlear') {
    return node.systemId && node.systemId !== 'nervous' ? null : [...root, 'vestibular', contextRole];
  }
  if (path[3] === 'vestibular') return null;
  const role = roleForName(node.rawName);
  if (!role) return null;
  // The creator assigns auditory ossicles to Nervous system in this atlas.
  // Preserve that override while also accepting skeletal source ownership.
  const systems = role === 'ossicles' ? ['nervous', 'skeletal']
    : role === 'bone-context' ? ['skeletal'] : ['nervous'];
  if (node.systemId && !systems.includes(node.systemId)) return null;
  return [...root, 'cochlear', role];
}

export function isCochlearNervousName(rawName: string): boolean {
  const role = roleForName(rawName);
  return (role !== null && role !== 'bone-context') || vestibularContextRole(rawName) !== null;
}

export function isCochlearContextPath(path: readonly string[] | null): boolean {
  return path?.[2] === 'viii' && (
    (path[3] === 'cochlear' && ['brainstem', 'bone-context', 'basal-ganglia', 'temporal-context', 'superior-temporal-context', 'transverse-temporal-context'].includes(path[4]))
    || (path[3] === 'vestibular' && ['nuclei-context', 'temporal-context'].includes(path[4]))
  );
}
