import vascularCsv from '@assets/Cardiovascular_system_1792359799661.csv?raw';
import nervousCsv from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import headNeckCsv from '@assets/Head_and_neck_1792571981066.csv?raw';
import organsCsv from '@assets/Internal_organs_1790925899980.csv?raw';
import { csvRows, type SystemGroupId } from './anatomicalSystems';
import { AUTONOMIC_SOURCE_OBJECTS } from './autonomicTaxonomy';
import { normalizeAdvancedObjectName } from './advancedCollection';
import { MUSCULOSKELETAL_SOURCE_ENTRIES } from './musculoskeletalTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import { nasalAnteriorSkullBaseTissue, NASAL_ANTERIOR_SKULL_BASE_REGION } from './headNeckAnteriorSkullBase';
import { isOralTrigeminalBranch } from './headNeckOralTrigeminal';
import { headNeckEarTissue } from './headNeckEarAnatomy';
import { anteriorTriangleNerve, anteriorTriangleCervicalBone, anteriorNeckSuperficialLayer,
  ANTERIOR_NECK_SUPERFICIAL_ID } from './headNeckAnteriorTriangle';
import { isHeadNeckExternalCarotid as isHeadNeckTemporalExternalCarotid } from './skullBaseExternalCarotid';
import { headNeckSalivaryGland } from './headNeckSalivaryGlands';
import { isNeckInventorySection, neckInventoryTissue, neckInventorySubpath, NECK_INVENTORY_SECTIONS } from './headNeckNeurovascularInventory';
import { HEAD_NECK_TOPOGRAPHY_ROOT, type HeadNeckTissue } from './headNeckTopographyRegions';
import { lateralNeckMemberships, lateralForamenMagnumPath, isLateralNeckNerve,
  LATERAL_FORAMEN_MAGNUM_PATH } from './headNeckLateralNeck';
import { SUBMENTAL_PATH, submentalMandibularPart, isUpperCranialNerve, isCaudalCranialNerve } from './headNeckSubmental';
import { headNeckCervicalNerveFamily, cervicalNerveName, cervicalNerveRegions, cervicalPlexusSupplementalMemberships } from './headNeckCervicalNerves';
import { headNeckSubclavianArteryPath, headNeckSubclavianVeinPath, headNeckSubclavianRegions } from './headNeckSubclavianVessels';
import { headNeckDetailedPaths } from './headNeckDetailedPaths';
import { isAnteriorTriangleBrainstem } from './headNeckAnteriorTriangle';
import {
  HEAD_NECK_MUSCLE_RULES, HEAD_NECK_NERVE_RULES, HEAD_NECK_VESSEL_RULES,
  HEAD_NECK_BONE_RULES, HEAD_NECK_ORGAN_RULES, matchingHeadNeckRegions,
  TEMPORAL_INFRATEMPORAL_VEINS,
  ORBIT_CAVERNOUS_VEINS,
} from './headNeckTopographyRules';

export { HEAD_NECK_TOPOGRAPHY_ROOT, HEAD_NECK_TOPOGRAPHY_GROUPS,
  HEAD_NECK_TOPOGRAPHY_MODEL_UID } from './headNeckTopographyRegions';
export { isHeadNeckTemporalExternalCarotid };

export function headNeckTopographyName(rawName: string): string {
  const name = normalizeAdvancedObjectName(rawName)
    .replace(/^fj\d+ bp\d+ fma\d+ /, '')
    .replace(/\b(?:right|left)\b/g, '').replace(/\s+/g, ' ').trim()
    .replace(/ansa cervicali$/, 'ansa cervicalis')
    .replace('submadinular', 'submandibular');
  // The vascular export uses Cavernous_Sinus_L/R as well as dotted laterality.
  const sinusName = name.replace(/ [lr]$/, '');
  if (ORBIT_CAVERNOUS_VEINS.test(sinusName)) return sinusName;
  // Updated model exports may use "_L"/" R" and parenthesized gland names
  // instead of the CSV's ".l"/".r". Keep this aliasing gland-specific.
  return /\b(?:gland|duct)\b/.test(name)
    ? name.replace(/[()]/g, '').replace(/(?:[. ]+[lr])(?:[. ]+\d+)*$/g, '').replace(/\s+/g, ' ').trim()
    : name;
}
type Membership = { tissue: HeadNeckTissue; region: string };
type SourceEntry = { name: string; systemId: SystemGroupId; memberships: Membership[] };
const sources = new Map<string, SourceEntry>();
const tissueSystem: Record<HeadNeckTissue, SystemGroupId> = {
  nerves: 'nervous', arteries: 'vascular', veins: 'vascular', muscles: 'muscular',
  bones: 'skeletal', fasciae: 'muscular', organs: 'organs', joints: 'joints',
};
function register(name: string, tissue: HeadNeckTissue, regions: readonly string[]) {
  if (!regions.length) return;
  const identity = headNeckTopographyName(name);
  const entry = sources.get(identity) ?? { name, systemId: tissueSystem[tissue], memberships: [] };
  for (const region of regions) {
    if (!entry.memberships.some(item => item.region === region && item.tissue === tissue))
      entry.memberships.push({ region, tissue });
  }
  sources.set(identity, entry);
}
function registerLateralNeck(name: string) {
  for (const { region, tissue } of lateralNeckMemberships(name)) register(name, tissue, [region]);
}
const matches = matchingHeadNeckRegions;

