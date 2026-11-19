import { buildAdvancedCollection, collection, structures, normalizeAdvancedObjectName } from './advancedCollection';
import { BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS } from './brainstemCerebellumSourceRows';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import { TRIGEMINAL_SENSORY_NUCLEI } from './brainstemTaxonomy';

/** Local to Brainstem and cerebellum; do not reorganise the independent Brain atlas. */
export function brainstemFocusedName(name: string): string {
  let k = normalizeAdvancedObjectName(name)
    .replace(/^(?:fj\d+ )?bp\d+ fma\d+ /, '')
    .replace(/(?:[-.\s]+(?:left|right)|\s*\((?:left|right)\)|\s+[lr])$/, '')
    .replace(/lemmniscus|lemnniscus/g, 'lemniscus').replace(/vestiibulo/g, 'vestibulo')
    .replace(/rubrospiinal/g, 'rubrospinal').replace(/neucleus/g, 'nucleus')
    .replace(/medial longitudinal fasciculus/g, 'medial longitudinal fascicle');
  // The creator confirmed these two meshes are nuclei mislabeled as roots
  // in this dedicated model, not anatomical motor-root geometry.
  if (k === 'motor root of trigeminal nerve') return 'motor trigeminal nucleus';
  if (/nucleus/.test(k) && /trigemin/.test(k)) {
    if (/motor/.test(k)) return 'motor trigeminal nucleus';
    if (/principal|pontine|chief/.test(k)) return 'principal sensory trigeminal nucleus';
    if (/mesencephal/.test(k)) return 'mesencephalic trigeminal nucleus';
    if (/spinal/.test(k)) {
      const part = k.match(/oralis|interpolaris|caudalis/)?.[0];
      return `spinal trigeminal nucleus${part ? ` pars ${part}` : ''}`;
    }
  }
  if (/trigemin/.test(k) && /spinal/.test(k) && /tract/.test(k)) return 'spinal trigeminal tract';
  return k;
}

