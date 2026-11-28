import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  UPPER_LIMB_SOURCE_OBJECTS as rows, UPPER_LIMB_TOPOGRAPHY_ROOT as ROOT,
  upperLimbPathForGroup as pathFor, upperLimbCataloguePathForGroup,
  upperLimbGroupsForNodes, upperLimbSystemForNode,
} from './upperLimbRegionalAtlas';
import { UPPER_LIMB_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { UpperLimbTopographyMenu } from '../components/UpperLimbTopographyMenu';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const p = (...parts: string[]) => [...ROOT, ...parts];
const nodes = (names: readonly string[]): SceneNode[] => names.map((rawName, i) => ({
  rawName, instanceID: i + 1, name: rawName, visible: true, type: 'MatrixTransform',
  systemId: upperLimbSystemForNode({ rawName, systemId: null }),
}));
const flatten = (groups: readonly NervousGroup[]): NervousGroup[] =>
  groups.flatMap(group => [group, ...flatten(group.children ?? [])]);
const noop = () => {};

test('Updated live shoulder, elbow, wrist and digital joint structures enter their anatomical joint menus', () => {
  for (const [name, region] of [
    ['Articular capsule of sternoclavicular joint', ['shoulder']],
    ['Articular capsule of acromioclavicular joint', ['shoulder']],
    ['Articular capsule of glenohumeral joint', ['shoulder']],
    ['Coracohumeral ligament', ['shoulder']],
    ['Articular capsule of sternoclavicular joint', ['shoulder', 'clavicular']],
    ['Articular capsule of glenohumeral joint', ['shoulder', 'deltoid']],
    ['Inferior glenohumeral ligament', ['shoulder', 'scapular']],
    ['Articular capsule of elbow joint', ['elbow']],
    ['Annular ligament of radius', ['elbow']],
    ['Ulnar collateral ligament', ['elbow']],
    ['Articular capsule of elbow joint', ['elbow', 'posterior']],
    ['Ulnar collateral ligament', ['elbow', 'medial']],
    ['Radial collateral ligament', ['elbow', 'lateral']],
    ['Articular capsule of radiocarpal joint', ['hand-wrist', 'wrist']],
    ['Dorsal radiocarpal ligament', ['hand-wrist', 'wrist', 'dorsal']],
    ['Articular capsules of proximal interphalangeal joints', ['hand-wrist', 'digital']],
    ['Articular capsules of distal interphalangeal joints', ['hand-wrist', 'digital']],
    ['Collateral metacarpophalangeal ligaments', ['hand-wrist', 'digital']],
    ['Collateral interphalangeal ligaments of hand', ['hand-wrist', 'digital']],
  ] as const) for (const side of ['l', 'r']) {
    const node = nodes([`${name}.${side}`])[0], path = p(...region, 'joints-ligaments');
    assert.ok(pathFor(node, path), node.rawName);
    assert.equal(node.systemId, 'joints');
    assert.ok(isNodeAllowedInAtlasView(node, UPPER_LIMB_TOPOGRAPHY_VIEW));
    assert.equal(pathFor(node, p(region[0], 'bones')), null, 'Capsules and ligaments are not bones');
    const imported = { ...node, rawName: `${node.rawName.replace(/ /g, '_')}_987` };
    assert.deepEqual(pathFor(imported, path), pathFor(node, path));
    assert.ok(pathFor(imported, path, side === 'l' ? 'left' : 'right'));
    assert.equal(pathFor(imported, path, side === 'l' ? 'right' : 'left'), null);
  }
});

test('Every saved cruciform and synovial digital sheath appears under digital connective tissue, never muscles', () => {
  const sheaths = rows.filter(row => /Cruciform part of fibrous sheath|Synovial sheaths of digits/.test(row.rawName));
  assert.equal(sheaths.length, 8);
  for (const { rawName } of sheaths) {
    assert.ok(pathFor({ rawName }, p('hand-wrist', 'digital', 'fasciae')), rawName);
    assert.ok(pathFor({ rawName }, p('hand-wrist', 'fasciae')), rawName);
    assert.equal(pathFor({ rawName }, p('hand-wrist', 'digital', 'muscles')), null);
    assert.equal(upperLimbSystemForNode({ rawName, systemId: null }), 'joints');
  }
  for (const side of ['l', 'r'])
    assert.ok(pathFor({ rawName: `Superficial transverse metacarpal ligament.${side}` },
      p('hand-wrist', 'digital', 'joints-ligaments')));
});

test('Loaded updated meshes create source-backed regional tissue branches and isolation shows their actual IDs', () => {
  const live = nodes([
    'Articular capsule of glenohumeral joint.l', 'Coracohumeral ligament.l',
    'Articular capsule of elbow joint.r', 'Articular capsule of radiocarpal joint.l',
    'Cruciform part of fibrous sheath of digit of hand.l.001',
    'Synovial sheaths of digits of hand.r.001', 'Articular capsules of proximal interphalangeal joints.r',
    'Unknown ligament of hand.r', 'Articular capsule of hip joint.l',
  ]);
  const groups = flatten(upperLimbGroupsForNodes(live));
  for (const group of groups)
    assert.ok(menuCollectionNodeIds(live, [group], node => pathFor(node, ROOT), pathFor).length, group.id);
  for (const [path, ids] of [
    [p('shoulder', 'joints-ligaments'), [1, 2]],
    [p('elbow', 'joints-ligaments'), [3]],
    [p('hand-wrist', 'wrist', 'joints-ligaments'), [4]],
    [p('hand-wrist', 'digital', 'fasciae'), [5, 6]],
    [p('hand-wrist', 'digital', 'joints-ligaments'), [7]],
  ] as const) {
    assert.ok(groups.some(group => group.id === path.join('/')), path.join('/'));
    const plan = planRegionIsolation(live, 'nervous', path, node => pathFor(node, path))!;
    assert.deepEqual(plan.show, ids);
    assert.ok(plan.hide.includes(8) && plan.hide.includes(9));
  }
  for (const node of live.slice(-2)) {
    assert.equal(pathFor(node, ROOT), null);
    assert.equal(isNodeAllowedInAtlasView(node, UPPER_LIMB_TOPOGRAPHY_VIEW), false);
  }
});

test('Offline discovery does not treat reviewed live-only joint names as proof of model presence', () => {
  const name = 'Articular capsule of glenohumeral joint.l';
  assert.ok(pathFor({ rawName: name }, ROOT));
  assert.equal(Boolean(upperLimbCataloguePathForGroup({ rawName: name }, ROOT)),
    rows.some(row => row.rawName === name));
  assert.ok(upperLimbCataloguePathForGroup({ rawName: 'Cruciform part of fibrous sheath of digit of hand.l' }, ROOT));
});

test('Shared sidebar, fullscreen and strip render updated live joint groups without a separate menu design', () => {
  const live = nodes(['Articular capsule of radiocarpal joint.l',
    'Articular capsules of proximal interphalangeal joints.l',
    'Cruciform part of fibrous sheath of digit of hand.l']);
  for (const variant of ['sidebar', 'fullscreen', 'strip'] as const) {
    const html = renderToStaticMarkup(createElement(UpperLimbTopographyMenu, {
      variant, nodes: live, activeNerveId: p('hand-wrist').join('/'),
      isolatedRegionPath: p('hand-wrist'), selectedNodeId: null,
      onActivateNerve: noop, onIsolateRegion: noop, onRestoreRegion: noop, onSetRegionVisibility: noop,
    }));
    assert.match(html, /Hand and wrist/);
    if (variant !== 'strip') {
      assert.match(html, /Joints and ligaments \(including capsules\)/);
      assert.match(html, /Digital anatomy/);
      assert.match(html, /Show all/);
      assert.match(html, /Restore previous view/);
    }
  }
});