for (const entry of MUSCULOSKELETAL_SOURCE_ENTRIES) {
  registerLateralNeck(entry.name);
  const name = headNeckTopographyName(entry.name);
  if (entry.category === 'bones' && anteriorTriangleCervicalBone(name))
    register(entry.name, 'bones', ['anterior-triangle']);
  const earTissue = headNeckEarTissue(name);
  if (earTissue) register(entry.name, earTissue, ['head/ear']);
  if (entry.category === 'muscles') {
    const regions: string[] = matches(name, HEAD_NECK_MUSCLE_RULES);
    if (/sternocleidomastoid|scalenus medius|levator scapulae/.test(name)) regions.push('cervical-plexus/relations');
    // Thyrohyoid and geniohyoid receive direct C1 fibers via XII, NOT the ansa.
    if (/sternohyoid|sternothyroid|omohyoid/.test(name)) regions.push('ansa-cervicalis/targets');
    register(entry.name, 'muscles', regions);
  } else if (entry.category === 'bones') {
    register(entry.name, 'bones', matches(name, HEAD_NECK_BONE_RULES));
  } else if (entry.category === 'fasciae') {
    const regions = /cervical/.test(name)
      ? ['anterior-triangle/carotid', 'anterior-triangle/muscular', 'lateral-neck/sternocleidomastoid',
        'lateral-neck/occipital-triangle', 'deep-neck/prevertebral']
      : /temporal fascia|masseteric/.test(name) ? ['head/temporal-infratemporal']
      : /epicranial/.test(name) ? ['head/scalp-face'] : [];
    register(entry.name, 'fasciae', regions);
  } else if (entry.category === 'joints-ligaments') {
    const regions = /temporomandibular|sphenomandibular|stylomandibular/.test(name) ? ['head/temporal-infratemporal']
      : /atlanto|alar ligament|apical ligament|tectorial/.test(name) ? ['posterior-neck/suboccipital']
      : /thyroid|cricoid|arytenoid|corniculate|hyoid/.test(name) ? ['anterior-triangle/muscular'] : [];
    register(entry.name, 'joints', regions);
  }
}

for (const row of AUTONOMIC_SOURCE_OBJECTS) {
  const name = headNeckTopographyName(row.object_name);
  if (row.collection_name === 'Eye') {
    // The export includes geometric guide axes, not anatomical structures.
    if (!/axis|segment of eyeball|chamber of eyeball/.test(name))
      register(row.object_name, 'organs', matches(name, HEAD_NECK_ORGAN_RULES));
    continue;
  }
  if (/carotid body/.test(name)) {
    register(row.object_name, 'organs', ['anterior-triangle/carotid']);
    continue;
  }
  // Collection names alone are unsafe: the trigeminal export contains muscle
  // placeholders and central nuclei. Only actual peripheral nerves/ganglia pass.
  if (/nucleus|neucleus|nuclei|tract|fascicle|fiber|gyrus|sulcus|^cranial part/.test(name)
    || (/muscle|tendinous/.test(name) && !/nerve/.test(name))) continue;
  const peripheral = /nerve|ganglion|ganglia|ansa cervical|ansa subclavia|dorsal ramus|brachial plexus/.test(name);
  if (!peripheral) continue;
  const regions: string[] = matches(name, HEAD_NECK_NERVE_RULES);
  if (isOralTrigeminalBranch(name)) regions.push('head/oral');
  if (/^c1 nerve$|^(?:trunk of )?c[234] nerve(?: root)?$/.test(name))
    regions.push('cervical-plexus/roots', 'deep-neck/prevertebral');
  if (/supraclavicular nerve|transverse cervical nerve|great auricular nerve|lesser occipital nerve/.test(name))
    regions.push('cervical-plexus/cutaneous');
  if (/phrenic nerve/.test(name)) regions.push('cervical-plexus/phrenic');
  if (/superior root (?:of )?ansa cervicalis/.test(name)) regions.push('ansa-cervicalis/superior-root');
  if (/inferior root (?:of )?ansa cervicalis/.test(name)) regions.push('ansa-cervicalis/inferior-root');
  if (/hypoglossal nerve/.test(name)) regions.push('ansa-cervicalis/relations');
  register(row.object_name, 'nerves', regions);
}

