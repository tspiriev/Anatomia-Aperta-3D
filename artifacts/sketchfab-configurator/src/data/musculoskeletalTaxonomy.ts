import muscularCsv from '@assets/Final_Muscles_fused__1792221386788.csv?raw';
import skeletalCsv from '@assets/Skeletal_system_and_muscle_attachments_1792221386788.csv?raw';
import { csvRows } from './anatomicalSystems';
import { classifyAttachmentObject } from './attachmentTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { BONES_AND_JOINTS_ID, bonesAndJointsGroup, skeletalRegions, UPPER_LIMB_BONE_GROUPS, upperLimbBoneGroup, type SkeletalRegion } from './musculoskeletalSkeleton';
import { JOINT_SOURCE_ENTRIES } from './musculoskeletalJoints';
import { isAttachmentSupportingBone } from './musculoskeletalAttachmentBones';
import { BACK_ATTACHMENT_VIEW, BACK_MUSCLE_OVERVIEW, backMuscleGroups, backMuscleSubdivision, backSubdivisionMatches, isDeepBackSupportingBone, isBackMuscleOverviewEntry } from './musculoskeletalBack';
import { neckMuscleGroups, neckMuscleSubdivisions, neckBoneGroup, NECK_BONE_GROUPS } from './musculoskeletalNeck';
import { isUpperLimbTopographyPath, upperLimbTopographicPaths, upperLimbTopographyGroup } from './upperLimbTopography';
import { lowerLimbMuscleGroups, lowerLimbMuscleSubdivision } from './musculoskeletalLowerLimb';

export const MUSCULOSKELETAL_MODEL_UID = '956235f4a83f4c8da08ff7c94eb16ea7';
export const MUSCULOSKELETAL_REGIONS = [
  { id: 'head', label: 'Head' }, { id: 'neck', label: 'Neck' },
  { id: 'upper-limb', label: 'Upper Limb' }, { id: 'thorax', label: 'Thorax' },
  { id: 'back', label: 'Back' }, { id: 'abdomen', label: 'Abdomen' },
  { id: 'pelvis-perineum', label: 'Pelvis and Perineum' }, { id: 'lower-limb', label: 'Lower Limb' },
] as const;
export const MUSCULOSKELETAL_CATEGORIES = [
  { id: 'bones', label: 'Bones' }, { id: 'joints-ligaments', label: 'Joints and Ligaments' },
  { id: 'muscles', label: 'Muscles' }, { id: 'fasciae', label: 'Fasciae' }, { id: 'bursae', label: 'Bursae' },
] as const;
export type MusculoskeletalRegionId = typeof MUSCULOSKELETAL_REGIONS[number]['id'];
export type MusculoskeletalCategoryId = typeof MUSCULOSKELETAL_CATEGORIES[number]['id'] | 'attachments';
export type MusculoskeletalEntry = {
  name: string;
  regions: MusculoskeletalRegionId[];
  category: MusculoskeletalCategoryId;
  sourceCollection: string;
  source: 'muscular' | 'skeletal' | 'joints';
  skeletalRegions?: readonly SkeletalRegion[];
};
type SourceRow = { name: string; collection: string; parent: string };
const rows = (csv: string): SourceRow[] => [...csvRows(csv)]
  .filter(row => row[0] === 'OBJECT' && row[4] && ['MESH', 'CURVE'].includes(row[5]))
  .map(row => ({ name: row[4], collection: row[1], parent: row[2] }));
const muscularRows = rows(muscularCsv);
const skeletalRows = rows(skeletalCsv);
const key = (name: string) => name.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
const removeRuntimeSuffix = (name: string) => name.replace(/(?:\.\d{3})?(?:_\d+)?$/, '');
const attachmentSite = /\.[oe]\d*[lr](?:\.\d{3})?(?:_\d+)?$/i;
const muscleKey = (name: string) => key(name)
  .replace(/\.[oe]\d*[lr](?:\.\d{3})?(?: \d+)?$/, '')
  .replace(/\.[lr](?:\.\d{3})?(?: \d+)?$/, '')
  .replace(/[()]/g, '').replace(/\bmuscles?\b/g, '').replace(/\s+/g, ' ').trim()
  .replace(/^bucinator$/, 'buccinator');

