import { normalizeAdvancedObjectName } from './advancedCollection';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import { brachialOverviewPart, brachialOverviewDetailPath, brachialThoracicCagePath, isBrachialOverviewContext, isBrachialOverviewRetainedContext, isBrachialRootsRetainedContext, BRACHIAL_WHOLE_BRAIN_NAME, BRACHIAL_OVERVIEW_BASAL_GROUPS, BRACHIAL_OVERVIEW_VENTRICULAR_GROUPS } from './brachialOverview';
import { brachialTrunkContextPart, isBrachialTrunkContext, isBrachialTrunkName, BRACHIAL_TRUNK_LIGHT_PURPLE } from './brachialTrunkContext';
import { brachialDivisionContextPart, isBrachialDivisionContext } from './brachialDivisionContext';
import { brachialCordContextPart, isBrachialCordContext, isBrachialCordName } from './brachialCordContext';
import { brachialTerminalAnatomyPath, brachialTerminalAnatomySystem, isBrachialTerminalContext } from './brachialTerminalAnatomy';
import { brachialRootLabel, BRACHIAL_TRUNK_ROOTS } from './brachialRootContributions';
import { BRACHIAL_HAND_NERVES, BRACHIAL_HAND_MUSCLES } from './brachialHand';

export const BRACHIAL_ROOT_PATH = ['advanced-neuroanatomy', 'brachial-plexus'] as const;
export const BRACHIAL_SOURCE_NOTES = 'Nerves stay opaque except for surrounding plexus segments used as semitransparent context in Trunks, Divisions, Cords and Terminal nerves; innervated muscles are semitransparent. The C5–T1 anterior rami are exported as one roots mesh per side, not five independently selectable roots. C5–C8 anterior spinal roots are supporting anatomy, not substitutes for plexus rami; no separate T1 anterior spinal root is listed. Flexor digitorum profundus and hand lumbricals are fused per side: shared targets show the whole mesh, with partial innervation, not an isolated median or ulnar portion. “Subclavian nerve.l.r” has ambiguous laterality and is available only in Both sides.';

