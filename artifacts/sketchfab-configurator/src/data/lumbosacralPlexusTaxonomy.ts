import { normalizeAdvancedObjectName } from './advancedCollection';
import { brachialSide } from './brachialPlexusTaxonomy';
import { CAUDA_DISC_LEVELS, lumbarPlexusAnatomyPath, lumbarPlexusAnatomySystem } from './lumbarPlexusContext';
import { explicitlyNamedBranchParent, withNamedModelBranchGroups } from './lumbosacralModelBranches';
import { sacralLimbBoneGroup } from './sacralLimbBones';
import { LOWER_LIMB_DISTAL_BRANCHES, LOWER_LIMB_DOWNSTREAM_NERVES, LOWER_LIMB_OTHER_CUTANEOUS, PLEXUS_ADDITIONAL_BRANCHES,
  type LowerLimbBranch } from './lowerLimbBranches';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

export const LUMBOSACRAL_ROOT_PATH = ['advanced-neuroanatomy', 'lumbar-sacral-plexuses'] as const;
export const LUMBOSACRAL_SOURCE_NOTES = 'Root contributions are teaching annotations, not separately selectable geometry. Roots groups use named plexus/ramus meshes, not anterior or posterior spinal roots as substitutes. Missing or fused structures cannot be separated by the atlas. Nerves stay opaque; muscle targets are semitransparent and can be hidden. Sciatic targets include downstream tibial and fibular territories. Fused adductor magnus and foot lumbricals are shared whole meshes with partial innervation; accessory obturator and pectineus innervation varies.';

type Nerve = { id: string; label: string; roots: string; names: string[]; muscles: string[] };
const nerve = (id: string, label: string, roots: string, names: string[], muscles: string[] = []): Nerve =>
  ({ id, label, roots, names, muscles });
const quadriceps = ['Rectus femoris muscle', 'Vastus lateralis muscle', 'Vastus medialis muscle', 'Vastus intermedius muscle'];
const obturatorTargets = ['Adductor longus', 'Adductor brevis', 'Adductor magnus', '(Adductor minimus)', 'Gracilis muscle', 'Obturator externus'];
const medialPlantarTargets = ['Abductor hallucis', 'Flexor digitorum brevis', 'Medial head of flexor hallucis brevis', 'Lateral head of flexor hallucis brevis', 'Lumbrical muscles of foot'];
const lateralPlantarTargets = ['Quadratus plantae muscle', 'Abductor digiti minimi of foot', 'Flexor digiti minimi of foot',
  'Oblique head of adductor hallucis', 'Transverse head of adductor hallucis', 'Plantar interossei muscles',
  'Dorsal interossei muscles of foot', 'Lumbrical muscles of foot'];
const tibialTargets = ['Medial head of gastrocnemius', 'Lateral head of gastrocnemius', 'Soleus muscle',
  'Plantaris muscle', 'Popliteus muscle', 'Tibialis posterior muscle', 'Flexor digitorum longus', 'Flexor hallucis longus',
  ...medialPlantarTargets, ...lateralPlantarTargets];
const superficialFibularTargets = ['Fibularis longus muscle', 'Fibularis brevis muscle'];
const deepFibularTargets = ['Tibialis anterior muscle', 'Extensor hallucis longus', 'Extensor digitorum longus',
  'Fibularis tertius muscle', 'Extensor digitorum brevis', 'Extensor hallucis brevis'];
const femoral = nerve('femoral', 'Femoral', 'L2–L4', ['Femoral nerve'],
  ['Iliacus muscle', 'Sartorius muscle', 'Pectineus muscle', ...quadriceps]);
const obturator = nerve('obturator', 'Obturator', 'L2–L4', ['Obturator nerve'], obturatorTargets);
const sciatic = nerve('sciatic', 'Sciatic', 'L4–S3', ['Sciatic nerve'],
  ['Semitendinosus muscle', 'Semimembranosus muscle', 'Long head of biceps femoris', 'Short head of biceps femoris',
    'Adductor magnus', ...tibialTargets, ...superficialFibularTargets, ...deepFibularTargets]);