const muscleCollectionRegions: Record<string, MusculoskeletalRegionId> = {
  'Head & Face': 'head', Neck: 'neck', 'Upper Limb': 'upper-limb', Thorax: 'thorax',
  Back: 'back', Abdomen: 'abdomen', Pelvis: 'pelvis-perineum', 'Lower Limb': 'lower-limb',
};
// Additional topographic Neck references; preserve the original CSV collection
// and whole source mesh, including the suboccipital muscles filed under Head.
const posteriorNeckMuscles = new Set([
  'splenius capitis', 'splenius colli', 'spinalis capitis', 'spinalis colli',
  'longissimus capitis', 'longissimus colli', 'semispinalis colli',
  'multifidus colli', 'interspinales colli', 'iliocostalis colli',
  'rectus posterior major capitis', 'rectus posterior minor capitis',
  'rectus lateralis capitis',
  'obliquus superior capitis', 'obliquus inferior capitis',
  'levator scapulae',
]);
const lowerLimbHipMuscles = new Set(['iliacus', 'psoas major', 'psoas minor']);
const pelvicGlutealMuscles = new Set(['gluteus maximus', 'gluteus medius', 'gluteus minimus']);
const thoracicParaspinalMuscles = new Set([
  'levatores longi costarum', 'levatores breves costarum',
  'semispinalis thoracis', 'multifidus thoracis', 'spinalis thoracis',
  'interspinales thoracis',
]);
const muscleRegions = new Map<string, MusculoskeletalRegionId[]>();
for (const row of muscularRows) {
  const region = muscleCollectionRegions[row.collection];
  if (row.parent !== '01 Muscles' || !region) continue;
  const identity = muscleKey(row.name);
  muscleRegions.set(identity, [...new Set([
    ...(muscleRegions.get(identity) ?? []), region,
    ...(posteriorNeckMuscles.has(identity) ? ['neck' as const] : []),
    ...(/^(descending|transverse) part of trapezius$/.test(identity) ? ['neck' as const] : []),
    ...(lowerLimbHipMuscles.has(identity) ? ['lower-limb' as const] : []),
    ...(pelvicGlutealMuscles.has(identity) ? ['pelvis-perineum' as const] : []),
    ...(thoracicParaspinalMuscles.has(identity) ? ['thorax' as const] : []),
    ...(identity === 'diaphragm' ? ['abdomen' as const] : []),
    ...(/^obliquus (superior|inferior) capitis$/.test(identity) ? ['back' as const] : []),
  ])]);
}

function primaryBoneRegions(name: string): MusculoskeletalRegionId[] {
  const n = key(name);
  if (/vertebra c\d|atlas \(c1\)|axis \(c2\)/.test(n)) return ['neck', 'back'];
  if (/vertebra t12\b/.test(n)) return ['thorax', 'back', 'abdomen', 'pelvis-perineum', 'lower-limb'];
  if (/vertebra t\d/.test(n)) return ['thorax', 'back', 'abdomen'];
  if (/vertebra l\d/.test(n)) return ['back', 'abdomen', 'pelvis-perineum', 'lower-limb'];
  if (/sacrum/.test(n)) return ['pelvis-perineum', 'back', 'abdomen', 'lower-limb'];
  if (/coccyx/.test(n)) return ['pelvis-perineum', 'back', 'abdomen'];
  if (/hip bone/.test(n)) return ['pelvis-perineum', 'abdomen', 'lower-limb'];
  if (/hyoid/.test(n)) return ['neck'];
  if (/\brib\b/.test(n)) return ['thorax', 'abdomen'];
  if (/sternum|xiphoid/.test(n)) return ['thorax'];
  if (/scapula/.test(n)) return ['upper-limb', 'back'];
  if (/clavicle|humerus|\bradius\b|\bulna\b|of hand|metacarpal|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate/.test(n)) return ['upper-limb'];
  if (/femur|patella|tibia|fibula|of foot|metatarsal|talus|calcaneus|navicular|cuboid|cuneiform/.test(n)) return ['lower-limb'];
  if (/frontal bone|parietal|temporal bone|occipital|sphenoid|ethmoid|zygomatic|maxilla|mandible|nasal|palatine|lacrimal|vomer|incus|malleus|stapes|tooth|canine|premolar|incisor/.test(n)) return ['head'];
  return [];
}

