import nervousCsv from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { LONG_TRACT_ROOT_PATH, longTractMenuGroups, longTractPathForGroup } from './longTractTaxonomy';

export const SPINAL_ATLAS_HREF = '/atlas/spinal-cord-anatomy';
export const SPINAL_REFERENCE_MODELS = [
  { uid: 'cdee163998f24ccc856366353b3269fa', label: 'Spinal cord — annotated anatomy' },
  { uid: 'e5e647a4351d41fd92842bdf88454526', label: 'Spinal cord — internal anatomy and tracts' },
  { uid: '35a28dea4dc049da9c549368cbeaf105', label: 'Spinal cord — arterial supply' },
] as const;
export const SPINAL_TOPOGRAPHIC_PATH = [...LONG_TRACT_ROOT_PATH, 'spinal-cord-topography'];
export const SPINAL_NERVE_PATH = [...LONG_TRACT_ROOT_PATH, 'spinal-nerve-anatomy'];
export const spinalReferencePath = (uid: string) => [...LONG_TRACT_ROOT_PATH, `model-${uid}`];
export const spinalReferenceHref = (uid: string) => `${SPINAL_ATLAS_HREF}/model/${uid}`;
/** Ordinary entry preserves the source opening. A collection query is an
 * explicit menu choice made while navigating back from a reference model. */
export function spinalCordInitialPath(search: string, referenceUid?: string): readonly string[] | null {
  if (referenceUid) return spinalReferencePath(referenceUid);
  const requested = new URLSearchParams(search).get('collection')?.split('/');
  return requested?.[0] === LONG_TRACT_ROOT_PATH[0] && requested[1] === LONG_TRACT_ROOT_PATH[1]
    && Boolean(requested[2]) && !requested[2].startsWith('model-') ? requested : null;
}
const within = (path: readonly string[], root: readonly string[]) => root.every((part, i) => path[i] === part);
const sourceKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
const runtimeKey = (name: string) => sourceKey(name.replace(/(?:\.\d{3})?(?:_\d+)?$/, ''));

// Derive the cord-only inventory from the uploaded CSV's actual ancestry.
// Exact sided names stay distinct from unsided cord tracts.
const rows = [...csvRows(nervousCsv)];
const parents = new Map(rows.filter(row => row[0] === 'COLLECTION').map(row => [row[1], row[2]]));
function belongsToCord(collection: string): boolean {
  const seen = new Set<string>();
  while (collection && !seen.has(collection)) {
    if (collection === 'NS_02_SPINAL_CORD') return true;
    seen.add(collection);
    collection = parents.get(collection) ?? '';
  }
  return false;
}
export const SPINAL_CSV_OBJECTS = rows.filter(row =>
  row[0] === 'OBJECT' && row[5] === 'MESH' && belongsToCord(row[1]))
  .map(row => ({ name: row[4], collection: row[1], parent: row[2] }));
const byName = new Map(SPINAL_CSV_OBJECTS.map(object => [sourceKey(object.name), object]));
const byRuntimeName = new Map(SPINAL_CSV_OBJECTS.map(object => [runtimeKey(object.name), object]));
export const spinalCsvObject = (name: string) =>
  byName.get(sourceKey(name)) ?? byName.get(runtimeKey(name)) ?? byRuntimeName.get(runtimeKey(name));
const rootObject = (object: typeof SPINAL_CSV_OBJECTS[number]) =>
  object.collection === 'NS_07_ROOTS' || object.parent === 'NS_07_ROOTS';
const grayObject = (object: typeof SPINAL_CSV_OBJECTS[number]) =>
  object.collection === 'NS_02_GRAY_MATTER' || /intermediolateral nucleus/i.test(object.name);
const idPath = (root: readonly string[], ...parts: string[]) => [...root, ...parts];
const group = (path: readonly string[], label: string, children?: readonly NervousGroup[]): NervousGroup =>
  ({ id: path.join('/'), label, ...(children?.length ? { children } : {}) });
