import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import csv from '@assets/First_combinedblend_1790668070052.csv?raw';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { BRACHIAL_GROUPS, BRACHIAL_ROOT_PATH, brachialPathForGroup, brachialContextIds, brachialForegroundIds } from './brachialPlexusTaxonomy';
import { brachialTerminalAnatomyPath } from './brachialTerminalAnatomy';
import { isNodeAllowedInAtlasView, BRACHIAL_PLEXUS_VIEW } from './atlasViews';
import { planRegionIsolation } from '../lib/regionIsolation';
import { BrachialPlexusMenu } from '../components/BrachialPlexusMenu';
import type { SceneNode } from '../types/sketchfab';
import { BRACHIAL_HAND_NERVES, BRACHIAL_HAND_MUSCLES } from './brachialHand';
import { brachialPlexusOpacity, refractionContextOpacity } from '../lib/materialTransparency';

const [header, ...rows] = [...csvRows(csv)];
const source = rows.filter(row => row[header.indexOf('row_type')] === 'OBJECT'
  && row[header.indexOf('object_type')] === 'MESH').map(row => ({
    name: row[header.indexOf('object_name')], collection: row[header.indexOf('collection_name')],
  }));
const nodes: SceneNode[] = [...new Set(source.map(row => row.name))].map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: systemForMeshName(rawName),
}));
const path = (...segments: string[]) => [...BRACHIAL_ROOT_PATH, 'terminal', ...segments];
const node = (name: string) => { const n = nodes.find(n => n.rawName === name); assert.ok(n, name); return n; };

