import { buildAdvancedCollection, structures, collection, type AdvancedCollection } from './advancedCollection';
import type { SceneNode } from '../types/sketchfab';

/** Exact paired source meshes in NS_CN05_TRIGEMINAL, including its "neucleus" spelling. */
export const TRIGEMINAL_SENSORY_NUCLEI = [
  { id: 'mesencephalic-trigeminal', label: 'Mesencephalic trigeminal nucleus', rawName: 'Mesencephalic nucleus of trigeminal nerve' },
  { id: 'principal-trigeminal', label: 'Principal sensory trigeminal nucleus', rawName: 'Principal (pontine) neucleus of trigeminal nerve' },
  { id: 'spinal-trigeminal', label: 'Spinal trigeminal nucleus', rawName: 'Spinal nucleus of trigeminal nerve' },
] as const;

// Fibers follow the CSV's Brainstem fibers collection and all five descendant
// collections. Objects stored directly on the parent remain accessible there.
// Nuclei use the requested textbook categories, but only explicit source meshes:
// combined vestibular nuclei and reticular formation are not split artificially.
const definition: AdvancedCollection = collection('brainstem', 'Brainstem',
  collection('gross-anatomy', 'Gross anatomy',
    structures('midbrain', 'Midbrain', 'Midbrain'),
    structures('pons', 'Pons', 'Pons'),
    structures('medulla-oblongata', 'Medulla oblongata', 'Medulla oblongata'),
  ),
  collection('nuclei', 'Brainstem nuclei',
    collection('gse', 'Somatic motor nuclei (GSE)',
      structures('oculomotor', 'Oculomotor nucleus', 'Nucleus of oculomotor nerve'),
      structures('trochlear', 'Trochlear nucleus', 'Nucleus of trochlear nerve'),
      structures('abducens', 'Abducens nucleus', 'Nucleus of abducens nerve'),
      structures('hypoglossal', 'Hypoglossal nucleus', 'Nucleus of hypoglossal nerve'),
    ),
    collection('sve', 'Branchial motor nuclei (SVE)',
      structures('facial', 'Facial motor nucleus', 'Motor nucleus of facial nerve'),
      structures('ambiguus', 'Nucleus ambiguus', 'Nucleus ambiguus'),
      structures('accessory', 'Accessory nucleus (XI)', 'Nucleus of accessory nerve'),
    ),
    collection('gve', 'Visceral motor nuclei (GVE)',
      // The source accessory oculomotor mesh is not split by EW component.
      structures('edinger-westphal', 'Edinger–Westphal nucleus (combined)', 'Accessory nucleus of oculomotor nerve'),
      structures('superior-salivatory', 'Superior salivatory nucleus', 'Superior salivatory nucleus'),
      structures('inferior-salivatory', 'Inferior salivatory nucleus', 'Inferior salivatory nucleus'),
      structures('dorsal-vagus', 'Dorsal motor nucleus of vagus', 'Posterior nucleus of vagus nerve'),
    ),
    collection('gsa', 'Somatic sensory nuclei (GSA)',
      ...TRIGEMINAL_SENSORY_NUCLEI.map(({ id, label, rawName }) => structures(id, label, rawName)),
      structures('gracile', 'Gracile nucleus', 'Gracile nucleus'),
      structures('cuneate', 'Cuneate nucleus', 'Cuneate nucleus'),
      structures('accessory-cuneate', 'Accessory cuneate nucleus', 'Accessory Cuneate nucleus'),
    ),
    collection('gva-sva', 'Visceral sensory nuclei (GVA/SVA)',
      structures('solitary', 'Nucleus of solitary tract', 'Nucleus of solitary tract'),
    ),
    collection('ssa', 'Special somatic sensory nuclei (SSA)',
      structures('vestibular', 'Vestibular nuclei (combined)', 'Vestibular nuclei'),
      structures('dorsal-cochlear', 'Dorsal cochlear nucleus (posterior)', 'Posterior cochlear nucleus'),
      structures('ventral-cochlear', 'Ventral cochlear nucleus (anterior)', 'Anterior cochlear nucleus'),
      structures('lateral-lemniscus', 'Nucleus of lateral lemniscus', 'N. of the lateral lemniscus'),
    ),
    collection('other', 'Other brainstem nuclei',
      structures('red', 'Red nucleus', 'Red nucleus'),
      collection('substantia-nigra', 'Substantia nigra',
        structures('compacta', 'Pars compacta', 'Substantia nigra pars compacta'),
        structures('reticulata', 'Pars reticulata', 'Substantia nigra pars reticularis'),
      ),
      structures('inferior-olive', 'Inferior olive', 'Olive'),
      structures('superior-olive', 'Superior olivary complex', 'Superior olivary complex'),
      structures('reticular', 'Reticular formation (combined)', 'Reticular formation brainstem'),
      structures('periaqueductal-gray', 'Periaqueductal gray', 'Periaqueductal gray matter'),
      structures('superior-colliculus', 'Superior colliculus', 'Superior colliculus'),
      structures('inferior-colliculus', 'Inferior colliculus', 'Inferior colliculus'),
      structures('vta', 'Ventral tegmental area', 'Ventral tegmental area'),
      structures('darkschewitsch', 'Nucleus of Darkschewitsch', 'Nucleus of Darkschewitsch'),
      structures('cajal', 'Interstitial nucleus of Cajal', 'Interstitial nucleus of Cajal'),
    ),
  ),
  {
    id: 'white-matter',
    label: 'Brainstem white matter fibers',
    objects: [
      'Lateral (medullary) reticulospinal tract',
      'Rubrospiinal tract',
      'Rubrospinal tract',
      'Pontocerebellar fibers',
      'Central tegmental tract (nucleus tractus solitarii)',
      'Lateral vestiibulospinal tract',
      'Medial (pontine) reticulospinal tract',
      'Tectospinal tract',
    ],
    children: [
      structures('auditory', 'Auditory',
        'Auditory decussation inferior colliculus',
        'Auditory decussation nucleus lateral lemnniscus',
        'Auditory fibers',
      ),
      structures('ascending-cerebellar', 'Ascending cerebellar',
        'Anterior spinocerebellar tract (Gowers)',
        'Posterior spinocerebellar tract',
      ),
      structures('trigeminal', 'Trigeminal',
        'Dorsal trigeminal tract',
        'Trigeminal lemniscus pain',
        'Trigeminal lemniscus proprioception',
      ),
      structures('ascending-sensory', 'Ascending sensory',
        'Spinothalamic tract',
        'Medial lemmniscus arms',
        'Medial lemniscus legs',
      ),
      structures('medial-longitudinal-fascicle', 'Medial longitudinal fascicle',
        'Medial longitudinal fascicle - Fibers to vestibular nuclei',
        'Medial longitudinal fascicle - Fibers to abducens nerve',
        'Medial longitudinal fascicle - Internuclear fibers',
        'Medial longitudinal fascicle - Fibers to trochlear nerve',
        'Medial longitudinal fascicle - Fibers to oculomotor nerve',
        'Medial longitudinal fascicle',
      ),
    ],
  },
);

