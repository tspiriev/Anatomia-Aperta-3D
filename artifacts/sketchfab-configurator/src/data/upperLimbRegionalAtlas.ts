import csv from '@assets/Upper_limb_1792574369831.csv?raw';
import { csvRows, type SystemGroupId } from './anatomicalSystems';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { upperLimbReferenceMemberships, upperLimbReferenceGroups,
  UPPER_LIMB_REFERENCE_TISSUES } from './upperLimbReferenceTopography';
import { MUSCULOSKELETAL_SOURCE_ENTRIES } from './musculoskeletalTaxonomy';

export const UPPER_LIMB_TOPOGRAPHY_ROOT = ['advanced-neuroanatomy', 'upper-limb-topography'] as const;
export const UPPER_LIMB_TOPOGRAPHY_MODEL_UID = '06234afee22a4685bab2cee6303a3c56';
export type UpperLimbSide = 'both' | 'left' | 'right';
// Sketchfab appends an import instance suffix; Blender's .001 identities
// belong to the source and must remain distinct.
const withoutRuntimeSuffix = (name: string) => name.replace(/_\d+$/, '');
export function upperLimbName(rawName: string): string {
  return rawName.toLowerCase().replace(/\.\d+$/, '').replace(/(?:\.[lr])+\.?$/, '')
    .replace(/^fj\d+_bp\d+_fma\d+_/, '').replace(/_/g, ' ')
    .replace(/\b(?:left|right)\b/g, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
}
export function upperLimbSide(rawName: string): UpperLimbSide | 'ambiguous' {
  const tokens = [...withoutRuntimeSuffix(rawName).toLowerCase().matchAll(/\.(l|r)(?=\.|$)|\b(left|right)\b/g)]
    .map(match => (match[1] === 'l' || match[2] === 'left') ? 'left' : 'right');
  const sides = new Set(tokens);
  return sides.size > 1 ? 'ambiguous' : (tokens[0] as UpperLimbSide | undefined) ?? 'both';
}
export const UPPER_LIMB_SOURCE_OBJECTS = [...csvRows(csv)]
  .filter(row => row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5]))
  .map(row => ({ rawName: row[4], collection: row[1],
    memberships: upperLimbReferenceMemberships(row[4], upperLimbName(row[4])) }));
const sources = new Map(UPPER_LIMB_SOURCE_OBJECTS.map(row => [row.rawName, row]));
const sourceKey = (name: string) => withoutRuntimeSuffix(name).toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
const importedSources = new Map(UPPER_LIMB_SOURCE_OBJECTS.map(row => [sourceKey(row.rawName), row]));
const sourceRecord = (node: Pick<SceneNode, 'rawName'>) =>
  sources.get(node.rawName) ?? sources.get(withoutRuntimeSuffix(node.rawName)) ?? importedSources.get(sourceKey(node.rawName));
// The creator updated the same live model after its CSV export. Admit only
// reviewed upper-limb connective identities; geometry must still exist in the
// live node map. Other tissues retain the strict dedicated-CSV requirement.
const updatedConnective = new Map(MUSCULOSKELETAL_SOURCE_ENTRIES
  .filter(entry => entry.regions.includes('upper-limb')
    && ['joints-ligaments', 'fasciae', 'muscles'].includes(entry.category)
    && /capsul|ligament|(?:fibrous|synovial).*sheath/i.test(entry.name))
  .map(entry => {
    const name = upperLimbName(entry.name);
    return [name, upperLimbReferenceMemberships(entry.name, name)] as const;
  }).filter(([, memberships]) => memberships.length));
const record = (node: Pick<SceneNode, 'rawName'>) => {
  const source = sourceRecord(node);
  if (source) return source;
  const memberships = updatedConnective.get(upperLimbName(withoutRuntimeSuffix(node.rawName)));
  return memberships ? { rawName: withoutRuntimeSuffix(node.rawName), memberships } : undefined;
};
const pathsFor = (node: Pick<SceneNode, 'rawName'>) => record(node)?.memberships.map(({ region, tissue, part }) =>
  [...UPPER_LIMB_TOPOGRAPHY_ROOT, ...region.split('/'), tissue, ...(part ? part.split('/') : [])]) ?? [];