export const LUMBAR_NERVES: readonly Nerve[] = [
  nerve('iliohypogastric', 'Iliohypogastric', 'T12–L1', ['Iliohypogastric nerve'],
    ['Internal abdominal oblique muscle', 'Internal oblique muscle of abdomen', 'Transversus abdominis muscle']),
  nerve('ilioinguinal', 'Ilioinguinal', 'L1', ['Ilio-inguinal nerve', 'Ilioinguinal nerve'],
    ['Internal abdominal oblique muscle', 'Internal oblique muscle of abdomen', 'Transversus abdominis muscle']),
  nerve('genitofemoral', 'Genitofemoral', 'L1–L2', ['Genitofemoral nerve'], ['Cremaster muscle']),
  nerve('lateral-femoral-cutaneous', 'Lateral femoral cutaneous', 'L2–L3', ['Lateral femoral cutaneous nerve']),
  femoral, obturator,
  nerve('accessory-obturator', 'Accessory obturator', 'L3–L4', ['Accessory obturator nerve'], ['Pectineus muscle']),
];
export const SACRAL_NERVES: readonly Nerve[] = [
  nerve('superior-gluteal', 'Superior gluteal', 'L4–S1', ['Superior gluteal nerve'],
    ['Gluteus medius muscle', 'Gluteus minimus muscle']),
  nerve('inferior-gluteal', 'Inferior gluteal', 'L5–S2', ['Inferior gluteal nerve'], ['Gluteus maximus muscle']),
  nerve('piriformis', 'Nerve to piriformis', 'S1–S2', ['Nerve to piriformis muscle', 'Nerve to piriformis'], ['Piriformis muscle']),
  nerve('obturator-internus', 'Nerve to obturator internus', 'L5–S2',
    ['Nerve to obturator internus', 'Nerve to obturator internus muscle'], ['Obturator internus', 'Superior gemellus muscle']),
  nerve('quadratus-femoris', 'Nerve to quadratus femoris', 'L4–S1',
    ['Nerve to quadratus femoris muscle', 'Nerve to quadratus femoris'], ['Quadratus femoris muscle', 'Inferior gemellus muscle']),
  nerve('posterior-femoral-cutaneous', 'Posterior femoral cutaneous', 'S1–S3', ['Posterior femoral cutaneous nerve']),
  nerve('pudendal', 'Pudendal', 'S2–S4', ['Pudendal nerve', 'Pudental nerve'],
    ['External anal sphincter', 'External urethral sphincter', 'Bulbospongiosus muscle', 'Ischiocavernosus muscle',
      'Superficial transverse perineal muscle', 'Deep transverse perineal muscle']),
  sciatic,
];
export const LOWER_LIMB_NERVES: readonly Nerve[] = [
  femoral, obturator, sciatic,
  nerve('tibial', 'Tibial', 'L4–S3', ['Tibial nerve'], tibialTargets),
  nerve('common-fibular', 'Common fibular', 'L4–S2', ['Common fibular nerve', 'Common peroneal nerve'],
    ['Short head of biceps femoris', ...superficialFibularTargets, ...deepFibularTargets]),
  nerve('superficial-fibular', 'Superficial fibular', 'L5–S2', ['Superficial fibular nerve', 'Superficial peroneal nerve'], superficialFibularTargets),
  nerve('deep-fibular', 'Deep fibular', 'L4–S1', ['Deep fibular nerve', 'Deep peroneal nerve'], deepFibularTargets),
  nerve('medial-plantar', 'Medial plantar', 'L4–L5', ['Medial plantar nerve'], medialPlantarTargets),
  nerve('lateral-plantar', 'Lateral plantar', 'S1–S2', ['Lateral plantar nerve'], lateralPlantarTargets),
  nerve('saphenous', 'Saphenous', 'L3–L4', ['Saphenous nerve']),
  nerve('sural', 'Sural', 'S1–S2', ['Sural nerve']),
];

