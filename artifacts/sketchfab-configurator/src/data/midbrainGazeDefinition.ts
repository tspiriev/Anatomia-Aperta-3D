import type { PathwayDefinition } from './longTractDefinitions';

export const MIDBRAIN_GAZE_ID = 'midbrain-gaze-tectospinal';
export const MIDBRAIN_GAZE_ORIENTATION = [
  'Midbrain', 'Pons', 'Medulla oblongata', 'White matter of spinal cord',
  'Anterior horn of spinal cord', 'Posterior horn of spinal cord',
  'Intermediomedial nucleus', 'Intermediolateral nucleus',
] as const;
const entry = (id: string, label: string, ...primary: string[]): PathwayDefinition => ({ id, label, primary });
const superior = 'Superior colliculus';

/** Cross-collection memberships use source meshes without changing their names. */
export const MIDBRAIN_GAZE_DEFINITION: PathwayDefinition = {
  id: MIDBRAIN_GAZE_ID,
  label: 'Midbrain Gaze Centers and Tectospinal Pathway',
  note: 'Orientation retains the gross brainstem and spinal-cord white matter semitransparently, plus the exported anterior and posterior gray-matter horns and intermediomedial/intermediolateral spinal gray matter with their original materials.',
  children: [
    { id: 'medial-longitudinal-fasciculus', label: 'Medial Longitudinal Fasciculus', children: [
      entry('whole', 'Medial longitudinal fasciculus (MLF)',
        'Medial longitudinal fascicle', 'Medial longitudinal fasciculus', 'Medial longitudinal tract',
        'Medial longitudinal fascicle - Fibers to vestibular nuclei',
        'Medial longitudinal fascicle - Fibers to oculomotor nerve',
        'Medial longitudinal fascicle - Fibers to trochlear nerve',
        'Medial longitudinal fascicle - Fibers to abducens nerve',
        'Medial longitudinal fascicle - Internuclear fibers'),
      entry('vestibular-nuclei', 'Vestibular nuclei', 'Vestibular nuclei'),
      entry('oculomotor', 'Oculomotor nucleus (III)', 'Nucleus of oculomotor nerve'),
      entry('trochlear', 'Trochlear nucleus (IV)', 'Nucleus of trochlear nerve'),
      entry('abducens', 'Abducens nucleus (VI)', 'Nucleus of abducens nerve'),
      entry('internuclear', 'MLF internuclear connections', 'Medial longitudinal fascicle - Internuclear fibers'),
    ] },
    { id: 'gaze-centers', label: 'Midbrain Gaze Centers', children: [
      entry('cajal', 'Interstitial nucleus of Cajal', 'Interstitial nucleus of Cajal'),
      entry('darkschewitsch', 'Nucleus of Darkschewitsch', 'Nucleus of Darkschewitsch'),
      entry('superior-colliculus', 'Superior colliculus', superior),
      entry('periaqueductal-gray', 'Periaqueductal gray (associated midbrain structure)', 'Periaqueductal gray matter', 'Periaqueductal gray'),
      entry('vestibular-nuclei', 'Vestibular nuclei', 'Vestibular nuclei'),
    ] },
    { id: 'tectospinal-pathway', label: 'Tectospinal System', complete: [superior], children: [
      entry('superior-colliculus', 'Superior colliculus', superior),
      // Laterality-aware matching in longTractPathForGroup keeps these meshes
      // separate despite both normalizing to "tectospinal tract".
      entry('brainstem', 'Tectospinal tract (brainstem)', 'Tectospinal tract.l', 'Tectospinal tract.r'),
      entry('spinal-cord', 'Tectospinal tract (spinal cord)', 'Tectospinal tract'),
    ] },
  ],
};
