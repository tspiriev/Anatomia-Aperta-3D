import type { NervousGroup } from './nervousTaxonomy';

export const NECK_BONE_GROUPS = [
  { id: 'skull-attachments', label: 'Skull and jaw attachment bones' },
  { id: 'cervical-spine', label: 'Cervical spine (C1–C7)' },
  { id: 'upper-thoracic-spine', label: 'Upper thoracic attachment spine (T1–T6)' },
  { id: 'upper-ribs', label: 'Upper ribs (1–6)' },
  { id: 'shoulder-girdle', label: 'Shoulder girdle — clavicles and scapulae' },
  { id: 'hyoid-manubrium', label: 'Hyoid and manubrium' },
] as const;

/** Regional context for whole Neck muscles, not exact numbered patch hosts.
 * Semispinales and splenius cervicis reach T6; iliocostalis cervicis attaches
 * to ribs 3–6, and scalenes to ribs 1–2. Keep complete original bone geometry.
 * https://www.kenhub.com/en/library/anatomy/semispinalis-capitis-muscle
 * https://www.kenhub.com/en/library/anatomy/iliocostalis-muscle
 */
export function neckBoneGroup(name: string): typeof NECK_BONE_GROUPS[number]['id'] | null {
  const n = name.trim().toLowerCase().replace(/_/g, ' ');
  if (/^vertebra c[3-7]\b|^atlas \(c1\)|^axis \(c2\)/.test(n)) return 'cervical-spine';
  if (/^vertebra t[1-6]\b/.test(n)) return 'upper-thoracic-spine';
  if (/^(first|second|third|fourth|fifth|sixth) rib\b/.test(n)) return 'upper-ribs';
  if (/^(clavicle|scapula)\b/.test(n)) return 'shoulder-girdle';
  if (/^(hyoid bone|manubrium of sternum)\b/.test(n)) return 'hyoid-manubrium';
  // Pharyngeal/suprahyoid attachments need sphenoid and palatine bones too.
  // Maxilla is retained for buccinator in the adjacent-source cheek group.
  if (/^(occipital bone|temporal bone|mandible|sphenoid bone|palatine bone|maxilla)\b/.test(n))
    return 'skull-attachments';
  return null;
}

export const NECK_BONE_CONTEXT_NOTE = 'Neck bones are semitransparent. Context includes T1–T6, ribs 1–6, skull and jaw attachment bones, clavicles, scapulae and manubrium, alongside the cervical spine and hyoid. These are shared regional references, not exact host-bone assignments for individual attachment patches.';

type NeckGroup = {
  id: string;
  label: string;
  names?: readonly string[];
  pattern?: RegExp;
  children?: readonly NeckGroup[];
};