const grayGroups = (root: readonly string[]) => [
  group(idPath(root, 'gray-matter', 'anterior-horn'), 'Anterior horn'),
  group(idPath(root, 'gray-matter', 'posterior-horn'), 'Posterior horn'),
  group(idPath(root, 'gray-matter', 'intermediomedial-horn'), 'Intermediomedial horn'),
  group(idPath(root, 'gray-matter', 'intermediolateral-horn'), 'Intermediolateral horn'),
  group(idPath(root, 'gray-matter', 'intermediate-substance'), 'Intermediate gray matter'),
];
function rootSection(name: string): string | null {
  const n = sourceKey(name);
  return /anterior root/.test(n) ? 'anterior-roots'
    : /posterior root/.test(n) ? 'posterior-roots'
    : /^c[12] anterior posterior[.]/.test(n) ? 'c1-c2-root-components'
    : /gangli/.test(n) ? 'ganglia' : /spinal nerve/.test(n) ? 'spinal-nerves' : null;
}
function rootRegion(object: typeof SPINAL_CSV_OBJECTS[number]): string | null {
  const level = object.collection.toLowerCase();
  return /^c\d+$/.test(level) ? 'cervical'
    : /^(?:th|t)\d+$/.test(level) ? 'thoracic'
    : /^l\d+$/.test(level) ? 'lumbar'
    : /^s\d+$/.test(level) ? 'sacral' : null;
}
function regionalRootGroup(section: string, label: string): NervousGroup {
  const path = idPath(SPINAL_NERVE_PATH, section);
  return group(path, label, [
    ['cervical', 'Cervical nerve roots'], ['thoracic', 'Thoracic nerve roots'],
    ['lumbar', 'Lumbar nerve roots'], ['sacral', 'Sacral nerve roots'],
  ].filter(([region]) => SPINAL_CSV_OBJECTS.some(object => rootObject(object)
    && rootSection(object.name) === section && rootRegion(object) === region))
    .map(([region, title]) => group(idPath(path, region), title)));
}
export const SPINAL_TOPOGRAPHIC_GROUP = group(SPINAL_TOPOGRAPHIC_PATH, 'Spinal cord topographic anatomy', [
  group(idPath(SPINAL_TOPOGRAPHIC_PATH, 'white-matter'), 'White matter'),
  group(idPath(SPINAL_TOPOGRAPHIC_PATH, 'gray-matter'), 'Gray matter', grayGroups(SPINAL_TOPOGRAPHIC_PATH)),
  group(idPath(SPINAL_TOPOGRAPHIC_PATH, 'ascending-tracts'), 'Ascending spinal tracts'),
  group(idPath(SPINAL_TOPOGRAPHIC_PATH, 'descending-tracts'), 'Descending spinal tracts'),
  group(idPath(SPINAL_TOPOGRAPHIC_PATH, 'other-tracts'), 'Other spinal tracts'),
]);
export const SPINAL_NERVE_GROUP = group(SPINAL_NERVE_PATH, 'Root anatomy', [
  group(idPath(SPINAL_NERVE_PATH, 'white-matter'), 'White matter (semi-transparent context)'),
  regionalRootGroup('anterior-roots', 'Anterior roots'),
  regionalRootGroup('posterior-roots', 'Posterior roots'),
  regionalRootGroup('c1-c2-root-components', 'C1–C2 root components'),
  regionalRootGroup('ganglia', 'Posterior root ganglia'),
  regionalRootGroup('spinal-nerves', 'Spinal nerves'),
  group(idPath(SPINAL_NERVE_PATH, 'gray-matter'), 'Gray matter', grayGroups(SPINAL_NERVE_PATH)),
]);
function grayPath(name: string, root: readonly string[]): readonly string[] {
  const n = sourceKey(name);
  const part = n.includes('anterior horn') ? 'anterior-horn' : n.includes('posterior horn') ? 'posterior-horn'
    : n.includes('intermediomedial') ? 'intermediomedial-horn' : n.includes('intermediolateral') ? 'intermediolateral-horn'
    : 'intermediate-substance';
  return idPath(root, 'gray-matter', part);
}
export function spinalCordPathForGroup(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  const topographic = within(requested, SPINAL_TOPOGRAPHIC_PATH);
  const nerve = within(requested, SPINAL_NERVE_PATH);
  if (topographic || nerve) {
    const object = spinalCsvObject(node.rawName);
    if (!object) return null;
    const root = topographic ? SPINAL_TOPOGRAPHIC_PATH : SPINAL_NERVE_PATH;
    let path: readonly string[] | null = null;
    if (nerve && object.collection === 'NS_03_GENERAL_WHITE_MATTER') path = idPath(root, 'white-matter');
    else if (grayObject(object)) path = grayPath(object.name, root);
    else if (topographic && !rootObject(object)) {
      const section = object.collection === 'NS_03_GENERAL_WHITE_MATTER' ? 'white-matter'
        : object.collection === 'NS_04_ASCENDING_SENSORY_TRACTS' ? 'ascending-tracts'
        : object.collection === 'NS_05_DESCENDING_MOTOR_TRACTS' ? 'descending-tracts'
        : object.collection === 'NS_06_OTHER_TRACTS' ? 'other-tracts' : null;
      if (section) path = idPath(root, section);
    } else if (nerve && rootObject(object)) {
      // Keep the ambiguous C1/C2 source components distinct from posterior roots.
      const section = rootSection(object.name), region = rootRegion(object);
      if (section) path = idPath(root, section, ...(region ? [region] : []));
    }
    return path && within(path, requested) ? path : null;
  }
  if (requested.length === LONG_TRACT_ROOT_PATH.length) {
    return spinalCordPathForGroup(node, SPINAL_TOPOGRAPHIC_PATH)
      ?? spinalCordPathForGroup(node, SPINAL_NERVE_PATH)
      ?? longTractPathForGroup(node, requested);
  }
  return longTractPathForGroup(node, requested);
}
/** Retained only after an explicit Root anatomy choice, including its
 * subcollections. Do not include tract fibers or similarly named brainstem parts. */
