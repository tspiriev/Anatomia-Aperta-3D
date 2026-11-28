import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import memberships from './brainGrossAnatomyMemberships.json';

export const BRAIN_GROSS_ANATOMY_PATH = ['advanced-neuroanatomy', 'brain-gross-anatomy'] as const;

const definitions = [
  ['brain-lobes', 'Brain lobes', [
    ['frontal', 'Frontal lobe'], ['parietal', 'Parietal lobe'],
    ['occipital', 'Occipital lobe'], ['temporal', 'Temporal lobe'], ['insula', 'Insular lobe'],
  ]],
  ['brainstem', 'Brainstem gross anatomy', [
    ['midbrain', 'Midbrain'], ['pons', 'Pons'], ['medulla-oblongata', 'Medulla oblongata'],
  ]],
  ['cerebellum', 'Cerebellum gross anatomy', [
    ['cerebellar-hemispheres', 'Cerebellar hemispheres'], ['vermis', 'Vermis'],
  ]],
] as const;

function sourceName(name: string): string {
  return name.trim().toLowerCase().replace(/\.+$/, '')
    .replace(/(?:_\d+)+$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ');
}

const paths = new Map<string, readonly string[]>();
export const BRAIN_GROSS_ANATOMY_GROUP: NervousGroup = {
  id: BRAIN_GROSS_ANATOMY_PATH.join('/'),
  label: 'Brain gross anatomy',
  children: [...definitions.map(([id, label, leaves]) => ({
    id: [...BRAIN_GROSS_ANATOMY_PATH, id].join('/'), label,
    children: leaves.map(([leafId, leafLabel]) => {
      const path = [...BRAIN_GROSS_ANATOMY_PATH, id, leafId];
      for (const name of memberships[leafId]) {
        const key = sourceName(name);
        if (paths.has(key)) throw new Error(`Duplicate gross brain source object: ${name}`);
        paths.set(key, path);
      }
      return { id: path.join('/'), label: leafLabel };
    }),
  })), {
    id: [...BRAIN_GROSS_ANATOMY_PATH, 'limbic-system'].join('/'),
    label: 'Limbic system',
  }],
};

const limbicPath = [...BRAIN_GROSS_ANATOMY_PATH, 'limbic-system'];
const limbicPaths = new Map<string, readonly string[]>();
for (const name of memberships.limbic) {
  const key = sourceName(name);
  if (limbicPaths.has(key)) throw new Error(`Duplicate limbic source object: ${name}`);
  limbicPaths.set(key, limbicPath);
  // Shared limbic structures retain their existing lobe memberships.
  if (!paths.has(key)) paths.set(key, limbicPath);
  // The cleaned source's numbered fornix can be exported without that suffix.
  const base = key.replace(/\.\d+$/, '');
  if (base !== key) {
    if (!limbicPaths.has(base)) limbicPaths.set(base, limbicPath);
    if (!paths.has(base)) paths.set(base, limbicPath);
  }
}

export function classifyBrainGrossAnatomy(rawName: string, groupPath?: readonly string[]): readonly string[] | null {
  // Preserve source-numbered objects before considering duplicate/export suffixes.
  // CSV Lateral occipitotemporal gyrus.l.001 is distinct from the .l mesh.
  let key = sourceName(rawName);
  const index = groupPath?.[0] === BRAIN_GROSS_ANATOMY_PATH[0]
    && groupPath[1] === BRAIN_GROSS_ANATOMY_PATH[1] && groupPath[2] === 'limbic-system'
    ? limbicPaths : paths;
  while (key) {
    const path = index.get(key);
    if (path) return path;
    const shorter = key.replace(/\.\d+$/, '');
    if (shorter === key) break;
    key = shorter;
  }
  return null;
}

export function brainGrossAnatomyPathForNode(node: SceneNode, groupPath?: readonly string[]): readonly string[] | null {
  return node.systemId === 'nervous' ? classifyBrainGrossAnatomy(node.rawName, groupPath) : null;
}
