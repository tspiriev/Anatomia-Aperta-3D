export type LowerLimbBranch = {
  id: string; label: string; names: readonly string[]; children?: readonly LowerLimbBranch[];
};
const branch = (id: string, label: string, ...names: string[]): LowerLimbBranch =>
  ({ id, label, names: names.length ? names : [label] });

/** Reviewed names from the nervous CSV, including branches misplaced in Other branches. */
export const LOWER_LIMB_DISTAL_BRANCHES: Readonly<Record<string, readonly LowerLimbBranch[]>> = {
  femoral: [branch('anterior-cutaneous', 'Anterior cutaneous branches of femoral nerve')],
  obturator: [
    branch('anterior', 'Anterior branch of obturator nerve'),
    branch('posterior', 'Posterior branch of obturator nerve'),
  ],
  tibial: [branch('medial-sural-cutaneous', 'Medial sural cutaneous nerve')],
  'common-fibular': [branch('sural-communicating', 'Sural communicating branch of common fibular nerve')],
  'superficial-fibular': [
    branch('dorsal-digital', 'Dorsal digital branches of superficial fibular nerve'),
    branch('intermediate-dorsal-cutaneous', 'Intermediate dorsal cutaneous nerve of foot'),
    branch('medial-dorsal-cutaneous', 'Medial dorsal cutaneous nerve of foot'),
  ],
  'deep-fibular': [
    branch('muscular', 'Muscular branches of deep fibular nerve'),
    branch('dorsal-digital', 'Dorsal digital branches of deep fibular nerve'),
  ],
  'medial-plantar': [
    branch('common-plantar-digital', 'Common plantar digital branches of medial plantar nerve'),
    branch('proper-plantar-digital', 'Proper plantar digital branches of medial plantar nerve'),
  ],
  'lateral-plantar': [
    branch('common-plantar-digital', 'Common plantar digital branches of lateral plantar nerve'),
    branch('proper-plantar-digital', 'Proper plantar digital branches of lateral plantar nerve'),
  ],
  saphenous: [
    branch('infrapatellar', 'Infrapatellar branch of saphenous nerve'),
    branch('medial-crural-cutaneous', 'Medial crural cutaneous branches of saphenous nerve'),
  ],
  sural: [
    branch('medial-sural-cutaneous', 'Medial sural cutaneous nerve'),
    branch('fibular-communicating', 'Sural communicating branch of common fibular nerve'),
  ],
};

export const LOWER_LIMB_DOWNSTREAM_NERVES: Readonly<Record<string, readonly string[]>> = {
  femoral: ['saphenous'],
  sciatic: ['tibial', 'common-fibular', 'superficial-fibular', 'deep-fibular', 'medial-plantar', 'lateral-plantar', 'sural'],
  tibial: ['medial-plantar', 'lateral-plantar', 'sural'],
  'common-fibular': ['superficial-fibular', 'deep-fibular', 'sural'],
};

export const PLEXUS_ADDITIONAL_BRANCHES: Readonly<Record<string, readonly LowerLimbBranch[]>> = {
  genitofemoral: [
    branch('femoral', 'Femoral branch of genitofemoral nerve'),
    branch('genital', 'Genital branch of genitofemoral nerve'),
  ],
  'posterior-femoral-cutaneous': [
    branch('anterior-root', 'Anterior root of posterior femoral cutaneous nerve'),
    branch('inferior-cluneal', 'Inferior cluneal nerves'),
  ],
};

export const LOWER_LIMB_OTHER_CUTANEOUS: readonly LowerLimbBranch[] = [
  { ...branch('posterior-femoral-cutaneous', 'Posterior femoral cutaneous (S1–S3)', 'Posterior femoral cutaneous nerve'),
    children: PLEXUS_ADDITIONAL_BRANCHES['posterior-femoral-cutaneous'] },
  branch('superior-cluneal', 'Superior cluneal nerves'),
  branch('medial-cluneal', 'Medial cluneal nerves', 'Medial clluneal nerves', 'Medial cluneal nerves'),
  branch('genitofemoral-femoral', 'Femoral branch of genitofemoral nerve'),
];
