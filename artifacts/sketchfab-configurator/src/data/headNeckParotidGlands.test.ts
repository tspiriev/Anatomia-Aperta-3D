import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { headNeckTopographyPathForGroup, headNeckTopographySystemForNode,
  headNeckTopographyName, HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES } from './headNeckTopography';
import { headNeckSalivaryGland } from './headNeckSalivaryGlands';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { searchAnatomy } from './anatomySearch';

const root = ['advanced-neuroanatomy', 'head-neck-topography'];
const region = [...root, 'head', 'parotid'];
const organs = [...region, 'organs'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, visible: false, systemId: null, type: 'MatrixTransform',
});

test('Parotid/retromandibular organs include all modeled salivary glands, ducts, accessory glands and lobes', () => {
  for (const name of ['Parotid gland', '(Accessory parotid gland)', 'Parotid duct',
    'Submandibular gland', 'Submandibular duct', 'Sublingual gland']) {
    for (const side of ['l', 'r']) {
      const n = node(`${name}.${side}`);
      assert.deepEqual(headNeckTopographyPathForGroup(n, organs), organs, n.rawName);
      assert.equal(headNeckTopographySystemForNode(n), 'organs');
      assert.ok(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW));
      assert.ok(HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES.some(entry =>
        headNeckTopographyName(entry.name) === headNeckTopographyName(n.rawName)
        && entry.memberships.some(m => m.region === 'head/parotid' && m.tissue === 'organs')), n.rawName);
    }
  }
  for (const name of ['Parotid_L', 'Accessory_parotid_R', 'Left parotid salivary gland',
    'Parotid gland (superficial lobe).l', 'Deep lobe of parotid gland.r.001',
    'Superficial parotid.l', 'Submandibular_L', 'Sublingual_gland_R']) {
    assert.deepEqual(headNeckTopographyPathForGroup(node(name), organs), organs, name);
    assert.equal(headNeckTopographySystemForNode(node(name)), 'organs', name);
  }
});

test('Salivary overlap preserves dedicated and original regional entries; does not relabel unrelated structures as glands', () => {
  for (const [name, family, original] of [
    ['Submandibular gland.l', 'submandibular', ['anterior-triangle', 'submandibular']],
    ['Sublingual gland.r', 'sublingual', ['head', 'oral']],
    ['Parotid duct.r', 'parotid', ['head', 'oral']],
  ] as const) {
    assert.ok(headNeckTopographyPathForGroup(node(name), [...root, 'glands', family, 'organs']));
    assert.ok(headNeckTopographyPathForGroup(node(name), [...root, ...original, 'organs']));
  }
  for (const name of ['Thyroid gland', 'Lacrimal gland.l', 'Suprarenal gland.l',
    'Parotid gland tumor', 'Nerve to parotid gland', 'Parotid artery', 'Parotid lymph node',
    'Auriculotemporal nerve.l', 'Retromandibular vein.r']) {
    assert.equal(headNeckSalivaryGland(name), null, name);
    assert.equal(headNeckTopographyPathForGroup(node(name), organs), null, name);
  }
});

test('Whole-region and organ-only isolation retain glands; tissue controls do not mix nerves/vessels; restore captures all meshes', () => {
  const nodes = ['Parotid_L', 'Accessory parotid gland.r', 'Parotid gland superficial lobe.l',
    'Submandibular gland.r', 'Sublingual gland.l', 'Parotid duct.r',
    'Auriculotemporal nerve.l', 'Retromandibular vein.r', 'Temporal bone.l', 'Unknown mesh']
    .map((name, i) => node(name, i + 1));
  const plan = planRegionIsolation(nodes, 'nervous', organs, n => headNeckTopographyPathForGroup(n, organs))!;
  assert.deepEqual(plan.show, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plan.hide, [7, 8, 9, 10]);
  for (const n of nodes.slice(0, 6)) assert.ok(headNeckTopographyPathForGroup(n, region));
  assert.deepEqual([...captureRegionIsolation(nodes, organs, null, null).visibility], nodes.map(n => [n.instanceID, false]));
});

test('Homepage salivary gland search includes the parotid/retromandibular collection', async () => {
  for (const name of ['parotid gland', 'submandibular gland', 'sublingual gland']) {
    const { results } = await searchAnatomy(name);
    assert.ok(results.some(result => result.destinations.some(destination => destination.atlasId === 'head-neck-topography'
      && destination.collections.some(label => label.includes('Parotid and retromandibular region') && label.includes('Organs and glands')))), name);
  }
});