for (const row of csvRows(vascularCsv)) {
  if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5])) continue;
  let name = headNeckTopographyName(row[4]);
  // This FMA name is truncated in the creator's CSV. Its identity is documented
  // by the existing reviewed vascular/skull-base classifications.
  if (/anterior glandular branch of supe$/.test(name)) name = 'anterior glandular branch of superior thyroid artery';
  const tissue = headNeckSubclavianVeinPath(row[4]) ? 'veins' : headNeckSubclavianArteryPath(row[4]) ? 'arteries'
    : /vein|venous|venae|pterygoid plexus/.test(name) || ORBIT_CAVERNOUS_VEINS.test(name) ? 'veins'
    : /arter|thyrocervical trunk|costocervical trunk/.test(name) ? 'arteries' : null;
  if (!tissue || /lung|pulmonary|cerebr|cerebell|parieto-occipital|(?:medial|lateral) occipital|spinal artery/.test(name)) continue;
  const regions: string[] = matches(name, HEAD_NECK_VESSEL_RULES);
  if (isHeadNeckTemporalExternalCarotid(row[4])) regions.push('head/temporal-infratemporal');
  if (/internal jugular|common carotid|external carotid|internal carotid/.test(name))
    regions.push('ansa-cervicalis/relations');
  if (/external jugular|transverse cervical/.test(name)) regions.push('cervical-plexus/relations');
  register(row[4], tissue, regions);
  for (const membership of headNeckSubclavianRegions(row[4]))
    register(row[4], membership.tissue, [membership.region]);
}
for (const row of csvRows(organsCsv)) {
  if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5])) continue;
  register(row[4], 'organs', matches(headNeckTopographyName(row[4]), HEAD_NECK_ORGAN_RULES));
}

// Explicitly requested cross-region overlap. Use both original exports: the
// autonomic-only source above is not the complete Skull base nerve inventory.
// This narrow source-menu import bypasses generic regional exclusions only
// here (e.g. source anterior cerebral arteries), never for other Head regions.
for (const csv of [nervousCsv, vascularCsv]) {
  for (const row of csvRows(csv)) {
    if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5])) continue;
    registerLateralNeck(row[4]);
    const tissue = nasalAnteriorSkullBaseTissue({ rawName: row[4] });
    if (tissue) register(row[4], tissue, [NASAL_ANTERIOR_SKULL_BASE_REGION]);
    if (csv === nervousCsv && isOralTrigeminalBranch(headNeckTopographyName(row[4])))
      register(row[4], 'nerves', ['head/oral']);
    if (csv === nervousCsv) {
      register(row[4], 'nerves', cervicalNerveRegions(row[4]));
      const name = headNeckTopographyName(row[4]);
      if (anteriorTriangleNerve(name)) register(row[4], 'nerves', ['anterior-triangle']);
      const earTissue = headNeckEarTissue(name);
      if (earTissue) register(row[4], earTissue, ['head/ear']);
    }
  }
}

// Supplement this menu with the supplied model inventory and existing nervous
// source identities. A CSV registers memberships, not nodes in the 3D scene.
for (const csv of [headNeckCsv, nervousCsv]) for (const row of csvRows(csv)) {
  if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5])) continue;
  register(row[4], 'nerves', cervicalNerveRegions(row[4]));
  for (const { region, tissue } of cervicalPlexusSupplementalMemberships(row[4]))
    register(row[4], tissue, [region]);
}

