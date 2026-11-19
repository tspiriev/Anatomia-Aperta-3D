import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BRACHIAL_GROUPS, BRACHIAL_ROOT_PATH, brachialPathForGroup } from './brachialPlexusTaxonomy';
import { brachialRootContribution, brachialRootLabel, withBrachialRootContributions, BRACHIAL_ROOT_LEVELS } from './brachialRootContributions';
import { BrachialPlexusMenu } from '../components/BrachialPlexusMenu';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const expected: Record<string, string> = {
  'Roots of brachial plexus': 'C5–T1',
  'Superior trunk of brachial plexus': 'C5–C6', 'Middle trunk of brachial plexus': 'C7',
  'Inferior trunk of brachial plexus': 'C8–T1',
  'Lateral cord of brachial plexus': 'C5–C7', 'Medial cord of brachial plexus': 'C8–T1',
  'Posterior cord brachial plexus': 'C5–T1',
  'Dorsal scapular nerve': 'C5', 'Long thoracic nerve': 'C5–C7',
  'Suprascapular nerve': 'C5–C6', 'Subclavian nerve': 'C5–C6',
  'Lateral pectoral nerve': 'C5–C7', 'Medial pectoral nerve': 'C8–T1',
  'Medial brachial cutaneous nerve': 'C8–T1', 'Medial antebrachial cutaneous nerve': 'C8–T1',
  'Superior subscapular nerve': 'C5–C6', 'Thoracodorsal nerve': 'C6–C8', 'Inferior subscapular nerve': 'C5–C6',
  'Musculocutaneous nerve': 'C5–C7', 'Axillary nerve': 'C5–C6', 'Median nerve': 'C5–T1',
  'Ulnar nerve': 'C8–T1', 'Radial nerve': 'C5–T1',
};
const nodes: SceneNode[] = Object.keys(expected).map((rawName, i) => ({
  instanceID: i + 1, rawName: `${rawName}.l.001_123`, name: `${rawName} (Left)`,
  visible: true, systemId: 'nervous', type: 'MatrixTransform',
}));
function flatten(groups: readonly NervousGroup[]): NervousGroup[] {
  return groups.flatMap(group => [group, ...flatten(group.children ?? [])]);
}
test('all supplied teaching contributions and source aliases are exact, including each anterior/posterior division', () => {
  for (const [name, roots] of Object.entries(expected)) {
    assert.equal(brachialRootContribution(name), roots, name);
    assert.equal(brachialRootContribution(`${name}.r.002_123`), roots, name);
  }
  for (const [trunk, roots] of [['Superior', 'C5–C6'], ['Middle', 'C7'], ['Inferior', 'C8–T1']]) {
    for (const division of ['Anterior', 'Posterior']) {
      assert.equal(brachialRootContribution(`${division} division of ${trunk} trunk of brachial plexus.l`), roots);
    }
  }
  for (const [name, roots] of [['Upper subscapular nerve', 'C5–C6'], ['Lower subscapular nerve', 'C5–C6'],
    ['Medial cutaneous nerve of arm', 'C8–T1'], ['Medial cutaneous nerve of forearm', 'C8–T1'],
    ['Nerve to subclavius', 'C5–C6'], ['Lateral root of median nerve', 'C5–C7'], ['Medial root of median nerve', 'C8–T1']]) {
    assert.equal(brachialRootContribution(name), roots);
  }
  assert.equal(brachialRootContribution('Scapula.l'), null);
  assert.equal(brachialRootContribution('Muscular branches of median nerve.l'), null, 'Do not invent narrower distal branch contributions');
});
test('group labels annotate trunks, six divisions, all cords, collateral branches and all terminal nerves without changing IDs', () => {
  const groups = flatten(BRACHIAL_GROUPS);
  const label = (id: string) => {
    const group = groups.find(group => group.id === [...BRACHIAL_ROOT_PATH, ...id.split('/')].join('/'));
    assert.ok(group, id);
    return group.label;
  };
  for (const [id, roots] of [
    ['cords/lateral', 'C5–C7'], ['cords/medial', 'C8–T1'], ['cords/posterior', 'C5–T1'],
    ['roots/dorsal-scapular', 'C5'], ['roots/long-thoracic', 'C5–C7'],
    ['trunks/superior/suprascapular', 'C5–C6'], ['trunks/superior/subclavian', 'C5–C6'],
    ['cords/lateral/lateral-pectoral', 'C5–C7'], ['cords/medial/medial-pectoral', 'C8–T1'],
    ['cords/medial/medial-brachial-cutaneous', 'C8–T1'], ['cords/medial/medial-antebrachial-cutaneous', 'C8–T1'],
    ['cords/posterior/superior-subscapular', 'C5–C6'], ['cords/posterior/thoracodorsal', 'C6–C8'],
    ['cords/posterior/inferior-subscapular', 'C5–C6'],
    ['terminal/musculocutaneous', 'C5–C7'], ['terminal/axillary', 'C5–C6'], ['terminal/median', 'C5–T1'],
    ['terminal/ulnar', 'C8–T1'], ['terminal/radial', 'C5–T1'],
  ]) assert.ok(label(id).includes(`(${roots})`), `${id}: ${label(id)}`);
  for (const [trunk, roots] of [['superior', 'C5–C6'], ['middle', 'C7'], ['inferior', 'C8–T1']]) {
    assert.ok(label(`trunks/${trunk}`).includes(`(${roots})`));
    for (const division of ['anterior', 'posterior']) {
      assert.ok(label(`divisions/${trunk}/${division}`).includes(`(${roots})`));
    }
  }
});
test('display annotations preserve identity, side and membership, are idempotent, and leave other anatomy unchanged', () => {
  const decorated = withBrachialRootContributions(nodes);
  for (const [i, n] of decorated.entries()) {
    assert.equal(n.rawName, nodes[i].rawName);
    assert.equal(n.instanceID, nodes[i].instanceID);
    assert.equal(n.visible, nodes[i].visible);
    assert.ok(n.name.includes('(Left)'));
    assert.ok(n.name.endsWith(`(${Object.values(expected)[i]})`));
    for (const category of ['overview', 'roots', 'trunks', 'divisions', 'cords', 'terminal']) {
      const path = [...BRACHIAL_ROOT_PATH, category, 'left'];
      assert.deepEqual(brachialPathForGroup(n, path), brachialPathForGroup(nodes[i], path));
    }
  }
  assert.deepEqual(withBrachialRootContributions(decorated), decorated);
  assert.equal(brachialRootLabel('Dorsal scapular nerve (C5)', 'Dorsal scapular nerve'), 'Dorsal scapular nerve (C5)');
  const bone = { ...nodes[0], rawName: 'Scaphoid bone.l', name: 'Scaphoid bone', systemId: 'skeletal' as const };
  assert.equal(withBrachialRootContributions([bone])[0], bone);
});
test('sidebar, mobile and fullscreen selected names show contributions; root level labels disclose fused geometry', () => {
  const props = {
    nodes, activeNerveId: [...BRACHIAL_ROOT_PATH, 'terminal'].join('/'), onActivateNerve: () => {},
    isolatedRegionPath: null, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: nodes.find(n => n.rawName.startsWith('Median nerve'))!.instanceID,
  };
  for (const variant of ['sidebar', 'mobile', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(BrachialPlexusMenu, { ...props, variant }));
    assert.ok(html.includes('Median nerve (Left) (C5–T1)'), variant);
  }
  const roots = renderToStaticMarkup(createElement(BrachialPlexusMenu, {
    ...props, variant: 'sidebar', selectedNodeId: null, activeNerveId: [...BRACHIAL_ROOT_PATH, 'roots'].join('/'),
  }));
  assert.deepEqual(BRACHIAL_ROOT_LEVELS, ['C5', 'C6', 'C7', 'C8', 'T1']);
  for (const root of BRACHIAL_ROOT_LEVELS) assert.ok(roots.includes(`>${root}</span>`));
  assert.ok(roots.includes('One fused roots mesh per side'));
});
