import type { MusculoskeletalEntry, MusculoskeletalRegionId } from './musculoskeletalTaxonomy';

/**
 * Regional skeletal context, not a claimed host-bone mapping for each numbered
 * patch: the source export has no such metadata. Keep complete original meshes.
 */
export function isAttachmentSupportingBone(entry: MusculoskeletalEntry, region: MusculoskeletalRegionId): boolean {
  if (entry.category !== 'bones') return false;
  if (entry.regions.includes(region)) return true;
  const n = entry.name.toLowerCase().replace(/_/g, ' ');
  switch (region) {
    case 'head':
      return /hyoid|atlas \(c1\)|axis \(c2\)/.test(n);
    case 'neck':
      return (entry.regions.includes('head') && !/tooth|molar|canine|incisor|premolar|incus|malleus|stapes/.test(n))
        || /clavicle|scapula|sternum|^(first|second) rib/.test(n);
    case 'thorax':
      return /clavicle|scapula|humerus|vertebra l\d/.test(n);
    case 'back':
      return /hip bone|clavicle|humerus|occipital|\brib\b/.test(n);
    case 'abdomen':
      return /hip bone|sternum|xiphoid|^(seventh|eighth|ninth|tenth|eleventh|twelfth) rib/.test(n);
    case 'pelvis-perineum':
      return /femur|vertebra l\d/.test(n);
    case 'lower-limb':
      return /hip bone|sacrum|vertebra l\d|vertebra t12\b/.test(n);
    default:
      return false;
  }
}