test('Terminal nerves includes five main nerves, every associated modeled branch and target muscles, without cord collaterals', () => {
  for (const name of ['Median nerve.l', 'Ulnar nerve.l', 'Radial nerve.l', 'Axillary nerve.l', 'Musculocutaneous nerve.l']) {
    assert.ok(brachialPathForGroup(node(name), path()), name);
    assert.ok(brachialForegroundIds(nodes, path()).includes(node(name).instanceID), name);
  }
  for (const name of ['Muscular branches of median nerve.l', 'Muscular branches of ulnar nerve.l',
    'Muscular branches of radial nerve.l', 'Muscular branches of axillary nerve.l',
    'Anterior interosseous nerve of forearm.l', 'Posterior interosseous nerve of forearm.l',
    'Lateral antebrachial cutaneous nerve.l']) {
    assert.ok(brachialPathForGroup(node(name), path()), name);
    assert.ok(brachialForegroundIds(nodes, path()).includes(node(name).instanceID), name);
    assert.ok(brachialPathForGroup(node(name), [...BRACHIAL_ROOT_PATH, 'overview', 'plexus']), name);
  }
  for (const name of ['Lateral pectoral nerve.l', 'Thoracodorsal nerve.l'])
    assert.equal(brachialPathForGroup(node(name), path()), null, name);
  const terminal = BRACHIAL_GROUPS.find(group => group.id.endsWith('/terminal'))!;
  for (const nerve of terminal.children!.filter(group => /\/(?:median|ulnar|radial|axillary|musculocutaneous)$/.test(group.id))) {
    assert.ok(nerve.children?.some(group => group.id.endsWith('/branches')));
    assert.ok(nerve.children?.some(group => group.id.endsWith('/muscles')));
  }
});
test('all 54 source hand bones are transparent and removed hand ligament collection is excluded', () => {
  const bones = nodes.filter(n => brachialTerminalAnatomyPath(n.rawName)?.[0] === 'hand-bones');
  const ligaments = nodes.filter(n => brachialTerminalAnatomyPath(n.rawName)?.[0] === 'hand-ligaments');
  const foreground = new Set(brachialForegroundIds(nodes, path()));
  const context = new Set(brachialContextIds(nodes, path()));
  assert.equal(bones.length, 54);
  assert.equal(ligaments.length, 72);
  for (const n of bones) {
    assert.ok(isNodeAllowedInAtlasView(n, BRACHIAL_PLEXUS_VIEW), n.rawName);
    assert.ok(brachialPathForGroup(n, path()), n.rawName);
    assert.equal(n.systemId, 'skeletal', n.rawName);
    assert.equal(foreground.has(n.instanceID), false, n.rawName);
    assert.equal(context.has(n.instanceID), true, n.rawName);
  }
  for (const n of ligaments) {
    assert.equal(isNodeAllowedInAtlasView(n, BRACHIAL_PLEXUS_VIEW), false, n.rawName);
    assert.equal(brachialPathForGroup(n, path()), null, n.rawName);
  }
  for (const name of ['Distal phalanx of first finger of foot.l', 'Plantar interphalangeal ligaments.l',
    'Collateral interphalangeal ligaments of foot.l', 'Collateral metatarsophalangeal ligaments.l',
    'Annular ligament of radius.l', 'Scapula.l']) {
    assert.equal(brachialTerminalAnatomyPath(node(name).rawName), null, name);
    assert.equal(brachialPathForGroup(node(name), path()), null, name);
  }
});
test('individual nerve isolation retains matching branches, muscles, bones and translucent cords, not other nerves or removed ligaments', () => {
  const p = path('median', 'left');
  const plan = planRegionIsolation(nodes, 'nervous', p, n => brachialPathForGroup(n, p))!;
  assert.ok(plan);
  const context = brachialContextIds(nodes, p);
  for (const name of ['Lateral cord of brachial plexus.l.', 'Medial cord of brachial plexus.l',
    'Posterior cord of brachial plexus.l']) {
    assert.ok(plan.show.includes(node(name).instanceID), name);
    assert.ok(context.includes(node(name).instanceID), name);
    assert.ok(!brachialForegroundIds(nodes, p).includes(node(name).instanceID), name);
  }
  for (const name of ['Median nerve.l', 'Scaphoid bone.l', 'First metacarpal bone.l',
    'Distal phalanx of first finger of hand.l', 'Muscular branches of median nerve.l',
    'Proper palmar digital branches of median nerve.l']) {
    assert.ok(plan.show.includes(node(name).instanceID), name);
    const handBone = brachialTerminalAnatomyPath(name)?.[0] === 'hand-bones';
    assert.equal(brachialForegroundIds(nodes, p).includes(node(name).instanceID), !handBone, name);
    assert.equal(context.includes(node(name).instanceID), handBone, name);
  }
  for (const name of ['Scaphoid bone.r', 'Scapholunate interosseous ligament.r', 'Ulnar nerve.l',
    'Scapholunate interosseous ligament.l', 'Palmar interphalangeal ligaments.l',
    'Lateral pectoral nerve.l', 'Clavicle.l']) {
    assert.ok(plan.hide.includes(node(name).instanceID), name);
  }
  assert.equal(brachialPathForGroup(node('Ulnopisiform ligament'), path('hand-ligaments')), null);
  assert.equal(brachialPathForGroup(node('Ulnopisiform ligament'), path('hand-ligaments', 'left')), null);
});
test('new Hand collection replaces exactly the three removed menus and all redundant descriptions are gone', () => {
  for (const name of ['Scaphoid bone.l']) {
    for (const category of ['roots', 'trunks', 'divisions', 'cords']) {
      assert.equal(brachialPathForGroup(node(name), [...BRACHIAL_ROOT_PATH, category]), null, name);
    }
    const alias = { ...node(name), rawName: `${name}.001_123` };
    assert.ok(brachialPathForGroup(alias, path('left')));
  }
  const props = {
    variant: 'sidebar', nodes: nodes.filter(n => isNodeAllowedInAtlasView(n, BRACHIAL_PLEXUS_VIEW)),
    activeNerveId: path().join('/'), onActivateNerve: () => {}, isolatedRegionPath: null,
    onIsolateRegion: () => {}, onRestoreRegion: () => {}, onSetRegionVisibility: () => {}, selectedNodeId: null,
  } as const;
  const html = renderToStaticMarkup(createElement(BrachialPlexusMenu, props));
  assert.ok(html.includes('Hand — terminal branches and muscles'));
  const terminal = BRACHIAL_GROUPS.find(g => g.id.endsWith('/terminal'))!;
  assert.deepEqual(terminal.children?.map(g => g.id.split('/').at(-1)),
    ['musculocutaneous', 'median', 'ulnar', 'axillary', 'radial', 'hand']);
  for (const category of [null, 'overview', 'roots', 'trunks', 'divisions', 'cords', 'terminal']) {
    for (const variant of ['sidebar', 'fullscreen'] as const) {
      const markup = renderToStaticMarkup(createElement(BrachialPlexusMenu, {
        ...props, variant, activeNerveId: category ? [...BRACHIAL_ROOT_PATH, category].join('/') : null,
      }));
      for (const removed of ['Nerves stay opaque except', 'The full model is shown. Choose Overview',
        'Cords provide semitransparent context', 'fused per side', 'Hand and wrist ligaments'])
        assert.ok(!markup.includes(removed), `${category}: ${removed}`);
    }
  }
});
test('arm and forearm bones are transparent, side-matched context in Terminal nerves and retained during nerve isolation', () => {
  const p = path('median', 'left');
  const plan = planRegionIsolation(nodes, 'nervous', p, n => brachialPathForGroup(n, p))!;
  assert.ok(plan);
  const context = brachialContextIds(nodes, p);
  const foreground = brachialForegroundIds(nodes, p);
  for (const name of ['Humerus', 'Radius', 'Ulna']) {
    const left = node(`${name}.l`);
    const right = node(`${name}.r`);
    assert.equal(left.systemId, 'skeletal');
    assert.ok(isNodeAllowedInAtlasView(left, BRACHIAL_PLEXUS_VIEW));
    assert.ok(brachialPathForGroup(left, path()));
    assert.ok(plan.show.includes(left.instanceID));
    assert.ok(context.includes(left.instanceID));
    assert.ok(!foreground.includes(left.instanceID));
    assert.ok(plan.hide.includes(right.instanceID));
    const alias = { ...left, rawName: `${name}.l.001_123` };
    assert.ok(brachialPathForGroup(alias, path('left')));
    assert.ok(brachialPathForGroup(left, [...BRACHIAL_ROOT_PATH, 'overview', 'upper-limb-bones',
      name === 'Humerus' ? 'arm' : 'forearm', 'left']));
    for (const category of ['roots', 'trunks', 'divisions', 'cords']) {
      assert.equal(brachialPathForGroup(left, [...BRACHIAL_ROOT_PATH, category]), null);
    }
  }
  assert.ok(context.includes(node('Scaphoid bone.l').instanceID));
  assert.ok(!foreground.includes(node('Scaphoid bone.l').instanceID));
});