// Expose source-backed memberships for regression checks, not fabricated meshes.
export const HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES: readonly SourceEntry[] = [...sources.values()];

/** Recognize only named head/neck gland families when a revised live model
 * introduces separate lobes or export variants absent from the older CSV. */
function sourceForNode(node: Pick<SceneNode, 'rawName'> & Partial<Pick<SceneNode, 'systemId'>>): SourceEntry | undefined {
  const name = headNeckTopographyName(node.rawName);
  const source = sources.get(name);
  if (source) return source;
  const cervicalMemberships = cervicalPlexusSupplementalMemberships(node.rawName);
  if (cervicalMemberships.length) return {
    name: node.rawName, systemId: tissueSystem[cervicalMemberships[0].tissue],
    memberships: [...cervicalMemberships],
  };
  const lateralMemberships = lateralNeckMemberships(node.rawName);
  if (lateralMemberships.length) {
    const anteriorNerve = anteriorTriangleNerve(name);
    const cervicalBone = anteriorTriangleCervicalBone(name);
    return { name: node.rawName, systemId: tissueSystem[lateralMemberships[0].tissue], memberships: [
      ...lateralMemberships,
      ...(anteriorNerve ? [{ region: 'anterior-triangle', tissue: 'nerves' as const }] : []),
      ...(cervicalBone ? [{ region: 'anterior-triangle', tissue: 'bones' as const }] : []),
      ...matches(name, anteriorNerve ? HEAD_NECK_NERVE_RULES : cervicalBone ? HEAD_NECK_BONE_RULES : HEAD_NECK_VESSEL_RULES)
        .map(region => ({ region, tissue: lateralMemberships[0].tissue })),
    ] };
  }
  const superficialLayer = anteriorNeckSuperficialLayer(node);
  if (superficialLayer) return {
    name: node.rawName, systemId: 'muscular',
    memberships: [{ region: 'anterior-triangle', tissue: superficialLayer === 'platysma' ? 'muscles' : 'fasciae' }],
  };
  const salivary = headNeckSalivaryGland(node.rawName);
  if (salivary) return {
    name: node.rawName, systemId: 'organs',
    memberships: matches(`${salivary.family} ${salivary.duct ? 'duct' : 'gland'}`, HEAD_NECK_ORGAN_RULES)
      .map(region => ({ region, tissue: 'organs' })),
  };
  const subclavianMemberships = headNeckSubclavianRegions(node.rawName);
  if (subclavianMemberships.length) return {
    name: node.rawName, systemId: 'vascular', memberships: subclavianMemberships,
  };
  if (isHeadNeckTemporalExternalCarotid(node.rawName)) return {
    name: node.rawName, systemId: 'vascular',
    memberships: [...new Set([...matches(name, HEAD_NECK_VESSEL_RULES), 'head/temporal-infratemporal'])]
      .map(region => ({ region, tissue: 'arteries' })),
  };
  // The creator requested every nerve in the dedicated file, including revised
  // live names and spinal roots absent from the older scoped regional exports.
  if (anteriorTriangleCervicalBone(name)) return {
    name: node.rawName, systemId: 'skeletal',
    memberships: [{ region: 'anterior-triangle', tissue: 'bones' }],
  };
  const earTissue = headNeckEarTissue(name);
  if (earTissue) return {
    name: node.rawName, systemId: tissueSystem[earTissue],
    memberships: [{ region: 'head/ear', tissue: earTissue }],
  };
  const importedTissue = nasalAnteriorSkullBaseTissue(node);
  const oralTrigeminal = isOralTrigeminalBranch(name);
  const anteriorNerve = anteriorTriangleNerve(name);
  if (importedTissue || oralTrigeminal || anteriorNerve) {
    const memberships: Membership[] = importedTissue
      ? [{ region: NASAL_ANTERIOR_SKULL_BASE_REGION, tissue: importedTissue }] : [];
    if (oralTrigeminal || anteriorNerve) {
      for (const region of new Set([...matches(name, HEAD_NECK_NERVE_RULES),
        ...(oralTrigeminal ? ['head/oral'] : []), ...(anteriorNerve ? ['anterior-triangle'] : [])]))
        if (!memberships.some(entry => entry.region === region && entry.tissue === 'nerves'))
          memberships.push({ region, tissue: 'nerves' });
    }
    return { name: node.rawName, systemId: oralTrigeminal || anteriorNerve ? 'nervous' : tissueSystem[importedTissue!], memberships };
  }
  if (TEMPORAL_INFRATEMPORAL_VEINS.test(name) || ORBIT_CAVERNOUS_VEINS.test(name)) {
    return { name: node.rawName, systemId: 'vascular',
      memberships: matches(name, HEAD_NECK_VESSEL_RULES).map(region => ({ region, tissue: 'veins' })) };
  }
  const inventoryTissue = neckInventoryTissue(node, name);
  if (inventoryTissue) return {
    name: node.rawName, systemId: inventoryTissue === 'nerves' ? 'nervous' : 'vascular',
    memberships: NECK_INVENTORY_SECTIONS.map(region => ({ region, tissue: inventoryTissue })),
  };
  const gland = name.match(/^(?:(?:superficial|deep)(?: lobe| part)?(?: of(?: the)?)? )?(?:(?:accessory|superior|inferior) )?(parotid|submandibular|sublingual|lacrimal|thyroid|parathyroid) gland(?: (?:superficial|deep)(?: lobe| part)?)?$/);
  if (!gland) return undefined;
  const regions = matches(`${gland[1]} gland`, HEAD_NECK_ORGAN_RULES);
  return { name: node.rawName, systemId: 'organs', memberships: regions.map(region => ({ region, tissue: 'organs' })) };
}

