import type { NervousGroup } from './nervousTaxonomy';
import { isNeckInventorySection, NECK_NEUROVASCULAR_GROUPS } from './headNeckNeurovascularInventory';
import { ANTERIOR_NECK_SUPERFICIAL_ID } from './headNeckAnteriorTriangle';
import { NECK_NERVE_DETAILS, cervicalNerveLeafGroups } from './headNeckCervicalNerves';
import { LATERAL_FORAMEN_MAGNUM_GROUP } from './headNeckLateralNeck';
import { SUBMENTAL_MANDIBULAR_GROUP, SUBMENTAL_BRAINSTEM_GROUP } from './headNeckSubmental';
import { headNeckSubclavianGroups } from './headNeckSubclavianVessels';
import { headNeckMuscleGroups } from './headNeckMuscleGroups';

export const HEAD_NECK_TOPOGRAPHY_ROOT = ['advanced-neuroanatomy', 'head-neck-topography'] as const;
export const HEAD_NECK_TOPOGRAPHY_MODEL_UID = '29052deaffee44c0997dfbcfea4eb219';
export const HEAD_NECK_TISSUES = [
  ['nerves', 'Nerves and ganglia'], ['arteries', 'Arteries'], ['veins', 'Veins and venous plexuses'],
  ['muscles', 'Muscles'], ['bones', 'Bones and landmarks'], ['fasciae', 'Fasciae'],
  ['organs', 'Organs and glands'], ['joints', 'Joints and ligaments'],
] as const;
export type HeadNeckTissue = typeof HEAD_NECK_TISSUES[number][0];

// Regions overlap intentionally: memberships describe relationships of complete
// source meshes, not spatial clipping or exclusive anatomical ownership.
export const HEAD_NECK_REGIONS = [
  ['head', 'Head', [
    ['scalp-face', 'Scalp and superficial face'],
    ['temporal-infratemporal', 'Temporal and infratemporal regions'],
    ['parotid', 'Parotid and retromandibular region'],
    ['orbit', 'Orbit'],
    ['nasal-pterygopalatine', 'Nasal cavity and pterygopalatine region'],
    ['oral', 'Oral cavity and floor of mouth'],
    ['ear', 'Auricular and middle-ear region'],
  ]],
  ['anterior-triangle', 'Anterior triangle of neck', [
    ['submental', 'Submental triangle'],
    ['submandibular', 'Submandibular (digastric) triangle'],
    ['carotid', 'Carotid triangle and carotid sheath'],
    ['muscular', 'Muscular triangle and visceral compartment'],
  ]],
  ['lateral-neck', 'Lateral neck and posterior triangle', [
    ['sternocleidomastoid', 'Sternocleidomastoid region'],
    ['occipital-triangle', 'Occipital triangle'],
    ['omoclavicular', 'Omoclavicular (supraclavicular) triangle'],
  ]],
  ['deep-neck', 'Deep neck and root of neck', [
    ['prevertebral', 'Prevertebral and scalene region'],
    ['root-of-neck', 'Root of neck'],
    ['pharyngeal', 'Pharyngeal and parapharyngeal region'],
  ]],
  ['posterior-neck', 'Posterior neck and suboccipital region', [
    ['posterior-cervical', 'Posterior cervical region'],
    ['suboccipital', 'Suboccipital triangle and craniovertebral junction'],
  ]],
  ['glands', 'Glands and salivary ducts', [
    ['parotid', 'Parotid and accessory parotid glands'],
    ['submandibular', 'Submandibular glands'],
    ['sublingual', 'Sublingual glands'],
    ['lacrimal', 'Lacrimal glands'],
    ['thyroid', 'Thyroid gland'],
    ['parathyroid', 'Parathyroid glands'],
  ]],
] as const;
export type HeadNeckRegion = `${typeof HEAD_NECK_REGIONS[number][0]}/${string}`;

