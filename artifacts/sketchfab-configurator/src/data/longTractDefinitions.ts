import { MIDBRAIN_GAZE_DEFINITION } from './midbrainGazeDefinition';
import { TRIGEMINAL_MOTOR_NUCLEUS_NAMES } from './trigeminalMotorNucleus';

export type PathwayDefinition = {
  id: string;
  label: string;
  primary?: readonly string[];
  complete?: readonly string[];
  expected?: readonly { label: string; names: readonly string[] }[];
  note?: string;
  optional?: boolean;
  children?: readonly PathwayDefinition[];
};
const leaf = (id: string, label: string, primary: string[], complete: readonly string[] = []): PathwayDefinition =>
  ({ id, label, primary, complete });
const group = (id: string, label: string, children: PathwayDefinition[], complete: readonly string[] = [],
  extra: Partial<PathwayDefinition> = {}): PathwayDefinition => ({ id, label, children, complete, ...extra });

const motorOrigin = ['Precentral gyrus', 'Paracentral gyrus and sulcus*'];
const motorStem = ['Base of cerebral peduncle (Midbrain)', 'Pyramid of medulla oblongata', 'Anterior horn of spinal cord'];
const corticospinal = ['Lateral corticospinal tract', 'Anterior corticospinal tract'];
const ocular = ['Nucleus of oculomotor nerve', 'Nucleus of trochlear nerve', 'Nucleus of abducens nerve'];
const cranialMotor = ['Motor nucleus of facial nerve', 'Nucleus ambiguus', 'Nucleus of hypoglossal nerve',
  ...TRIGEMINAL_MOTOR_NUCLEUS_NAMES, ...ocular];
const red = ['Red nucleus'];
const olive = ['Olive', 'Inferior olivary nucleus'];
const dentate = ['Dentate_nucleus'];
const interposed = ['Nucleus_emboliformis', 'Nucleus_globosus'];
const fastigial = ['Nucleus_fastigii'];
const vestibular = ['Vestibular nuclei'];
const reticular = ['Reticular formation brainstem'];
const mlf = ['Medial longitudinal fascicle - Fibers to abducens nerve',
  'Medial longitudinal fascicle - Fibers to oculomotor nerve',
  'Medial longitudinal fascicle - Fibers to trochlear nerve',
  'Medial longitudinal fascicle - Fibers to vestibular nuclei',
  'Medial longitudinal fascicle - Internuclear fibers',
  'Medial longitudinal fascicle', 'Medial longitudinal fasciculus', 'Medial longitudinal tract'];
const lemniscus = ['Medial lemniscus legs', 'Medial lemmniscus arms', 'Medial lemniscus arms'];
const dorsal = ['Gracile fasciculus', 'Cuneate fasciculus', 'Gracile nucleus', 'Cuneate nucleus'];
const vpl = ['12_Ventral_posterolateral_VPL'];
const vpm = ['13_Ventral_posteromedial_VPM'];
const postcentral = ['Postcentral gyrus'];
const somatosensoryBody = ['Somatosensory tract arm', 'Somatosensory tract trunk', 'Somatosensory tract legs'];
const somatosensoryFace = ['Somatosensory tract face'];
const vl = ['11_Ventral_lateral_VL'];
const medialReticulo = ['Medial reticulospinal tract', 'Medial (pontine) reticulospinal tract'];
const lateralReticulo = ['Lateral reticulospinal tract', 'Lateral (medullary) reticulospinal tract'];
const medialVestibulo = ['Medial vestibulospinal tract'];
const lateralVestibulo = ['Lateral vestibulospinal tract', 'Lateral vestiibulospinal tract'];
const rubrospinal = ['Rubrospinal tract', 'Rubrospiinal tract'];
const olivoCerebellar = ['Olivocerebellar (Climbing fibers)', 'Olivodentate fibers (Guillain-Mollaet Triangle)'];
const triangleTegmental = ['Central tegmental tract (Guillain-Mollaet Triangle)', 'Central tegmental tract (Guillain-Mollaret Triangle)'];
const solitaryThalamic = ['Nucleus of solitary tract', 'Central tegmental tract (nucleus tractus solitarii)',
  ...vpm, ...somatosensoryFace];