const keyFor = (rawName: string) => normalizeAdvancedObjectName(rawName).replace(/\s+(?:left|right)$/, '').replace(/^(?:left|right)\s+/, '');
const memberships = new Map<string, string[][]>();
const systems = new Map<string, 'nervous' | 'muscular'>();
const contributions = new Map<string, string>();
function assign(names: readonly string[], path: string[], system: 'nervous' | 'muscular', roots?: string) {
  for (const name of names) {
    const key = keyFor(name);
    memberships.set(key, [...memberships.get(key) ?? [], path]);
    systems.set(key, system);
    if (roots) contributions.set(key, roots);
  }
}
function nerveGroup(section: string, n: Nerve): NervousGroup {
  const path = [...LUMBOSACRAL_ROOT_PATH, section, n.id];
  assign(n.names, path, 'nervous', n.roots);
  assign(n.muscles, [...path, 'muscles'], 'muscular');
  return { id: path.join('/'), label: `${n.label} (${n.roots})`,
    ...(n.muscles.length ? { children: [{ id: [...path, 'muscles'].join('/'),
      label: 'Innervated muscles (semitransparent; shared meshes may be partial)' }] } : {}) };
}
function rootsGroup(section: string, levels: string[], names: string[], roots: string): NervousGroup {
  const path = [...LUMBOSACRAL_ROOT_PATH, section, 'roots'];
  assign(names, path, 'nervous', roots);
  const children = levels.map(level => {
    const rootPath = [...path, level.toLowerCase()];
    assign([`${level} root`, `${level} anterior ramus`, `${level} ventral ramus`,
      `Anterior ramus of ${level} spinal nerve`, `Ventral ramus of ${level} spinal nerve`], rootPath, 'nervous');
    return { id: rootPath.join('/'), label: level };
  });
  return { id: path.join('/'), label: `Roots (${roots})`, children };
}
function spinalRootsGroup(section: 'lumbar' | 'sacral' | 'cauda-equina', levels: string[], range: string): NervousGroup {
  const path = [...LUMBOSACRAL_ROOT_PATH, section, 'spinal-roots'];
  return { id: path.join('/'), label: `Anterior and posterior spinal roots (${range})`, children:
    ['anterior', 'posterior'].map(direction => {
      const directionPath = [...path, direction];
      return { id: directionPath.join('/'), label: `${direction === 'anterior' ? 'Anterior' : 'Posterior'} roots ${range}`,
        children: levels.map(level => {
          const levelPath = [...directionPath, level.toLowerCase()];
          const name = `${level} ${direction} root`;
          assign([name], levelPath, 'nervous');
          return { id: levelPath.join('/'), label: name };
        }) };
    }) };
}
function plexusContextGroup(section: 'lumbar' | 'sacral' | 'cauda-equina'): NervousGroup {
  const id = (...parts: string[]) => [...LUMBOSACRAL_ROOT_PATH, section, 'context', ...parts].join('/');
  return { id: id(), label: 'Surrounding anatomy', children: [
    { id: id('vertebrae'), label: 'Lumbar vertebrae L1–L5 (semitransparent)',
      children: [1, 2, 3, 4, 5].map(level => ({
        id: id('vertebrae', `l${level}`), label: `Vertebra L${level}`,
      })) },
    ...(section !== 'cauda-equina' ? [{ id: id('iliac-bones'), label: 'Iliac/hip bones (semitransparent)' }] : []),
    { id: id('sacrum'), label: section === 'cauda-equina'
      ? 'Sacral vertebrae — fused sacrum (semitransparent)' : 'Sacrum (semitransparent)' },
    { id: id('spinal-cord'), label: 'Spinal cord' },
    { id: id('spinal-dura'), label: 'Spinal dura (semitransparent)' },
    ...(section !== 'lumbar' ? [{ id: id('filum-terminale'), label: 'Filum terminale' }] : []),
    ...(section === 'lumbar' ? [{ id: id('inguinal-ligament'), label: 'Inguinal ligament (semitransparent)' }] : []),
    ...(section === 'cauda-equina' ? [{ id: id('intervertebral-discs'), label: 'Intervertebral discs (semitransparent)',
      children: CAUDA_DISC_LEVELS.map(level => ({
        id: id('intervertebral-discs', level.toLowerCase()), label: `Intervertebral disc ${level}`,
      })) }] : []),
    ...(section === 'sacral' ? [sacralLimbBoneGroup([...LUMBOSACRAL_ROOT_PATH, section, 'context'])] : []),
  ] };
}
function distalGroup(parent: readonly string[], definition: LowerLimbBranch): NervousGroup {
  const path = [...parent, definition.id];
  assign(definition.names, path, 'nervous');
  return { id: path.join('/'), label: definition.label,
    ...(definition.children?.length ? { children: definition.children.map(child => distalGroup(path, child)) } : {}) };
}
function distalBranches(parent: readonly string[], nerveId: string): NervousGroup[] {
  const definitions = LOWER_LIMB_DISTAL_BRANCHES[nerveId] ?? PLEXUS_ADDITIONAL_BRANCHES[nerveId] ?? [];
  const path = [...parent, 'branches'];
  return definitions.length ? [{ id: path.join('/'), label: 'Distal branches',
    children: definitions.map(definition => distalGroup(path, definition)) }] : [];
}
function branchedNerveGroup(section: string, n: Nerve): NervousGroup {
  const group = nerveGroup(section, n);
  const children = [...group.children ?? [], ...distalBranches(group.id.split('/'), n.id)];
  return { ...group, ...(children.length ? { children } : {}) };
}
// Register canonical nerves before their overlapping downstream memberships.
function addDownstreamGroups(groups: NervousGroup[]) {
  for (const group of groups) {
    const downstream = LOWER_LIMB_DOWNSTREAM_NERVES[group.id.split('/').at(-1)!] ?? [];
    if (!downstream.length) continue;
    const path = [...group.id.split('/'), 'downstream'];
    const children = downstream.map(id => {
      const n = LOWER_LIMB_NERVES.find(n => n.id === id)!;
      const childPath = [...path, id];
      assign(n.names, childPath, 'nervous');
      const branches = distalBranches(childPath, id);
      return { id: childPath.join('/'), label: `${n.label} (${n.roots})`,
        ...(branches.length ? { children: branches } : {}) };
    });
    group.children = [...group.children ?? [], { id: path.join('/'), label: 'Downstream nerves', children }];
  }
  return groups;
}
const lowerLimbGroups = addDownstreamGroups(LOWER_LIMB_NERVES.map(n => branchedNerveGroup('lower-limb', n)));
const lumbarGroups = addDownstreamGroups(LUMBAR_NERVES.map(n => branchedNerveGroup('lumbar', n)));
const sacralGroups = addDownstreamGroups(SACRAL_NERVES.map(n => branchedNerveGroup('sacral', n)));
function otherPlexusCutaneousGroup(section: 'lumbar' | 'sacral'): NervousGroup {
  const path = [...LUMBOSACRAL_ROOT_PATH, section, 'other-cutaneous'];
  const definition = LOWER_LIMB_OTHER_CUTANEOUS.find(item =>
    item.id === (section === 'lumbar' ? 'superior-cluneal' : 'medial-cluneal'))!;
  return { id: path.join('/'), label: 'Other cutaneous nerves (dorsal rami)',
    children: [distalGroup(path, definition)] };
}
const otherCutaneousPath = [...LUMBOSACRAL_ROOT_PATH, 'lower-limb', 'other-cutaneous'];
lowerLimbGroups.push({ id: otherCutaneousPath.join('/'), label: 'Other cutaneous nerves',
  children: LOWER_LIMB_OTHER_CUTANEOUS.map(definition => distalGroup(otherCutaneousPath, definition)) });
