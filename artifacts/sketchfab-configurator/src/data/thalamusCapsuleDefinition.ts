import gross from './brainGrossAnatomyMemberships.json';

export type ThalamusComponent = {
  label: string; names: readonly string[]; cortex?: boolean; context?: boolean;
  role?: 'preceding-connection' | 'associated-structure';
};
const mesh = (label: string, ...names: string[]): ThalamusComponent => ({ label, names });
const cortex = (label: string, ...names: string[]): ThalamusComponent => ({ label, names, cortex: true });
const lobe = (id: 'frontal' | 'parietal' | 'occipital', label: string) => cortex(label, label, ...gross[id]);
export const THALAMUS_COMPONENTS = {
  av: mesh('AV', '01_Anterior_ventral_AV', 'Anterior ventral nucleus', 'Anteroventral nucleus'),
  ad: mesh('AD', '02_Anterior_dorsal_AD', 'Anterior dorsal nucleus', 'Anterodorsal nucleus'),
  am: mesh('AM', '03_Anterior_medial_AM', 'Anterior medial nucleus', 'Anteromedial nucleus'),
  md: mesh('MD', '04_Mediodorsal_MD', 'Mediodorsal nucleus'),
  va: mesh('VA', '10_Ventral_anterior_VA', 'Ventral anterior nucleus'),
  vl: mesh('VL', '11_Ventral_lateral_VL', 'Ventral lateral nucleus'),
  vpl: mesh('VPL', '12_Ventral_posterolateral_VPL', 'Ventral posterolateral nucleus'),
  vpm: mesh('VPM', '13_Ventral_posteromedial_VPM', 'Ventral posteromedial nucleus'),
  ld: mesh('LD', '08_Lateral_dorsal_LD', 'Lateral dorsal nucleus'),
  lp: mesh('LP', '09_Lateral_posterior_LP', 'Lateral posterior nucleus'),
  pum: mesh('Medial pulvinar', '14_Pulvinar_medial_PuM', 'Medial pulvinar'),
  pul: mesh('Lateral pulvinar', '15_Pulvinar_lateral_PuL', 'Lateral pulvinar'),
  pui: mesh('Inferior pulvinar', '16_Pulvinar_inferior_PuI', 'Inferior pulvinar'),
  midline: mesh('Midline nuclei', '05_Midline_nuclei', 'Midline nuclei'),
  rostral: mesh('Rostral intralaminar nuclei', '06_Intralaminar_rostral_CL_PC_CeM', 'Rostral intralaminar nuclei'),
  cmpf: mesh('Centromedian–parafascicular complex', '07_Centromedian_parafascicular_CM_Pf', 'Centromedian parafascicular complex'),
  lgb: mesh('Lateral geniculate body', 'Lateral geniculate body'),
  mgb: mesh('Medial geniculate body', 'Medial geniculate body'),
  thalamusOutline: { label: 'Thalamic outer surface', names: [
    'Thalamus', '00_Thalamic_background_core',
  ], context: true } satisfies ThalamusComponent,
  basalGangliaOutline: { label: 'Basal ganglia context', names: [
    'Caudate nucleus', 'Putamen', 'Globus pallidus externus', 'Globus pallidus internus',
    'Nucleus accumbens', 'Subthalamic nucleus', 'Substantia nigra pars compacta', 'Substantia nigra pars reticularis',
  ], context: true } satisfies ThalamusComponent,
  lenticularOrientation: { label: 'Caudate and lenticular nuclei context', names: [
    'Caudate nucleus', 'Putamen', 'Globus pallidus externus', 'Globus pallidus internus',
  ], context: true } satisfies ThalamusComponent,
  frontopontine: mesh('Frontopontine fibers', 'Fronto pontine fibers', 'Frontopontine fibers'),
  pontineNuclei: mesh('Pontine nuclei', 'Pontine nuclei', 'Pontine nucleus', 'Nuclei pontis'),
  parietopontine: mesh('Parietopontine fibers', 'Parietopontine fibers'),
  occipitopontine: mesh('Occipitopontine fibers', 'Occipitopontine fibers'),
  temporopontine: mesh('Temporopontine fibers', 'Temporopontine fibers', 'Temporoponne fibers'),
  dentate: mesh('Dentate nucleus', 'Dentate nucleus'),
  globose: mesh('Globose nucleus', 'Nucleus globosus', 'Globose nucleus'),
  emboliform: mesh('Emboliform nucleus', 'Nucleus emboliformis', 'Emboliform nucleus'),
  dentatorubrothalamic: { ...mesh('Dentatorubrothalamic tract — preceding connection', 'Dentatorubrothalamic tract'),
    role: 'preceding-connection' } satisfies ThalamusComponent,
  interpositothalamic: { ...mesh('Interpositothalamic tract — preceding connection', 'Interpositothalamic tract'),
    role: 'preceding-connection' } satisfies ThalamusComponent,
  superiorPeduncle: { ...mesh('Superior cerebellar peduncle — preceding connection', 'Superior cerebellar peduncle'),
    role: 'preceding-connection', context: true } satisfies ThalamusComponent,
  redNucleus: { ...mesh('Red nucleus — associated structure', 'Red nucleus'),
    role: 'associated-structure' } satisfies ThalamusComponent,
  pontocerebellar: mesh('Pontocerebellar fibers', 'Pontocerebellar fibers'),
  brainstemOutline: { label: 'Gross brainstem anatomy', names: [
    'Brainstem', ...gross.midbrain, ...gross.pons, ...gross['medulla-oblongata'],
  ], context: true } satisfies ThalamusComponent,
  cerebellumOutline: { label: 'Gross cerebellum anatomy', names: [
    'Cerebellum', 'Cerebellar hemisphere', ...gross['cerebellar-hemispheres'], ...gross.vermis,
  ], context: true } satisfies ThalamusComponent,
  anteriorRadiation: mesh('Anterior thalamic radiations', 'Fibers from anterior thalamic nuclei', 'Anterior thalamic radiation', 'Anterior thalamic radiations'),
  mdFibers: mesh('Mediodorsal thalamic fibers', 'Mediodorsal thalamic fibers'),
  corticobulbar: mesh('Corticobulbar fibers', 'Corticospinal tract face', 'Corticobulbar tract', 'Corticobulbar fibers'),
  motorNuclei: mesh('Brainstem motor nuclei', 'Nucleus of oculomotor nerve', 'Nucleus of trochlear nerve',
    'Nucleus of abducens nerve', 'Motor nucleus of trigeminal nerve', 'Motor tract of the trigeminal nerve',
    'Motor tract of trigeminal nerve', 'Motor nucleus of facial nerve', 'Nucleus of facial nerve', 'Nucleus ambiguus', 'Nucleus of hypoglossal nerve'),
  motorArm: mesh('Corticospinal fibers — Arm', 'Corticospinal tract arm'),
  motorTrunk: mesh('Corticospinal fibers — Trunk', 'Corticospinal tract trunk'),
  motorLeg: mesh('Corticospinal fibers — Leg', 'Corticospinal tract legs', 'Corticospinal tract leg'),
  sensoryArm: mesh('Somatosensory fibers — Arm', 'Somatosensory tract arm'),
  sensoryTrunk: mesh('Somatosensory fibers — Trunk', 'Somatosensory tract trunk'),
  sensoryLeg: mesh('Somatosensory fibers — Leg', 'Somatosensory tract legs', 'Somatosensory tract leg'),
  sensoryFace: mesh('Somatosensory fibers — Face', 'Somatosensory tract face'),
  gracileFasciculus: mesh('Gracile fasciculus', 'Gracile fasciculus'),
  cuneateFasciculus: mesh('Cuneate fasciculus', 'Cuneate fasciculus'),
  gracileNuclei: mesh('Gracile nuclei', 'Gracile nucleus', 'Gracile nuclei'),
  cuneateNuclei: mesh('Cuneate nuclei', 'Cuneate nucleus', 'Cuneate nuclei'),
  medialLemniscusArm: mesh('Medial lemniscus — arms', 'Medial lemniscus arms', 'Medial lemmniscus arms'),
  medialLemniscusLeg: mesh('Medial lemniscus — legs', 'Medial lemniscus legs'),
  internalArcuate: mesh('Internal arcuate fibers / medullary sensory decussation',
    'Internal arcuate fibers', 'Sensory decussation', 'Decussation of medial lemniscus', 'Decussation of the medial lemniscus'),
  lateralSpinothalamic: mesh('Lateral spinothalamic tract', 'Lateral spinothalamic tract'),
  anteriorSpinothalamic: mesh('Anterior spinothalamic tract', 'Anterior spinothalamic tract'),
  brainstemSpinothalamic: mesh('Spinothalamic tract in the brainstem', 'Spinothalamic tract', 'Spinothalamic tract in the brainstem'),
  principalTrigeminal: mesh('Principal sensory nucleus of trigeminal nerve',
    'Principal sensory nucleus of trigeminal nerve', 'Principal nucleus of trigeminal nerve',
    'Principal (pontine) nucleus of trigeminal nerve', 'Principal (pontine) neucleus of trigeminal nerve'),
  spinalTrigeminalNuclei: mesh('Spinal nucleus of trigeminal nerve', 'Spinal nucleus of trigeminal nerve'),
  spinalTrigeminal: mesh('Spinal trigeminal tract', 'Spinal trigeminal tract'),
  trigeminalPain: mesh('Trigeminal lemniscus — pain', 'Trigeminal lemniscus pain'),
  trigeminalProprioception: mesh('Trigeminal lemniscus — proprioception', 'Trigeminal lemniscus proprioception'),
  dorsalTrigeminal: mesh('Dorsal trigeminal tract (where separately available)', 'Dorsal trigeminal tract'),
  optic: mesh('Optic radiation', 'Optic radiation'),
  posteriorRadiation: mesh('Posterior thalamic radiations', 'Posterior thalamic radiation', 'Posterior thalamic radiations', 'Pulvinar fibers'),
  temporalOptic: mesh('Separately identifiable temporal optic radiations', 'Temporal optic radiation', 'Meyer loop', "Meyer's loop"),
  auditory: mesh('Auditory radiations', 'Auditory fibers', 'Auditory radiation', 'Auditory radiations'),
  auditoryNuclei: mesh('Auditory brainstem nuclei and relays',
    'Anterior cochlear nucleus', 'Posterior cochlear nucleus', 'Superior olivary complex',
    'N. of the lateral lemniscus', 'Nucleus of the lateral lemniscus', 'Inferior colliculus'),
  motorFibers: mesh('Motor thalamocortical fibers', 'Thalamocortical fibers to VL and VA', 'Motor thalamocortical fibers'),
  mammillo: mesh('Mammillothalamic tract', "bundle of Vicq d'Azyr tractus mamillothalamicus", 'Mammillothalamic tract'),
  lateralFibers: mesh('LD/LP thalamocortical fibers', 'Thalamocortical from lateral LD and LP'),
  parietalFibers: mesh('Pulvinar–parietal thalamocortical fibers', 'Thalamocortical from lateral pulvinar to parietal cortex'),
  pulvinarFibers: mesh('Pulvinar fibers', 'Pulvinar fibers'),
  frontal: lobe('frontal', 'Frontal lobe'),
  motorCortex: cortex('Precentral and premotor cortex', 'Precentral gyrus', 'Premotor cortex'),
  superiorFrontal: cortex('Superior frontal gyrus', 'Superior frontal gyrus'),
  sensoryCortex: cortex('Postcentral gyrus', 'Postcentral gyrus'),
  parietal: lobe('parietal', 'Parietal lobe'),
  occipital: lobe('occipital', 'Occipital lobe'),
  sublenticularCortex: cortex('Selected temporal gyri', 'Middle temporal gyrus',
    'Superior temporal gyrus (Lateral part)', 'Transverse temporal gyri'),
  auditoryCortex: cortex('Primary auditory cortex', 'Transverse temporal gyri', 'Primary auditory cortex', "Heschl's gyrus"),
  cingulate: cortex('Cingulate cortex', 'Cingulate gurys', 'Cingulate gyrus',
    'Cingulate gyrus (Posteroventral part*)', 'Cingulate gyrus and sulcus (Middle anterior part)',
    'Cingulate gyrus and sulcus (Posterior dorsal part)'),
} satisfies Record<string, ThalamusComponent>;