const definition = collection('brainstem', 'Brainstem',
  collection('gross-anatomy', 'Gross anatomy',
    structures('midbrain', 'Midbrain', 'Midbrain'),
    structures('pons', 'Pons', 'Pons'),
    structures('medulla-oblongata', 'Medulla oblongata', 'Medulla oblongata'),
    structures('cerebral-crus', 'Cerebral crus', 'Base of cerebral peduncle (Midbrain)', 'Cerebral crus', 'Crus cerebri'),
  ),
  collection('nuclei', 'Brainstem nuclei',
    collection('gse', 'Somatic motor nuclei (GSE)',
      structures('oculomotor', 'Oculomotor nucleus', 'Nucleus of oculomotor nerve', 'Oculomotor nucleus'),
      structures('trochlear', 'Trochlear nucleus', 'Nucleus of trochlear nerve', 'Trochlear nucleus'),
      structures('abducens', 'Abducens nucleus', 'Nucleus of abducens nerve', 'Abducens nucleus'),
      structures('hypoglossal', 'Hypoglossal nucleus', 'Nucleus of hypoglossal nerve', 'Hypoglossal nucleus')),
    collection('sve', 'Branchial motor nuclei (SVE)',
      structures('motor-trigeminal', 'Motor trigeminal nucleus', 'Motor trigeminal nucleus'),
      structures('facial', 'Facial motor nucleus', 'Motor nucleus of facial nerve', 'Facial motor nucleus'),
      structures('ambiguus', 'Nucleus ambiguus', 'Nucleus ambiguus'),
      structures('accessory', 'Accessory nucleus (XI)', 'Nucleus of accessory nerve')),
    collection('gve', 'Visceral motor nuclei (GVE)',
      structures('edinger-westphal', 'Edinger–Westphal nucleus (source combined mesh)',
        'Accessory nucleus of oculomotor nerve', 'Edinger–Westphal nucleus', 'Edinger-Westphal preganglionic nucleus'),
      structures('superior-salivatory', 'Superior salivatory nucleus', 'Superior salivatory nucleus'),
      structures('inferior-salivatory', 'Inferior salivatory nucleus', 'Inferior salivatory nucleus'),
      structures('dorsal-vagus', 'Dorsal motor nucleus of vagus', 'Posterior nucleus of vagus nerve', 'Dorsal motor nucleus of vagus')),
    collection('gsa', 'Somatic sensory nuclei (GSA)',
      structures('principal-trigeminal', 'Principal sensory trigeminal nucleus', 'Principal sensory trigeminal nucleus'),
      { ...structures('spinal-trigeminal', 'Spinal trigeminal nucleus', 'Spinal trigeminal nucleus'), children: [
        structures('oralis', 'Pars oralis', 'Spinal trigeminal nucleus pars oralis'),
        structures('interpolaris', 'Pars interpolaris', 'Spinal trigeminal nucleus pars interpolaris'),
        structures('caudalis', 'Pars caudalis', 'Spinal trigeminal nucleus pars caudalis'),
      ] },
      structures('mesencephalic-trigeminal', 'Mesencephalic trigeminal nucleus', 'Mesencephalic trigeminal nucleus')),
    collection('gva-sva', 'Visceral sensory nuclei (GVA/SVA)',
      { ...structures('solitary', 'Nucleus tractus solitarius', 'Nucleus of solitary tract', 'Nucleus tractus solitarius'), children: [
        structures('rostral', 'Rostral gustatory division', 'Rostral gustatory nucleus of solitary tract'),
        structures('caudal', 'Caudal visceral sensory division', 'Caudal visceral nucleus of solitary tract'),
      ] }),
    collection('ssa', 'Special somatic sensory nuclei (SSA)',
      { ...structures('vestibular', 'Vestibular nuclei (source combined mesh)', 'Vestibular nuclei'), children: [
        ...['Superior', 'Inferior', 'Medial', 'Lateral'].map(n => structures(n.toLowerCase(), `${n} vestibular nucleus`, `${n} vestibular nucleus`)),
      ] },
      structures('dorsal-cochlear', 'Dorsal cochlear nucleus', 'Posterior cochlear nucleus', 'Dorsal cochlear nucleus'),
      { ...structures('ventral-cochlear', 'Ventral cochlear nucleus', 'Anterior cochlear nucleus', 'Ventral cochlear nucleus'), children: [
        structures('anteroventral', 'Anteroventral cochlear nucleus', 'Anteroventral cochlear nucleus'),
        structures('posteroventral', 'Posteroventral cochlear nucleus', 'Posteroventral cochlear nucleus'),
      ] }),
    collection('gaze-related', 'Oculomotor and gaze-related nuclei',
      structures('cajal', 'Interstitial nucleus of Cajal', 'Interstitial nucleus of Cajal'),
      structures('darkschewitsch', 'Nucleus of Darkschewitsch', 'Nucleus of Darkschewitsch')),
    collection('midbrain-tectum', 'Midbrain tectum',
      structures('superior-colliculus', 'Superior colliculus', 'Superior colliculus'),
      structures('inferior-colliculus', 'Inferior colliculus', 'Inferior colliculus')),
    collection('reticular-neuromodulatory', 'Reticular formation and neuromodulatory systems',
      structures('reticular-formation', 'Reticular formation', 'Reticular formation brainstem', 'Reticular formation'),
      collection('serotonergic', 'Serotonergic system',
        structures('ascending-serotonergic', 'Ascending serotonergic projections', 'Medial forebrain bundle serotonin')),
      collection('dopaminergic', 'Dopaminergic system',
        structures('ventral-tegmental-area', 'Ventral tegmental area', 'Ventral tegmental area'),
        structures('medial-forebrain-bundle', 'Medial forebrain bundle dopamine', 'Medial forebrain bundle dopamine'))),
    collection('other', 'Other brainstem nuclei',
      collection('motor-extrapyramidal', 'Motor and extrapyramidal nuclei',
        structures('red', 'Red nucleus', 'Red nucleus'),
        collection('substantia-nigra', 'Substantia nigra',
          structures('compacta', 'Pars compacta', 'Substantia nigra pars compacta'),
          structures('reticulata', 'Pars reticulata', 'Substantia nigra pars reticularis', 'Substantia nigra pars reticulata'))),
      structures('inferior-olivary', 'Inferior olivary complex', 'Olive', 'Inferior olivary nucleus', 'Inferior olivary complex'),
      collection('dorsal-column', 'Dorsal column nuclei',
        structures('gracile', 'Gracile nucleus', 'Gracile nucleus'),
        structures('cuneate', 'Cuneate nucleus', 'Cuneate nucleus'),
        structures('accessory-cuneate', 'Accessory cuneate nucleus', 'Accessory Cuneate nucleus')),
      collection('auditory-relay', 'Auditory relay nuclei',
        structures('superior-olive', 'Superior olivary complex', 'Superior olivary complex'),
        structures('lateral-lemniscus', 'Nucleus of lateral lemniscus', 'N. of the lateral lemniscus', 'Nucleus of lateral lemniscus')),
      structures('raphe', 'Raphe nuclei', 'Raphe nuclei', 'Raphe nucleus'),
      structures('neuromodulatory', 'Neuromodulatory nuclei', 'Locus coeruleus', 'Locus ceruleus'),
      structures('periaqueductal-gray', 'Periaqueductal gray', 'Periaqueductal gray matter'))),
  collection('white-matter', 'Brainstem white matter fibers',
    collection('descending-motor', 'Descending motor pathways',
      structures('corticospinal', 'Corticospinal', 'Corticospinal tract arm', 'Corticospinal tract legs', 'Corticospinal tract trunk', 'Pyramidal decussation'),
      structures('corticobulbar', 'Corticobulbar', 'Corticospinal tract face', 'Corticobulbar fibers', 'Corticobulbar tract'),
      structures('rubrospinal', 'Rubrospinal', 'Rubrospinal tract'),
      structures('tectospinal', 'Tectospinal tract', 'Tectospinal tract'),
      structures('vestibulospinal', 'Vestibulospinal', 'Lateral vestibulospinal tract', 'Medial vestibulospinal tract'),
      structures('reticulospinal', 'Reticulospinal', 'Medial (pontine) reticulospinal tract', 'Lateral (medullary) reticulospinal tract')),
    collection('ascending-sensory', 'Ascending sensory pathways',
      structures('medial-lemniscus', 'Dorsal column–medial lemniscus system', 'Medial lemniscus arms', 'Medial lemniscus legs', 'Medial lemniscus'),
      structures('anterolateral', 'Anterolateral system', 'Spinothalamic tract', 'Spinotectal tract'),
      collection('trigeminal', 'Trigeminal sensory pathways',
        structures('lemnisci', 'Trigeminal lemnisci and dorsal trigeminothalamic pathway',
          'Trigeminal lemniscus pain', 'Trigeminal lemniscus proprioception', 'Trigeminal lemniscus', 'Dorsal trigeminal tract', 'Dorsal trigeminothalamic tract'),
        structures('spinal-tract', 'Spinal trigeminal tract', 'Spinal trigeminal tract'))),
    collection('cerebellar-connections', 'Cerebellar connections',
      structures('ascending-cerebellar', 'Ascending spinocerebellar and cuneocerebellar',
        'Anterior spinocerebellar tract (Gowers)', 'Posterior spinocerebellar tract', 'Cuneocerebellar tract', 'Cuneocerebellar fibers'),
      structures('pontocerebellar', 'Pontocerebellar', 'Pontocerebellar fibers'),
      structures('olivocerebellar', 'Olivocerebellar', 'Olivocerebellar (Climbing fibers)', 'Olivodentate fibers (Guillain-Mollaet Triangle)'),
      structures('efferents', 'Cerebellar efferent pathways', 'Dentatorubrothalamic tract', 'Interpositothalamic tract', 'Fastigiovestibular tract'),
      structures('mollaret', 'Guillain–Mollaret circuit', 'Rubro-olivary fibers')),
    collection('auditory', 'Auditory pathways',
      structures('ascending', 'Ascending auditory fibers', 'Auditory fibers', 'Auditory radiation', 'Lateral lemniscus', 'Trapezoid body'),
      structures('decussations', 'Auditory decussations', 'Auditory decussation inferior colliculus', 'Auditory decussation nucleus lateral lemniscus', 'Inferior collicular commissure')),
    collection('vestibular-oculomotor', 'Vestibular and oculomotor connections',
      structures('medial-longitudinal-fascicle', 'Medial longitudinal fasciculus — left and right', 'Medial longitudinal fascicle'),
      collection('vestibulo-ocular', 'Vestibulo-ocular connections',
        structures('oculomotor', 'Projections to oculomotor nuclei', 'Medial longitudinal fascicle - Fibers to oculomotor nerve'),
        structures('trochlear', 'Projections to trochlear nuclei', 'Medial longitudinal fascicle - Fibers to trochlear nerve'),
        structures('abducens', 'Projections to abducens nuclei', 'Medial longitudinal fascicle - Fibers to abducens nerve'),
        structures('internuclear', 'Internuclear connections', 'Medial longitudinal fascicle - Internuclear fibers'),
        structures('vestibular', 'Vestibular nuclear connections', 'Medial longitudinal fascicle - Fibers to vestibular nuclei', 'Vestibular nerve fibers to nuclei'))),
    collection('intrinsic', 'Intrinsic brainstem connections',
      collection('central-tegmental', 'Central tegmental tract',
        structures('rubro-olivary', 'Rubro-olivary component', 'Central tegmental tract (Guillain-Mollaet Triangle)'),
        structures('solitary', 'Solitary nucleus-related component', 'Central tegmental tract (nucleus tractus solitarii)')))),
);

