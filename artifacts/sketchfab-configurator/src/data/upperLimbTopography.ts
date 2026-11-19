import type { NervousGroup } from './nervousTaxonomy';
import type { MusculoskeletalEntry } from './musculoskeletalTaxonomy';
import { upperLimbEntryMatches, upperLimbTissue } from './upperLimbTopographicMembership';

export const UPPER_LIMB_TOPOGRAPHY_ID = 'topography';
type Region = { id: string; label: string; children?: readonly Region[] };
const regions: readonly Region[] = [
  { id: 'shoulder', label: 'Shoulder and shoulder girdle' },
  { id: 'arm', label: 'Arm', children: [
    { id: 'anterior', label: 'Anterior arm compartment (flexors)' },
    { id: 'posterior', label: 'Posterior arm compartment (extensors)' },
  ] },
  { id: 'elbow', label: 'Elbow region' },
  { id: 'forearm', label: 'Forearm', children: [
    { id: 'anterior', label: 'Anterior forearm compartment (flexor–pronator)', children: [
      { id: 'superficial', label: 'Superficial flexor–pronator layer' },
      { id: 'intermediate', label: 'Intermediate flexor layer (FDS)' },
      { id: 'deep', label: 'Deep flexor–pronator layer' },
    ] },
    { id: 'posterior', label: 'Posterior forearm compartment (extensor–supinator)', children: [
      { id: 'superficial', label: 'Superficial extensor layer' },
      { id: 'deep', label: 'Deep extensor–supinator layer' },
    ] },
    { id: 'mobile-wad', label: 'Posterolateral group (mobile wad)' },
  ] },
  { id: 'wrist', label: 'Wrist', children: [
    { id: 'palmar', label: 'Palmar wrist', children: [
      { id: 'carpal-tunnel', label: 'Carpal tunnel — muscular/tendon and retinacular structures' },
    ] },
    { id: 'dorsal', label: 'Dorsal wrist / extensor region' },
  ] },
  { id: 'hand', label: 'Hand', children: [
    { id: 'thenar', label: 'Thenar region' },
    { id: 'hypothenar', label: 'Hypothenar region' },
    { id: 'adductor', label: 'Adductor pollicis compartment' },
    { id: 'central', label: 'Central palm / lumbricals' },
    { id: 'interosseous', label: 'Interosseous compartments' },
  ] },
];
const tissues = [
  { id: 'muscles', label: 'Muscles' },
  { id: 'fasciae', label: 'Fasciae, intermuscular septa and tendon sheaths' },
  { id: 'bones', label: 'Bones' },
  { id: 'joints-ligaments', label: 'Joints and ligaments' },
  { id: 'attachments', label: 'Muscle attachment sites' },
  { id: 'bursae', label: 'Bursae' },
] as const;

const flatten = (items: readonly Region[], parent: readonly string[] = []): string[][] =>
  items.flatMap(group => {
    const path = [...parent, group.id];
    return [path, ...flatten(group.children ?? [], path)];
  });
const regionPaths = flatten(regions);
const cache = new WeakMap<MusculoskeletalEntry, readonly (readonly string[])[]>();

export function upperLimbTopographicPaths(entry: MusculoskeletalEntry): readonly (readonly string[])[] {
  let paths = cache.get(entry);
  if (!paths) {
    paths = regionPaths.filter(path => upperLimbEntryMatches(entry, path))
      .map(path => [...path, upperLimbTissue(entry)]);
    cache.set(entry, paths);
  }
  return paths;
}

/** Normal and fullscreen use the same collection tree. Only source-backed
 * tissue branches are offered; no empty fabricated regional joints/tendons. */
export function upperLimbTopographyGroup(prefix: readonly string[], entries: readonly MusculoskeletalEntry[]): NervousGroup {
  const sourcePaths = entries.flatMap(entry => upperLimbTopographicPaths(entry));
  const base = [...prefix, UPPER_LIMB_TOPOGRAPHY_ID];
  const build = (group: Region, parent: readonly string[]): NervousGroup => {
    const relative = [...parent, group.id];
    return {
      id: [...base, ...relative].join('/'), label: group.label,
      children: [
        ...(group.children ?? []).map(child => build(child, relative)),
        ...tissues.filter(tissue => sourcePaths.some(path =>
          path.length === relative.length + 1 && relative.every((part, i) => path[i] === part)
          && path.at(-1) === tissue.id))
          .map(tissue => ({
            id: [...base, ...relative, tissue.id].join('/'),
            label: relative[0] === 'wrist' && tissue.id === 'muscles'
              ? 'Crossing muscles / tendons (whole meshes)' : tissue.label,
          })),
      ],
    };
  };
  return { id: base.join('/'), label: 'Topographic regions — combined tissues', children: regions.map(group => build(group, [])) };
}

export const isUpperLimbTopographyPath = (path: readonly string[]) =>
  path[0] === 'musculoskeletal-system' && path[1] === 'regions'
  && path[2] === 'upper-limb' && path[3] === UPPER_LIMB_TOPOGRAPHY_ID;

export const UPPER_LIMB_TOPOGRAPHY_NOTE = 'Topographic regions combine available muscles, fasciae/septa, bones, joints, bursae and attachment sites. Choosing a combined region explicitly shows its attachments; tissue-only subcollections remain separate. Septa are shared arm boundaries. Bones and crossing muscles remain whole: wrist views may include long forearm muscle bellies, and fused hand joint meshes remain at Hand level. Attachment groups follow the named muscle, not an inferred location of each numbered patch.';
