import test from 'node:test';
import assert from 'node:assert/strict';
import vascularCsv from '@assets/Cardiovascular_system_1792359799661.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { SceneNode } from '../types/sketchfab';
import { SKULL_BASE_EXTERNAL_CAROTID_NAMES } from './skullBaseExternalCarotid';
import { skullBaseName } from './skullBaseSources';
import { headNeckTopographyPathForGroup, headNeckTopographySystemForNode, headNeckTopographyName,
  HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES } from './headNeckTopography';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { searchAnatomy } from './anatomySearch';

const region = ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'temporal-infratemporal'];
const arteries = [...region, 'arteries'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, visible: false, systemId: null, type: 'MatrixTransform',
});

test('Every modeled reviewed ECA branch is a temporal/infratemporal artery without losing other memberships', () => {
  const reviewed = new Set(SKULL_BASE_EXTERNAL_CAROTID_NAMES.map(skullBaseName));
  let checked = 0;
  for (const row of csvRows(vascularCsv)) {
    if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5]) || !reviewed.has(skullBaseName(row[4]))) continue;
    const n = node(row[4]); checked++;
    assert.deepEqual(headNeckTopographyPathForGroup(n, arteries), arteries, n.rawName);
    assert.equal(headNeckTopographySystemForNode(n), 'vascular', n.rawName);
    assert.ok(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), n.rawName);
    assert.ok(HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES.some(entry => headNeckTopographyName(entry.name) === headNeckTopographyName(n.rawName)
      && entry.memberships.some(m => m.region === 'head/temporal-infratemporal' && m.tissue === 'arteries')), n.rawName);
  }
  assert.ok(checked > 30, String(checked));
  for (const side of ['l', 'r']) {
    const n = node(`Superficial temporal artery.${side}`);
    assert.ok(headNeckTopographyPathForGroup(n, ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'parotid', 'arteries']));
    assert.ok(headNeckTopographyPathForGroup(n, ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'scalp-face', 'arteries']));
  }
});

test('Live ECA variants and newer named branches are included, without admitting unrelated arteries or veins', () => {
  for (const name of ['Superficial_temporal_artery_L', 'Superficial temporal artery.r.001',
    'Parietal branch of superficial temporal artery.l', 'Posterior auricular artery.r',
    'Superior thyroid artery.l', 'Lingual artery.r', 'Sphenopalatine artery.l',
    'FJ5024_BP29706_FMA49489_Anterior glandular branch of right supe']) {
    assert.ok(headNeckTopographyPathForGroup(node(name), arteries), name);
    assert.equal(headNeckTopographySystemForNode(node(name)), 'vascular', name);
  }
  for (const name of ['Internal carotid artery.l', 'Vertebral artery.r', 'Inferior thyroid artery.l',
    'Middle cerebral artery (M1-segment).l', 'Pulmonary artery.r', 'Superficial temporal veins.r',
    'Auriculotemporal nerve.l', 'Unknown temporal artery'])
    assert.equal(headNeckTopographyPathForGroup(node(name), arteries), null, name);
});

test('Artery-only isolation includes the temporal ECA tree, excludes other tissues and preserves restore state', () => {
  const nodes = ['Superficial temporal artery.l', 'Superficial temporal artery.r', 'Maxillary artery.l',
    'Anterior deep temporal artery.r', 'External carotid artery.l',
    'Superficial temporal veins.r', 'Auriculotemporal nerve.l', 'Temporal bone.l',
    'Vertebral artery.l', 'Unidentified mesh'].map((name, i) => node(name, i + 1));
  const plan = planRegionIsolation(nodes, 'nervous', arteries, n => headNeckTopographyPathForGroup(n, arteries))!;
  assert.deepEqual(plan.show, [1, 2, 3, 4, 5]);
  assert.deepEqual(plan.hide, [6, 7, 8, 9, 10]);
  assert.deepEqual([...captureRegionIsolation(nodes, arteries, null, null).visibility], nodes.map(n => [n.instanceID, false]));
  for (const n of nodes.slice(0, 5)) assert.ok(headNeckTopographyPathForGroup(n, region));
});

test('Homepage search discovers superficial temporal artery in the temporal/infratemporal collection', async () => {
  const { results } = await searchAnatomy('superficial temporal artery');
  assert.ok(results.some(result => result.destinations.some(destination =>
    destination.atlasId === 'head-neck-topography' && destination.collections.some(label =>
      label.includes('Temporal and infratemporal regions') && label.includes('Arteries')))));
});