const superiorPeduncle = ['Superior cerebellar peduncle'];
const inferiorPeduncle = ['Inferior cerebellar peduncle'];
const clarke = ["Dorsal nucleus Clarke's nucleus", 'Dorsal nucleus of Clarke', "Clarke's nucleus"];
const cuneocerebellar = ['Cuneocerebellar fibers', 'Cuneocerebellar tract'];
const dentato = ['Dentatorubrothalamic tract'];
const spinalTarget = ['Anterior horn of spinal cord'];
const spinothalamic = ['Spinothalamic tract'];
const trigeminal = ['Spinal trigeminal tract', 'Spinal nucleus of trigeminal nerve',
  'Principal (pontine) neucleus of trigeminal nerve', 'Mesencephalic nucleus of trigeminal nerve',
  'Trigeminal lemniscus pain', 'Trigeminal lemniscus proprioception'];

const pathwaySystems: readonly PathwayDefinition[] = [
  group('descending-motor', 'Descending motor systems', [
    group('corticospinal', 'Corticospinal', [
      leaf('arm', 'Arm', ['Corticospinal tract arm']),
      leaf('trunk', 'Trunk', ['Corticospinal tract trunk']),
      leaf('leg', 'Leg', ['Corticospinal tract legs', 'Corticospinal tract leg']),
      leaf('lateral', 'Lateral corticospinal', ['Lateral corticospinal tract']),
      leaf('anterior', 'Anterior corticospinal', ['Anterior corticospinal tract']),
    ], [...motorOrigin, ...motorStem, ...corticospinal], {
      expected: [{ label: 'Pyramidal decussation', names: ['Pyramidal decussation', 'Decussation of pyramids'] }],
      note: 'Arm, trunk and leg pathways share whole exported cortical, brainstem and spinal components; those shared meshes cannot be split into somatotopic segments.',
    }),
    group('corticobulbar', 'Corticobulbar', [
      leaf('fibers', 'Corticobulbar fibers', ['Corticospinal tract face', 'Corticobulbar fibers', 'Corticobulbar tract']),
      leaf('motor-nuclei', 'Motor cranial nerve nuclei', [...cranialMotor]),
    ], [...motorOrigin, 'Base of cerebral peduncle (Midbrain)', 'Corticospinal tract face', ...cranialMotor], {
      expected: [{ label: 'Motor trigeminal nucleus', names: TRIGEMINAL_MOTOR_NUCLEUS_NAMES }],
      note: 'The source names the available facial corticobulbar component “Corticospinal tract face”. The creator identifies the object “Motor tract of trigeminal nerve” as the trigeminal motor nucleus. Source object names are preserved.',
    }),
    group('extrapyramidal', 'Extrapyramidal', [
      group('rubrospinal', 'Rubrospinal', [
        leaf('red-nuclei', 'Red nucleus (left/right)', [...red]),
        leaf('tract', 'Rubrospinal tract (brainstem and spinal cord)', [...rubrospinal]),
      ], [...red, ...rubrospinal, ...spinalTarget]),
      group('tectospinal', 'Tectospinal', [
        leaf('superior-colliculi', 'Superior colliculus (left/right)', ['Superior colliculus']),
        leaf('tract', 'Tectospinal tract (brainstem and spinal cord)', ['Tectospinal tract']),
      ], ['Superior colliculus', 'Tectospinal tract', ...spinalTarget]),
      group('medial-reticulospinal', 'Medial Reticulospinal', [
        leaf('reticular-formation', 'Reticular formation brainstem', [...reticular]),
        leaf('pontine-tract', 'Medial (pontine) reticulospinal tract', ['Medial (pontine) reticulospinal tract']),
        leaf('spinal-tract', 'Medial reticulospinal tract (spinal cord)', ['Medial reticulospinal tract']),
      ], [...reticular, ...medialReticulo, ...spinalTarget]),
      group('lateral-reticulospinal', 'Lateral Reticulospinal', [
        leaf('reticular-formation', 'Reticular formation brainstem', [...reticular]),
        leaf('medullary-tract', 'Lateral (medullary) reticulospinal tract', ['Lateral (medullary) reticulospinal tract']),
        leaf('spinal-tract', 'Lateral reticulospinal tract (spinal cord)', ['Lateral reticulospinal tract']),
      ], [...reticular, ...lateralReticulo, ...spinalTarget]),
      group('medial-vestibulospinal', 'Medial Vestibulospinal', [
        leaf('vestibular-nuclei', 'Vestibular nuclei (left/right)', [...vestibular]),
        leaf('tract', 'Medial vestibulospinal tract', [...medialVestibulo]),
        leaf('mlf', 'Associated medial longitudinal fasciculus', [...mlf]),
      ], [...vestibular, ...medialVestibulo, ...mlf, ...spinalTarget]),
      group('lateral-vestibulospinal', 'Lateral Vestibulospinal', [
        leaf('vestibular-nuclei', 'Vestibular nuclei (left/right)', [...vestibular]),
        leaf('tract', 'Lateral vestibulospinal tract', [...lateralVestibulo]),
      ], [...vestibular, ...lateralVestibulo, ...spinalTarget]),
    ]),
  ]),
  group('ascending-sensory', 'Ascending sensory systems', [
    group('dorsal-column-medial-lemniscus', 'Dorsal Column–Medial Lemniscus', [
      leaf('gracilis', 'Fasciculus gracilis', ['Gracile fasciculus']),
      leaf('cuneatus', 'Fasciculus cuneatus', ['Cuneate fasciculus']),
      leaf('gracile-nucleus', 'Gracile nucleus', ['Gracile nucleus']),
      leaf('cuneate-nucleus', 'Cuneate nucleus', ['Cuneate nucleus']),
      leaf('internal-arcuate', 'Internal arcuate fibers', ['Internal arcuate fibers']),
      leaf('medial-lemniscus', 'Medial lemniscus', [...lemniscus]),
      leaf('somatosensory-fibers', 'Somatosensory fibers — Arm, trunk and legs', [...somatosensoryBody]),
      leaf('postcentral-gyrus', 'Postcentral gyrus', [...postcentral]),
    ], [...dorsal, ...lemniscus, ...vpl, ...somatosensoryBody, ...postcentral], {
      expected: [{ label: 'Internal arcuate fibers', names: ['Internal arcuate fibers'] }],
    }),
    group('anterolateral', 'Anterolateral', [
      leaf('anterior-spinothalamic', 'Anterior spinothalamic', ['Anterior spinothalamic tract'],
        [...spinothalamic, 'Posterior horn of spinal cord', ...vpl, ...somatosensoryBody, ...postcentral]),
      leaf('lateral-spinothalamic', 'Lateral spinothalamic', ['Lateral spinothalamic tract'],
        [...spinothalamic, 'Posterior horn of spinal cord', ...vpl, ...somatosensoryBody, ...postcentral]),
      leaf('spinoreticular', 'Spinoreticular', ['Spinoreticular tract'], ['Posterior horn of spinal cord', ...reticular]),
      leaf('spinotectal', 'Spinotectal', ['Spinotectal tract'], ['Posterior horn of spinal cord']),
      leaf('somatosensory-fibers', 'Somatosensory fibers — Arm, trunk and legs', [...somatosensoryBody],
        [...spinothalamic, 'Anterior spinothalamic tract', 'Lateral spinothalamic tract',
          'Posterior horn of spinal cord', ...vpl, ...somatosensoryBody, ...postcentral]),
      leaf('postcentral-gyrus', 'Postcentral gyrus', [...postcentral],
        [...spinothalamic, 'Anterior spinothalamic tract', 'Lateral spinothalamic tract',
          'Posterior horn of spinal cord', ...vpl, ...somatosensoryBody, ...postcentral]),
    ]),
    group('trigeminal', 'Trigeminal', [
      leaf('spinal-tract', 'Spinal trigeminal tract', ['Spinal trigeminal tract']),
      leaf('spinal-nucleus', 'Spinal trigeminal nucleus', ['Spinal nucleus of trigeminal nerve']),
      leaf('principal-nucleus', 'Principal sensory nucleus', ['Principal (pontine) neucleus of trigeminal nerve']),
      leaf('mesencephalic-nucleus', 'Mesencephalic trigeminal nucleus', ['Mesencephalic nucleus of trigeminal nerve']),
      leaf('lemniscus', 'Trigeminal lemniscus', ['Trigeminal lemniscus pain', 'Trigeminal lemniscus proprioception']),
      leaf('somatosensory-fibers', 'Somatosensory fibers — Face', [...somatosensoryFace]),
      leaf('postcentral-gyrus', 'Postcentral gyrus', [...postcentral]),
    ], [...trigeminal, ...vpm, ...somatosensoryFace, ...postcentral]),
  ]),
  group('cerebellar', 'Cerebellar systems', [
    group('spinocerebellar', 'Spinocerebellar', [
      group('posterior', 'Posterior Spinocerebellar', [
        leaf('clarke', 'Dorsal nucleus of Clarke', [...clarke]),
        leaf('spinal-cord', 'Posterior spinocerebellar tract (spinal cord)', ['Posterior spinocerebellar tract']),
        leaf('brainstem', 'Posterior spinocerebellar tract (brainstem)', ['Posterior spinocerebellar tract']),
        { ...leaf('inferior-peduncle', 'Inferior cerebellar peduncle', [...inferiorPeduncle]), optional: true },
      ], [...clarke, 'Posterior spinocerebellar tract', ...inferiorPeduncle]),
      group('anterior', 'Anterior Spinocerebellar', [
        leaf('spinal-cord', 'Anterior spinocerebellar tract (spinal cord)', ['Anterior spinocerebellar tract']),
        leaf('brainstem', 'Anterior spinocerebellar tract (Gowers), brainstem', ['Anterior spinocerebellar tract (Gowers)']),
        { ...leaf('superior-peduncle', 'Superior cerebellar peduncle', [...superiorPeduncle]), optional: true },
        { ...leaf('intermediate-gray', 'Intermediate gray matter (context)', ['Lateral intermediate substance']), optional: true },
      ], ['Anterior spinocerebellar tract', 'Anterior spinocerebellar tract (Gowers)',
        ...superiorPeduncle, 'Lateral intermediate substance']),
      group('cuneocerebellar', 'Cuneocerebellar', [
        leaf('accessory-cuneate', 'Accessory cuneate nucleus (left/right)', ['Accessory Cuneate nucleus']),
        { ...leaf('fibers', 'Cuneocerebellar fibers', [...cuneocerebellar]), optional: true },
        { ...leaf('inferior-peduncle', 'Inferior cerebellar peduncle', [...inferiorPeduncle]), optional: true },
      ], ['Accessory Cuneate nucleus', ...cuneocerebellar, ...inferiorPeduncle]),
    ]),
    group('afferents', 'Cerebellar Afferents', [
      leaf('pontocerebellar', 'Pontocerebellar', ['Pontocerebellar fibers'],
        ['Fronto pontine fibers', 'Occipitopontine fibers', 'Parietopontine fibers',
          'Temporoponne fibers', 'Temporopontine fibers', 'Temporo-pontine fibers', 'Temporo pontine fibers', 'Pontine nuclei']),
      leaf('olivocerebellar', 'Olivocerebellar', [...olivoCerebellar], [...olive]),
      leaf('vestibulocerebellar', 'Vestibulocerebellar', ['Vestibulocerebellar fibers', 'Vestibulocerebellar tract'],
        [...vestibular, 'Vestibular nerve fibers to nuclei', ...fastigial]),
    ]),
    group('efferents', 'Cerebellar Efferents', [
      leaf('dentatorubrothalamic', 'Dentatorubrothalamic', [...dentato], [...dentate, ...red, ...vl, ...superiorPeduncle]),
      { ...leaf('interpositorubral', 'Interpositorubral', ['Interpositorubral tract'],
        [...interposed, ...red, 'Interpositothalamic tract', ...superiorPeduncle]),
        note: 'The available interpositothalamic tract is shown as a whole exported connection; a separate interpositorubral segment is not fabricated.' },
      leaf('fastigiovestibular', 'Fastigiovestibular', ['Fastigiovestibular tract'], [...fastigial, ...vestibular]),
      leaf('fastigioreticular', 'Fastigioreticular', ['Fastigioreticular tract'], [...fastigial, ...reticular]),
    ]),
    group('guillain-mollaret', 'Guillain–Mollaret Triangle', [
      leaf('dentate', 'Dentate nucleus', [...dentate]),
      leaf('red', 'Red nucleus', [...red]),
      leaf('inferior-olive', 'Inferior olivary nucleus', [...olive]),
      leaf('dentatorubral', 'Dentatorubral fibers', [...dentato, 'Dentatorubral fibers']),
      leaf('central-tegmental', 'Central tegmental tract', [...triangleTegmental]),
      leaf('olivocerebellar', 'Olivocerebellar fibers', [...olivoCerebellar]),
    ], [...dentate, ...red, ...olive, ...dentato, ...triangleTegmental, ...olivoCerebellar, ...superiorPeduncle], {
      note: 'Both crossed loops are displayed with the original geometry: dentate nucleus, contralateral red nucleus and inferior olive. Dentatorubral fibers use the whole dentatorubrothalamic mesh; that segment cannot be separated.',
    }),
  ]),
  group('vestibular-oculomotor', 'Vestibular and oculomotor systems', [
    group('vestibulospinal', 'Vestibulospinal', [
      leaf('medial', 'Medial vestibulospinal', [...medialVestibulo]),
      leaf('lateral', 'Lateral vestibulospinal', [...lateralVestibulo]),
    ], [...vestibular, ...spinalTarget]),
    group('medial-longitudinal-fasciculus', 'Medial Longitudinal Fasciculus', [
      leaf('ascending', 'Ascending connections', ['Ascending medial longitudinal fasciculus']),
      leaf('descending', 'Descending connections', ['Descending medial longitudinal fasciculus']),
      leaf('oculomotor', 'Oculomotor connections', mlf.slice(0, 3)),
    ], [...mlf, ...medialVestibulo, ...vestibular, ...ocular], {
      note: 'The exported MLF connections are whole meshes named for their nuclear targets; separate ascending and descending segments are not available.',
    }),
    group('vestibulo-ocular', 'Vestibulo-Ocular', [
      leaf('vestibular-nuclei', 'Vestibular nuclei', [...vestibular]),
      leaf('oculomotor-nucleus', 'Oculomotor nucleus', ['Nucleus of oculomotor nerve']),
      leaf('trochlear-nucleus', 'Trochlear nucleus', ['Nucleus of trochlear nerve']),
      leaf('abducens-nucleus', 'Abducens nucleus', ['Nucleus of abducens nerve']),
      leaf('internuclear', 'Internuclear connections', ['Medial longitudinal fascicle - Internuclear fibers']),
    ], [...mlf, ...medialVestibulo, ...vestibular, ...ocular]),
  ]),
  group('brainstem-connections', 'Brainstem connections', [
    group('central-tegmental', 'Central Tegmental', [
      leaf('tract', 'Central tegmental tract', [...triangleTegmental, 'Central tegmental tract (nucleus tractus solitarii)'],
        [...solitaryThalamic]),
      leaf('vpm', 'Ventral posteromedial nucleus (VPM)', [...vpm], [...solitaryThalamic]),
      leaf('somatosensory-face', 'Somatosensory fibers — face', [...somatosensoryFace], [...solitaryThalamic]),
      leaf('rubro-olivary', 'Rubro-olivary connections', [...triangleTegmental], [...red, ...olive]),
    ]),
    group('reticular', 'Reticular', [
      leaf('reticulospinal', 'Reticulospinal', [...medialReticulo, ...lateralReticulo], [...reticular, ...spinalTarget]),
      leaf('raphe-spinal', 'Raphe-spinal', ['Raphe-spinal tract', 'Raphespinal tract'], [...reticular, ...spinalTarget]),
    ]),
    group('other', 'Other Connections', [
      leaf('tectobulbar', 'Tectobulbar', ['Tectobulbar tract'], [...reticular]),
      leaf('vestibulo-olivary', 'Vestibulo-olivary', ['Vestibuloolivary fibers'], [...vestibular, ...olive]),
      leaf('available-fibers', 'Other available brainstem fibers',
        ['Central tegmental tract (nucleus tractus solitarii)', 'Vestibular nerve fibers to nuclei'],
        [...solitaryThalamic, ...vestibular]),
    ]),
  ]),
];