function boneRegions(name: string): MusculoskeletalRegionId[] {
  const original = primaryBoneRegions(name);
  // Additional Neck references must not replace a bone's original regions.
  return neckBoneGroup(name) ? [...new Set([...original, 'neck' as const])] : original;
}

function fasciaRegions(name: string): MusculoskeletalRegionId[] {
  const n = key(name);
  if (/epicranial|masseteric|temporal fascia/.test(n)) return ['head'];
  if (/cervical/.test(n)) return ['neck'];
  if (/thoracolumbar/.test(n)) return ['back'];
  if (/clavipectoral/.test(n)) return ['upper-limb', 'thorax'];
  if (/pectoral|diaphragmatic/.test(n)) return ['thorax'];
  if (/abdominal|transversalis/.test(n)) return ['abdomen'];
  if (/piriformis/.test(n)) return ['pelvis-perineum'];
  if (/iliopsoas/.test(n)) return ['pelvis-perineum', 'lower-limb'];
  if (/deltoid|antebrachial|brachial|palmar|of hand|wrist|metacarpal|pollicis|carpi|common flexor tendon sheath/.test(n)) return ['upper-limb'];
  if (/iliotibial|plantar|crural|fascia lata|popliteal|tensor fasciae latae|ankle|fibular|patellar|calcaneal/.test(n)) return ['lower-limb'];
  return [];
}

function bursaRegions(name: string): MusculoskeletalRegionId[] {
  const n = key(name);
  if (/trapezius/.test(n)) return ['back'];
  if (/piriformis|obturator internus/.test(n)) return ['pelvis-perineum'];
  if (/iliopectineal|iliacus/.test(n)) return ['pelvis-perineum', 'lower-limb'];
  if (/bicipitoradial|coracobrachial|intertubercular|acromial|subdeltoid|infraspinatus|teres major|triceps brachii/.test(n)) return ['upper-limb'];
  if (/anserine|patellar|biceps femoris|gluteal|gluteus|gastrocnemius|semimembranosus|malleolus|tibia|calcaneal|trochanteric|sartorius/.test(n)) return ['lower-limb'];
  return [];
}

// These existing reviewed name-based regions describe a muscle's attachment
// group, never an inferred spatial location of an individual origin patch.
const attachmentRegionMap: Record<string, MusculoskeletalRegionId> = {
  'head-face': 'head', cervical: 'neck', thoracic: 'thorax', back: 'back',
  abdominal: 'abdomen', 'hip-pelvis': 'pelvis-perineum',
  'upper-extremity': 'upper-limb', 'lower-extremity': 'lower-limb',
};
function attachmentRegions(name: string): MusculoskeletalRegionId[] {
  const direct = muscleRegions.get(muscleKey(name));
  if (direct) return [...direct];
  const previous = classifyAttachmentObject(name);
  const region = previous && attachmentRegionMap[previous[1]];
  return region ? [region] : [];
}

function articularRegions(name: string): MusculoskeletalRegionId[] {
  const n = key(name);
  if (/costal|\brib\b/.test(n)) return ['thorax'];
  if (/nasal|alar/.test(n)) return ['head'];
  if (/arytenoid|corniculate|cricoid|thyroid/.test(n)) return ['neck'];
  if (/upper limb|of hand|metacarpophalangeal|common (extensor|flexor) tendon/.test(n)) return ['upper-limb'];
  if (/plantar|patellar|tensor fasciae latae/.test(n)) return ['lower-limb'];
  return [];
}

