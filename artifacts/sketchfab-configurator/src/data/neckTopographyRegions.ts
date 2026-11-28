import type { NervousGroup } from './nervousTaxonomy';

export const NECK_TOPOGRAPHY_ROOT = ['advanced-neuroanatomy', 'neck-topography'] as const;
export const NECK_TOPOGRAPHY_MODEL_UID = 'aa82b18a747748669d3100bc7aaf1926';
export const NECK_TISSUES = [
  ['muscles', 'Muscles'], ['nerves', 'Nerves and ganglia'], ['arteries', 'Arteries'],
  ['veins', 'Veins and venous plexuses'], ['bones', 'Bones and landmarks'],
  ['fasciae', 'Fasciae'], ['joints', 'Joints, ligaments and laryngeal cartilages'],
  ['organs', 'Organs and glands'],
] as const;
export type NeckTissue = typeof NECK_TISSUES[number][0];
export const NECK_REGION_LABELS: Record<string, string> = {
  'anterior-triangle': 'Anterior triangle of neck',
  submental: 'Submental triangle', submandibular: 'Submandibular (digastric) triangle',
  carotid: 'Carotid triangle and carotid sheath', muscular: 'Muscular triangle and visceral compartment',
  'posterior-triangle': 'Posterior triangle of neck',
  occipital: 'Occipital triangle', omoclavicular: 'Omoclavicular (supraclavicular) triangle',
  sternocleidomastoid: 'Sternocleidomastoid and superficial neck',
  'deep-neck': 'Deep neck and root of neck',
  prevertebral: 'Prevertebral and scalene region', 'root-of-neck': 'Root of neck',
  pharyngeal: 'Pharyngeal and parapharyngeal region',
  'posterior-neck': 'Posterior cervical region',
  'foramen-magnum': 'Foramen magnum and suboccipital region',
  suboccipital: 'Suboccipital triangle', junction: 'Craniovertebral junction and foramen magnum',
  'cervical-plexus': 'Neck peripheral nerve and plexuses',
  plexus: 'Cervical plexus',
  roots: 'Roots',
  cutaneous: 'Cutaneous branches', 'lesser-occipital': 'Lesser occipital nerves',
  'great-auricular': 'Great auricular nerves', 'transverse-cervical': 'Transverse cervical nerves',
  supraclavicular: 'Supraclavicular nerves', ansa: 'Ansa cervicalis',
  'superior-root': 'Superior root (C1 via XII)', 'inferior-root': 'Inferior root (C2–C3)',
  loop: 'Ansa cervicalis loop, when separately modeled',
  phrenic: 'Phrenic nerves (C3–C5)', 'c1-via-xii': 'Hypoglossal nerve and C1 shared pathway',
  motor: 'Deep muscular targets — branches not separately modeled',
  relations: 'Muscular, skeletal and vascular relations',
  'spinal-context': 'Cervical spinal nerves, spinal roots and ganglia — reference',
  'brachial-plexus': 'Brachial plexus — roots and trunks only',
  trunks: 'Trunks', superior: 'Superior trunk', middle: 'Middle trunk', inferior: 'Inferior trunk',
  brainstem: 'Brainstem reference (semitransparent)',
};
const sectionOrder = ['anterior-triangle', 'posterior-triangle', 'sternocleidomastoid',
  'deep-neck', 'posterior-neck', 'foramen-magnum', 'cervical-plexus'];
const tissueIds = new Set<string>(NECK_TISSUES.map(([id]) => id));

/** Source-backed branches only, shared by strip, sidebar and fullscreen. */
export function neckTopographyGroups(paths: readonly (readonly string[])[]): NervousGroup[] {
  const groups: NervousGroup[] = [];
  for (const path of paths) {
    let siblings = groups;
    for (let depth = NECK_TOPOGRAPHY_ROOT.length; depth < path.length; depth++) {
      const id = path.slice(0, depth + 1).join('/');
      let group = siblings.find(group => group.id === id);
      if (!group) {
        const segment = path[depth];
        group = { id, label: NECK_TISSUES.find(([id]) => id === segment)?.[1]
          ?? NECK_REGION_LABELS[segment] ?? segment, children: [] };
        siblings.push(group);
      }
      siblings = group.children as NervousGroup[];
    }
  }
  const clean = (group: NervousGroup): NervousGroup => ({
    ...group, children: group.children?.length
      ? [...group.children].sort((a, b) => {
        const rank = (id: string) => {
          const leaf = id.split('/').at(-1)!;
          return tissueIds.has(leaf) ? 100 + NECK_TISSUES.findIndex(([id]) => id === leaf)
            : Object.keys(NECK_REGION_LABELS).indexOf(leaf);
        };
        return rank(a.id) - rank(b.id);
      }).map(clean) : undefined,
  });
  return groups.sort((a, b) => sectionOrder.indexOf(a.id.split('/')[2])
    - sectionOrder.indexOf(b.id.split('/')[2])).map(clean);
}
