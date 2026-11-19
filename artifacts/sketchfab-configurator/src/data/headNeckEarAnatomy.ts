import { trigeminalEarRole } from './trigeminalEar';

/** Reuse reviewed ear identities, distinguishing tensor tympani from its nerve.
 * Ossicles remain bones; cochlea/labyrinth remain organs rather than CN VIII. */
export function headNeckEarTissue(canonicalName: string): 'bones' | 'muscles' | 'organs' | null {
  const name = canonicalName.replace(/ [lr]$/, '');
  if (['malleus', 'incus', 'stapes'].includes(name)) return 'bones';
  const role = trigeminalEarRole(name);
  if (role === 'inner-ear') return 'organs';
  if (role === 'muscle') return 'muscles';
  return null;
}