export type ComponentId = keyof typeof THALAMUS_COMPONENTS;
export const THALAMIC_NUCLEUS_IDS: ReadonlySet<ComponentId> = new Set([
  'av', 'ad', 'am', 'md', 'va', 'vl', 'vpl', 'vpm', 'ld', 'lp', 'pum', 'pul', 'pui',
  'midline', 'rostral', 'cmpf', 'lgb', 'mgb',
]);
export type ThalamusEntry = {
  id: string; label: string; components?: readonly ComponentId[]; children?: readonly ThalamusEntry[];
  side?: 'left' | 'right';
};
const entry = (id: string, label: string, ...components: ComponentId[]): ThalamusEntry => ({ id, label, components });
const bilateralFibers = (id: string, label: string, component: ComponentId): ThalamusEntry => ({
  id, label, children: [
    { ...entry('left', 'Left', component), side: 'left' },
    { ...entry('right', 'Right', component), side: 'right' },
  ],
});
const anterior: ComponentId[] = ['av', 'ad', 'am'];
const motor: ComponentId[] = ['va', 'vl', 'motorFibers', 'motorCortex'];
const body: ComponentId[] = ['sensoryArm', 'sensoryTrunk', 'sensoryLeg'];
const vplAscending: ComponentId[] = ['gracileFasciculus', 'cuneateFasciculus', 'gracileNuclei', 'cuneateNuclei',
  'medialLemniscusArm', 'medialLemniscusLeg', 'internalArcuate',
  'lateralSpinothalamic', 'anteriorSpinothalamic', 'brainstemSpinothalamic'];
