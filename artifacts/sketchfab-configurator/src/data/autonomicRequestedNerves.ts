// Live-model additions may not yet exist in the earlier CSV. Match anatomical
// names, never instance IDs; the taxonomy normalizer handles sides and duplicates.
const trunkLevels = [
  ...Array.from({ length: 12 }, (_, i) => [`T${i + 1}`, `Th${i + 1}`]).flat(),
  ...Array.from({ length: 5 }, (_, i) => `L${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `S${i + 1}`),
];
const rootParts = [
  'anterior root', 'posterior root', 'dorsal root', 'ventral root',
  'anterior nerve root', 'posterior nerve root', 'nerve root', 'nerve roots',
  'root', 'root left', 'root right',
];
const rootNames = trunkLevels.flatMap(level => rootParts.map(part => `${level} ${part}`));
const pelvicSpinalNames = ['L', 'S'].flatMap(region =>
  Array.from({ length: 5 }, (_, i) => `${region}${i + 1}`)).flatMap(level => [
    ...rootParts, 'spinal nerve', 'spinal nerves', 'nerve', 'nerves', 'dorsal root ganglion',
  ].map(part => `${level} ${part}`));
export const AUTONOMIC_SPINAL_CORD_NAMES = [
  'White matter of spinal cord', 'Anterior horn of spinal cord', 'Posterior horn of spinal cord',
  'Lateral intermediate substance', 'Intermediolateral nucleus', 'Intermediomedial nucleus',
] as const;
const romanLevels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const intercostalNames = ['Intercostal nerve', 'Intercostal nerves',
  ...romanLevels.flatMap((roman, i) => [roman, String(i + 1)].flatMap(level =>
    ['', ' left', ' right'].map(side => `Intercostal nerve ${level}${side}`)))];
const communicatingRami = ['albi', 'grisei'].flatMap(kind => [
  `Rami communicantes ${kind}`,
  ...['cervical', 'thoracic', 'lumbar', 'sacral'].map(region => `Rami communicantes ${kind} ${region} region`),
]);

export const REQUESTED_AUTONOMIC_NERVES: readonly {
  names: readonly string[];
  paths: readonly (readonly string[])[];
}[] = [
  {
    names: ['Superior cervical cardiac sympathetic nerve',
      'Superior cervical cardiac sympathetic nerve right',
      'Right superior cervical cardiac sympathetic nerve'],
    paths: [['plexuses', 'cardiac']],
  },
  {
    names: [
      ...['Superior', 'Middle', 'Inferior'].map(level => `${level} cervical cardiac sympathetic nerve`),
      'Superior cervical cardiac sympathetic nerve right',
      'Right superior cervical cardiac sympathetic nerve',
    ],
    paths: [['sympathetic', 'cervical'], ['head-neck']],
  },
  {
    names: [1, 2, 3, 4].map(level => `C${level} anterior root`),
    paths: [['sympathetic', 'cervical'], ['head-neck']],
  },
  // The older lumbar export does not specify white/grey; include it without
  // relabelling the fiber type.
  { names: [...communicatingRami, 'Rami communicantes lumbar region'], paths: [['plexuses']] },
  { names: rootNames, paths: [['plexuses']] },
  { names: intercostalNames, paths: [['plexuses'], ['sympathetic', 'thoracic']] },
  {
    names: [
      ...AUTONOMIC_SPINAL_CORD_NAMES, 'Spinal cord', 'Conus medullaris',
      'Sympathetic trunk', 'Sympathetic nerves',
      'Sympathetic ganglia sacral region', 'Sacral sympathetic ganglia', 'Sacral sympathetic ganglion',
      ...pelvicSpinalNames,
    ],
    paths: [['plexuses', 'pelvic']],
  },
];
