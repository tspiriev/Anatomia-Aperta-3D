import type { MusculoskeletalEntry } from './musculoskeletalTaxonomy';
import type { NervousGroup } from './nervousTaxonomy';

export const BONES_AND_JOINTS_ID = 'bones-and-joints';
export const SKELETAL_REGIONS = [
  { id: 'skull', label: 'Skull' },
  { id: 'cervical', label: 'Cervical region' },
  { id: 'upper-limb', label: 'Upper limb' },
  { id: 'thoracic', label: 'Thoracic region' },
  { id: 'lumbar', label: 'Lumbar region' },
  { id: 'pelvis', label: 'Pelvis and sacrum' },
  { id: 'lower-limb', label: 'Lower limb' },
] as const;
export type SkeletalRegion = typeof SKELETAL_REGIONS[number]['id'];

export const UPPER_LIMB_BONE_GROUPS = [
  { id: 'shoulder-girdle', label: 'Shoulder girdle — clavicle and scapula' },
  { id: 'arm', label: 'Arm — humerus' },
  { id: 'forearm', label: 'Forearm — radius and ulna' },
  { id: 'wrist', label: 'Wrist — carpal bones' },
  { id: 'hand', label: 'Hand — metacarpals and phalanges' },
] as const;
export function upperLimbBoneGroup(name: string): typeof UPPER_LIMB_BONE_GROUPS[number]['id'] | null {
  const n = name.toLowerCase().replace(/_/g, ' ');
  if (/clavicle|scapula/.test(n)) return 'shoulder-girdle';
  if (/humerus/.test(n)) return 'arm';
  if (/\bradius\b|\bulna\b/.test(n)) return 'forearm';
  if (/metacarpal|of hand/.test(n)) return 'hand';
  if (/scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate/.test(n)) return 'wrist';
  return null;
}

export const isBoneOrJoint = (entry: MusculoskeletalEntry) =>
  (entry.source === 'skeletal' || entry.source === 'joints')
  && (entry.category === 'bones' || entry.category === 'joints-ligaments');

/** Virtual regional references to the flat skeletal export; never new geometry. */
export function skeletalRegion(entry: MusculoskeletalEntry): SkeletalRegion | null {
  if (!isBoneOrJoint(entry)) return null;
  if (entry.skeletalRegions?.length) return entry.skeletalRegions[0];
  const name = entry.name.toLowerCase();
  if (/vertebra l\d/.test(name)) return 'lumbar';
  if (/vertebra t\d/.test(name)) return 'thoracic';
  if (entry.regions.includes('head')) return 'skull';
  // Neck's adjacent attachment bones retain their primary whole-skeleton
  // classification; adding context must not move ribs or the shoulder girdle.
  if (entry.regions.includes('upper-limb')) return 'upper-limb';
  if (entry.regions.includes('thorax')) return 'thoracic';
  if (entry.regions.includes('neck')) return 'cervical';
  if (entry.regions.includes('pelvis-perineum')) return 'pelvis';
  if (entry.regions.includes('lower-limb')) return 'lower-limb';
  return null;
}

export function skeletalRegions(entry: MusculoskeletalEntry): readonly SkeletalRegion[] {
  if (!isBoneOrJoint(entry)) return [];
  if (entry.skeletalRegions?.length) return entry.skeletalRegions;
  const region = skeletalRegion(entry);
  return region ? [region] : [];
}

export function bonesAndJointsGroup(entries: readonly MusculoskeletalEntry[], root: readonly string[]): NervousGroup {
  const path = [...root, BONES_AND_JOINTS_ID];
  return {
    id: path.join('/'), label: 'Bones and joints',
    children: SKELETAL_REGIONS.filter(region => entries.some(entry => skeletalRegions(entry).includes(region.id)))
      .map(region => ({
        id: [...path, region.id].join('/'), label: region.label,
        children: [
          { id: 'bones', label: 'Bones' },
          { id: 'joints-ligaments', label: 'Joints and Ligaments' },
        ].filter(category => entries.some(entry =>
          skeletalRegions(entry).includes(region.id) && entry.category === category.id))
          .map(category => ({ id: [...path, region.id, category.id].join('/'), label: category.label })),
      })),
  };
}