test('Overview upper-limb, arm, forearm and hand controls are side-matched and transparent', () => {
  const root = [...BRACHIAL_ROOT_PATH, 'overview'];
  const bones = ['Humerus.l', 'Radius.l', 'Ulna.l', 'Scaphoid bone.l', 'First metacarpal bone.l',
    'Distal phalanx of first finger of hand.l'];
  for (const name of bones) {
    assert.ok(brachialContextIds(nodes, root).includes(node(name).instanceID), name);
    assert.ok(!brachialForegroundIds(nodes, root).includes(node(name).instanceID), name);
    assert.ok(brachialContextIds(nodes, [...root, 'plexus', 'left']).includes(node(name).instanceID), name);
    assert.ok(!brachialContextIds(nodes, [...root, 'plexus', 'right']).includes(node(name).instanceID), name);
  }
  for (const [part, names] of [
    ['arm', ['Humerus.l']],
    ['forearm', ['Radius.l', 'Ulna.l']],
    ['hand', ['Scaphoid bone.l', 'First metacarpal bone.l', 'Distal phalanx of first finger of hand.l']],
  ] as const) {
    const p = [...root, 'upper-limb-bones', part, 'left'];
    const plan = planRegionIsolation(nodes, 'nervous', p, n => brachialPathForGroup(n, p))!;
    assert.ok(plan);
    for (const name of names) assert.ok(plan.show.includes(node(name).instanceID), name);
    for (const name of bones.filter(name => !names.some(member => member === name)))
      assert.ok(plan.hide.includes(node(name).instanceID), name);
  }
});