const boneNames = new Set(skeletalRows.filter(r => r.collection === 'BONES' && !attachmentSite.test(r.name)).map(r => key(r.name)));
const existingSourceNames = new Set([...muscularRows, ...skeletalRows].map(row => key(row.name)));
export const MUSCULOSKELETAL_SOURCE_ENTRIES: readonly MusculoskeletalEntry[] = [
  ...muscularRows.map(row => {
    const region = muscleCollectionRegions[row.collection];
    const category: MusculoskeletalCategoryId = row.collection === '02 Fasciae' ? 'fasciae'
      : row.collection === '03 Bursae' ? 'bursae' : 'muscles';
    const regions = category === 'fasciae' ? fasciaRegions(row.name) : category === 'bursae'
      ? bursaRegions(row.name) : [...(muscleRegions.get(muscleKey(row.name)) ?? (region ? [region] : []))];
    return { name: row.name, regions, category, sourceCollection: row.collection, source: 'muscular' as const };
  }),
  ...skeletalRows.map(row => {
    // The CSV contains muscle attachment patches in BONES/CARTILAGE too.
    // Preserve their source metadata but never present these as joint models.
    const isMuscleAttachment = row.collection === 'MUSCLE_ATTACHMENTS'
      || (attachmentSite.test(row.name) && row.collection !== 'TENDON_LIGAMENT_ATTACHMENTS');
    const isBone = !isMuscleAttachment && (row.collection === 'BONES' || boneNames.has(key(row.name))
      // A whole Second rib.l is filed under CARTILAGE in this export.
      || (row.collection === 'CARTILAGE' && /^\w+ rib\.[lr]$/i.test(row.name)));
    const category: MusculoskeletalCategoryId = isMuscleAttachment ? 'attachments' : isBone ? 'bones' : 'joints-ligaments';
    return {
      name: row.name,
      regions: isMuscleAttachment ? attachmentRegions(row.name) : isBone ? boneRegions(row.name) : articularRegions(row.name),
      category, sourceCollection: row.collection, source: 'skeletal' as const,
    };
  }),
  // Keep original source records and avoid listing the overlapping right-hand
  // metacarpophalangeal capsule twice.
  ...JOINT_SOURCE_ENTRIES.filter(entry => !existingSourceNames.has(key(entry.name))),
];