export const LUMBOSACRAL_GROUPS: readonly NervousGroup[] = [
  { id: [...LUMBOSACRAL_ROOT_PATH, 'lumbar'].join('/'), label: 'Lumbar plexus (L1–L4)', children: [
    rootsGroup('lumbar', ['L1', 'L2', 'L3', 'L4'], ['Lumbar plexus', 'Roots of lumbar plexus', 'Lumbar plexus roots'], 'L1–L4'),
    ...lumbarGroups,
    otherPlexusCutaneousGroup('lumbar'),
    spinalRootsGroup('lumbar', ['L1', 'L2', 'L3', 'L4'], 'L1–L4'),
    plexusContextGroup('lumbar'),
  ] },
  { id: [...LUMBOSACRAL_ROOT_PATH, 'sacral'].join('/'), label: 'Sacral plexus (L4–S4)', children: [
    rootsGroup('sacral', ['L4', 'L5', 'S1', 'S2', 'S3', 'S4'], ['Sacral plexus', 'Roots of sacral plexus', 'Sacral plexus roots'], 'L4–S4'),
    ...sacralGroups,
    otherPlexusCutaneousGroup('sacral'),
    spinalRootsGroup('sacral', ['L4', 'L5', 'S1', 'S2', 'S3', 'S4'], 'L4–S4'),
    plexusContextGroup('sacral'),
  ] },
  { id: [...LUMBOSACRAL_ROOT_PATH, 'lower-limb'].join('/'), label: 'Lower limb nerves',
    children: lowerLimbGroups },
  { id: [...LUMBOSACRAL_ROOT_PATH, 'cauda-equina'].join('/'), label: 'Cauda equina', children: [
    spinalRootsGroup('cauda-equina', ['L1', 'L2', 'L3', 'L4', 'L5', 'S1', 'S2', 'S3', 'S4'], 'L1–S4'),
    plexusContextGroup('cauda-equina'),
  ] },
];