type Branch = { id: string; label: string; nerves: string[]; muscles?: string[] };
const branch = (id: string, label: string, nerves: string[], muscles: string[] = []): Branch => ({ id, label, nerves, muscles });
const pectoralis = ['Clavicular head of pectoralis major muscle', 'Sternocostal head of pectoralis major muscle', '(Abdominal part of pectoralis major muscle)'];
const dorsalScapular = branch('dorsal-scapular', 'Dorsal scapular nerve (C5)', ['Dorsal scapular nerve'], ['Rhomboid major muscle', 'Rhomboid minor muscle']);
const longThoracic = branch('long-thoracic', 'Long thoracic nerve (C5–C7)', ['Long thoracic nerve'], ['Serratus anterior muscle']);
const suprascapular = branch('suprascapular', 'Suprascapular nerve', ['Suprascapular nerve'], ['Supraspinatus muscle', 'Infraspinatus muscle']);
const subclavian = branch('subclavian', 'Nerve to subclavius (Subclavian nerve)', ['Subclavian nerve', 'Nerve to subclavius'], ['Subclavius muscle']);
const lateralPectoral = branch('lateral-pectoral', 'Lateral pectoral nerve', ['Lateral pectoral nerve'], pectoralis);
const lateralMedianRoot = branch('lateral-median-root', 'Lateral root of median nerve', ['Lateral root of median nerve', 'Lateral root of the median nerve']);
const medialMedianRoot = branch('medial-median-root', 'Medial root of median nerve', ['Medial root of median nerve', 'Medial root of the median nerve']);
const medialPectoral = branch('medial-pectoral', 'Medial pectoral nerve', ['Medial pectoral nerve'], [...pectoralis, 'Pectoralis minor muscle']);
const medialBrachial = branch('medial-brachial-cutaneous', 'Medial brachial cutaneous nerve', ['Medial brachial cutaneous nerve', 'Medial cutaneous nerve of arm']);
const medialAntebrachial = branch('medial-antebrachial-cutaneous', 'Medial antebrachial cutaneous nerve', ['Medial antebrachial cutaneous nerve', 'Anterior branch of medial antebrachial cutaneous nerve', 'Posterior branch of medial antebrachial cutaneous nerve', 'Medial cutaneous nerve of forearm']);
const superiorSubscapular = branch('superior-subscapular', 'Superior subscapular nerve', ['Superior subscapular nerve', 'Upper subscapular nerve'], ['Subscapularis muscle']);
const inferiorSubscapular = branch('inferior-subscapular', 'Inferior subscapular nerve', ['Inferior subscapular nerve', 'Lower subscapular nerve'], ['Subscapularis muscle', 'Teres major muscle']);
const thoracodorsal = branch('thoracodorsal', 'Thoracodorsal nerve', ['Thoracodorsal nerve'], ['Latissimus dorsi muscle']);
const musculocutaneous = branch('musculocutaneous', 'Musculocutaneous nerve', ['Musculocutaneous nerve', 'Lateral antebrachial cutaneous nerve'], ['Coracobrachialis muscle', 'Short head of biceps brachii', 'Long head of biceps brachii', 'Brachialis muscle']);
const axillary = branch('axillary', 'Axillary nerve', ['Axillary nerve', 'Muscular branches of axillary nerve', 'Superior lateral brachial cutaneous nerve'], ['Acromial part of deltoid muscle', 'Clavicular part of deltoid muscle', 'Scapular spinal part of deltoid muscle', 'Teres minor muscle']);
const median = branch('median', 'Median nerve', [
  'Median nerve', 'Muscular branches of median nerve', 'Palmar branch of median nerve',
  'Common palmar digital branches of median nerve', 'Proper palmar digital branches of median nerve',
  'Anterior interosseous nerve of forearm', '(Communicating branch of median nerve with ulnar nerve)',
], ['Superficial head of pronator teres', 'Deep head of pronator teres', 'Flexor carpi radialis', 'Palmaris longus muscle',
  'Humero-ulnar head of flexor digitorum superficialis', 'Radial head of flexor digitorum superficialis',
  'Flexor pollicis longus', 'Pronator quadratus', 'Abductor pollicis brevis', 'Opponens pollicis muscle',
  'Superficial head of flexor pollicis brevis', 'Flexor digitorum profundus', 'Lumbrical muscles of hand']);
const ulnar = branch('ulnar', 'Ulnar nerve', [
  'Ulnar nerve', 'Muscular branches of ulnar nerve', 'Deep branch of ulnar nerve', 'Superficial branch of ulnar nerve',
  'Dorsal branch of ulnar nerve', 'Palmar branch of ulnar nerve', 'Common palmar digital branches of ulnar nerve',
  'Proper palmar digital branches of ulnar nerve', 'Dorsal digital branches of ulnar nerve',
  '(Communicating branch of median nerve with ulnar nerve)',
], ['Humeral head of flexor carpi ulnaris', 'Ulnar head of flexor carpi ulnaris', 'Abductor digiti minimi of hand',
  'Flexor digiti minimi of hand', 'Opponens digiti minimi muscle of hand', 'Transverse head of adductor pollicis',
  'Oblique head of adductor pollicis', 'Deep head of flexor pollicis brevis', 'Dorsal interossei muscles of hand',
  'Palmar interossei muscles', 'Flexor digitorum profundus', 'Lumbrical muscles of hand']);
const radial = branch('radial', 'Radial nerve', [
  'Radial nerve', 'Muscular branches of radial nerve', 'Deep branch of radial nerve', 'Superficial branch of radial nerve',
  'Dorsal digital branches of radial nerve', 'Inferior lateral brachial cutaneous nerve',
  'Posterior antebrachial cutaneous nerve', 'Posterior interosseous nerve of forearm',
], ['Long head of triceps brachii', 'Lateral head of triceps brachii', 'Medial head of triceps brachii',
  'Anconeus muscle', 'Brachioradialis muscle', 'Brachioradialis', 'Extensor carpi radialis longus',
  'Extensor carpi radialis brevis', 'Supinator', 'Extensor digitorum', 'Extensor digiti minimi',
  'Humeral head of extensor carpi ulnaris', 'Ulnar head of extensor carpi ulnaris',
  'Abductor pollicis longus', 'Extensor pollicis brevis', 'Extensor pollicis longus', 'Extensor indicis']);
