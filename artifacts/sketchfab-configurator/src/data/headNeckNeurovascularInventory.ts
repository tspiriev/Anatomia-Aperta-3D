import type { SceneNode } from '../types/sketchfab';
import { anteriorTriangleNerve } from './headNeckAnteriorTriangle';
import { skullBaseName, skullBaseNervousSource, skullBaseVesselKind } from './skullBaseSources';
import { isSkullBaseExternalCarotid, isHeadNeckExternalCarotid } from './skullBaseExternalCarotid';
import { headNeckCervicalNerveFamily, cervicalNerveDetail, cervicalNerveName, isCervicalAutonomicNerve } from './headNeckCervicalNerves';
import { headNeckSubclavianArteryPath, headNeckSubclavianVeinPath } from './headNeckSubclavianVessels';

export const NECK_INVENTORY_SECTIONS = ['anterior-triangle', 'lateral-neck', 'deep-neck', 'posterior-neck'] as const;
export type InventoryTissue = 'nerves' | 'arteries' | 'veins';
export const NECK_NEUROVASCULAR_GROUPS = {
  nerves: [
    ['spinal-roots', 'Spinal roots and root ganglia'],
    ['spinal-nerves', 'Spinal nerves and rami'],
    ['cranial', 'Cranial nerves, ganglia and branches'],
    ['cervical-plexus', 'Cervical plexus, ansa cervicalis and phrenic nerves'],
    ['brachial-plexus', 'Brachial plexus and branches'],
    ['autonomic', 'Sympathetic trunks, autonomic ganglia and plexuses'],
    ['other', 'Other nerves present in the model'],
  ],
  arteries: [
    ['carotid', 'Carotid trunks and external-carotid branches'],
    ['vertebral', 'Vertebral arteries and branches'],
    ['subclavian', 'Subclavian arteries, origins and branches'],
    ['other', 'Other arteries present in the model'],
  ],
  veins: [
    ['jugular', 'Jugular veins and tributaries'],
    ['vertebral', 'Vertebral and deep cervical veins / plexuses'],
    ['thyroid', 'Thyroid veins'],
    ['subclavian', 'Subclavian veins, tributaries and brachiocephalic outflow'],
    ['sinuses', 'Dural venous sinuses and connections'],
    ['other', 'Other veins and venous plexuses present in the model'],
  ],
} as const;

export function neckInventoryTissue(
  node: Pick<SceneNode, 'rawName'> & Partial<Pick<SceneNode, 'systemId'>>,
  canonicalName: string,
): InventoryTissue | null {
  if (anteriorTriangleNerve(canonicalName)) return 'nerves';
  const kind = skullBaseVesselKind(node.rawName);
  if (kind) return kind === 'arterial' ? 'arteries' : 'veins';
  // New live meshes may not exist in the older export. Require an actual
  // vascular classification as well as an unambiguous vessel name.
  if (node.systemId === 'vascular') {
    if (/vein|venous|venosu|sinus|vena cava|pterygoid plexus/.test(canonicalName)) return 'veins';
    if (/arter|aorta|(?:thyrocervical|costocervical|brachiocephalic) trunk/.test(canonicalName)) return 'arteries';
  }
  return null;
}

export function neckInventoryFamily(rawName: string, tissue: InventoryTissue): string {
  const name = cervicalNerveName(rawName);
  if (tissue === 'nerves') {
    if (isCervicalAutonomicNerve(rawName)) return 'autonomic';
    const cervicalFamily = headNeckCervicalNerveFamily(rawName);
    if (cervicalFamily) return cervicalFamily;
    if (/mylohyoid.*nerve|nerve to mylohyoid/.test(name)) return 'cranial';
    const cranialSource = [...skullBaseNervousSource.get(skullBaseName(rawName)) ?? []]
      .some(collection => collection.startsWith('NS_CN'));
    if (/ansa cervical|phrenic|great auricular|lesser occipital|transverse cervical|supraclavicular/.test(name)) return 'cervical-plexus';
    if ((!cranialSource && /root/.test(name)) || /^c[12] anterior posterior/.test(name)) return 'spinal-roots';
    if (/spinal nerve|ramus|rami|^c\d+ nerve/.test(name)) return 'spinal-nerves';
    if (!cranialSource && /sympathetic|gangli|plexus/.test(name)
      && !/trigeminal|gasserian|geniculate|ciliary|cilliary|pterygopalatine|otic|submandibular|brachial|vagus|glossopharyngeal/.test(name)) return 'autonomic';
    if (/brachial|musculocutaneous|median nerve|ulnar nerve|radial nerve|axillary nerve|suprascapular|dorsal scapular|long thoracic|pectoral nerve|thoracodorsal|subscapular/.test(name)) return 'brachial-plexus';
    if (cranialSource
      || /olfactory|optic nerve|oculomot|trochlear nerve|trigeminal|ophthalmic nerve|maxillary nerve|mandibular nerve|auriculotemporal|abducens|facial nerve|vestibulocochlear|glossopharyngeal|vagus|accessory nerve|hypoglossal|laryngeal nerve/.test(name)) return 'cranial';
    return 'other';
  }
  if (tissue === 'arteries') {
    if (/carotid/.test(name) || isSkullBaseExternalCarotid(rawName) || isHeadNeckExternalCarotid(rawName)) return 'carotid';
    if (/vertebral/.test(name)) return 'vertebral';
    if (headNeckSubclavianArteryPath(rawName)) return 'subclavian';
    if (/subclavian|thyrocervical|costocervical|cervical|suprascapular|dorsal scapular|intercostal|internal thoracic/.test(name)) return 'subclavian';
    return 'other';
  }
  if (/sinus/.test(name)) return 'sinuses';
  if (/jugular|facial|retromandibular|lingual|pharyngeal|occipital|auricular/.test(name)) return 'jugular';
  if (/vertebral|deep cervical/.test(name)) return 'vertebral';
  if (/thyroid/.test(name)) return 'thyroid';
  if (headNeckSubclavianVeinPath(rawName)) return 'subclavian';
  if (/subclavian|brachiocephalic/.test(name)) return 'subclavian';
  return 'other';
}

export function isNeckInventorySection(section: string): boolean {
  return (NECK_INVENTORY_SECTIONS as readonly string[]).includes(section);
}

export function neckInventorySubpath(rawName: string, tissue: InventoryTissue): string[] {
  const family = neckInventoryFamily(rawName, tissue);
  const detail = tissue === 'nerves' ? cervicalNerveDetail(rawName, family) : null;
  return [family, ...(detail ? [detail] : [])];
}
