import type { NervousGroup } from './nervousTaxonomy';

export const LOWER_LIMB_TOPOGRAPHY_ROOT = ['advanced-neuroanatomy', 'lower-limb-topography'] as const;
export const LOWER_LIMB_TOPOGRAPHY_MODEL_UID = 'ab91928f086c44ad95006b14831e2c80';
export const LOWER_LIMB_TISSUES = [
  ['muscles', 'Muscles'], ['nerves', 'Nerves and ganglia'],
  ['arteries', 'Arteries'], ['veins', 'Veins and venous plexuses'],
  ['bones', 'Bones and landmarks'], ['fasciae', 'Fasciae, retinacula, tendons and sheaths'],
  ['joints', 'Joints, ligaments and discs'], ['bursae', 'Bursae'],
] as const;
export type LowerLimbTissue = typeof LOWER_LIMB_TISSUES[number][0];
export type LowerLimbMembership = { region: string; tissue: LowerLimbTissue };
export const LOWER_LIMB_REGION_LABELS: Record<string, string> = {
  'cauda-equina': 'Cauda equina and filum terminale',
  'lumbar-pelvic': 'Lumbar and pelvic region',
  'lumbar-plexus': 'Lumbar plexus and lumbar wall',
  'sacral-plexus': 'Sacral plexus and pelvic wall',
  'hip-gluteal': 'Hip and gluteal region',
  iliopsoas: 'Anterior hip and iliopsoas', gluteal: 'Gluteal region',
  rotators: 'Deep gluteal region and short lateral rotators',
  thigh: 'Thigh', anterior: 'Anterior compartment', medial: 'Medial compartment',
  posterior: 'Posterior compartment', lateral: 'Lateral compartment',
  'femoral-triangle': 'Femoral triangle', 'adductor-canal': 'Adductor canal',
  knee: 'Knee region and popliteal fossa', patellar: 'Anterior knee and patellar region',
  popliteal: 'Popliteal fossa',
  leg: 'Leg', superficial: 'Superficial posterior compartment', deep: 'Deep posterior compartment',
  ankle: 'Ankle region', 'anterior-ankle': 'Anterior ankle and extensor region',
  'lateral-ankle': 'Lateral ankle and fibular tendons',
  'tarsal-tunnel': 'Medial ankle and tarsal tunnel', 'posterior-ankle': 'Posterior ankle and calcaneal tendon',
  foot: 'Foot', dorsal: 'Dorsum of foot', plantar: 'Plantar foot',
  'layer-1': 'Plantar layer 1', 'layer-2': 'Plantar layer 2',
  'layer-3': 'Plantar layer 3', 'layer-4': 'Plantar layer 4',
};
const order = Object.keys(LOWER_LIMB_REGION_LABELS);
const topOrder = ['lumbar-pelvic', 'hip-gluteal', 'thigh', 'knee', 'leg', 'ankle', 'foot'];

/** Build only branches backed by actual objects in this dedicated export. */
export function lowerLimbGroups(paths: readonly (readonly string[])[]): NervousGroup[] {
  const result: NervousGroup[] = [];
  for (const path of paths) {
    let siblings = result;
    for (let depth = LOWER_LIMB_TOPOGRAPHY_ROOT.length; depth < path.length; depth++) {
      const id = path.slice(0, depth + 1).join('/');
      let group = siblings.find(group => group.id === id);
      if (!group) {
        const segment = path[depth];
        group = { id, label: LOWER_LIMB_TISSUES.find(([id]) => id === segment)?.[1]
          ?? LOWER_LIMB_REGION_LABELS[segment] ?? segment, children: [] };
        siblings.push(group);
      }
      siblings = group.children as NervousGroup[];
    }
  }
  const clean = (group: NervousGroup): NervousGroup => ({
    ...group, children: group.children?.length ? [...group.children].sort((a, b) => {
      const rank = (id: string) => {
        const segment = id.split('/').at(-1)!;
        if (['thigh', 'leg'].some(region => group.id === [...LOWER_LIMB_TOPOGRAPHY_ROOT, region].join('/'))
          && segment === 'fasciae')
          return 1000;
        const tissue = LOWER_LIMB_TISSUES.findIndex(([id]) => id === segment);
        return tissue >= 0 ? 100 + tissue : order.indexOf(segment);
      };
      return rank(a.id) - rank(b.id);
    }).map(clean) : undefined,
  });
  return result.sort((a, b) => topOrder.indexOf(a.id.split('/')[2])
    - topOrder.indexOf(b.id.split('/')[2])).map(clean);
}
