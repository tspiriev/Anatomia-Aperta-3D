import type { NervousGroup } from './nervousTaxonomy';
import type { MusculoskeletalEntry } from './musculoskeletalTaxonomy';
import { isAttachmentSupportingBone } from './musculoskeletalAttachmentBones';

export const BACK_ATTACHMENT_VIEW = 'with-attachments';
export const BACK_MUSCLE_OVERVIEW = 'overview';
export const BACK_MUSCLE_OVERVIEW_LABEL = 'Overview — muscles, bones and ligaments';
export const BACK_MUSCLE_OVERVIEW_NOTE = 'Browse the muscle layers with the same supporting bones, joints and ligaments throughout. Attachment patches remain optional.';
const backGroups: readonly NervousGroup[] = [
  { id: 'superficial', label: 'Superficial (extrinsic)', children: [
    { id: 'trapezius', label: 'Trapezius' },
    { id: 'latissimus', label: 'Latissimus dorsi' },
    { id: 'scapular', label: 'Rhomboids and levator scapulae' },
  ] },
  { id: 'intermediate', label: 'Intermediate (extrinsic)', children: [
    { id: 'serrati', label: 'Serratus posterior' },
  ] },
  { id: 'deep', label: 'Deep (autochthonous)', children: [
    { id: 'splenii', label: 'Splenii' },
    { id: 'erector-spinae', label: 'Erector spinae', children: [
      { id: 'iliocostalis', label: 'Iliocostalis system' },
      { id: 'longissimus', label: 'Longissimus system' },
      { id: 'spinalis', label: 'Spinalis system' },
    ] },
    { id: 'transversospinal', label: 'Transversospinal system', children: [
      { id: 'semispinalis', label: 'Semispinalis' },
      { id: 'multifidus', label: 'Multifidus' },
      { id: 'rotatores', label: 'Rotatores (original unsegmented meshes)' },
    ] },
    { id: 'segmental', label: 'Short segmental muscles', children: [
      { id: 'interspinales', label: 'Interspinales' },
      { id: 'intertransversarii', label: 'Intertransversarii' },
      { id: 'costal-levators', label: 'Levatores costarum' },
    ] },
    { id: 'suboccipital', label: 'Suboccipital muscles' },
  ] },
];

/** Shared tree definitions, not a different viewer or duplicate source meshes. */
export function backMuscleGroups(prefix: readonly string[]): readonly NervousGroup[] {
  function build(group: NervousGroup, parent: readonly string[]): NervousGroup {
    const path = [...parent, group.id];
    const children = group.children?.map(child => build(child, path)) ?? [];
    return { id: path.join('/'), label: group.label, ...(children.length ? { children } : {}) };
  }
  return backGroups.map(group => build(group, prefix));
}

/** Opening context only; do not change pure superficial/deep layer isolation
 * or opt into attachment patches. Keep original whole-bone geometry and colors. */
export function isBackMuscleOverviewEntry(entry: MusculoskeletalEntry): boolean {
  if (entry.category === 'muscles')
    return entry.regions.includes('back') && backMuscleSubdivision(entry.name) !== null;
  if (entry.category === 'bones')
    return isAttachmentSupportingBone(entry, 'back') || /temporal bone/i.test(entry.name);
  return entry.category === 'joints-ligaments' && entry.regions.includes('back');
}

/** Named muscle family only: numbered patches are not exact host-bone maps. */
export function backMuscleSubdivision(rawName: string): readonly string[] | null {
  const n = rawName.toLowerCase().replace(/(?:\.\d{3})?(?:_\d+)?$/, '')
    .replace(/\.[oe]\d*[lr]$|\.[lr]$/, '').replace(/_/g, ' ')
    .replace(/\bmuscles?\b/g, '').replace(/\s+/g, ' ').trim();
  if (/trapezius/.test(n)) return ['superficial', 'trapezius'];
  if (/^latissimus dorsi$/.test(n)) return ['superficial', 'latissimus'];
  if (/^rhomboid (major|minor)$|^levator scapulae$/.test(n)) return ['superficial', 'scapular'];
  if (/^serratus posterior (superior|inferior)$/.test(n)) return ['intermediate', 'serrati'];
  if (/^splenius /.test(n)) return ['deep', 'splenii'];
  if (n === 'erector spinae') return ['deep', 'erector-spinae'];
  for (const family of ['iliocostalis', 'longissimus', 'spinalis'])
    if (n.startsWith(`${family} `)) return ['deep', 'erector-spinae', family];
  for (const family of ['semispinalis', 'multifidus', 'rotatores'])
    if (n === family || n.startsWith(`${family} `) || n === `cervical ${family}` || n.startsWith(`thoracic ${family}`))
      return ['deep', 'transversospinal', family];
  if (/\binterspinales\b/.test(n)) return ['deep', 'segmental', 'interspinales'];
  if (/\bintertransversarii\b/.test(n)) return ['deep', 'segmental', 'intertransversarii'];
  if (/^levatores (longi|breves) costarum$/.test(n)) return ['deep', 'segmental', 'costal-levators'];
  if (/^rectus posterior (major|minor) capitis$|^obliquus (superior|inferior) capitis$/.test(n))
    return ['deep', 'suboccipital'];
  return null;
}

export function backSubdivisionMatches(name: string, group: readonly string[]): boolean {
  const path = backMuscleSubdivision(name);
  return path !== null && group.every((part, i) => path[i] === part);
}

/** In intrinsic views, omit the shoulder/arm bones needed only by extrinsic
 * back muscles. Keep original complete bone geometry, never crop it. */
export function isDeepBackSupportingBone(entry: MusculoskeletalEntry, group: readonly string[]): boolean {
  if (group[0] !== 'deep') return true;
  const n = entry.name.toLowerCase();
  if (group[1] === 'suboccipital') return /occipital|temporal|atlas \(c1\)|axis \(c2\)/.test(n);
  return /vertebra|atlas \(c1\)|axis \(c2\)|sacrum|coccyx|hip bone|occipital|temporal|\brib\b/.test(n);
}