export function upperLimbPathForGroup(node: Pick<SceneNode, 'rawName'>, path: readonly string[], side: UpperLimbSide = 'both'): readonly string[] | null {
  if (path.length < 2 || !UPPER_LIMB_TOPOGRAPHY_ROOT.every((part, i) => path[i] === part)) return null;
  const lateral = upperLimbSide(record(node)?.rawName ?? node.rawName);
  if (side !== 'both' && lateral !== 'both' && lateral !== side) return null;
  return pathsFor(node).find(candidate => path.every((part, i) => candidate[i] === part)) ?? null;
}
/** Offline search must not claim live-only meshes are in the old export. */
export function upperLimbCataloguePathForGroup(node: Pick<SceneNode, 'rawName'>, path: readonly string[]): readonly string[] | null {
  return sourceRecord(node) ? upperLimbPathForGroup(node, path) : null;
}
export const isUpperLimbTopographyNode = (node: Pick<SceneNode, 'rawName'>) => Boolean(record(node)?.memberships.length);
/** Reference bones are selectable/hideable context, never unrelated muscles. */
export function isUpperLimbHandWristBoneContext(node: Pick<SceneNode, 'rawName'>, path: readonly string[]): boolean {
  return UPPER_LIMB_TOPOGRAPHY_ROOT.every((part, i) => path[i] === part)
    && path[2] === 'hand-wrist'
    // A specific carpal-tunnel tissue selection retains its established scope.
    && !path.includes('carpal-tunnel')
    && Boolean(record(node)?.memberships.some(m => m.region === 'hand-wrist' && m.tissue === 'bones'));
}
export function upperLimbSystemForNode(node: Pick<SceneNode, 'rawName' | 'systemId'>): SystemGroupId {
  const tissue = record(node)?.memberships[0]?.tissue;
  return UPPER_LIMB_REFERENCE_TISSUES.find(([id]) => id === tissue)?.[2] ?? node.systemId ?? 'nervous';
}
const registeredPaths = UPPER_LIMB_SOURCE_OBJECTS.flatMap(row => pathsFor({ rawName: row.rawName }));
export const UPPER_LIMB_TOPOGRAPHY_GROUPS: readonly NervousGroup[] =
  upperLimbReferenceGroups(UPPER_LIMB_TOPOGRAPHY_ROOT, registeredPaths);
/** Every offered updated tissue branch is backed by an actual loaded mesh. */
export function upperLimbGroupsForNodes(nodes: readonly Pick<SceneNode, 'rawName'>[]): readonly NervousGroup[] {
  return nodes.length ? upperLimbReferenceGroups(UPPER_LIMB_TOPOGRAPHY_ROOT, nodes.flatMap(pathsFor))
    : UPPER_LIMB_TOPOGRAPHY_GROUPS;
}

export function upperLimbSettings(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
  side: UpperLimbSide = 'both', transparentMuscles = false,
): { supportIds: number[]; contextIds: number[] } {
  const deltoidRegion = path[2] === 'shoulder' && path[3] === 'deltoid' && path.length === 4;
  if ((!transparentMuscles && !deltoidRegion) || path[1] !== UPPER_LIMB_TOPOGRAPHY_ROOT[1]) return { supportIds: [], contextIds: [] };
  const selected = new Set(ids);
  const regionDepth = path[2] === 'hand-wrist' && path[3] === 'wrist' ? 5 : 4;
  const region = path.slice(0, Math.min(regionDepth, path.length));
  const contextIds = nodes.filter(node => (deltoidRegion || !selected.has(node.instanceID))
    && upperLimbSystemForNode(node) === 'muscular' && upperLimbPathForGroup(node, region, side))
    .map(node => node.instanceID);
  return { supportIds: contextIds, contextIds };
}