test('Hand contains every modeled hand branch and intrinsic muscle, excluding parent trunks and proximal targets', () => {
  for (const side of ['left', 'right'] as const) {
    const suffix = side === 'left' ? 'l' : 'r';
    const p = path('hand', side);
    const plan = planRegionIsolation(nodes, 'nervous', p, n => brachialPathForGroup(n, p))!;
    const context = brachialContextIds(nodes, p);
    const foreground = brachialForegroundIds(nodes, p);
    assert.ok(plan);
    for (const names of Object.values(BRACHIAL_HAND_NERVES)) for (const name of names) {
      const n = node(`${name}.${suffix}`);
      assert.ok(plan.show.includes(n.instanceID), n.rawName);
      assert.ok(foreground.includes(n.instanceID), n.rawName);
      assert.ok(!context.includes(n.instanceID), n.rawName);
    }
    for (const name of BRACHIAL_HAND_MUSCLES) {
      const n = node(`${name}.${suffix}`);
      assert.ok(plan.show.includes(n.instanceID), n.rawName);
      assert.ok(context.includes(n.instanceID), n.rawName);
      assert.ok(!foreground.includes(n.instanceID), n.rawName);
    }
    for (const name of ['Median nerve', 'Ulnar nerve', 'Radial nerve', 'Pronator quadratus',
      'Flexor digitorum profundus', 'Humerus', 'Radius', 'Lateral cord of brachial plexus']) {
      const n = nodes.find(n => n.rawName.startsWith(`${name}.${suffix}`))!;
      assert.ok(n, name);
      assert.ok(plan.hide.includes(n.instanceID), n.rawName);
    }
    const bone = node(`Scaphoid bone.${suffix}`);
    assert.ok(context.includes(bone.instanceID));
    const branchPath = path('hand', 'median', side);
    const isolated = planRegionIsolation(nodes, 'nervous', branchPath, n => brachialPathForGroup(n, branchPath))!;
    assert.ok(isolated.show.includes(bone.instanceID));
    assert.ok(isolated.hide.includes(node(`Dorsal digital branches of radial nerve.${suffix}`).instanceID));
    assert.ok(isolated.hide.includes(node(`Scaphoid bone.${suffix === 'l' ? 'r' : 'l'}`).instanceID));
  }
});

test('every brachial semitransparent material uses the screenshot refraction preset without mutating source or other models', () => {
  const material = { id: 'source', name: 'source', channels: {
    Opacity: { enable: false, factor: 0.8, type: 'blend', refractionColor: [0.2, 0.3, 0.4] },
  } };
  const original = structuredClone(material);
  const result = brachialPlexusOpacity(BRACHIAL_PLEXUS_VIEW.modelUid, material);
  assert.deepEqual(result, refractionContextOpacity(material));
  assert.equal(result?.type, 'refraction');
  assert.equal(result?.factor, 0.133);
  assert.equal(result?.ior, 1);
  assert.equal(result?.roughnessFactor, 0);
  assert.equal(result?.useMicrosurfaceTexture, true);
  assert.equal(result?.useNormalOffset, false);
  assert.equal(result?.useAlbedoTint, false);
  assert.deepEqual(result?.refractionColor, [1, 1, 1]);
  assert.equal(brachialPlexusOpacity('other-model', material), undefined);
  assert.deepEqual(material, original);
});
