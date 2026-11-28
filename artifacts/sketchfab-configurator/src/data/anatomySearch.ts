import combinedCsv from '@assets/First_combinedblend_1790668070052.csv?raw';
import vascularCsv from '@assets/Cardiovascular_system_1792359799661.csv?raw';
import organsCsv from '@assets/Internal_organs_1790925899980.csv?raw';
import lymphaticCsv from '@assets/Lymphoid_tissue_1791545390897.csv?raw';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { AUTONOMIC_SOURCE_OBJECTS } from './autonomicTaxonomy';
import { MUSCULOSKELETAL_SOURCE_ENTRIES } from './musculoskeletalTaxonomy';
import { anatomySearchDestinations, type AnatomySearchDestination } from './anatomySearchMenus';
import { formatAnatomicalName } from '../lib/anatomicalDisplayName';
import type { SceneNode } from '../types/sketchfab';

export type AnatomySearchResult = {
  id: string;
  name: string;
  destinations: AnatomySearchDestination[];
};
type SearchEntry = { id: string; name: string; searchable: Set<string>; nodes: SceneNode[]; destinations?: AnatomySearchDestination[] };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

export function anatomySearchDisplayName(rawName: string): string {
  const clean = formatAnatomicalName(rawName.trim().replace(/\s+(?=\.)/g, ''))
    .replace(/^FJ\d+_BP\d+_FMA\d+_/i, '').replace(/_/g, ' ')
    .replace(/\s*\((?:Left|Right)\)$/i, '').replace(/\b(?:left|right)\b/gi, '')
    .replace(/\s+/g, ' ').trim().replace(/ansa cervicali$/i, 'ansa cervicalis')
    .replace(/^bucinator\b/i, 'Buccinator');
  return clean ? clean[0].toUpperCase() + clean.slice(1) : '';
}
function aliases(name: string): string {
  return [
    /hip bone/i.test(name) ? 'iliac bone ilium pelvis' : '',
    /sternocleidomastoid/i.test(name) ? 'SCM' : '',
    /internal carotid artery/i.test(name) ? 'ICA' : '',
    /external carotid artery/i.test(name) ? 'ECA' : '',
    /vagus nerve/i.test(name) ? 'vagal cranial nerve 10 CN X' : '',
    /hypoglossal nerve/i.test(name) ? 'cranial nerve 12 CN XII' : '',
    /ansa cervicali/i.test(name) ? 'ansa cervicalis' : '',
  ].join(' ');
}
import { LOWER_LIMB_SOURCE_OBJECTS, lowerLimbSystemForNode } from './lowerLimbTopography';
import { UPPER_LIMB_SOURCE_OBJECTS, upperLimbSystemForNode } from './upperLimbRegionalAtlas';
import { NECK_SOURCE_OBJECTS, neckTopographySystemForNode } from './neckTopography';

let catalog: SearchEntry[] | undefined;
function getCatalog(): SearchEntry[] {
  if (catalog) return catalog;
  const rawNames = new Map<string, SceneNode['systemId']>();
  for (const csv of [combinedCsv, vascularCsv, organsCsv, lymphaticCsv]) {
    for (const row of csvRows(csv)) {
      if (row[0] === 'OBJECT' && row[4] && ['MESH', 'CURVE'].includes(row[5]))
        rawNames.set(row[4], systemForMeshName(row[4]));
    }
  }
  for (const source of AUTONOMIC_SOURCE_OBJECTS)
    rawNames.set(source.object_name, systemForMeshName(source.object_name) ?? 'nervous');
  for (const source of MUSCULOSKELETAL_SOURCE_ENTRIES) {
    const systemId = source.category === 'attachments' ? 'attachments'
      : source.category === 'bones' ? 'skeletal' : source.category === 'joints-ligaments' ? 'joints' : 'muscular';
    rawNames.set(source.name, systemId);
  }
  for (const source of UPPER_LIMB_SOURCE_OBJECTS.filter(source => source.memberships.length))
    rawNames.set(source.rawName, upperLimbSystemForNode({ rawName: source.rawName, systemId: null }));
  for (const source of LOWER_LIMB_SOURCE_OBJECTS.filter(source => source.memberships.length))
    rawNames.set(source.rawName, lowerLimbSystemForNode({ rawName: source.rawName, systemId: null }));
  for (const source of NECK_SOURCE_OBJECTS.filter(source => source.memberships.length))
    rawNames.set(source.rawName, neckTopographySystemForNode({ rawName: source.rawName, systemId: null }));
  const entries = new Map<string, SearchEntry>();
  let instanceID = 1;
  for (const [rawName, systemId] of rawNames) {
    if (!systemId || /^(?:Collection|Empty|Camera|Light)(?:[._\s]|$)/i.test(rawName)
      || /internal axis of eyeball|^Extra-ocular muscles\.g$|^Muscles of head\.g$|^Cranial part of muscular system$/i.test(rawName)) continue;
    const name = anatomySearchDisplayName(rawName), id = normalize(name);
    if (!id || !/[a-z]/.test(id)) continue;
    const entry = entries.get(id) ?? { id, name, searchable: new Set<string>(), nodes: [] };
    const side = /[._]l(?:[._]\d+)*$/i.test(rawName.trim()) ? 'left'
      : /[._]r(?:[._]\d+)*$/i.test(rawName.trim()) ? 'right' : '';
    entry.searchable.add(normalize(`${rawName} ${name} ${side} ${aliases(name)}`));
    entry.nodes.push({ instanceID: instanceID++, rawName, name, systemId, visible: true, type: 'MatrixTransform' });
    entries.set(id, entry);
  }
  catalog = [...entries.values()];
  return catalog;
}

/** Lazy, local catalogue search: no account, external API or live 3D model needed.
 * Resolve memberships only for matching results, cache them for later queries. */
export async function searchAnatomy(query: string, limit = 20): Promise<{ results: AnatomySearchResult[]; total: number }> {
  const key = normalize(query);
  if (key.length < 2) return { results: [], total: 0 };
  const tokens = key.split(' ');
  const candidates = getCatalog().filter(entry =>
    [...entry.searchable].some(text => tokens.every(token => text.includes(token))));
  const score = (entry: SearchEntry) => entry.id === key ? 0
    : entry.id.startsWith(key) ? 1 : entry.id.includes(key) ? 2 : 3;
  candidates.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
  const results: AnatomySearchResult[] = [];
  const take = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 20;
  for (const entry of candidates) {
    entry.destinations ??= anatomySearchDestinations(entry.nodes);
    if (!entry.destinations.length) continue;
    results.push({ id: entry.id, name: entry.name, destinations: entry.destinations });
    if (results.length === take) break;
  }
  // Every catalogue item has a known system in the unrestricted Full anatomy
  // menu. Do not resolve hundreds of off-screen memberships for a broad query.
  return { results, total: candidates.length };
}
