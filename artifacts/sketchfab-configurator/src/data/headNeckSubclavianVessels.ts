import type { NervousGroup } from './nervousTaxonomy';
import { cervicalNerveName } from './headNeckCervicalNerves';

// Reviewed against Cardiovascular_system_1792359799661.csv. Collection labels
// are not safe: subclavian trunks are in Upper Extremity, internal thoracic
// and costocervical branches span Cervical and Thoracic collections.
const nameOf = (rawName: string) => cervicalNerveName(rawName).replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
export function headNeckSubclavianArteryPath(rawName: string): readonly string[] | null {
  const name = nameOf(rawName);
  if (name === 'brachiocephalic trunk') return ['proximal-origin'];
  if (/^(?:trunk of )?subclavian arter(?:y|ies)$/.test(name)) return ['trunks'];
  if (name === 'vertebral artery') return ['vertebral'];
  if (name === 'internal thoracic artery') return ['internal-thoracic'];
  if (name === 'thyrocervical trunk') return ['thyrocervical', 'trunk'];
  if (name === 'inferior thyroid artery') return ['thyrocervical', 'inferior-thyroid'];
  if (name === 'ascending cervical artery') return ['thyrocervical', 'ascending-cervical'];
  if (name === 'transverse cervical artery') return ['thyrocervical', 'transverse-cervical', 'trunk'];
  if (/^(?:superficial|deep) branch of transverse cervical artery$/.test(name))
    return ['thyrocervical', 'transverse-cervical', name.startsWith('deep') ? 'deep' : 'superficial'];
  if (name === 'suprascapular artery') return ['thyrocervical', 'suprascapular'];
  if (name === 'costocervical trunk') return ['costocervical', 'trunk'];
  if (name === 'deep cervical artery') return ['costocervical', 'deep-cervical'];
  if (/^(?:supreme|superior) intercostal artery$/.test(name)) return ['costocervical', 'supreme-intercostal'];
  if (/^(?:first|second) posterior intercostal artery$/.test(name))
    return ['costocervical', 'upper-intercostals'];
  if (name === 'dorsal scapular artery') return ['dorsal-scapular'];
  return null;
}
export function headNeckSubclavianVeinPath(rawName: string): readonly string[] | null {
  const name = nameOf(rawName);
  if (/^(?:trunk of )?subclavian veins?$/.test(name)) return ['trunks'];
  if (name === 'axillary vein') return ['axillary-inflow', 'axillary'];
  if (name === 'cephalic vein') return ['axillary-inflow', 'cephalic'];
  if (name === 'external jugular vein') return ['external-jugular', 'trunk'];
  if (name === 'suprascapular vein') return ['external-jugular', 'suprascapular'];
  if (name === 'transverse cervical vein') return ['external-jugular', 'transverse-cervical'];
  if (name === 'anterior jugular vein' || name === 'jugular venous arch') return ['jugular-connections'];
  if (name === 'brachiocephalic vein') return ['brachiocephalic-outflow', 'trunks'];
  if (name === 'internal jugular vein') return ['brachiocephalic-outflow', 'jugular-confluence'];
  if (/^(?:deep cervical|vertebral) vein$|^cervical vertebral venous ple(?:xus|us)$/.test(name))
    return ['brachiocephalic-outflow', 'vertebral'];
  if (/^inferior thyroid veins?$/.test(name)) return ['brachiocephalic-outflow', 'inferior-thyroid'];
  if (/^internal thoracic veins?$/.test(name)) return ['brachiocephalic-outflow', 'internal-thoracic'];
  return null;
}
type Branch = { id: string; label: string; children?: readonly Branch[] };
const arteryBranches: readonly Branch[] = [
  { id: 'trunks', label: 'Subclavian arterial trunks' },
  { id: 'proximal-origin', label: 'Brachiocephalic trunk — proximal right-sided origin' },
  { id: 'vertebral', label: 'Vertebral arterial origin' },
  { id: 'internal-thoracic', label: 'Internal thoracic artery' },
  { id: 'thyrocervical', label: 'Thyrocervical trunk and branches', children: [
    { id: 'trunk', label: 'Thyrocervical trunk' },
    { id: 'inferior-thyroid', label: 'Inferior thyroid artery' },
    { id: 'ascending-cervical', label: 'Ascending cervical artery, when modeled' },
    { id: 'suprascapular', label: 'Suprascapular artery' },
    { id: 'transverse-cervical', label: 'Transverse cervical artery and branches', children: [
      { id: 'trunk', label: 'Transverse cervical arterial trunk' },
      { id: 'superficial', label: 'Superficial branch of transverse cervical artery' },
      { id: 'deep', label: 'Deep branch of transverse cervical artery' },
    ] },
  ] },
  { id: 'costocervical', label: 'Costocervical trunk and branches', children: [
    { id: 'trunk', label: 'Costocervical trunk' },
    { id: 'deep-cervical', label: 'Deep cervical artery' },
    { id: 'supreme-intercostal', label: 'Supreme intercostal artery' },
    { id: 'upper-intercostals', label: 'First and second posterior intercostal arteries — whole meshes' },
  ] },
  { id: 'dorsal-scapular', label: 'Dorsal scapular artery, when separately modeled' },
];
const veinBranches: readonly Branch[] = [
  { id: 'trunks', label: 'Subclavian venous trunks' },
  { id: 'axillary-inflow', label: 'Axillary inflow and cephalic drainage', children: [
    { id: 'axillary', label: 'Axillary veins — continuation into subclavian veins' },
    { id: 'cephalic', label: 'Cephalic veins — axillary inflow' },
  ] },
  { id: 'external-jugular', label: 'External jugular drainage and cervical tributaries', children: [
    { id: 'trunk', label: 'External jugular veins' },
    { id: 'suprascapular', label: 'Suprascapular veins' },
    { id: 'transverse-cervical', label: 'Transverse cervical veins, when modeled' },
  ] },
  { id: 'jugular-connections', label: 'Anterior jugular veins and jugular venous arch connections' },
  { id: 'brachiocephalic-outflow', label: 'Brachiocephalic outflow and related tributaries', children: [
    { id: 'trunks', label: 'Brachiocephalic veins' },
    { id: 'jugular-confluence', label: 'Internal jugular veins — venous-angle confluence' },
    { id: 'vertebral', label: 'Vertebral and deep cervical venous drainage' },
    { id: 'inferior-thyroid', label: 'Inferior thyroid venous drainage, when modeled' },
    { id: 'internal-thoracic', label: 'Internal thoracic venous drainage' },
  ] },
];
export function headNeckSubclavianGroups(path: readonly string[], tissue: string): NervousGroup[] {
  const make = (parent: readonly string[], branches: readonly Branch[]): NervousGroup[] => branches.map(branch => {
    const id = [...parent, branch.id];
    return { id: id.join('/'), label: branch.label, ...(branch.children ? { children: make(id, branch.children) } : {}) };
  });
  return make(path, tissue === 'arteries' ? arteryBranches : veinBranches);
}