const pathCache = new Map<string, readonly (readonly string[])[]>();
export function headNeckTopographyPathsForNode(node: Pick<SceneNode, 'rawName'> & Partial<Pick<SceneNode, 'systemId'>>): readonly (readonly string[])[] {
  // Menus ask the same question for many nested groups. Source taxonomy is
  // immutable; cache the memberships, not visibility or browsing state.
  const key = `${node.rawName}\0${node.systemId ?? ''}`;
  const cached = pathCache.get(key);
  if (cached) return cached;
  const paths = computeHeadNeckPaths(node);
  pathCache.set(key, paths);
  return paths;
}
function computeHeadNeckPaths(node: Pick<SceneNode, 'rawName'> & Partial<Pick<SceneNode, 'systemId'>>): readonly (readonly string[])[] {
  const entry = sourceForNode(node);
  const mandibularPart = submentalMandibularPart(node.rawName);
  const upperCranial = isUpperCranialNerve(node.rawName);
  const paths = entry?.memberships.filter(({ region, tissue }) =>
    !(region.startsWith('lateral-neck') && tissue === 'nerves' && !isLateralNeckNerve(node.rawName))
    && !(region.startsWith('anterior-triangle') && tissue === 'nerves' && upperCranial
      && !(region === 'anterior-triangle/submental' && mandibularPart))).map(({ region, tissue }) => {
    if (region === 'anterior-triangle/submental' && tissue === 'nerves' && mandibularPart)
      return [...SUBMENTAL_PATH, 'nerves', 'mandibular-pathway', mandibularPart];
    const path = [...HEAD_NECK_TOPOGRAPHY_ROOT, ...region.split('/'), tissue];
    return isNeckInventorySection(region.split('/')[0]) && ['nerves', 'arteries', 'veins'].includes(tissue)
      ? [...path, ...neckInventorySubpath(node.rawName, tissue as 'nerves' | 'arteries' | 'veins')] : path;
  }) ?? [];
  const superficialLayer = anteriorNeckSuperficialLayer(node);
  if (superficialLayer) return [
    ...paths.filter(path => path[2] !== 'anterior-triangle' && path[2] !== 'lateral-neck'),
    ...(superficialLayer === 'investing-fascia' ? [[...HEAD_NECK_TOPOGRAPHY_ROOT, 'lateral-neck', 'fasciae']] : []),
    [...HEAD_NECK_TOPOGRAPHY_ROOT, 'anterior-triangle', ANTERIOR_NECK_SUPERFICIAL_ID, superficialLayer],
  ];
  const tissue = neckInventoryTissue({ ...node, systemId: entry?.systemId ?? node.systemId }, headNeckTopographyName(node.rawName));
  if (tissue) for (const section of NECK_INVENTORY_SECTIONS) {
    if (section === 'lateral-neck' && tissue === 'nerves' && !isLateralNeckNerve(node.rawName)) continue;
    if (section === 'anterior-triangle' && tissue === 'nerves' && upperCranial) continue;
    paths.push([...HEAD_NECK_TOPOGRAPHY_ROOT, section, tissue, ...neckInventorySubpath(node.rawName, tissue)]);
  }
  if (mandibularPart) paths.push([...SUBMENTAL_PATH, 'nerves', 'mandibular-pathway', mandibularPart]);
  if (isCaudalCranialNerve(node.rawName) && anteriorTriangleNerve(cervicalNerveName(node.rawName)))
    paths.push([...SUBMENTAL_PATH, 'nerves', 'cranial']);
  const cervicalFamily = headNeckCervicalNerveFamily(node.rawName);
  if (!upperCranial && cervicalFamily && cervicalFamily !== 'brachial-plexus')
    paths.push([...SUBMENTAL_PATH, 'nerves', ...neckInventorySubpath(node.rawName, 'nerves')]);
  if (isHeadNeckTemporalExternalCarotid(node.rawName))
    paths.push([...SUBMENTAL_PATH, 'arteries', ...neckInventorySubpath(node.rawName, 'arteries')]);
  if (anteriorTriangleCervicalBone(cervicalNerveName(node.rawName))) paths.push([...SUBMENTAL_PATH, 'bones']);
  if (isAnteriorTriangleBrainstem(node)) paths.push([...SUBMENTAL_PATH, 'brainstem-context']);
  const referencePath = lateralForamenMagnumPath(node);
  if (referencePath) paths.push([...referencePath]);
  for (const region of cervicalNerveRegions(node.rawName))
    paths.push([...HEAD_NECK_TOPOGRAPHY_ROOT, ...region.split('/'), 'nerves']);
  for (const { region, tissue } of cervicalPlexusSupplementalMemberships(node.rawName))
    paths.push([...HEAD_NECK_TOPOGRAPHY_ROOT, ...region.split('/'), tissue]);
  for (const { region, tissue } of headNeckSubclavianRegions(node.rawName))
    paths.push([...HEAD_NECK_TOPOGRAPHY_ROOT, ...region.split('/'), tissue]);
  return headNeckDetailedPaths(paths, node.rawName, headNeckTopographyName(node.rawName));
}