const terminalBranches = [musculocutaneous, median, ulnar, axillary, radial];

const memberships = new Map<string, string[][]>();
function assign(names: string[], path: string[]) {
  for (const name of names) {
    const key = normalizeAdvancedObjectName(name);
    memberships.set(key, [...memberships.get(key) ?? [], path]);
  }
}
function group(id: string, label: string, names: string[] = [], children: NervousGroup[] = []): NervousGroup {
  const path = [...BRACHIAL_ROOT_PATH, ...id.split('/')];
  assign(names, path);
  return { id: path.join('/'), label: names[0] ? brachialRootLabel(label, names[0]) : label,
    ...(children.length ? { children } : {}) };
}
function nerveGroup(parent: string, b: Branch): NervousGroup {
  const id = `${parent}/${b.id}`;
  return group(id, b.label, [b.nerves[0]], [
    group(`${id}/branches`, 'Anatomical branches', b.nerves.slice(1)),
    ...(b.muscles?.length ? [group(`${id}/muscles`, 'Innervated muscles (semitransparent; shared meshes may be partial)', b.muscles)] : []),
  ]);
}
function terminalGroup(b: Branch): NervousGroup {
  return nerveGroup('terminal', b);
}
const trunks = (['superior', 'middle', 'inferior'] as const).map(id => group(`trunks/${id}`,
  `${id === 'superior' ? 'Superior (C5–C6)' : id === 'middle' ? 'Middle (C7)' : 'Inferior (C8–T1)'} trunk`,
  [`${id[0].toUpperCase() + id.slice(1)} trunk of brachial plexus`],
  id === 'superior' ? [nerveGroup(`trunks/${id}`, suprascapular), nerveGroup(`trunks/${id}`, subclavian)] : []));
const divisions = (['superior', 'middle', 'inferior'] as const).map(trunk => group(`divisions/${trunk}`, `${trunk[0].toUpperCase() + trunk.slice(1)} trunk divisions (${BRACHIAL_TRUNK_ROOTS[trunk]})`, [],
  ['anterior', 'posterior'].map(division => group(`divisions/${trunk}/${division}`, `${division[0].toUpperCase() + division.slice(1)} division`,
    [`${division} division of ${trunk} trunk of brachial plexus`]))));