const byName = new Map<string, MusculoskeletalEntry[]>();
for (const entry of MUSCULOSKELETAL_SOURCE_ENTRIES) {
  const name = key(entry.name);
  byName.set(name, [...(byName.get(name) ?? []), entry]);
}
// Anatomical synonyms for source names; never duplicate a source mesh.
const muscleNameAliases = new Map([
  ['semispinalis cervicis', 'Semispinalis colli muscle'],
  ['splenius cervicis', 'Splenius colli muscle'],
  ['longissimus cervicis', 'Longissimus colli muscle'],
  ['spinalis cervicis', 'Spinalis colli muscle'],
  ['multifidus cervicis', 'Multifidus colli muscle'],
  ['interspinales cervicis', 'Interspinales colli muscles'],
  ['rectus capitis lateralis', 'Rectus lateralis capitis muscle'],
  ['rectus capitis posterior minor', 'Rectus posterior minor capitis muscle'],
  ['rectus capitis posterior major', 'Rectus posterior major capitis muscle'],
  ['obliquus capitis superior', 'Obliquus superior capitis muscle'],
  ['obliquus capitis inferior', 'Obliquus inferior capitis muscle'],
  ['psoas major', 'Psoas major'],
  ['iliacus', 'Iliacus muscle'],
  ['levatores costarum longi', 'Levatores longi costarum'],
  ['levatores costarum breves', 'Levatores breves costarum'],
]);
const requestedCervicalMeshLabels = [
  'Semispinalis capitis', 'Cervical intertransversarii', 'Cervical rotatores',
] as const;
function requestedCervicalMeshFamily(rawName: string): typeof requestedCervicalMeshLabels[number] | null {
  const name = removeRuntimeSuffix(rawName);
  if (attachmentSite.test(name)) return null;
  const identity = muscleKey(name);
  if (identity === 'semispinalis capitis') return 'Semispinalis capitis';
  if (/^(?:(?:anterior|posterior) )?intertransversarii (?:(?:anteriores|posteriores) )?(?:colli|cervicis|cervicales)$/.test(identity)
    || identity === 'cervical intertransversarii') return 'Cervical intertransversarii';
  if (/^rotatores (?:colli|cervicis|cervicales)$/.test(identity)
    || identity === 'cervical rotatores') return 'Cervical rotatores';
  return null;
}
const requestedThoracicMeshLabels = ['Thoracic intertransversarii', 'Thoracic rotatores'] as const;
function requestedThoracicMeshFamily(rawName: string): typeof requestedThoracicMeshLabels[number] | null {
  const name = removeRuntimeSuffix(rawName);
  if (attachmentSite.test(name)) return null;
  const identity = muscleKey(name);
  if (/^(?:(?:anterior|posterior) )?intertransversarii (?:thoracis|thoracici)$/.test(identity)
    || identity === 'thoracic intertransversarii') return 'Thoracic intertransversarii';
  if (/^rotatores (?:(?:breves|longi) )?(?:thoracis|thoracici)$/.test(identity)
    || /^thoracic rotatores(?: (?:breves|longi))?$/.test(identity)) return 'Thoracic rotatores';
  return null;
}
export function classifyMusculoskeletalNode(rawName: string): readonly MusculoskeletalEntry[] {
  const source = byName.get(key(rawName)) ?? byName.get(key(removeRuntimeSuffix(rawName)));
  if (source) return source;
  const name = removeRuntimeSuffix(rawName);
  if (!attachmentSite.test(name)) {
    const alias = muscleNameAliases.get(muscleKey(name));
    if (alias) {
      const side = name.match(/\.[lr]$/i)?.[0] ?? '';
      const target = byName.get(key(`${alias}${side}`));
      if (target) return target;
    }
    // Also recognize an unsided live psoas-major mesh, or psoas minor (absent
    // from the CSV), without inventing source records or substituting fascia.
    if (['psoas major', 'psoas minor'].includes(muscleKey(name))) return [{
      name, regions: ['pelvis-perineum', 'lower-limb'], category: 'muscles',
      sourceCollection: 'Requested lower-limb live-model anatomy', source: 'muscular',
    }];
  }
  // These user-requested structures are absent from the supplied CSV. Recognize
  // them only when an actual live node has this name; no placeholder source
  // records or geometry are added, and generic/lumbar meshes are not substitutes.
  if (requestedThoracicMeshFamily(name)) return [{
    name, regions: ['back', 'thorax'], category: 'muscles',
    sourceCollection: 'Requested thoracic live-model anatomy', source: 'muscular',
  }];
  return requestedCervicalMeshFamily(name) ? [{
    name, regions: ['neck', 'back'], category: 'muscles',
    sourceCollection: 'Requested cervical live-model anatomy', source: 'muscular',
  }] : [];
}
export function missingRequestedCervicalMeshes(nodes: readonly Pick<SceneNode, 'rawName'>[]): string[] {
  const present = new Set(nodes.map(node => requestedCervicalMeshFamily(node.rawName)));
  return requestedCervicalMeshLabels.filter(label => !present.has(label));
}
export function missingRequestedThoracicMeshes(nodes: readonly Pick<SceneNode, 'rawName'>[]): string[] {
  const present = new Set(nodes.map(node => requestedThoracicMeshFamily(node.rawName)));
  return requestedThoracicMeshLabels.filter(label => !present.has(label));
}
export function missingRequestedLowerLimbMeshes(nodes: readonly Pick<SceneNode, 'rawName'>[]): string[] {
  const present = new Set(nodes.flatMap(node => classifyMusculoskeletalNode(node.rawName)
    .filter(entry => entry.category === 'muscles').map(entry => muscleKey(entry.name))));
  return [
    ['iliacus', 'Iliacus'], ['psoas major', 'Psoas major'], ['psoas minor', 'Psoas minor'],
  ].filter(([identity]) => !present.has(identity)).map(([, label]) => label);
}
export function musculoskeletalSide(rawName: string): 'left' | 'right' | 'bilateral' {
  const side = rawName.match(/\.(?:[oe]\d*)?([lr])(?:\.\d{3})?(?:_\d+)?$/i)?.[1]?.toLowerCase();
  return side === 'l' ? 'left' : side === 'r' ? 'right' : 'bilateral';
}
export function matchedMuscleAttachmentIds(selected: SceneNode, nodes: readonly SceneNode[]): number[] {
  if (!classifyMusculoskeletalNode(selected.rawName).some(entry => entry.category === 'muscles')) return [];
  const canonicalIdentity = (name: string) => {
    const identity = muscleKey(removeRuntimeSuffix(name));
    return muscleKey(muscleNameAliases.get(identity) ?? identity);
  };
  const identity = canonicalIdentity(selected.rawName);
  const side = musculoskeletalSide(selected.rawName);
  return nodes.filter(node => {
    if (!classifyMusculoskeletalNode(node.rawName).some(entry => entry.category === 'attachments')) return false;
    if (canonicalIdentity(node.rawName) !== identity) return false;
    return side === 'bilateral' || musculoskeletalSide(node.rawName) === side;
  }).map(node => node.instanceID);
}

