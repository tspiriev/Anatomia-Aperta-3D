import csv from '@assets/Lower_limb_1792583902027.csv?raw';
import { csvRows, type SystemGroupId } from './anatomicalSystems';
import { lowerLimbMemberships } from './lowerLimbTopographyRules';
import {
  LOWER_LIMB_TOPOGRAPHY_ROOT, lowerLimbGroups, type LowerLimbTissue,
} from './lowerLimbTopographyRegions';
import type { SceneNode } from '../types/sketchfab';
import { isLowerLimbSpinalCord, isLowerLimbSpinalDura, lowerLimbSpinalSupportIds } from './lowerLimbLumbarPelvic';
import { isLowerLimbCaudaEquina, hipGlutealSupportIds } from './lowerLimbHipGluteal';
import { isThighFascialSheet, thighSupportIds } from './lowerLimbThigh';
import { isLegFascialSheet } from './lowerLimbLeg';
export { withLowerLimbRootContributions } from './lowerLimbRootContributions';

export { LOWER_LIMB_TOPOGRAPHY_ROOT, LOWER_LIMB_TOPOGRAPHY_MODEL_UID } from './lowerLimbTopographyRegions';
export type LowerLimbSide = 'both' | 'left' | 'right';
export const LOWER_LIMB_SOURCE_OBJECTS = [...csvRows(csv)]
  .filter(row => row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5]))
  .map(row => ({ rawName: row[4], collection: row[1], memberships: lowerLimbMemberships(row[4], row[1]) }));
const sourceKey = (name: string) => name.replace(/_\d+$/, '').replace(/_/g, ' ')
  .replace(/\s+/g, ' ').trim().toLowerCase();
const sources = new Map(LOWER_LIMB_SOURCE_OBJECTS.map(row => [sourceKey(row.rawName), row]));
const record = (node: Pick<SceneNode, 'rawName'>) => {
  const source = sources.get(sourceKey(node.rawName));
  if (source) return source;
  // The CSV has the anterior horn and individual cauda equina components.
  // Show requested aggregate anatomy only if it actually loads in this model.
  if (isLowerLimbSpinalCord(node.rawName) || isLowerLimbCaudaEquina(node.rawName))
    return { rawName: node.rawName, collection: 'Requested live spinal context',
      memberships: lowerLimbMemberships(node.rawName, '') };
  return undefined;
};
const system: Record<LowerLimbTissue, SystemGroupId> = {
  muscles: 'muscular', nerves: 'nervous', arteries: 'vascular', veins: 'vascular',
  bones: 'skeletal', fasciae: 'muscular', joints: 'joints', bursae: 'muscular',
};
export function lowerLimbSide(raw: string): LowerLimbSide | 'ambiguous' {
  const tokens = [...raw.replace(/_\d+$/, '').toLowerCase()
    .matchAll(/\.(l|r)(?=\.|$)|\b(left|right)\b/g)]
    .map(match => match[1] === 'l' || match[2] === 'left' ? 'left' : 'right');
  if (new Set(tokens).size > 1) return 'ambiguous';
  if (tokens.length) return tokens[0] as LowerLimbSide;
  // These unsided peripheral exports cannot be assigned to a left/right limb.
  if (/plantar digital|circumflex femoral/i.test(raw)) return 'ambiguous';
  return 'both';
}
export function lowerLimbPaths(node: Pick<SceneNode, 'rawName'>): string[][] {
  const paths = record(node)?.memberships.flatMap(m => {
    const parts = m.region.split('/');
    // Parent tissue filters include ALL compartments, not just parent-level
    // objects. A thigh-wide Nerves or Muscles selection must be complete.
    return parts.map((_, i) => [...LOWER_LIMB_TOPOGRAPHY_ROOT, ...parts.slice(0, i + 1), m.tissue]);
  }) ?? [];
  return [...new Map(paths.map(path => [path.join('/'), path])).values()];
}
export function lowerLimbPathForGroup(
  node: Pick<SceneNode, 'rawName'>, path: readonly string[], side: LowerLimbSide = 'both',
): readonly string[] | null {
  if (path.length < 2 || !LOWER_LIMB_TOPOGRAPHY_ROOT.every((part, i) => path[i] === part)) return null;
  const source = record(node);
  if (!source) return null;
  // Thigh fasciae are opt-in, not an outer layer covering compartment views.
  // Keep their dedicated collection discoverable without Show all/region
  // isolation silently restoring fasciae over the muscles.
  if (path[2] === 'thigh' && !path.includes('fasciae')
    && source.memberships.some(m => m.tissue === 'fasciae'
      && (m.region === 'thigh' || m.region.startsWith('thigh/')))) return null;
  // Unlike Thigh, the main Leg overview includes fascia. Its individual
  // compartments and tissue selections must not restore that covering layer.
  if (path[2] === 'leg' && path.length > 3 && !path.includes('fasciae')
    && source.memberships.some(m => m.tissue === 'fasciae'
      && (m.region === 'leg' || m.region.startsWith('leg/')))) return null;
  const lateral = lowerLimbSide(source.rawName);
  if (side !== 'both' && lateral !== 'both' && lateral !== side) return null;
  return lowerLimbPaths(node).find(candidate => path.every((part, i) => candidate[i] === part)) ?? null;
}
export const lowerLimbCataloguePathForGroup = (node: Pick<SceneNode, 'rawName'>, path: readonly string[]) =>
  sources.has(sourceKey(node.rawName)) ? lowerLimbPathForGroup(node, path) : null;