function pathsForKey(key: string): readonly string[][] | undefined {
  const exact = memberships.get(key);
  if (exact) return exact;
  const parent = explicitlyNamedBranchParent(key);
  if (!parent || systems.get(parent) !== 'nervous') return undefined;
  return memberships.get(parent)?.filter(path => !path.includes('muscles'))
    .map(path => [...path, 'branches', 'other-model-branches']);
}
export function lumbosacralGroupsForNodes(nodes: readonly SceneNode[]): readonly NervousGroup[] {
  const paths = nodes.flatMap(node => {
    const key = keyFor(node.rawName);
    return memberships.has(key) ? [] : pathsForKey(key) ?? [];
  });
  return withNamedModelBranchGroups(LUMBOSACRAL_GROUPS, paths);
}
export function lumbosacralSystemForName(rawName: string) {
  const key = keyFor(rawName);
  return lumbarPlexusAnatomySystem(rawName) ?? systems.get(key) ?? (pathsForKey(key)?.length ? 'nervous' : undefined);
}
export function lumbosacralPathForGroup(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  if (!LUMBOSACRAL_ROOT_PATH.every((part, i) => requested[i] === part)) return null;
  const side = requested.find(part => part === 'left' || part === 'right');
  const anatomy = lumbarPlexusAnatomyPath(node.rawName);
  const nodeSide = brachialSide(node.rawName.trim().replace(/(?:\.\d+|_\d+)+$/, ''));
  const midline = anatomy && anatomy[0] !== 'iliac-bones' && !nodeSide;
  if (side && !midline && nodeSide !== side) return null;
  const key = keyFor(node.rawName);
  if (node.systemId && node.systemId !== lumbosacralSystemForName(node.rawName)) return null;
  const base = requested.filter(part => !['left', 'right', 'without-muscles'].includes(part));
  if (anatomy) {
    const section = base[2] ?? (anatomy[0] === 'intervertebral-discs' ? 'cauda-equina'
      : ['filum-terminale', 'lower-limb-bones'].includes(anatomy[0]) ? 'sacral' : 'lumbar');
    if (!['lumbar', 'sacral', 'cauda-equina'].includes(section)) return null;
    if (anatomy[0] === 'filum-terminale' && !['sacral', 'cauda-equina'].includes(section)) return null;
    if (anatomy[0] === 'inguinal-ligament' && section !== 'lumbar') return null;
    if (anatomy[0] === 'intervertebral-discs' && section !== 'cauda-equina') return null;
    if (anatomy[0] === 'iliac-bones' && section === 'cauda-equina') return null;
    if (anatomy[0] === 'lower-limb-bones' && section !== 'sacral') return null;
    const path = [...LUMBOSACRAL_ROOT_PATH, section, 'context', ...anatomy];
    return base.every((part, i) => path[i] === part) ? [...requested, ...path.slice(base.length)] : null;
  }
  const path = pathsForKey(key)?.find(path => base.every((part, i) => path[i] === part)
    && !(requested.includes('without-muscles') && path.includes('muscles') && !base.includes('muscles')));
  return path ? [...requested, ...path.slice(base.length)] : null;
}
export const isLumbosacralNode = (node: SceneNode) => lumbosacralPathForGroup(node, LUMBOSACRAL_ROOT_PATH) !== null;
export function isLumbosacralPlexusRetainedContext(node: SceneNode, path: readonly string[]): boolean {
  return LUMBOSACRAL_ROOT_PATH.every((part, i) => path[i] === part) && ['lumbar', 'sacral', 'cauda-equina'].includes(path[2])
    && path.length > 3 && path[3] !== 'context' && lumbarPlexusAnatomyPath(node.rawName) !== null
    && lumbosacralPathForGroup(node, [...LUMBOSACRAL_ROOT_PATH, path[2],
      ...path.filter(part => ['left', 'right', 'without-muscles'].includes(part))]) !== null;
}
export const lumbosacralContextIds = (nodes: readonly SceneNode[], path: readonly string[]) =>
  nodes.filter(node => (systems.get(keyFor(node.rawName)) === 'muscular' || lumbarPlexusAnatomySystem(node.rawName) === 'skeletal'
    || lumbarPlexusAnatomyPath(node.rawName)?.[0] === 'spinal-dura')
    && (lumbosacralPathForGroup(node, path) || isLumbosacralPlexusRetainedContext(node, path))).map(node => node.instanceID);
export const lumbosacralForegroundIds = (nodes: readonly SceneNode[], path: readonly string[]) =>
  nodes.filter(node => lumbosacralSystemForName(node.rawName) === 'nervous'
    && lumbarPlexusAnatomyPath(node.rawName)?.[0] !== 'spinal-dura'
    && (lumbosacralPathForGroup(node, path) || isLumbosacralPlexusRetainedContext(node, path))).map(node => node.instanceID);
export function withLumbosacralRootContributions(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.map(node => {
    const roots = contributions.get(keyFor(node.rawName));
    return roots && !node.name.includes(`(${roots})`) ? { ...node, name: `${node.name} (${roots})` } : node;
  });
}
/** Reuse the reviewed contributions without changing another atlas's geometry. */
export const lumbosacralRootContributionForName = (rawName: string): string | undefined =>
  contributions.get(keyFor(rawName));