export function isSpinalRootWhiteMatterContext(node: SceneNode, path: readonly string[]): boolean {
  return within(path, SPINAL_NERVE_PATH)
    && spinalCsvObject(node.rawName)?.collection === 'NS_03_GENERAL_WHITE_MATTER';
}
export const spinalRootContextIds = (nodes: readonly SceneNode[], path: readonly string[]): number[] =>
  nodes.filter(node => isSpinalRootWhiteMatterContext(node, path)).map(node => node.instanceID);
/** Fit the requested foreground, not the long semitransparent cord shell.
 * White-matter-only selections still fit the shell itself. */
export function spinalRootCameraTargets(nodes: readonly SceneNode[], path: readonly string[]): number[] | null {
  if (!within(path, SPINAL_NERVE_PATH)) return null;
  const members = nodes.filter(node => spinalCordPathForGroup(node, path));
  const foreground = members.filter(node => !isSpinalRootWhiteMatterContext(node, path));
  return (foreground.length ? foreground : members).map(node => node.instanceID);
}
export const isSpinalCordAtlasNode = (node: SceneNode) =>
  spinalCordPathForGroup(node, LONG_TRACT_ROOT_PATH) !== null;
export const spinalCordMenuGroups = (nodes: readonly SceneNode[]): readonly NervousGroup[] => [
  ...SPINAL_REFERENCE_MODELS.map(model => group(spinalReferencePath(model.uid), model.label)),
  SPINAL_TOPOGRAPHIC_GROUP, SPINAL_NERVE_GROUP, ...longTractMenuGroups(nodes),
];