export const isLowerLimbTopographyNode = (node: Pick<SceneNode, 'rawName'>) => Boolean(record(node)?.memberships.length);
export const lowerLimbSystemForNode = (node: Pick<SceneNode, 'rawName' | 'systemId'>): SystemGroupId =>
  system[record(node)?.memberships[0]?.tissue ?? 'nerves'];
export const LOWER_LIMB_TOPOGRAPHY_GROUPS = lowerLimbGroups(LOWER_LIMB_SOURCE_OBJECTS.flatMap(row =>
  lowerLimbPaths({ rawName: row.rawName })));

/** Bones remain selectable/hideable references, not permanently forced geometry.
 * Bone-only views retain original materials; combined regions use transparency.
 */
export function lowerLimbSettings(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[], side: LowerLimbSide = 'both',
) {
  const spinalSupport = lowerLimbSpinalSupportIds(nodes, ids, path,
    node => Boolean(lowerLimbPathForGroup(node, path, side)));
  const hipScope = path.slice(0, ['iliopsoas', 'gluteal'].includes(path[3]) ? 4 : 3);
  const hipSupport = hipGlutealSupportIds(nodes, ids, path,
    node => Boolean(lowerLimbPathForGroup(node, hipScope, side)));
  const thighSupport = thighSupportIds(nodes, ids, path,
    node => Boolean(lowerLimbPathForGroup(node, path.slice(0, 4), side)));
  const visible = new Set([...ids, ...spinalSupport, ...hipSupport, ...thighSupport]);
  const duraIds = nodes.filter(node => visible.has(node.instanceID) && isLowerLimbSpinalDura(node.rawName))
    .map(node => node.instanceID);
  const boneIds = path.includes('bones') ? [] : nodes.filter(node => visible.has(node.instanceID)
    && lowerLimbSystemForNode(node) === 'skeletal')
    .map(node => node.instanceID);
  const fasciaIds = path[2] === 'thigh' && path.includes('fasciae')
    ? nodes.filter(node => visible.has(node.instanceID) && isThighFascialSheet(node.rawName)
      && lowerLimbPathForGroup(node, [...LOWER_LIMB_TOPOGRAPHY_ROOT, 'thigh', 'fasciae'], side))
      .map(node => node.instanceID) : [];
  const legFasciaIds = path[2] === 'leg' && (path.length === 3 || path.includes('fasciae'))
    ? nodes.filter(node => visible.has(node.instanceID) && isLegFascialSheet(node.rawName)
      && lowerLimbPathForGroup(node, [...LOWER_LIMB_TOPOGRAPHY_ROOT, 'leg', 'fasciae'], side))
      .map(node => node.instanceID) : [];
  const contextIds = [...boneIds, ...duraIds, ...fasciaIds, ...legFasciaIds];
  return { supportIds: [...new Set([...contextIds, ...spinalSupport, ...hipSupport, ...thighSupport])], contextIds, skullBaseStyle: true as const };
}
