import assert from 'node:assert/strict';
import test from 'node:test';
import somatosensoryNames from './somatosensoryFiberMemberships.json';
import { systemForMeshName } from './anatomicalSystems';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { BRAIN_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

const peer = ['advanced-neuroanatomy', 'white-matter', 'somatosensory'];
const nested = ['advanced-neuroanatomy', 'white-matter', 'projection', 'somatosensory'];
function sceneNode(rawName: string, instanceID: number): SceneNode {
  return {
    instanceID, rawName, name: rawName, visible: true, type: 'MatrixTransform',
    systemId: systemForMeshName(rawName),
  };
}

test('actual viewer classification assigns every somatosensory source/export name to the nervous system and both shared menus', () => {
  for (const name of somatosensoryNames) {
    for (const rawName of [name, `${name}_123`, `${name}.001_123`]) {
      const node = sceneNode(rawName, 1);
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(isNodeAllowedInAtlasView(node, BRAIN_VIEW), rawName);
      assert.ok(isNodeAllowedInAtlasView(node, CENTRAL_NERVOUS_SYSTEM_VIEW), rawName);
      for (const path of [peer, nested]) assert.ok(isNodeInRegion(node, path, () => null), rawName);
    }
  }
  assert.equal(systemForMeshName('Unknown somatosensory mesh'), null, 'Do not guess membership from a keyword');
});

test('Somatosensory isolation finds all eight live-classified meshes, excludes other anatomy, and does not duplicate White matter membership', () => {
  const members = somatosensoryNames.map((name, i) => sceneNode(`${name}_123`, i + 1));
  const outside = ['Arcuate fascicle.l', 'Thalamus.r', 'Skull', 'Unknown structure']
    .map((name, i) => sceneNode(name, i + 9));
  const nodes = [...members, ...outside];
  for (const path of [peer, nested]) {
    const plan = planRegionIsolation(nodes, 'nervous', path,
      node => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.deepEqual(plan.show, members.map(node => node.instanceID));
    assert.deepEqual(plan.hide, outside.map(node => node.instanceID));
  }
  const white = ['advanced-neuroanatomy', 'white-matter'];
  const parent = planRegionIsolation(nodes, 'nervous', white,
    node => advancedNeuroanatomyPathForGroup(node, white))!;
  assert.equal(parent.show.filter(id => id <= 8).length, 8);
  assert.equal(new Set(parent.show).size, parent.show.length);
});
