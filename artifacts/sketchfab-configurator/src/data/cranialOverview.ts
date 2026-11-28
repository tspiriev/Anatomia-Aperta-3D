import { normalizeAdvancedObjectName } from './advancedCollection';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import { classifyBrainstemObject } from './brainstemTaxonomy';
import { opticAnatomyAliasRole } from './opticVisualContext';
import type { NervousGroup } from './nervousTaxonomy';

export const CRANIAL_OVERVIEW_PATH = ['advanced-neuroanatomy', 'cranial-nerves', 'overview'] as const;
export const CRANIAL_OVERVIEW_GROUP: NervousGroup = {
  id: CRANIAL_OVERVIEW_PATH.join('/'),
  label: 'Overview',
  children: [
    ['brain', 'Brainstem (semitransparent)'],
    ['bone-context', 'Sphenoid and temporal bones (semitransparent)'],
    ['inner-ear', 'Cochleae and vestibular labyrinth (temporal bones)'],
    ['nuclei', 'Cranial nerve nuclei'],
    ['nerves', 'Cranial nerves and main branches'],
    ['trigeminal', 'Trigeminal roots and main branches'],
    ['optic', 'Optic nerves, tracts and radiations'],
    ['olfactory', 'Olfactory nerves'],
    ['basal-nuclei', 'Basal forebrain nuclei'],
  ].map(([id, label]) => ({ id: [...CRANIAL_OVERVIEW_PATH, id].join('/'), label })),
};

// These are source-supported V roots/divisions and readily traceable branches,
// not the complete terminal-branch inventory from the detailed V category.
const trigeminalMain = new Set([
  'Motor root of trigeminal nerve', 'Trigeminal nerve root',
  'Trigeminal nerve (Gasserian) ganglion', 'Ophthalmic nerve',
  'Trigeminal nerve maxillary n (V)', 'Maxillary nerve', 'Maxillary nerve (V2)', 'Zygomatic nerve',
  'Anterior division of mandibular nerve', 'Posterior division of mandibular nerve',
  'Frontal nerve', 'Lacrimal nerve', 'Nasociliary nerve',
  'Auriculotemporal nerve', 'Lingual nerve', 'Inferior alveolar nerve',
  'Trunk of right inferior alveolar nerve',
].map(normalizeAdvancedObjectName));
const basalNuclei = new Set([
  'Septal nucleus', 'Basal nucleus of Maynert', 'Basal nucleus of Meynert',
  'Nucleus accumbens', 'Amygdaloid body', 'Amygdala',
].map(normalizeAdvancedObjectName));
const opticNames = new Set([
  'Optic nerve (II)', 'Optic nerve', 'Optic chiasm', 'Optic tract',
  'Optic radiation', 'Radiatio optica', 'Lateral geniculate body',
].map(normalizeAdvancedObjectName));
const olfactoryNames = new Set([
  'Olfactory nerve (I)', 'Olfactory nerve', 'Olfactory bulb', 'Olfactory tract',
].map(normalizeAdvancedObjectName));

export function cranialOverviewRole(rawName: string): string | null {
  const key = normalizeAdvancedObjectName(rawName);
  if (key === 'sphenoid bone' || key === 'temporal bone') return 'bone-context';
  if (['cochlea', 'vestibule', 'labyrinth', 'bony labyrinth', 'membranous labyrinth'].includes(key)) return 'inner-ear';
  if (classifyBrainGrossAnatomy(rawName)?.[2] === 'brainstem') return 'brain';
  const brainstem = classifyBrainstemObject(rawName);
  if (brainstem?.[2] === 'nuclei' && brainstem[3] !== 'other'
    && !['gracile', 'cuneate', 'accessory-cuneate'].includes(brainstem[4])) return 'nuclei';
  if (key === 'principal (pontine) neucleus of trigeminal nerve'
    || key === 'principal (pontine) nucleus of trigeminal nerve') return 'nuclei';
  if (opticNames.has(key) || opticAnatomyAliasRole(rawName) === 'tracts') return 'optic';
  if (olfactoryNames.has(key)) return 'olfactory';
  if (basalNuclei.has(key)) return 'basal-nuclei';
  if (trigeminalMain.has(key)) return 'trigeminal';
  return null;
}