/** Shared background reference, separate from each pathway's Hide/Show scope. */
export const LONG_TRACT_DEFINITIONS: readonly PathwayDefinition[] = [...pathwaySystems.map(system => ({
  ...system,
  children: [...system.children ?? [], group('context', system.id === 'ascending-sensory'
    ? 'Brainstem, thalamus and spinal cord orientation' : system.id === 'descending-motor'
      ? 'Brain and spinal cord orientation' : 'Brainstem and spinal cord anatomy (semitransparent)', [
    leaf('midbrain', 'Midbrain', ['Midbrain']),
    leaf('pons', 'Pons', ['Pons']),
    leaf('medulla', 'Medulla oblongata', ['Medulla oblongata']),
    leaf('spinal-white-matter', 'Spinal cord white matter', ['White matter of spinal cord']),
    ...(['ascending-sensory', 'cerebellar', 'brainstem-connections'].includes(system.id) ? [
      leaf('thalamus', 'Thalamus — capsule / orientation (semitransparent)', ['Thalamus']),
    ] : []),
    ...(system.id === 'descending-motor' ? [
      group('basal-ganglia', 'Basal ganglia', [
        leaf('caudate', 'Caudate nucleus', ['Caudate nucleus']),
        leaf('putamen', 'Putamen', ['Putamen']),
        leaf('globus-pallidus', 'Globus pallidus', ['Globus pallidus externus', 'Globus pallidus internus']),
      ]),
    ] : []),
    ...(['ascending-sensory', 'descending-motor', 'vestibular-oculomotor'].includes(system.id) ? [
      group('spinal-gray-matter', 'Spinal cord gray matter', [
        leaf('posterior-horn', 'Posterior horn', ['Posterior horn of spinal cord']),
        leaf('anterior-horn', 'Anterior horn', ['Anterior horn of spinal cord']),
        leaf('lateral-intermediate', 'Lateral intermediate substance', ['Lateral intermediate substance']),
      ]),
    ] : []),
  ])],
})), MIDBRAIN_GAZE_DEFINITION];