const plexusGroups: readonly NervousGroup[] = [
  group('roots', 'Roots C5–T1', ['Roots of brachial plexus', 'Roots of the brachial plexus', 'Brachial plexus roots'], [
    group('roots/vertebrae', 'Cervical vertebrae C1–C7 and Th1–Th2 (semitransparent)'),
    group('roots/supporting-anterior-roots', 'Anterior spinal roots (supporting anatomy, not plexus rami)', ['C5 anterior root', 'C6 anterior root', 'C7 anterior root', 'C8 anterior root']),
    nerveGroup('roots', dorsalScapular), nerveGroup('roots', longThoracic),
  ]),
  group('trunks', 'Trunks', [], [...trunks, group('trunks/context', 'Surrounding anatomy (semitransparent)', [], [
    group('trunks/context/roots', 'Roots (semitransparent)'),
    group('trunks/context/divisions', 'Divisions (semitransparent)'),
    group('trunks/context/cords', 'Cords (semitransparent)'),
    group('trunks/context/bones', 'Scapulae and clavicles (semitransparent)'),
  ])]),
  group('divisions', 'Divisions', [], [...divisions, group('divisions/context', 'Surrounding anatomy (semitransparent)', [], [
    group('divisions/context/roots', 'Roots (semitransparent)'),
    group('divisions/context/trunks', 'Trunks (semitransparent)'),
    group('divisions/context/cords', 'Cords (semitransparent)'),
    group('divisions/context/bones', 'Scapulae and clavicles (semitransparent)'),
    group('divisions/context/vertebrae', 'Cervical vertebrae C1–C7 and Th1–Th2 (semitransparent)'),
  ])]),
  group('cords', 'Cords', [], [
    group('cords/lateral', 'Lateral cord', ['Lateral cord of brachial plexus'], [lateralPectoral, lateralMedianRoot].map(b => nerveGroup('cords/lateral', b))),
    group('cords/medial', 'Medial cord', ['Medial cord of brachial plexus'], [
      medialPectoral,
      { ...medialBrachial, label: 'Medial cutaneous nerve of arm' },
      { ...medialAntebrachial, label: 'Medial cutaneous nerve of forearm' },
      medialMedianRoot,
    ].map(b => nerveGroup('cords/medial', b))),
    group('cords/posterior', 'Posterior cord', ['Posterior cord of brachial plexus', 'Posterior cord brachial plexus'], [
      { ...superiorSubscapular, label: 'Upper subscapular nerve' },
      thoracodorsal,
      { ...inferiorSubscapular, label: 'Lower subscapular nerve' },
    ].map(b => nerveGroup('cords/posterior', b))),
    group('cords/context', 'Surrounding anatomy (semitransparent)', [], [
      group('cords/context/roots', 'Roots (semitransparent)'),
      group('cords/context/trunks', 'Trunks (semitransparent)'),
      group('cords/context/divisions', 'Divisions (semitransparent)'),
      group('cords/context/bones', 'Scapulae and clavicles (semitransparent)'),
      group('cords/context/vertebrae', 'Cervical vertebrae C1–C7 and Th1–Th2 (semitransparent)'),
    ]),
  ]),
  group('terminal', 'Terminal nerves', [], [
    ...terminalBranches.map(terminalGroup),
    group('terminal/hand', 'Hand — terminal branches and muscles', [], [
      group('terminal/hand/median', 'Median nerve — hand branches', BRACHIAL_HAND_NERVES.median),
      group('terminal/hand/ulnar', 'Ulnar nerve — hand branches', BRACHIAL_HAND_NERVES.ulnar),
      group('terminal/hand/radial', 'Radial nerve — hand branches', BRACHIAL_HAND_NERVES.radial),
      group('terminal/hand/muscles', 'Intrinsic hand muscles (semitransparent; shared meshes may be partial)', BRACHIAL_HAND_MUSCLES),
      group('terminal/hand/bones', 'Bones (semitransparent)', [], [
        group('terminal/hand/bones/carpals', 'Carpal bones'),
        group('terminal/hand/bones/metacarpals', 'Metacarpal bones'),
        group('terminal/hand/bones/phalanges', 'Finger phalanges'),
      ]),
    ]),
  ]),
];

// Overview contains the actual plexus and its branches, not all target muscles.
for (const paths of memberships.values()) {
  if (paths.some(path => !path.includes('muscles')) && !paths.some(path => path[2] === 'overview')) {
    paths.push([...BRACHIAL_ROOT_PATH, 'overview', 'plexus']);
  }
}
export const BRACHIAL_GROUPS: readonly NervousGroup[] = [
  group('overview', 'Overview', [], [
    group('overview/plexus', 'Brachial plexus'),
    group('overview/tracts', 'Corticospinal pathways — arm, anterior and lateral'),
    group('overview/precentral', 'Precentral gyri — motor cortex (opaque)'),
    group('overview/basal-ganglia', 'Basal ganglia (opaque)', [], BRACHIAL_OVERVIEW_BASAL_GROUPS),
    group('overview/ventricular-system', 'Ventricular system (opaque)', [], BRACHIAL_OVERVIEW_VENTRICULAR_GROUPS),
    group('overview/shoulder', 'Scapulae and clavicles (semitransparent)'),
    group('overview/upper-limb-bones', 'Upper limb bones (semitransparent)', [], [
      group('overview/upper-limb-bones/arm', 'Arm — humerus'),
      group('overview/upper-limb-bones/forearm', 'Forearm — radius and ulna'),
      group('overview/upper-limb-bones/hand', 'Hand bones', [], [
        group('overview/upper-limb-bones/hand/carpals', 'Carpal bones'),
        group('overview/upper-limb-bones/hand/metacarpals', 'Metacarpal bones'),
        group('overview/upper-limb-bones/hand/phalanges', 'Finger phalanges'),
      ]),
    ]),
    group('overview/thoracic-cage', 'Thoracic cage (semitransparent)', [], [
      group('overview/thoracic-cage/ribs', 'Ribs'),
      group('overview/thoracic-cage/sternum', 'Sternum'),
      group('overview/thoracic-cage/cartilages', 'Costal cartilages'),
      group('overview/thoracic-cage/thoracic-spine', 'Thoracic vertebrae Th3–Th12'),
    ]),
    group('overview/vertebrae', 'Cervical vertebrae C1–C7 and Th1–Th2 (semitransparent)'),
    group('overview/spinal-cord', 'Spinal cord (semitransparent)'),
    group('overview/brain', BRACHIAL_WHOLE_BRAIN_NAME),
  ]),
  ...plexusGroups,
];