// Standard cervical regions and triangles:
// https://www.kenhub.com/en/library/anatomy/triangles-of-the-neck
// Triangles contain references to available muscular boundaries, floors and
// deep planes, NOT clipped muscle portions or the triangle's nonmuscular contents.
// Preserve the reviewed Neck inventory and its original Head/Back references.
const groups: readonly NeckGroup[] = [
  { id: 'superficial', label: 'Superficial cervical layer', names: ['platysma'] },
  { id: 'sternocleidomastoid', label: 'Sternocleidomastoid region', names: ['sternocleidomastoid'] },
  { id: 'anterior', label: 'Anterior cervical region', children: [
    { id: 'submental', label: 'Submental triangle and deep suprahyoid plane',
      names: ['anterior belly of digastric', 'mylohyoid', 'geniohyoid'] },
    { id: 'submandibular', label: 'Submandibular (digastric) triangle',
      names: ['anterior belly of digastric', 'posterior belly of digastric', 'intermediate tendon of digastric', 'stylohyoid', 'mylohyoid'] },
    { id: 'carotid', label: 'Carotid triangle — muscular boundaries and floor',
      names: ['sternocleidomastoid', 'omohyoid', 'posterior belly of digastric', 'stylohyoid',
        'thyrohyoid', 'middle pharyngeal constrictor', 'inferior pharyngeal constrictor'] },
    { id: 'muscular', label: 'Muscular (omotracheal / infrahyoid) triangle',
      names: ['sternocleidomastoid', 'omohyoid', 'sternohyoid', 'sternothyroid', 'thyrohyoid'] },
    { id: 'visceral', label: 'Deep visceral compartment', children: [
      { id: 'pharyngeal', label: 'Pharyngeal muscles', pattern: /pharyngeal constrictor|^(?:palato|stylo)pharyngeus$/ },
      { id: 'laryngeal', label: 'Laryngeal muscles', pattern: /arytenoid|cricothyroid/ },
    ] },
  ] },
  { id: 'lateral', label: 'Lateral cervical region (posterior triangle)', children: [
    { id: 'occipital', label: 'Occipital triangle — muscular boundaries and floor',
      names: ['sternocleidomastoid', 'omohyoid', 'splenius capitis', 'levator scapulae',
        'scalenus medius', 'scalenus posterior'] },
    { id: 'omoclavicular', label: 'Omoclavicular (supraclavicular) triangle — muscular references',
      names: ['sternocleidomastoid', 'omohyoid', 'scalenus medius'] },
    { id: 'scalene', label: 'Scalene region (deep lateral neck)',
      names: ['scalenus anterior', 'scalenus medius', 'scalenus posterior'] },
  ] },
  { id: 'prevertebral', label: 'Deep prevertebral region',
    names: ['longus colli', 'longus capitis', 'rectus anterior capitis', 'rectus lateralis capitis'] },
  { id: 'posterior', label: 'Posterior cervical (nuchal) region', children: [
    { id: 'splenii', label: 'Splenii', pattern: /^splenius (?:capitis|colli|cervicis)$/ },
    { id: 'erector-spinae', label: 'Cervical erector spinae', pattern: /^(?:spinalis|longissimus|iliocostalis) (?:capitis|colli|cervicis)$/ },
    { id: 'transversospinal', label: 'Cervical transversospinal muscles', pattern: /^(?:semispinalis|multifidus) (?:capitis|colli|cervicis)$|^(?:cervical )?rotatores(?: (?:breves|longi))? (?:colli|cervicis)$|^cervical rotatores(?: (?:breves|longi))?$/ },
    { id: 'segmental', label: 'Short cervical segmental muscles', pattern: /^(?:(?:anterior|posterior) )?(?:interspinales|intertransversarii) (?:colli|cervicis)$|^cervical intertransversarii$/ },
    { id: 'suboccipital', label: 'Suboccipital region',
      names: ['rectus posterior major capitis', 'rectus posterior minor capitis',
        'obliquus superior capitis', 'obliquus inferior capitis'] },
    { id: 'scapular', label: 'Cervicoscapular region', names: ['levator scapulae',
      'descending part of trapezius', 'transverse part of trapezius'] },
  ] },
  // The creator's CSV files buccinator under Neck. Keep that membership without
  // misrepresenting cheek anatomy as part of a cervical triangle.
  { id: 'adjacent-source', label: 'Adjacent source anatomy (cheek)', names: ['bucinator', 'buccinator'] },
];

const identity = (name: string) => name.toLowerCase().trim()
  .replace(/(?:\.\d{3})?(?:_\d+)?$/, '')
  .replace(/\.[lr]$/, '').replace(/_/g, ' ')
  .replace(/\bmuscles?\b/g, '').replace(/\s+/g, ' ').trim();

/** Multiple paths are intentional: a boundary muscle is one source mesh even
 * when browsed through several overlapping topographic regions. */
export function neckMuscleSubdivisions(name: string): readonly (readonly string[])[] {
  const n = identity(name);
  const paths: string[][] = [];
  const walk = (items: readonly NeckGroup[], parent: readonly string[]) => {
    for (const group of items) {
      const path = [...parent, group.id];
      if (group.names?.includes(n) || group.pattern?.test(n)) paths.push(path);
      if (group.children) walk(group.children, path);
    }
  };
  walk(groups, []);
  return paths;
}

export function neckMuscleGroups(prefix: readonly string[]): readonly NervousGroup[] {
  const build = (items: readonly NeckGroup[], parent: readonly string[]): NervousGroup[] =>
    items.map(group => {
      const path = [...parent, group.id];
      return {
        id: path.join('/'), label: group.label,
        ...(group.children ? { children: build(group.children, path) } : {}),
      };
    });
  return build(groups, prefix);
}

export const NECK_TOPOGRAPHY_NOTE = 'Neck muscles follow topographic regions and triangles. Triangle groups include available muscular boundaries, floors and deep planes, not vessels or glands. Shared muscles remain whole and may appear in more than one region; they are not cropped into triangle-shaped parts. Buccinator is retained separately as adjacent cheek anatomy from the source.';