const vpmAscending: ComponentId[] = ['principalTrigeminal', 'spinalTrigeminalNuclei', 'spinalTrigeminal',
  'trigeminalPain', 'trigeminalProprioception', 'dorsalTrigeminal'];
const vplSensory: ComponentId[] = ['vpl', ...vplAscending, ...body, 'sensoryCortex', 'brainstemOutline'];
const vpmSensory: ComponentId[] = ['vpm', ...vpmAscending, 'sensoryFace', 'sensoryCortex', 'brainstemOutline'];
const frontal: ComponentId[] = ['mdFibers', 'frontal'];
const limbic: ComponentId[] = ['mammillo', 'anteriorRadiation', 'cingulate'];
const lateral: ComponentId[] = ['lateralFibers', 'parietal'];
const parietalAssociation: ComponentId[] = ['ld', 'lp', 'pum', 'pul', 'pui',
  ...lateral, 'parietalFibers', 'pulvinarFibers'];
const visual: ComponentId[] = ['optic', 'occipital'];
const auditory: ComponentId[] = ['auditory', 'auditoryCortex'];

export const THALAMUS_CAPSULE_DEFINITIONS: readonly ThalamusEntry[] = [
  { id: 'internal-capsule', label: 'Internal capsule', components: parietalAssociation, children: [
    entry('anterior-limb', 'Anterior Limb', 'frontopontine', 'pontineNuclei', 'pontocerebellar', 'brainstemOutline', 'cerebellumOutline',
      'anteriorRadiation', 'md', ...anterior, 'mdFibers', 'frontal'),
    entry('genu', 'Genu', 'corticobulbar', 'motorCortex', 'motorNuclei',
      'thalamusOutline', 'basalGangliaOutline', 'brainstemOutline'),
    entry('posterior-limb', 'Posterior Limb', 'motorArm', 'motorTrunk', 'motorLeg', ...body,
      'va', 'vl', 'vpl', 'vpm', 'motorCortex', 'superiorFrontal', 'motorFibers', 'sensoryCortex', 'brainstemOutline', 'basalGangliaOutline',
      'dentate', 'globose', 'emboliform', 'dentatorubrothalamic', 'interpositothalamic', 'superiorPeduncle', 'redNucleus'),
    { ...entry('retrolenticular', 'Retrolenticular Part', 'optic', 'posteriorRadiation', 'lgb', 'pum', 'pul', 'pui', 'occipital',
      'parietopontine', 'occipitopontine', 'parietal', 'lenticularOrientation',
      'pontocerebellar', 'brainstemOutline', 'cerebellumOutline'), children: [
      { id: 'posterior-association-radiations', label: 'Posterior Association Thalamic Radiations', children: [
        bilateralFibers('ld-lp', 'LD/LP Thalamocortical Fibers', 'lateralFibers'),
        bilateralFibers('pulvinar-parietal', 'Pulvinar–Parietal Thalamocortical Fibers', 'parietalFibers'),
      ] },
    ] },
    entry('sublenticular', 'Sublenticular Part', 'mgb', 'auditory', 'sublenticularCortex',
      'temporalOptic', 'lenticularOrientation', 'temporopontine', 'auditoryNuclei',
      'pontocerebellar', 'brainstemOutline', 'cerebellumOutline'),
  ] },
  { id: 'thalamic-nuclei', label: 'Thalamic nuclei', children: [
    { id: 'anterior', label: 'Anterior', children: anterior.map(id => entry(id, THALAMUS_COMPONENTS[id].label, id, ...limbic)) },
    { id: 'mediodorsal', label: 'Mediodorsal', children: [entry('md', 'MD', 'md', ...frontal)] },
    { id: 'ventral-anterior', label: 'Ventral anterior — VA, VL', children: [
      entry('va', 'VA', 'va', 'motorFibers', 'superiorFrontal'),
      entry('vl', 'VL', 'vl', 'motorFibers', 'superiorFrontal'),
    ] },
    { id: 'ventral-posterior', label: 'Ventral posterior — VPL, VPM', children: [
      entry('vpl', 'VPL', ...vplSensory),
      entry('vpm', 'VPM', ...vpmSensory),
    ] },
    { id: 'lateral', label: 'Lateral', children: [entry('ld', 'LD', 'ld', ...lateral), entry('lp', 'LP', 'lp', ...lateral)] },
    { id: 'posterior', label: 'Posterior', children: [
      entry('pum', 'Medial pulvinar', 'pum', 'pulvinarFibers'),
      entry('pul', 'Lateral pulvinar', 'pul', 'parietalFibers', 'parietal'),
      entry('pui', 'Inferior pulvinar', 'pui', 'pulvinarFibers'),
    ] },
    { id: 'intralaminar-midline', label: 'Intralaminar and Midline', children: [
      entry('midline', 'Midline nuclei', 'midline'),
      entry('rostral', 'Rostral intralaminar nuclei', 'rostral'),
      entry('cmpf', 'Centromedian–parafascicular complex', 'cmpf'),
    ] },
    { id: 'metathalamus', label: 'Metathalamus', children: [
      entry('lgb', 'Lateral geniculate body', 'lgb', ...visual),
      entry('mgb', 'Medial geniculate body', 'mgb', ...auditory),
    ] },
  ] },
  { id: 'thalamocortical-pathways', label: 'Thalamocortical pathways', children: [
    entry('motor', 'Motor', ...motor, 'superiorFrontal', 'basalGangliaOutline'),
    entry('somatosensory', 'Somatosensory', ...vplSensory, ...vpmSensory),
    entry('prefrontal', 'Prefrontal', 'md', ...frontal),
    entry('limbic', 'Limbic', ...anterior, ...limbic),
    entry('parietal-association', 'Parietal Association', ...parietalAssociation),
    entry('visual', 'Visual', 'lgb', ...visual),
    entry('auditory', 'Auditory', 'mgb', ...auditory),
  ] },
];