export function brachialSide(rawName: string): 'left' | 'right' | null {
  const suffixes = rawName.toLowerCase().match(/\.([lr])(?=\.|_\d|$)/g) ?? [];
  const sides = new Set(suffixes.map(s => s.replace(/\./g, '')));
  if (sides.size !== 1) {
    if (sides.size > 1) return null;
    const words = rawName.trim().toLowerCase();
    if (/^left\b|\bleft$/.test(words)) return 'left';
    if (/^right\b|\bright$/.test(words)) return 'right';
    return null;
  }
  return sides.has('l') ? 'left' : 'right';
}
export function brachialPathForGroup(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  if (!BRACHIAL_ROOT_PATH.every((part, i) => requested[i] === part)) return null;
  const base = requested.filter(part => !['left', 'right', 'with-muscles'].includes(part));
  const overviewPart = brachialOverviewPart(node.rawName);
  const side = requested.find(part => part === 'left' || part === 'right');
  // Whole central context and unsplit spinal tracts are retained on either side.
  const centralContext = overviewPart && (['brain', 'vertebrae', 'spinal-cord', 'precentral', 'basal-ganglia', 'ventricular-system'].includes(overviewPart)
    || (['tracts', 'thoracic-cage'].includes(overviewPart) && !brachialSide(node.rawName)));
  if (side && !centralContext && brachialSide(node.rawName) !== side) return null;
  const terminalPart = brachialTerminalAnatomyPath(node.rawName);
  if (terminalPart && (base.length === BRACHIAL_ROOT_PATH.length || base[2] === 'terminal')) {
    if (terminalPart[0] === 'hand-ligaments') return null;
    // Keep proximal anatomy as scene context, not as the removed advanced menus.
    // In Hand, only hand bones are relevant; do not reintroduce cords/arm bones.
    if (base[3] === 'hand' && terminalPart[0] !== 'hand-bones') return null;
    const path = base[3] === 'hand'
      ? [...BRACHIAL_ROOT_PATH, 'terminal', 'hand', 'bones', ...terminalPart.slice(1)]
      : [...BRACHIAL_ROOT_PATH, 'terminal'];
    if (node.systemId && node.systemId !== brachialTerminalAnatomySystem(node.rawName)) return null;
    return base.every((part, i) => path[i] === part) ? [...requested, ...path.slice(base.length)] : null;
  }
  const cordPart = brachialCordContextPart(node.rawName);
  if (cordPart && base[2] === 'cords') {
    const path = [...BRACHIAL_ROOT_PATH, 'cords', 'context', cordPart];
    const system = ['bones', 'vertebrae'].includes(cordPart) ? 'skeletal' : 'nervous';
    if (node.systemId && node.systemId !== system) return null;
    return base.every((part, i) => path[i] === part) ? [...requested, ...path.slice(base.length)] : null;
  }
  const divisionPart = brachialDivisionContextPart(node.rawName);
  if (divisionPart && base[2] === 'divisions') {
    const path = [...BRACHIAL_ROOT_PATH, 'divisions', 'context', divisionPart];
    const system = ['bones', 'vertebrae'].includes(divisionPart) ? 'skeletal' : 'nervous';
    if (node.systemId && node.systemId !== system) return null;
    return base.every((part, i) => path[i] === part) ? [...requested, ...path.slice(base.length)] : null;
  }
  const trunkPart = brachialTrunkContextPart(node.rawName);
  if (trunkPart && (base.length === BRACHIAL_ROOT_PATH.length || base[2] === 'trunks')) {
    const path = [...BRACHIAL_ROOT_PATH, 'trunks', 'context', trunkPart];
    const system = trunkPart === 'bones' ? 'skeletal' : 'nervous';
    if (node.systemId && node.systemId !== system) return null;
    return base.every((part, i) => path[i] === part) ? [...requested, ...path.slice(base.length)] : null;
  }
  if (overviewPart) {
    const detailPath = brachialOverviewDetailPath(node.rawName)
      ?? (overviewPart === 'thoracic-cage' ? brachialThoracicCagePath(node.rawName) : null);
    const path = overviewPart === 'vertebrae' && base[2] === 'roots'
      ? [...BRACHIAL_ROOT_PATH, 'roots', 'vertebrae']
      : [...BRACHIAL_ROOT_PATH, 'overview', ...(detailPath ?? [overviewPart])];
    const expectedSystem = ['vertebrae', 'shoulder', 'thoracic-cage', 'upper-limb-bones'].includes(overviewPart) ? 'skeletal' : 'nervous';
    if (node.systemId && node.systemId !== expectedSystem) return null;
    return base.every((part, i) => path[i] === part) ? [...requested, ...path.slice(base.length)] : null;
  }
  const paths = memberships.get(normalizeAdvancedObjectName(node.rawName)) ?? [];
  const path = paths.find(p => base.every((part, i) => p[i] === part)
    && !(p.includes('muscles') && base[2] === 'cords' && !requested.includes('with-muscles') && !base.includes('muscles')));
  if (!path) return null;
  const muscle = path.includes('muscles');
  if (node.systemId && node.systemId !== (muscle ? 'muscular' : 'nervous')) return null;
  return [...requested, ...path.slice(base.length)];
}
export function isBrachialNode(node: SceneNode): boolean {
  return brachialPathForGroup(node, BRACHIAL_ROOT_PATH) !== null;
}
export function brachialSystemForName(rawName: string): 'nervous' | 'muscular' | 'skeletal' | 'joints' | undefined {
  const terminalSystem = brachialTerminalAnatomySystem(rawName);
  if (terminalSystem) return terminalSystem;
  if (brachialTrunkContextPart(rawName) === 'bones') return 'skeletal';
  const part = brachialOverviewPart(rawName);
  if (part) return ['vertebrae', 'shoulder', 'thoracic-cage', 'upper-limb-bones'].includes(part) ? 'skeletal' : 'nervous';
  const path = memberships.get(normalizeAdvancedObjectName(rawName))?.[0];
  return path ? path.includes('muscles') ? 'muscular' : 'nervous' : undefined;
}
export function brachialContextIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node => (node.systemId === 'muscular' || isBrachialOverviewContext(node)
    || (path[2] === 'trunks' && isBrachialTrunkContext(node))
    || (path[2] === 'divisions' && isBrachialDivisionContext(node))
    || (path[2] === 'cords' && isBrachialCordContext(node))
    || (path[2] === 'terminal' && isBrachialTerminalContext(node)))
    && (brachialPathForGroup(node, path) || isBrachialOverviewRetainedContext(node, path)
      || isBrachialRootsRetainedContext(node, path) || isBrachialTrunkRetainedContext(node, path)
       || isBrachialDivisionRetainedContext(node, path) || isBrachialCordRetainedContext(node, path)
       || isBrachialTerminalRetainedContext(node, path))).map(node => node.instanceID);
}
export function brachialForegroundIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node => node.systemId !== 'muscular' && !isBrachialOverviewContext(node)
    && !(path[2] === 'trunks' && isBrachialTrunkContext(node))
    && !(path[2] === 'divisions' && isBrachialDivisionContext(node))
    && !(path[2] === 'cords' && isBrachialCordContext(node))
    && !(path[2] === 'terminal' && isBrachialTerminalContext(node))
    && (brachialPathForGroup(node, path) || isBrachialTerminalRetainedContext(node, path))).map(node => node.instanceID);
}
export function isBrachialTrunkRetainedContext(node: SceneNode, path: readonly string[]): boolean {
  return BRACHIAL_ROOT_PATH.every((part, i) => path[i] === part) && path[2] === 'trunks'
    && path.length > 3 && path[3] !== 'context' && isBrachialTrunkContext(node)
    && brachialPathForGroup(node, [...BRACHIAL_ROOT_PATH, 'trunks',
      ...path.filter(part => part === 'left' || part === 'right')]) !== null;
}
export function isBrachialDivisionRetainedContext(node: SceneNode, path: readonly string[]): boolean {
  return BRACHIAL_ROOT_PATH.every((part, i) => path[i] === part) && path[2] === 'divisions'
    && path.length > 3 && path[3] !== 'context' && isBrachialDivisionContext(node)
    && brachialPathForGroup(node, [...BRACHIAL_ROOT_PATH, 'divisions',
      ...path.filter(part => part === 'left' || part === 'right')]) !== null;
}
export function isBrachialCordRetainedContext(node: SceneNode, path: readonly string[]): boolean {
  return BRACHIAL_ROOT_PATH.every((part, i) => path[i] === part) && path[2] === 'cords'
    && path.length > 3 && path[3] !== 'context' && isBrachialCordContext(node)
    && brachialPathForGroup(node, [...BRACHIAL_ROOT_PATH, 'cords',
      ...path.filter(part => part === 'left' || part === 'right')]) !== null;
}
export function isBrachialTerminalRetainedContext(node: SceneNode, path: readonly string[]): boolean {
  if (path[0] !== BRACHIAL_ROOT_PATH[0] || path[1] !== BRACHIAL_ROOT_PATH[1]) return false;
  const anatomy = brachialTerminalAnatomyPath(node.rawName);
  if (path[2] === 'terminal' && path[3] === 'hand' && path[4] !== 'bones') {
    return anatomy?.[0] === 'hand-bones'
      && brachialPathForGroup(node, [...BRACHIAL_ROOT_PATH, 'terminal', 'hand',
        ...path.filter(part => part === 'left' || part === 'right')]) !== null;
  }
  return BRACHIAL_ROOT_PATH.every((part, i) => path[i] === part) && path[2] === 'terminal'
    && terminalBranches.some(branch => branch.id === path[3])
    && anatomy !== null && anatomy[0] !== 'hand-ligaments'
    && brachialPathForGroup(node, [...BRACHIAL_ROOT_PATH, 'terminal',
      ...path.filter(part => part === 'left' || part === 'right')]) !== null;
}
export function brachialTrunkColorNodes(nodes: readonly SceneNode[], path: readonly string[]) {
  if (!BRACHIAL_ROOT_PATH.every((part, i) => path[i] === part) || path[2] !== 'trunks') return [];
  const categoryPath = [...BRACHIAL_ROOT_PATH, 'trunks', ...path.filter(part => part === 'left' || part === 'right')];
  return nodes.filter(node => isBrachialTrunkName(node.rawName) && brachialPathForGroup(node, categoryPath))
    .map(node => ({ instanceID: node.instanceID, color: BRACHIAL_TRUNK_LIGHT_PURPLE }));
}
export function brachialDivisionColorNodes(nodes: readonly SceneNode[], path: readonly string[]) {
  if (!BRACHIAL_ROOT_PATH.every((part, i) => path[i] === part) || path[2] !== 'divisions') return [];
  const categoryPath = [...BRACHIAL_ROOT_PATH, 'divisions', ...path.filter(part => part === 'left' || part === 'right')];
  return nodes.filter(node => brachialTrunkContextPart(node.rawName) === 'divisions' && brachialPathForGroup(node, categoryPath))
    .map(node => ({ instanceID: node.instanceID, color: BRACHIAL_TRUNK_LIGHT_PURPLE }));
}
export function brachialCordColorNodes(nodes: readonly SceneNode[], path: readonly string[]) {
  if (!BRACHIAL_ROOT_PATH.every((part, i) => path[i] === part) || path[2] !== 'cords') return [];
  const categoryPath = [...BRACHIAL_ROOT_PATH, 'cords', ...path.filter(part => part === 'left' || part === 'right')];
  return nodes.filter(node => isBrachialCordName(node.rawName) && brachialPathForGroup(node, categoryPath))
    .map(node => ({ instanceID: node.instanceID, color: BRACHIAL_TRUNK_LIGHT_PURPLE }));
}