const taxonomy = buildAdvancedCollection(definition);
export function classifyFocusedBrainstem(rawName: string): readonly string[] | null {
  // Source membership is explicit; do not rely solely on name heuristics for
  // these six cranial-nerve-collection meshes in a brainstem teaching menu.
  const sourceName = normalizeAdvancedObjectName(rawName);
  const trigeminal = TRIGEMINAL_SENSORY_NUCLEI.find(n => normalizeAdvancedObjectName(n.rawName) === sourceName);
  if (trigeminal) return ['advanced-neuroanatomy', 'brainstem', 'nuclei', 'gsa', trigeminal.id];
  const k = brainstemFocusedName(rawName);
  // Raphe subdivisions in a revised live model stay together, without fabricated meshes.
  if (/\braphe\b/.test(k) && /nucle/.test(k)) return ['advanced-neuroanatomy', 'brainstem', 'nuclei', 'other', 'raphe'];
  const path = taxonomy.classify(k);
  // Unsided spinal-cord meshes are not interchangeable with brainstem tract geometry.
  if (path?.[2] === 'white-matter' && /^(?:posterior spinocerebellar tract|spinothalamic tract|spinotectal tract|rubrospinal tract|tectospinal tract|medial vestibulospinal tract|lateral vestibulospinal tract)$/.test(k)
    && !/(?:[._](?:l|r)(?:[.\d_]*$)|\b(?:left|right)\b)/i.test(rawName)) return null;
  return path;
}

/** Optional nuclear subdivisions and "other" groups appear only when meshes exist. */
export function focusedBrainstemGroup(nodes: readonly SceneNode[] = []): NervousGroup {
  const paths = [...BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS.map(row => row.object_name), ...nodes.map(n => n.rawName)]
    .map(classifyFocusedBrainstem).filter((p): p is readonly string[] => p !== null);
  const has = (id: string) => paths.some(p => p.join('/') === id || p.join('/').startsWith(`${id}/`));
  const prune = (group: NervousGroup): NervousGroup => {
    const optionalChildren = /\/(?:other|spinal-trigeminal|solitary|vestibular|ventral-cochlear)$/.test(group.id);
    const children = group.children?.filter(c => !optionalChildren || has(c.id)).map(prune);
    return { ...group, ...(children ? { children } : {}) };
  };
  const group = prune(taxonomy.group);
  // Both source rubro-olivary and olivodentate meshes are shared circuit members.
  return group;
}

export function isFocusedMollaretFiber(rawName: string): boolean {
  return /central tegmental tract.*(?:molla|molle|mollaret)|olivodentate.*(?:molla|molle|mollaret)|rubro.olivary fibers/.test(brainstemFocusedName(rawName));
}