export const MUSCULOSKELETAL_ROOT_PATH = ['musculoskeletal-system', 'regions'] as const;
export const cleanMusculoskeletalPath = (path: readonly string[]) => path.filter(part => !part.startsWith('@side-'));
export const musculoskeletalPathSide = (path: readonly string[]) =>
  path.includes('@side-left') ? 'left' : path.includes('@side-right') ? 'right' : 'bilateral';
/** Keep reference bones/joints during isolation, without adding them to muscle
 * Show/Hide controls or changing the optional attachment layer. */
export function musculoskeletalIsolationPathForGroup(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  const path = cleanMusculoskeletalPath(requested);
  // The creator wants both iliac/hip bones as orientation throughout Lower Limb,
  // including individual tissue and muscle subgroups. Keep them in Bones for
  // browsing; do not fold them into muscle Show/Hide controls.
  if (MUSCULOSKELETAL_ROOT_PATH.every((part, i) => path[i] === part)
    && path[2] === 'lower-limb'
    && classifyMusculoskeletalNode(node.rawName).some(entry =>
      entry.category === 'bones' && /^hip bone(?:\.[lr])?$/.test(key(entry.name)))) {
    const side = musculoskeletalPathSide(requested), nodeSide = musculoskeletalSide(node.rawName);
    return side === 'bilateral' || nodeSide === 'bilateral' || side === nodeSide
      ? [...path, 'bones'] : null;
  }
  if (MUSCULOSKELETAL_ROOT_PATH.every((part, i) => path[i] === part)
    && path[2] === 'back' && path[3] === 'muscles'
    && ['superficial', 'intermediate', 'deep'].includes(path[4])
    && !path.includes(BACK_ATTACHMENT_VIEW)) {
    const side = musculoskeletalPathSide(requested);
    const nodeSide = musculoskeletalSide(node.rawName);
    if (side !== 'bilateral' && nodeSide !== 'bilateral' && nodeSide !== side) return null;
    const context = classifyMusculoskeletalNode(node.rawName).find(entry =>
      ['bones', 'joints-ligaments'].includes(entry.category) && isBackMuscleOverviewEntry(entry));
    if (context) return [...path, context.category];
  }
  return musculoskeletalPathForGroup(node, requested);
}
export function musculoskeletalPathForGroup(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  const path = cleanMusculoskeletalPath(requested);
  if (!MUSCULOSKELETAL_ROOT_PATH.every((part, i) => path[i] === part)) return null;
  const side = musculoskeletalPathSide(requested);
  const nodeSide = musculoskeletalSide(node.rawName);
  if (side !== 'bilateral' && nodeSide !== 'bilateral' && side !== nodeSide) return null;
  // Abdomen has one skeletal collection. Its Muscles opening view keeps that
  // same skeletal context, without reclassifying source meshes or enabling sites.
  if (path[2] === 'abdomen' && ['bones', 'muscles'].includes(path[3])) {
    for (const entry of classifyMusculoskeletalNode(node.rawName)) {
      if (!entry.regions.includes('abdomen')) continue;
      const skeletal = entry.category === 'bones' || entry.category === 'joints-ligaments';
      if (skeletal || (path[3] === 'muscles' && entry.category === 'muscles')) {
        const leaf = [...MUSCULOSKELETAL_ROOT_PATH, 'abdomen', path[3], entry.category];
        if (path.every((part, i) => leaf[i] === part)) return leaf;
      }
    }
    return null;
  }
  if (isUpperLimbTopographyPath(path)) {
    for (const entry of classifyMusculoskeletalNode(node.rawName)) {
      for (const relative of upperLimbTopographicPaths(entry)) {
        const leaf = [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb', 'topography', ...relative];
        if (path.every((part, i) => leaf[i] === part)) return leaf;
      }
    }
    return null;
  }
  if (path[2] === BONES_AND_JOINTS_ID) {
    for (const entry of classifyMusculoskeletalNode(node.rawName)) {
      for (const region of skeletalRegions(entry)) {
        const leaf = [...MUSCULOSKELETAL_ROOT_PATH, BONES_AND_JOINTS_ID, region, entry.category];
        if (path.every((part, i) => leaf[i] === part)) return leaf;
      }
    }
    return null;
  }
  if (path[2] === 'back' && path[3] === 'muscles') {
    const parts = path.slice(4);
    const viewIndex = parts.indexOf(BACK_ATTACHMENT_VIEW);
    const group = viewIndex < 0 ? parts : parts.slice(0, viewIndex);
    for (const entry of classifyMusculoskeletalNode(node.rawName)) {
      if ((!parts.length || parts[0] === BACK_MUSCLE_OVERVIEW) && isBackMuscleOverviewEntry(entry)) {
        const leaf = [...MUSCULOSKELETAL_ROOT_PATH, 'back', 'muscles', BACK_MUSCLE_OVERVIEW, entry.category];
        if (path.every((part, i) => leaf[i] === part)) return leaf;
      }
      if (viewIndex >= 0) {
        const isMuscleOrSite = entry.regions.includes('back')
          && ['muscles', 'attachments'].includes(entry.category)
          && backSubdivisionMatches(entry.name, group);
        const isBone = isAttachmentSupportingBone(entry, 'back') && isDeepBackSupportingBone(entry, group);
        if (isMuscleOrSite || isBone)
          return [...MUSCULOSKELETAL_ROOT_PATH, 'back', 'muscles', ...group, BACK_ATTACHMENT_VIEW, entry.category];
      } else if (entry.category === 'muscles' && entry.regions.includes('back')) {
        const leaf = [...MUSCULOSKELETAL_ROOT_PATH, 'back', 'muscles', ...(backMuscleSubdivision(entry.name) ?? [])];
        if (path.every((part, i) => leaf[i] === part)) return leaf;
      }
    }
    return null;
  }
  if (path[3] === 'attachments' && MUSCULOSKELETAL_REGIONS.some(region => region.id === path[2])) {
    const region = path[2] as MusculoskeletalRegionId;
    if (classifyMusculoskeletalNode(node.rawName).some(entry => isAttachmentSupportingBone(entry, region))) {
      const leaf = [...MUSCULOSKELETAL_ROOT_PATH, region, 'attachments', 'bones'];
      return path.every((part, i) => leaf[i] === part) ? leaf : null;
    }
  }
  for (const entry of classifyMusculoskeletalNode(node.rawName)) {
    // Regional Show/Isolate never automatically turns on the optional layer.
    if (entry.category === 'attachments' && path[3] !== 'attachments') continue;
    for (const region of entry.regions) {
      const boneGroup = region === 'upper-limb' && entry.category === 'bones'
        ? upperLimbBoneGroup(entry.name)
        : region === 'neck' && entry.category === 'bones' ? neckBoneGroup(entry.name) : null;
      const subdivision = entry.category === 'attachments'
        ? ['sites', ...(region === 'back' ? backMuscleSubdivision(entry.name) ?? [] : [])]
        : boneGroup ? [boneGroup] : [];
      const subdivisions = region === 'neck' && entry.category === 'muscles'
        ? neckMuscleSubdivisions(entry.name)
        : region === 'lower-limb' && entry.category === 'muscles'
          ? [lowerLimbMuscleSubdivision(entry.name) ?? []] : [subdivision];
      for (const parts of subdivisions) {
        const leaf = [...MUSCULOSKELETAL_ROOT_PATH, region, entry.category, ...parts];
        if (path.every((part, i) => leaf[i] === part)) return leaf;
      }
    }
  }
  return null;
}
/** Clearing an individual-muscle selection must not hide sites now owned by
 * the whole attachment collection. Visibility edits alone do not call this. */
export function previousAttachmentSitesToHide(
  ids: readonly number[], nodes: readonly SceneNode[], activePath: readonly string[] | null,
): number[] {
  if (!activePath) return [...ids];
  const path = cleanMusculoskeletalPath(activePath);
  if (path[3] !== 'attachments' && !isUpperLimbTopographyPath(path)
    && !(path[2] === 'back' && path[3] === 'muscles' && path.includes(BACK_ATTACHMENT_VIEW)))
    return [...ids];
  const byId = new Map(nodes.map(node => [node.instanceID, node]));
  return ids.filter(id => {
    const node = byId.get(id);
    return !node || !musculoskeletalPathForGroup(node, activePath);
  });
}
export const MUSCULOSKELETAL_GROUPS: readonly NervousGroup[] = [
  bonesAndJointsGroup(MUSCULOSKELETAL_SOURCE_ENTRIES, MUSCULOSKELETAL_ROOT_PATH),
  ...MUSCULOSKELETAL_REGIONS.map(region => ({
  id: [...MUSCULOSKELETAL_ROOT_PATH, region.id].join('/'),
  label: region.label,
  children: [
    ...(region.id === 'upper-limb'
      ? [upperLimbTopographyGroup([...MUSCULOSKELETAL_ROOT_PATH, region.id], MUSCULOSKELETAL_SOURCE_ENTRIES)] : []),
    ...[...MUSCULOSKELETAL_CATEGORIES, { id: 'attachments' as const, label: 'Muscle Attachments (optional)' }]
    .filter(category => !(region.id === 'abdomen' && category.id === 'joints-ligaments'))
    .filter(category => MUSCULOSKELETAL_SOURCE_ENTRIES.some(entry =>
      entry.category === category.id && entry.regions.includes(region.id)))
    .map(category => ({
      id: [...MUSCULOSKELETAL_ROOT_PATH, region.id, category.id].join('/'),
      label: region.id === 'abdomen' && category.id === 'bones' ? 'Bones and joints' : category.label,
      ...(region.id === 'back' && category.id === 'muscles' ? {
        children: backMuscleGroups([...MUSCULOSKELETAL_ROOT_PATH, 'back', 'muscles']),
      } : {}),
      ...(region.id === 'neck' && category.id === 'muscles' ? {
        children: neckMuscleGroups([...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'muscles']),
      } : {}),
      ...(region.id === 'lower-limb' && category.id === 'muscles' ? {
        children: lowerLimbMuscleGroups([...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb', 'muscles']),
      } : {}),
      ...(region.id === 'neck' && category.id === 'bones' ? {
        children: NECK_BONE_GROUPS.map(group => ({
          id: [...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'bones', group.id].join('/'),
          label: group.label,
        })),
      } : {}),
      ...(region.id === 'upper-limb' && category.id === 'bones' ? {
        children: UPPER_LIMB_BONE_GROUPS.map(group => ({
          id: [...MUSCULOSKELETAL_ROOT_PATH, region.id, category.id, group.id].join('/'),
          label: group.label,
        })),
      } : {}),
      ...(category.id === 'attachments' ? {
        children: [
          { id: 'sites', label: 'Attachment sites' },
          { id: 'bones', label: 'Supporting bones' },
        ].map(group => ({
          id: [...MUSCULOSKELETAL_ROOT_PATH, region.id, category.id, group.id].join('/'),
          label: group.label,
          ...(region.id === 'back' && group.id === 'sites' ? {
            children: backMuscleGroups([...MUSCULOSKELETAL_ROOT_PATH, 'back', 'attachments', 'sites']),
          } : {}),
        })),
      } : {}),
    })),
  ],
}))];
