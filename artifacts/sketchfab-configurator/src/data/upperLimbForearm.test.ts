import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UPPER_LIMB_SOURCE_OBJECTS as rows, UPPER_LIMB_TOPOGRAPHY_GROUPS as groups,
  UPPER_LIMB_TOPOGRAPHY_ROOT as ROOT, upperLimbPathForGroup as pathFor,
  upperLimbSystemForNode,
} from './upperLimbRegionalAtlas';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

const p = (...parts: string[]) => [...ROOT, 'forearm', ...parts];
const nodes: SceneNode[] = rows.map((row, i) => ({
  rawName: row.rawName, name: row.rawName, instanceID: i + 1, type: 'MatrixTransform',
  systemId: upperLimbSystemForNode({ rawName: row.rawName, systemId: null }), visible: true,
}));
const flatten = (items: readonly NervousGroup[]): NervousGroup[] =>
  items.flatMap(group => [group, ...flatten(group.children ?? [])]);
const tree = flatten(groups);
const nodeFor = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, `Source model must contain ${name}`);
  return node;
};
const assertIncluded = (path: string[], names: string[]) => {
  const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
  assert.ok(plan?.show.length);
  const group = tree.find(group => group.id === path.join('/'))!;
  assert.ok(group, `Visible menu: ${path.join('/')}`);
  const menuIds = menuCollectionNodeIds(nodes, [group], node => pathFor(node, ROOT), pathFor);
  for (const name of names) {
    const node = nodeFor(name);
    assert.ok(pathFor(node, path), `Membership: ${name}/${path.join('/')}`);
    assert.ok(plan.show.includes(node.instanceID), `Isolation: ${name}/${path.join('/')}`);
    assert.ok(menuIds.includes(node.instanceID), `Menu: ${name}/${path.join('/')}`);
    assert.ok(pathFor({ rawName: `${name.replace(/ /g, '_')}_321` }, path), `Live import: ${name}`);
  }
};
const bilateral = (names: string[]) => names.flatMap(name => [`${name}.l`, `${name}.r`]);
const regions = ['anterior', 'posterior', 'mobile-wad', 'radial', 'ulnar', 'median'];

test('Forearm compartments and all three neurovascular groups show proximal supply and the brachial arterial division', () => {
  const arteries = [
    'Left subclavian artery', 'Right subclavian artery',
    ...bilateral(['Axillary artery', 'Brachial artery', 'Radial artery', 'Ulnar artery',
      'Common interosseous artery', 'Posterior interosseous artery', 'Recurrent interosseous artery']),
  ];
  const veins = ['Left subclavian vein', 'Right subclavian vein',
    ...bilateral(['Axillary vein', 'Brachial veins', 'Radial veins', 'Ulnar veins'])];
  for (const region of regions) {
    assertIncluded(p(region), [...arteries, ...veins]);
    assertIncluded(p(region, 'arteries'), arteries);
    assertIncluded(p(region, 'veins'), veins);
  }
});

test('Anterior forearm includes median and ulnar nerves; posterior and mobile wad include radial nerve and both branches', () => {
  const anterior = bilateral(['Median nerve', 'Ulnar nerve',
    'Anterior interosseous nerve of forearm', 'Muscular branches of median nerve', 'Muscular branches of ulnar nerve']);
  assertIncluded(p('anterior'), anterior);
  assertIncluded(p('anterior', 'nerves'), anterior);
  const radial = bilateral(['Radial nerve', 'Deep branch of radial nerve', 'Superficial branch of radial nerve',
    'Posterior interosseous nerve of forearm', 'Muscular branches of radial nerve']);
  for (const region of ['posterior', 'mobile-wad']) {
    assertIncluded(p(region), radial);
    assertIncluded(p(region, 'nerves'), radial);
  }
});

test('Median neurovascular menu contains the median nerve, its forearm branches and median veins', () => {
  assert.equal(tree.find(group => group.id === p('median').join('/'))?.label, 'Median neurovascular structures');
  assertIncluded(p('median', 'nerves'), bilateral(['Median nerve', 'Anterior interosseous nerve of forearm',
    'Muscular branches of median nerve', 'Palmar branch of median nerve']));
  assertIncluded(p('median', 'veins'), bilateral(['Median antebrachial vein', 'Median cubital vein']));
});

test('Antebrachial fascia is available only in the dedicated forearm fascia category, not any compartment or layer', () => {
  const fascia = bilateral(['Antebrachial fascia']);
  assertIncluded(p('fasciae'), fascia);
  const compartmentGroups = tree.filter(group =>
    regions.some(region => group.id === p(region).join('/') || group.id.startsWith(`${p(region).join('/')}/`)));
  for (const group of compartmentGroups) {
    const path = group.id.split('/');
    const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
    const menuIds = menuCollectionNodeIds(nodes, [group], node => pathFor(node, ROOT), pathFor);
    for (const name of fascia) {
      assert.equal(pathFor(nodeFor(name), path), null, `${name}/${group.id}`);
      assert.ok(!plan.show.includes(nodeFor(name).instanceID));
      assert.ok(!menuIds.includes(nodeFor(name).instanceID));
    }
  }
});

test('Brachiocephalic veins are excluded from every forearm menu without removing shoulder memberships', () => {
  for (const name of ['Left brachiocephalic vein', 'Right brachiocephalic vein']) {
    const node = nodeFor(name);
    assert.equal(pathFor(node, p()), null);
    for (const region of ['clavicular', 'deltoid'])
      assert.ok(pathFor(node, [...ROOT, 'shoulder', region, 'veins']));
  }
});