const tissueGroups = (path: readonly string[]): NervousGroup[] => HEAD_NECK_TISSUES.map(([id, label]) => ({
  id: [...path, id].join('/'), label,
  ...(id === 'muscles' ? { children: headNeckMuscleGroups([...path, id]) } : {}),
  ...(id in NECK_NEUROVASCULAR_GROUPS ? {
    children: [...NECK_NEUROVASCULAR_GROUPS[id as keyof typeof NECK_NEUROVASCULAR_GROUPS].map(([family, familyLabel]) => ({
      id: [...path, id, family].join('/'),
      label: path[2] === 'anterior-triangle' && id === 'nerves' && family === 'cranial'
        ? 'Caudal cranial nerves (IX–XII) and cervical branches' : familyLabel,
      ...(id === 'nerves' && family in NECK_NERVE_DETAILS ? {
        children: NECK_NERVE_DETAILS[family as keyof typeof NECK_NERVE_DETAILS].map(([detail, detailLabel]) => ({
          id: [...path, id, family, detail].join('/'), label: detailLabel,
          children: cervicalNerveLeafGroups([...path, id, family, detail], family, detail),
        })),
      } : {}),
      ...(id !== 'nerves' && family === 'subclavian'
        ? { children: headNeckSubclavianGroups([...path, id, family], id) } : {}),
    })), ...(path[2] === 'anterior-triangle' && path[3] === 'submental' && id === 'nerves'
      ? [SUBMENTAL_MANDIBULAR_GROUP] : [])],
  } : {}),
}));
const section = (id: string, label: string, children: readonly (readonly [string, string])[]): NervousGroup => ({
  id: [...HEAD_NECK_TOPOGRAPHY_ROOT, id].join('/'), label,
  children: [...children.map(([child, childLabel]) => {
    const path = [...HEAD_NECK_TOPOGRAPHY_ROOT, id, child];
    return { id: path.join('/'), label: childLabel, children: [
      ...tissueGroups(path),
      ...(id === 'anterior-triangle' && child === 'submental' ? [SUBMENTAL_BRAINSTEM_GROUP] : []),
      ...(id === 'lateral-neck' && child === 'occipital-triangle' ? [LATERAL_FORAMEN_MAGNUM_GROUP] : []),
    ] };
  }), ...(isNeckInventorySection(id) ? tissueGroups([...HEAD_NECK_TOPOGRAPHY_ROOT, id]) : []),
  ...(id === 'anterior-triangle' ? [{
    id: [...HEAD_NECK_TOPOGRAPHY_ROOT, id, ANTERIOR_NECK_SUPERFICIAL_ID].join('/'),
    label: 'Superficial layers (optional)',
    children: [
      { id: [...HEAD_NECK_TOPOGRAPHY_ROOT, id, ANTERIOR_NECK_SUPERFICIAL_ID, 'platysma'].join('/'), label: 'Platysma' },
      { id: [...HEAD_NECK_TOPOGRAPHY_ROOT, id, ANTERIOR_NECK_SUPERFICIAL_ID, 'investing-fascia'].join('/'), label: 'Superficial investing cervical fascia' },
    ],
  }] : [])],
});
export const HEAD_NECK_TOPOGRAPHY_GROUPS: readonly NervousGroup[] = [
  ...HEAD_NECK_REGIONS.map(([id, label, children]) => section(id, label, children)),
  section('cervical-plexus', 'Cervical plexus', [
    ['roots', 'C1–C4: modeled anterior rami'],
    ['spinal-context', 'C1–C4 spinal nerve context — roots, nerves and rami'],
    ['cutaneous', 'Cutaneous branches'],
    ['ansa', 'Ansa cervicalis — motor loop and roots'],
    ['phrenic', 'Phrenic nerves'],
    ['motor', 'Deep cervical muscular branches and C1 fibers via XII, where modeled'],
    ['relations', 'Muscular and vascular relations'],
  ]),
  section('ansa-cervicalis', 'Ansa cervicalis', [
    ['superior-root', 'Superior root (C1 via hypoglossal nerve)'],
    ['inferior-root', 'Inferior root (C2–C3)'],
    ['targets', 'Infrahyoid muscular targets'],
    ['relations', 'Carotid sheath and hypoglossal relations'],
  ]),
];