const taxonomy = buildAdvancedCollection(definition);
export const BRAINSTEM_GROUP = taxonomy.group;

// The CSV also contains unsided, whole spinal-cord tracts with some of the
// same stems. Do not pull those into the brainstem's bilateral tract meshes.
function sourceFiberName(rawName: string): string {
  return rawName.trim().toLowerCase()
    .replace(/\.+$/, '')
    .replace(/(?:\.+\d+\.*|_\d+)+$/g, '')
    .replace(/\.+$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

const fiberSources = new Set<string>();
const fiberExceptions: Record<string, readonly string[]> = {
  'Rubrospiinal tract': ['Rubrospiinal tract.l'],
  'Rubrospinal tract': ['Rubrospinal tract.r'],
  'Dorsal trigeminal tract': ['Dorsal trigeminal tract.l'],
  'Auditory decussation inferior colliculus': ['Auditory decussation inferior colliculus'],
  'Auditory decussation nucleus lateral lemnniscus': ['Auditory decussation nucleus lateral lemnniscus'],
  'Medial longitudinal fascicle - Internuclear fibers': ['Medial longitudinal fascicle - Internuclear fibers'],
};
function registerFibers(group: AdvancedCollection) {
  for (const object of group.objects ?? []) {
    for (const name of fiberExceptions[object] ?? [`${object}.l`, `${object}.r`]) {
      fiberSources.add(sourceFiberName(name));
    }
  }
  group.children?.forEach(registerFibers);
}
registerFibers(definition.children!.find((group) => group.id === 'white-matter')!);

export function classifyBrainstemObject(rawName: string): readonly string[] | null {
  const path = taxonomy.classify(rawName);
  if (path?.[2] === 'white-matter' && !fiberSources.has(sourceFiberName(rawName))) return null;
  return path;
}

/** Internal anatomy retains the gross envelope without changing tract/nucleus membership. */
export function isBrainstemRetainedContext(node: SceneNode, requested: readonly string[]): boolean {
  return requested[0] === 'advanced-neuroanatomy' && requested[1] === 'brainstem'
    && ['nuclei', 'white-matter'].includes(requested[2]) && node.systemId === 'nervous'
    && classifyBrainstemObject(node.rawName)?.[2] === 'gross-anatomy';
}

/** Fade gross surfaces in their own views and as orientation for nuclei or fibers. */
export function brainstemContextIds(nodes: readonly SceneNode[], requested: readonly string[]): number[] {
  if (requested[0] !== 'advanced-neuroanatomy' || requested[1] !== 'brainstem') return [];
  return nodes.filter(node => {
    const path = classifyBrainstemObject(node.rawName);
    return node.systemId === 'nervous' && path?.[2] === 'gross-anatomy'
      && (requested.every((part, i) => path[i] === part) || isBrainstemRetainedContext(node, requested));
  }).map(node => node.instanceID);
}

/** Show nucleus/fiber controls recover orientation if its surfaces were hidden. */
export function brainstemShowContextIds(nodes: readonly SceneNode[], shownIds: readonly number[]): number[] {
  const shown = new Set(shownIds);
  const showsInternalAnatomy = nodes.some(node => shown.has(node.instanceID) && node.systemId === 'nervous'
    && ['nuclei', 'white-matter'].includes(classifyBrainstemObject(node.rawName)?.[2] ?? ''));
  return showsInternalAnatomy ? brainstemContextIds(nodes, ['advanced-neuroanatomy', 'brainstem']) : [];
}
