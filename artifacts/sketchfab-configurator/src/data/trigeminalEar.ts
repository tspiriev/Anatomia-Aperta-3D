import { normalizeAdvancedObjectName } from './advancedCollection';
import type { NervousGroup } from './nervousTaxonomy';

export const TRIGEMINAL_EAR_PATH = ['advanced-neuroanatomy', 'cranial-nerves', 'v', 'ear-anatomy'] as const;
const labels = {
  nerve: 'Nerve to tensor tympani (V3)',
  muscle: 'Tensor tympani muscle (V3 motor target)',
  'middle-ear': 'Middle ear — tympanic membranes and auditory ossicles',
  'auditory-tube': 'Auditory (Eustachian) tubes',
  'inner-ear': 'Inner ear — cochleae and labyrinth / vestibule',
};
type EarRole = keyof typeof labels;
const roles = new Map<string, EarRole>();
function add(role: EarRole, names: readonly string[]) {
  for (const name of names) roles.set(normalizeAdvancedObjectName(name), role);
}
add('nerve', ['Tensor tympani nerve', 'Nerve to tensor tympani muscle',
  'Nerve to tensor tympani', 'Nerve to the tensor tympani muscle']);
// The creator corrected the live name to "Tensor tympani muscle".
// Retain the old misspelling for earlier models; never substitute a
// different muscle or the tensor tympani nerve.
add('muscle', ['Tensor tympani muscle', 'Tensor tympani', 'Tensor typmani muscle']);
add('middle-ear', ['Tympanic membrane', 'Malleus', 'Incus', 'Stapes']);
add('auditory-tube', ['Auditory tube', 'Eustachian tube', 'Pharyngotympanic tube']);
add('inner-ear', ['Cochlea', 'Vestibule', 'Labyrinth', 'Vestibular labyrinth',
  'Bony labyrinth', 'Membranous labyrinth', 'Semicircular canals', 'Semicircular ducts',
  'Anterior semicircular canal', 'Posterior semicircular canal', 'Lateral semicircular canal',
  'Anterior semicircular duct', 'Posterior semicircular duct', 'Lateral semicircular duct']);

export function trigeminalEarRole(rawName: string): EarRole | null {
  return roles.get(normalizeAdvancedObjectName(rawName)) ?? null;
}

/** Ear organs and ossicles are anatomical references, not V-innervated targets.
 * Only tensor tympani and its motor nerve are labelled as the V3 motor pathway. */
export const TRIGEMINAL_EAR_GROUP: NervousGroup = {
  id: TRIGEMINAL_EAR_PATH.join('/'),
  label: 'Ear anatomy and tensor tympani (V3)',
  children: Object.entries(labels).map(([role, label]) => ({
    id: [...TRIGEMINAL_EAR_PATH, role].join('/'), label,
  })),
};
