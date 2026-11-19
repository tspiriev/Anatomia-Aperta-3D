import jointsCsv from '@assets/Joints_1792227867661.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { MusculoskeletalEntry, MusculoskeletalRegionId } from './musculoskeletalTaxonomy';
import type { SkeletalRegion } from './musculoskeletalSkeleton';

const spine: readonly SkeletalRegion[] = ['cervical', 'thoracic', 'lumbar'];
const regionMap: Record<SkeletalRegion, readonly MusculoskeletalRegionId[]> = {
  skull: ['head'], cervical: ['neck'], thoracic: ['thorax'],
  lumbar: ['back', 'abdomen'], pelvis: ['pelvis-perineum'],
  'upper-limb': ['upper-limb'], 'lower-limb': ['lower-limb'],
};

/** The supplied joint export is flat. References overlap at regional boundaries;
 * continuous ligaments remain one source mesh, never artificially subdivided. */
export function jointSkeletalRegions(name: string): readonly SkeletalRegion[] {
  const n = name.toLowerCase();
  const levels = [...n.matchAll(/\b([ctls])\d+/g)].map(match =>
    ({ c: 'cervical', t: 'thoracic', l: 'lumbar', s: 'pelvis' } as const)[match[1] as 'c' | 't' | 'l' | 's']);
  if (levels.length && /intervertebral disc|nucleus pulposus/.test(n)) return [...new Set(levels)];
  if (/iliolumbar/.test(n)) return ['lumbar', 'pelvis'];
  if (/longitudinal ligament|ligamenta flava|interspinous|intertransverse|supraspinous/.test(n)) return spine;
  if (/temporomandibular|stylomandibular|sphenomandibular|pterygospinous/.test(n)) return ['skull'];
  if (/stylohyoid|thyrohyoid|cricothyroid|cricopharyngeal|quadrangular membrane|nuchal/.test(n)) return ['cervical'];
  if (/costotransverse|of (head of )?rib|intercostal/.test(n)) return ['thoracic'];
  if (/sacro|interpubic|pubic|obturator|inguinal|intercornual|triradiate/.test(n)) return ['pelvis'];
  if (/acetabular|femoral|of hip joint|head of femur|zona orbicularis|frenula capsulae/.test(n))
    return ['pelvis', 'lower-limb'];
  // Foot-specific interphalangeal names precede the hand's unqualified names.
  if (/of foot|great toe|metatars|tarsometatars|plantar|calcane|talocalcane|talonavicular|talofibular|tibio|tibial|talo|tarsal|cuneo|intercune|cuboideo|cruciate|menisc|patellar|poplite|fibular|of knee|membrane of leg|intersesamoid/.test(n))
    return ['lower-limb'];
  if (/clavicular|interclavicular|coraco|scapular|humeral|glenoid|conoid|trapezoid|radius|radio|radial|ulnar|ulno|forearm|oblique cord|quadrate|of elbow|carpal|carpo|capitat|hamate|triquet|scapho|pisoh|pisom|pisot|lunate|lunotri|of hand|palmar|interphalangeal joints/.test(n))
    return ['upper-limb'];
  return [];
}

/** Regional musculoskeletal menus also include structures crossing a boundary,
 * rather than limiting them to their primary skeletal-region reference. */
export function jointMusculoskeletalRegions(
  name: string, skeleton = jointSkeletalRegions(name),
): MusculoskeletalRegionId[] {
  const regions = new Set<MusculoskeletalRegionId>(skeleton.flatMap(region => regionMap[region]));
  const n = name.toLowerCase();
  if (/inguinal ligament/.test(n)) regions.add('abdomen');
  if (/sternoclavicular|costoclavicular|interclavicular/.test(n)) regions.add('thorax');
  if (/stylohyoid ligament/.test(n)) regions.add('head');
  // Only actual spinal and posterior rib structures inherit Back membership;
  // anterior neck joints, such as the laryngeal joints, do not.
  if (/intervertebral disc|nucleus pulposus|longitudinal ligament|ligamenta flava|interspinous|intertransverse|supraspinous|nuchal|costotransverse|of head of rib/.test(n))
    regions.add('back');
  if (/transverse scapular ligament|posterior sacro-iliac|interosseous sacro-iliac|iliolumbar|sacrococcygeal|intercornual/.test(n))
    regions.add('back');
  return [...regions];
}

export const JOINT_SOURCE_ENTRIES: readonly MusculoskeletalEntry[] = [...csvRows(jointsCsv)]
  .filter(row => row[0] === 'OBJECT' && row[5] === 'MESH')
  .map(row => {
    const skeletalRegions = jointSkeletalRegions(row[4]);
    return {
      name: row[4], sourceCollection: row[1], source: 'joints', category: 'joints-ligaments',
      skeletalRegions, regions: jointMusculoskeletalRegions(row[4], skeletalRegions),
    };
  });
