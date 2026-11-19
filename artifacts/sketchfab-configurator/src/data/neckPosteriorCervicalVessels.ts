/** Regional supplying trunks, posterior branches and venous drainage references.
 * These names only assign memberships: actual meshes must exist in the Neck CSV.
 */
const arteries = new Set([
  'subclavian artery', 'vertebral artery', 'thyrocervical trunk', 'costocervical trunk',
  'transverse cervical artery', 'superficial branch of transverse cervical artery',
  'deep branch of transverse cervical artery', 'dorsal scapular artery',
  'deep cervical artery', 'ascending cervical artery', 'suprascapular artery',
  'occipital artery', 'posterior auricular artery',
]);
const veins = new Set([
  'subclavian vein', 'internal jugular vein', 'external jugular vein',
  'occipital vein', 'posterior auricular vein', 'suprascapular vein',
  'transverse cervical vein', 'dorsal scapular vein', 'deep cervical vein',
  'vertebral vein', 'cervical vertebral venous pleus', 'cervical vertebral venous plexus',
]);

export function isPosteriorCervicalVessel(name: string, tissue: 'arteries' | 'veins'): boolean {
  const canonical = name.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  return (tissue === 'arteries' ? arteries : veins).has(canonical);
}