/** Permissive live-model inventories are not evidence that an unrelated
 * full-body catalogue vessel is actually present in this dedicated model. */
export function headNeckTopographyCataloguePathForGroup(
  node: Pick<SceneNode, 'rawName'>, requested: readonly string[],
): readonly string[] | null {
  if (!sources.has(headNeckTopographyName(node.rawName))) return null;
  // Catalogue traversal needs the optional branch's structural ancestors,
  // although opening those ancestors in the viewer must omit its coverings.
  if (anteriorNeckSuperficialLayer(node))
    return headNeckTopographyPathsForNode(node).find(path => requested.every((part, i) => path[i] === part)) ?? null;
  return headNeckTopographyPathForGroup(node, requested);
}
export function headNeckTopographyPathForGroup(
  node: Pick<SceneNode, 'rawName'>, requested: readonly string[],
): readonly string[] | null {
  if (requested.length < HEAD_NECK_TOPOGRAPHY_ROOT.length
    || !HEAD_NECK_TOPOGRAPHY_ROOT.every((part, i) => requested[i] === part)) return null;
  if (LATERAL_FORAMEN_MAGNUM_PATH.every((part, i) => requested[i] === part))
    return lateralForamenMagnumPath(node, requested);
  if (requested[2] === 'anterior-triangle' && requested[3] !== ANTERIOR_NECK_SUPERFICIAL_ID
    && anteriorNeckSuperficialLayer(node)) return null;
  if (requested[2] === 'lateral-neck' && requested[3] !== 'fasciae'
    && anteriorNeckSuperficialLayer(node) === 'investing-fascia') return null;
  return headNeckTopographyPathsForNode(node).find(path => requested.every((part, i) => path[i] === part)) ?? null;
}
export function isHeadNeckTopographyNode(node: Pick<SceneNode, 'rawName'>): boolean {
  return sourceForNode(node) !== undefined;
}
export function headNeckTopographySystemForNode(node: Pick<SceneNode, 'rawName' | 'systemId'>): SystemGroupId {
  return sourceForNode(node)?.systemId ?? node.systemId ?? 'nervous';
}
