import csv from '@assets/0_Neck_1792581522623.csv?raw';
import { csvRows, type SystemGroupId } from './anatomicalSystems';
import { neckMemberships, isNeckBrainstemName } from './neckTopographyRules';
import { headNeckTopographyName } from './headNeckTopography';
import { NECK_TOPOGRAPHY_ROOT, NECK_TOPOGRAPHY_MODEL_UID, neckTopographyGroups,
  type NeckTissue } from './neckTopographyRegions';
import type { SceneNode } from '../types/sketchfab';
import { isNeckAnteriorHiddenLayer, neckSubmandibularSupportIds } from './neckAnteriorTriangle';
import { neckPeripheralSupportIds, neckPeripheralContextIds } from './neckPeripheralPlexuses';
import { cervicalNerveName } from './headNeckCervicalNerves';

export { NECK_TOPOGRAPHY_ROOT, NECK_TOPOGRAPHY_MODEL_UID } from './neckTopographyRegions';
export const NECK_SOURCE_OBJECTS = [...csvRows(csv)]
  .filter(row => row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5]))
  .map(row => ({ rawName: row[4], memberships: neckMemberships(row[4]) }));
const key = (name: string) => name.replace(/_\d+$/, '').replace(/_/g, ' ')
  .replace(/\s+/g, ' ').trim().toLowerCase();
const sources = new Map(NECK_SOURCE_OBJECTS.map(row => [key(row.rawName), row]));
const record = (node: Pick<SceneNode, 'rawName'>) => {
  const source = sources.get(key(node.rawName));
  if (source) return source;
  // The creator added the paired C1 nerves to this same live model after the
  // CSV export. Admit only that announced identity, and only when loaded.
  const rawName = node.rawName.replace(/_\d+$/, '');
  if (/^(?:trunk of )?c1 nerve$/.test(cervicalNerveName(rawName))
    && /(?:\.[lr](?:\.\d+)?$|\b(?:left|right)\b)/i.test(rawName))
    return { rawName, memberships: neckMemberships(rawName) };
  return undefined;
};
const system: Record<NeckTissue, SystemGroupId> = {
  muscles: 'muscular', nerves: 'nervous', arteries: 'vascular', veins: 'vascular',
  bones: 'skeletal', fasciae: 'muscular', joints: 'joints', organs: 'organs',
};
export function neckTopographyPaths(node: Pick<SceneNode, 'rawName'>): string[][] {
  return record(node)?.memberships.map(m => [...NECK_TOPOGRAPHY_ROOT, ...m.region.split('/'), m.tissue]) ?? [];
}
function requestedPathForGroup(node: Pick<SceneNode, 'rawName'>, path: readonly string[]): readonly string[] | null {
  if (path.length < NECK_TOPOGRAPHY_ROOT.length
    || !NECK_TOPOGRAPHY_ROOT.every((part, i) => path[i] === part)) return null;
  return neckTopographyPaths(node).find(candidate => path.every((part, i) => candidate[i] === part)) ?? null;
}
export function neckTopographyCataloguePathForGroup(node: Pick<SceneNode, 'rawName'>, path: readonly string[]): readonly string[] | null {
  // Offline discovery must not claim live-only additions are in the old CSV.
  return sources.has(key(node.rawName)) ? requestedPathForGroup(node, path) : null;
}
export function neckTopographyPathForGroup(node: Pick<SceneNode, 'rawName'>, path: readonly string[]): readonly string[] | null {
  return isNeckAnteriorHiddenLayer(node, path) ? null : requestedPathForGroup(node, path);
}
export const isNeckTopographyNode = (node: Pick<SceneNode, 'rawName'>) => Boolean(record(node)?.memberships.length);
export const neckTopographySystemForNode = (node: Pick<SceneNode, 'rawName' | 'systemId'>): SystemGroupId =>
  system[record(node)?.memberships[0]?.tissue ?? 'nerves'];
export const NECK_TOPOGRAPHY_GROUPS = neckTopographyGroups(NECK_SOURCE_OBJECTS.flatMap(row => neckTopographyPaths(row)));
export function neckBoneContextIds(modelUid: string, nodes: readonly SceneNode[]): number[] {
  return modelUid === NECK_TOPOGRAPHY_MODEL_UID
    ? nodes.filter(node => isNeckTopographyNode(node) && neckTopographySystemForNode(node) === 'skeletal').map(node => node.instanceID)
    : [];
}
export function neckTopographySettings(nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[]) {
  const admitted = nodes.filter(isNeckTopographyNode);
  const peripheralSupport = neckPeripheralSupportIds(admitted, ids, path);
  const reference = path[1] === 'neck-topography' && path[2] === 'foramen-magnum'
    && !['bones', 'joints', 'fasciae'].some(tissue => path.includes(tissue));
  const brainstemIds = reference ? nodes.filter(node => {
    const source = record(node);
    return source && isNeckBrainstemName(headNeckTopographyName(source.rawName));
  }).map(node => node.instanceID) : [];
  const selected = new Set(ids);
  const fasciaIds = path[0] === NECK_TOPOGRAPHY_ROOT[0]
    && path[1] === NECK_TOPOGRAPHY_ROOT[1]
    && ['posterior-triangle', 'sternocleidomastoid'].includes(path[2])
    ? nodes.filter(node => selected.has(node.instanceID)
      && record(node)?.memberships.some(m => m.tissue === 'fasciae'))
      .map(node => node.instanceID) : [];
  const contextIds = [...new Set([...brainstemIds, ...fasciaIds,
    ...neckPeripheralContextIds(admitted, [...ids, ...peripheralSupport], path)])];
  return { supportIds: [...new Set([...contextIds,
    ...peripheralSupport, ...neckSubmandibularSupportIds(admitted, ids, path)])],
  contextIds, skullBaseStyle: true };
}
export const NECK_SOURCE_NOTE = 'Uses only this neck model and its supplied structure export. Whole source meshes may cross regional boundaries. Cervical plexus cutaneous branches, ansa cervicalis and phrenic nerves are included where modeled. C1 fibers accompanying XII and deep muscular branches are not separately separable: shared pathways and target muscles are labeled as references, not invented nerves. The export provides only the right superior ansa root; spinal roots/ganglia remain separate from plexus roots. The brachial plexus contains only the supplied roots and trunks. Original side labels are preserved where prefixes and suffixes conflict. All bones use the Head sphenoid refraction preset in every menu; brainstem reference is semitransparent.';
