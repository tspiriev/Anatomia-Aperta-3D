import type { NervousGroup } from './nervousTaxonomy';

type FiberGroup = { id: string; label: string; names?: readonly string[]; children?: readonly FiberGroup[] };
const tract = (id: string, label: string, ...names: string[]): FiberGroup => ({ id, label, names });
const family = (id: string, label: string, ...children: FiberGroup[]): FiberGroup => ({ id, label, children });
const sensory = (): FiberGroup => family('somatosensory', 'Somatosensory fibers',
  ...['arm', 'legs', 'trunk', 'face'].map(part => tract(part, `${part === 'legs' ? 'Leg' : part[0].toUpperCase() + part.slice(1)} somatosensory fibers`, `Somatosensory tract ${part}`)));

// Leaf names are reviewed identities from the cleaned CSV, not keyword guesses.
// Parent memberships stay unchanged, including the creator's custom placements.
const definitions: readonly FiberGroup[] = [
  family('association', 'Association fibers',
    tract('arcuate', 'Arcuate fasciculus', 'Arcuate fascicle'),
    family('superior-longitudinal', 'Superior longitudinal fasciculus (SLF)',
      tract('slf-i', 'SLF I', 'Superior longitudinal fascicle (SLF) I'),
      tract('slf-ii', 'SLF II', 'Superior longitudinal fiascicle (SLF) II'),
      tract('slf-iii', 'SLF III', 'Superior longitudinal fascicle III')),
    tract('ifof', 'Inferior fronto-occipital fasciculus (IFOF)', 'Inferor FrontoOccipital Fascicle (IFOF)'),
    tract('ilf', 'Inferior longitudinal fasciculus (ILF)', 'Inferior Longitudinal Fascicle (ILF)'),
    tract('middle-longitudinal', 'Middle longitudinal fasciculus', 'Middle longitudianl fascicle'),
    tract('uncinate', 'Uncinate fasciculus', 'Uncinate fascicle'),
    tract('cingulum', 'Cingulum', 'Cingulum fibers'),
    tract('frontal-aslant', 'Frontal aslant tract', 'Frontal aslant tract'),
    tract('optic-radiation', 'Optic radiation (projection pathway; CSV Association membership)', 'Optic radiation')),
  family('projection', 'Projection fibers',
    family('motor', 'Motor projection fibers',
      tract('arm', 'Arm corticospinal fibers', 'Corticospinal tract arm'),
      tract('legs', 'Leg corticospinal fibers', 'Corticospinal tract legs'),
      tract('trunk', 'Trunk corticospinal fibers', 'Corticospinal tract trunk'),
      tract('face', 'Face motor fibers (CSV: corticospinal face)', 'Corticospinal tract face')),
    sensory(),
    family('corticopontine', 'Corticopontine fibers',
      tract('frontal', 'Frontopontine fibers', 'Fronto pontine fibers'),
      tract('parietal', 'Parietopontine fibers', 'Parietopontine fibers'),
      tract('temporal', 'Temporopontine fibers', 'Temporoponne fibers'),
      tract('occipital', 'Occipitopontine fibers', 'Occipitopontine fibers'))),
  sensory(),
  family('commissural', 'Commissural fibers',
    family('corpus-callosum', 'Corpus callosum',
      tract('body', 'Callosal body fibers', 'Corpus callosum body'),
      tract('genu', 'Genu — forceps minor', 'Corpus callosum forceps minor (genu) fibers'),
      tract('splenium', 'Splenium — forceps major', 'Corpus callosum forceps major (splenium) fibers')),
    tract('anterior-commissure', 'Anterior commissure', 'Anterior commissure')),
  family('ascending-brainstem', 'Brainstem fibers — ascending, descending and connecting',
    family('ascending-sensory', 'Ascending sensory pathways',
      tract('spinothalamic', 'Spinothalamic tract', 'Spinothalamic tract'),
      family('medial-lemniscus', 'Medial lemniscus',
        tract('arms', 'Arm fibers', 'Medial lemmniscus arms'),
        tract('legs', 'Leg fibers', 'Medial lemniscus legs')),
      family('trigeminal', 'Trigeminal sensory pathways',
        tract('dorsal', 'Dorsal trigeminal tract', 'Dorsal trigeminal tract'),
        tract('pain', 'Trigeminal lemniscus — pain', 'Trigeminal lemniscus pain'),
        tract('proprioception', 'Trigeminal lemniscus — proprioception', 'Trigeminal lemniscus proprioception')),
      family('auditory', 'Auditory fibers and decussations',
        tract('fibers', 'Auditory fibers', 'Auditory fibers'),
        tract('inferior-colliculus', 'Inferior collicular decussation', 'Auditory decussation inferior colliculus'),
        tract('lateral-lemniscus', 'Lateral lemniscal decussation', 'Auditory decussation nucleus lateral lemnniscus'))),
    family('cerebellar', 'Cerebellar connections',
      tract('anterior-spinocerebellar', 'Anterior spinocerebellar tract (Gowers)', 'Anterior spinocerebellar tract (Gowers)'),
      tract('posterior-spinocerebellar', 'Posterior spinocerebellar tract', 'Posterior spinocerebellar tract'),
      tract('pontocerebellar', 'Pontocerebellar fibers', 'Pontocerebellar fibers')),
    family('descending-motor', 'Descending motor pathways (CSV brainstem collection)',
      tract('rubrospinal', 'Rubrospinal tract', 'Rubrospinal tract', 'Rubrospiinal tract'),
      tract('tectospinal', 'Tectospinal tract', 'Tectospinal tract'),
      family('reticulospinal', 'Reticulospinal tracts',
        tract('medullary', 'Lateral / medullary reticulospinal tract', 'Lateral (medullary) reticulospinal tract'),
        tract('pontine', 'Medial / pontine reticulospinal tract', 'Medial (pontine) reticulospinal tract')),
      tract('vestibulospinal', 'Lateral vestibulospinal tract', 'Lateral vestiibulospinal tract')),
    family('connecting', 'Brainstem connecting pathways',
      family('mlf', 'Medial longitudinal fasciculus (MLF)',
        tract('main', 'MLF — main mesh', 'Medial longitudinal fascicle'),
        tract('internuclear', 'Internuclear fibers', 'Medial longitudinal fascicle - Internuclear fibers'),
        tract('iii', 'Oculomotor nuclear connections (III)', 'Medial longitudinal fascicle - Fibers to oculomotor nerve'),
        tract('iv', 'Trochlear nuclear connections (IV)', 'Medial longitudinal fascicle - Fibers to trochlear nerve'),
        tract('vi', 'Abducens nuclear connections (VI)', 'Medial longitudinal fascicle - Fibers to abducens nerve'),
        tract('vestibular', 'Fibers to vestibular nuclei', 'Medial longitudinal fascicle - Fibers to vestibular nuclei')),
      tract('central-tegmental', 'Central tegmental tract — solitary nucleus source mesh',
        'Central tegmental tract (nucleus tractus solitarii)'))),
  family('thalamic', 'Thalamic fibers',
    tract('mammillothalamic', 'Mammillothalamic tract (Vicq d’Azyr)', "bundle of Vicq d'Azyr tractus mamillothalamicus"),
    tract('anterior-nuclei', 'Anterior thalamic nuclear fibers', 'Fibers from anterior thalamic nuclei'),
    tract('mediodorsal', 'Mediodorsal thalamic fibers', 'Mediodorsal thalamic fibers'),
    tract('va-vl', 'VA / VL thalamocortical fibers (combined mesh)', 'Thalamocortical fibers to VL and VA'),
    tract('ld-lp', 'LD / LP thalamocortical fibers (combined mesh)', 'Thalamocortical from lateral LD and LP'),
    family('pulvinar', 'Pulvinar pathways',
      tract('general', 'Pulvinar fibers — general source mesh', 'Pulvinar fibers'),
      tract('parietal', 'Lateral pulvinar–parietal cortex fibers', 'Thalamocortical from lateral pulvinar to parietal cortex'))),
];

const paths = new Map<string, readonly string[]>();
function build(group: FiberGroup, parent: readonly string[]): NervousGroup {
  const path = [...parent, group.id];
  for (const name of group.names ?? []) {
    const key = `${path[2]}/${name.toLowerCase()}`;
    if (paths.has(key)) throw new Error(`Duplicate white matter subdivision: ${key}`);
    paths.set(key, path);
  }
  return { id: path.join('/'), label: group.label,
    ...(group.children ? { children: group.children.map(child => build(child, path)) } : {}) };
}
export const WHITE_MATTER_FIBER_GROUPS = definitions.map(group =>
  build(group, ['advanced-neuroanatomy', 'white-matter']));

/** Call only after exact CSV membership validation, preserving sided/whole identity. */
export function whiteMatterFiberPath(category: string, normalizedSourceName: string): readonly string[] | null {
  return paths.get(`${category}/${normalizedSourceName.replace(/\.[lr]$/, '')}`) ?? null;
}