/** Whole modeled vessels overlap where they form origins, branches or drainage
 * relationships. Do not extend subclavian vessels to unrelated facial/orbital menus. */
export function headNeckSubclavianRegions(rawName: string): { region: string; tissue: 'arteries' | 'veins' }[] {
  const artery = headNeckSubclavianArteryPath(rawName), vein = headNeckSubclavianVeinPath(rawName);
  if (!artery && !vein) return [];
  const tissue = artery ? 'arteries' as const : 'veins' as const;
  const regions = new Set(['deep-neck/root-of-neck', 'lateral-neck/omoclavicular']);
  const name = nameOf(rawName);
  if (/subclavian|brachiocephalic|jugular/.test(name)) regions.add('lateral-neck/sternocleidomastoid');
  if (/vertebral|deep cervical|transverse cervical|thyrocervical|costocervical|ascending cervical|dorsal scapular/.test(name))
    regions.add('deep-neck/prevertebral');
  if (/deep cervical|transverse cervical|dorsal scapular/.test(name)) {
    regions.add('lateral-neck/occipital-triangle');
    regions.add('posterior-neck/posterior-cervical');
  }
  if (/vertebral|deep cervical/.test(name)) regions.add('posterior-neck/suboccipital');
  if (/inferior thyroid|ascending cervical/.test(name)) regions.add('anterior-triangle/muscular');
  if (/jugular/.test(name)) regions.add('anterior-triangle/carotid');
  if (/subclavian|thyrocervical|transverse cervical|suprascapular|external jugular/.test(name))
    regions.add('cervical-plexus/relations');
  return [...regions].map(region => ({ region, tissue }));
}
