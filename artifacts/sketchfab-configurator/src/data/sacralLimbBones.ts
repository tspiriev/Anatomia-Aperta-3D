import { normalizeAdvancedObjectName } from './advancedCollection';
import type { NervousGroup } from './nervousTaxonomy';

type BoneGroup = { id: string; label: string; names?: string[]; children?: BoneGroup[] };
const bone = (id: string, label: string, ...names: string[]): BoneGroup =>
  ({ id, label, names: names.length ? names : [label] });
const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
const definitions: BoneGroup[] = [
  bone('femur', 'Femur', 'Femur', 'Femur bone'),
  bone('tibia', 'Tibia', 'Tibia', 'Tibia bone'),
  bone('fibula', 'Fibula', 'Fibula', 'Fibula bone'),
  { id: 'foot-ankle', label: 'Ankle and foot bones', children: [
    { id: 'tarsals', label: 'Tarsal bones', children: [
      bone('talus', 'Talus'), bone('calcaneus', 'Calcaneus'),
      bone('navicular', 'Navicular bone'), bone('cuboid', 'Cuboid bone'),
      bone('medial-cuneiform', 'Medial cuneiform bone'),
      bone('intermediate-cuneiform', 'Intermediate cuneiform bone'),
      bone('lateral-cuneiform', 'Lateral cuneiform bone'),
    ] },
    { id: 'metatarsals', label: 'Metatarsals', children: ordinals.map((ordinal, i) =>
      bone(`metatarsal-${i + 1}`, `${ordinal} metatarsal bone`)) },
    { id: 'phalanges', label: 'Toe phalanges', children: ['Proximal', 'Middle', 'Distal'].map(position => ({
      id: position.toLowerCase(), label: `${position} phalanges`,
      // The hallux has no middle phalanx; preserve the exported finger-of-foot spelling.
      children: ordinals.flatMap((ordinal, i) => position === 'Middle' && i === 0 ? [] : [
        bone(`${i + 1}`, `${position} phalanx of ${ordinal.toLowerCase()} toe`,
          `${position} phalanx of ${ordinal.toLowerCase()} finger of foot`,
          `${position} phalanx of ${ordinal.toLowerCase()} toe`),
      ]),
    })) },
    bone('sesamoids', 'Sesamoid bones of foot'),
  ] },
];
const paths = new Map<string, readonly string[]>();
function collect(group: BoneGroup, parent: readonly string[]) {
  const path = [...parent, group.id];
  for (const name of group.names ?? []) paths.set(normalizeAdvancedObjectName(name), path);
  group.children?.forEach(child => collect(child, path));
}
definitions.forEach(group => collect(group, ['lower-limb-bones']));

export function sacralLimbBonePath(rawName: string): readonly string[] | null {
  const key = normalizeAdvancedObjectName(rawName).replace(/\s+(?:left|right)$/, '').replace(/^(?:left|right)\s+/, '');
  return paths.get(key) ?? null;
}
export function sacralLimbBoneGroup(parent: readonly string[]): NervousGroup {
  const path = [...parent, 'lower-limb-bones'];
  const build = (group: BoneGroup, parent: readonly string[]): NervousGroup => {
    const id = [...parent, group.id];
    return { id: id.join('/'), label: group.label,
      ...(group.children ? { children: group.children.map(child => build(child, id)) } : {}) };
  };
  return { id: path.join('/'), label: 'Leg, ankle and foot bones (semitransparent)',
    children: definitions.map(group => build(group, path)) };
}
