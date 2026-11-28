import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UPPER_LIMB_SOURCE_OBJECTS as rows, UPPER_LIMB_TOPOGRAPHY_GROUPS as groups,
  UPPER_LIMB_TOPOGRAPHY_ROOT as ROOT, upperLimbPathForGroup as pathFor,
  upperLimbSystemForNode, upperLimbSettings, upperLimbSide,
} from './upperLimbRegionalAtlas';
import { HAND_WRIST_REGIONS } from './upperLimbHandWrist';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const p = (...parts: string[]) => [...ROOT, 'hand-wrist', ...parts];
const nodes: SceneNode[] = rows.map((row, i) => ({
  rawName: row.rawName, name: row.rawName, instanceID: i + 1, type: 'MatrixTransform',
  systemId: upperLimbSystemForNode({ rawName: row.rawName, systemId: null }), visible: true,
}));
const flatten = (items: readonly NervousGroup[]): NervousGroup[] =>
  items.flatMap(group => [group, ...flatten(group.children ?? [])]);
const tree = flatten(groups);
const boneRows = nodes.filter(node => pathFor(node, p('bones')));
const n = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, name);
  return node;
};
const plan = (path: string[]) => planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
const menuIds = (path: string[]) => {
  const group = tree.find(group => group.id === path.join('/'))!;
  assert.ok(group, `Menu exists: ${path.join('/')}`);
  return menuCollectionNodeIds(nodes, [group], node => pathFor(node, ROOT), pathFor);
};

test('Hand and wrist have one shared top-level menu and retain every existing distal subdivision', () => {
  assert.equal(groups.filter(group => group.id === p().join('/')).length, 1);
  assert.equal(groups.find(group => group.id === p().join('/'))?.label, 'Hand and wrist');
  assert.ok(!groups.some(group => /\/(?:hand|wrist)$/.test(group.id)));
  for (const path of [
    ...HAND_WRIST_REGIONS.map(region => p(region)),
    p('wrist'), p('wrist', 'palmar'), p('wrist', 'dorsal'), p('wrist', 'palmar', 'carpal-tunnel'),
  ]) assert.ok(menuIds(path).length, path.join('/'));
});

test('Every hand region retains all 54 source hand and wrist bones, without importing other regional muscles', () => {
  assert.equal(boneRows.length, 54);
  for (const region of HAND_WRIST_REGIONS) {
    const path = p(region);
    const isolation = plan(path);
    const menu = menuIds([...path, 'bones']);
    for (const node of boneRows) {
      assert.ok(isolation.show.includes(node.instanceID), `${region}/${node.rawName}`);
      assert.ok(menu.includes(node.instanceID), `${region}/${node.rawName}`);
    }
    for (const id of isolation.show) {
      const node = nodes[id - 1];
      if (node.systemId === 'muscular')
        assert.ok(pathFor(node, [...path, 'muscles']), `${region} must not import ${node.rawName}`);
    }
  }
  const hypothenarOnly = nodes.find(node => pathFor(node, p('hypothenar', 'muscles'))
    && !pathFor(node, p('thenar', 'muscles')))!;
  assert.ok(hypothenarOnly);
  assert.ok(!plan(p('thenar')).show.includes(hypothenarOnly.instanceID));
});

test('Muscle-only groups retain the hand/wrist bony reference as scene context, not as muscle menu entries', () => {
  for (const region of ['thenar', 'hypothenar', 'adductor', 'central', 'interosseous']) {
    const path = p(region, 'muscles'), isolation = plan(path), menu = menuIds(path);
    for (const node of boneRows) {
      assert.ok(isolation.show.includes(node.instanceID));
      assert.ok(isNodeInRegion(node, path, () => null), node.rawName);
      assert.ok(!menu.includes(node.instanceID));
    }
  }
});

test('Retained hand/wrist bones respect the selected side and preserve opaque bones-only selections', () => {
  const path = p('thenar', 'muscles');
  for (const side of ['left', 'right'] as const) {
    const isolation = planRegionIsolation(nodes, 'nervous', path,
      node => pathFor(node, path, side), node => Boolean(pathFor(node, ROOT, side)))!;
    for (const bone of boneRows)
      assert.equal(isolation.show.includes(bone.instanceID), upperLimbSide(bone.rawName) === side, bone.rawName);
  }
  const bones = plan(p('thenar', 'bones'));
  assert.ok(bones.show.every(id => nodes[id - 1].systemId === 'skeletal'));
  assert.deepEqual(upperLimbSettings(nodes, bones.show, p('thenar', 'bones')), { supportIds: [], contextIds: [] });
});

test('Antebrachial fascia is absent throughout hand/wrist; palmar aponeurosis remains only in the shared fascia menu', () => {
  const fascia = ['Antebrachial fascia.l', 'Antebrachial fascia.r'].map(n);
  const aponeuroses = ['Palmar aponeurosis.l', 'Palmar aponeurosis.r'].map(n);
  for (const node of fascia) assert.equal(pathFor(node, p()), null);
  for (const node of aponeuroses) assert.ok(menuIds(p('fasciae')).includes(node.instanceID));
  for (const region of [...HAND_WRIST_REGIONS, 'wrist', 'wrist/palmar', 'wrist/dorsal']) {
    const path = p(...region.split('/')), isolation = plan(path), menu = menuIds(path);
    for (const node of [...fascia, ...aponeuroses]) {
      assert.equal(pathFor(node, path), null, `${region}/${node.rawName}`);
      assert.ok(!isolation.show.includes(node.instanceID));
      assert.ok(!menu.includes(node.instanceID));
    }
  }
});

test('Dorsal/digital hand and dorsal wrist include both arterial and venous palmar arches and radial/ulnar arteries', () => {
  for (const region of ['dorsal', 'digital', 'wrist/dorsal']) {
    const path = p(...region.split('/')), isolation = plan(path);
    for (const [tissue, names] of [
      ['arteries', ['Superficial palmar arch', 'Deep palmar arch', 'Radial artery', 'Ulnar artery']],
      ['veins', ['Superficial venous palmar arch', 'Deep venous palmar arch']],
    ] as const) for (const name of names) for (const side of ['l', 'r']) {
      const node = n(`${name}.${side}`);
      assert.ok(isolation.show.includes(node.instanceID), `${region}/${node.rawName}`);
      assert.ok(menuIds([...path, tissue]).includes(node.instanceID));
      assert.ok(pathFor({ rawName: `${node.rawName.replace(/ /g, '_')}_567` }, [...path, tissue]));
    }
  }
});
