import test from 'node:test';
import assert from 'node:assert/strict';
import nervousCsv from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import vascularCsv from '@assets/Cardiovascular_system_1792359799661.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { SceneNode } from '../types/sketchfab';
import { isLateralNeckNerve } from './headNeckLateralNeck';
import { isUpperCranialNerve } from './headNeckSubmental';
import { HEAD_NECK_TOPOGRAPHY_GROUPS, headNeckTopographyPathForGroup,
  headNeckTopographyName } from './headNeckTopography';
import { NECK_INVENTORY_SECTIONS, NECK_NEUROVASCULAR_GROUPS, neckInventoryTissue,
  neckInventoryFamily } from './headNeckNeurovascularInventory';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { searchAnatomy } from './anatomySearch';
import type { NervousGroup } from './nervousTaxonomy';

const root = ['advanced-neuroanatomy', 'head-neck-topography'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, systemId: null, visible: false, type: 'MatrixTransform',
});

test('Every named source nerve and vessel is available in all four complete neck inventories and has a registered detailed group', () => {
  const registered = new Set<string>();
  const visit = (groups: readonly NervousGroup[]) => groups.forEach(group => {
    registered.add(group.id); if (group.children) visit(group.children);
  });
  visit(HEAD_NECK_TOPOGRAPHY_GROUPS);
  const counts = { nerves: 0, arteries: 0, veins: 0 };
  for (const csv of [nervousCsv, vascularCsv]) for (const row of csvRows(csv)) {
    if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5])) continue;
    const n = node(row[4]), tissue = neckInventoryTissue(n, headNeckTopographyName(n.rawName));
    if (!tissue) continue;
    counts[tissue]++;
    for (const section of NECK_INVENTORY_SECTIONS) {
      const parent = [...root, section, tissue];
      assert.ok(registered.has(parent.join('/')), parent.join('/'));
      const path = headNeckTopographyPathForGroup(n, parent);
      if (section === 'anterior-triangle' && tissue === 'nerves' && isUpperCranialNerve(n.rawName)) {
        assert.equal(path, null, n.rawName);
        continue;
      }
      if (section === 'lateral-neck' && tissue === 'nerves' && !isLateralNeckNerve(n.rawName)) {
        assert.equal(path, null, n.rawName);
        continue;
      }
      assert.ok(path, `${section}: ${n.rawName}`);
      assert.ok(registered.has(path.join('/')), path.join('/'));
      assert.equal(path[parent.length], neckInventoryFamily(n.rawName, tissue));
    }
  }
  for (const count of Object.values(counts)) assert.ok(count > 50, JSON.stringify(counts));
});

test('Each neck advanced menu has complete collections with anatomical subdivisions, never only curated subsets', () => {
  for (const section of NECK_INVENTORY_SECTIONS) {
    const group = HEAD_NECK_TOPOGRAPHY_GROUPS.find(g => g.id === [...root, section].join('/'))!;
    for (const [tissue, families] of Object.entries(NECK_NEUROVASCULAR_GROUPS)) {
      const collection = group.children!.find(g => g.id === [...root, section, tissue].join('/'))!;
      assert.ok(collection, `${section}/${tissue}`);
      assert.deepEqual(collection.children!.map(g => g.id.split('/').at(-1)), families.map(([id]) => id));
    }
  }
  assert.equal(neckInventoryFamily('Trigeminal nerve root.l', 'nerves'), 'cranial');
  assert.equal(neckInventoryFamily('Superior root ansa cervicalis.l', 'nerves'), 'cervical-plexus');
  assert.equal(neckInventoryFamily('C3 posterior root.l', 'nerves'), 'spinal-roots');
  assert.equal(neckInventoryFamily('Anterior_Intercavernous_Sinus', 'veins'), 'sinuses');
  const live = { ...node('New named cervical artery.l'), systemId: 'vascular' as const };
  for (const section of NECK_INVENTORY_SECTIONS)
    assert.ok(headNeckTopographyPathForGroup(live, [...root, section, 'arteries']));
});

test('Regional openings include full inventories; advanced artery/vein/nerve families narrow independently and restore safely', () => {
  const nodes = ['Vagus nerve (X).l', 'C3 posterior root.r', 'Common carotid artery.l',
    'Vertebral artery.l', 'Internal jugular vein.r', 'Superior thyroid vein.r',
    'Unknown mesh'].map((name, i) => node(name, i + 1));
  for (const section of NECK_INVENTORY_SECTIONS) {
    const parent = [...root, section];
    const opening = planRegionIsolation(nodes, 'nervous', parent, n => headNeckTopographyPathForGroup(n, parent))!;
    assert.deepEqual(opening.show, [1, 2, 3, 4, 5, 6]);
    for (const [tissue, family, ids] of [
      ['nerves', 'cranial', [1]], ['nerves', 'spinal-roots', [2]],
      ['arteries', 'carotid', [3]], ['arteries', 'vertebral', [4]],
      ['veins', 'jugular', [5]], ['veins', 'thyroid', [6]],
    ] as const) {
      const path = [...parent, tissue, family];
      const plan = planRegionIsolation(nodes, 'nervous', path, n => headNeckTopographyPathForGroup(n, path))!;
      assert.deepEqual(plan.show, ids);
      assert.deepEqual([...captureRegionIsolation(nodes, path, null, null).visibility], nodes.map(n => [n.instanceID, false]));
    }
  }
});

test('Unreviewed live-model breadth is not advertised as catalogue evidence of pulmonary vessels in this dedicated model', async () => {
  const { results } = await searchAnatomy('pulmonary artery');
  const vessel = results.find(result => result.name === 'Pulmonary artery');
  assert.ok(vessel);
  assert.ok(vessel.destinations.every(destination => destination.atlasId !== 'head-neck-topography'));
});
