import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LUMBOSACRAL_GROUPS, LUMBOSACRAL_ROOT_PATH, lumbosacralPathForGroup, lumbosacralContextIds,
  lumbosacralForegroundIds, withLumbosacralRootContributions, lumbosacralGroupsForNodes } from './lumbosacralPlexusTaxonomy';
import { ATLAS_VIEWS, FULL_ANATOMY_VIEW, LUMBOSACRAL_PLEXUS_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { systemForMeshName } from './anatomicalSystems';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { LumbosacralPlexusMenu } from '../components/LumbosacralPlexusMenu';
import type { SceneNode } from '../types/sketchfab';
const root = LUMBOSACRAL_ROOT_PATH;
const make = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, instanceID, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName) ?? undefined,
});
const matches = (name: string, ...path: string[]) => lumbosacralPathForGroup(make(name), [...root, ...path]);
const expected = [
  ['Roots (L1–L4)', 'Iliohypogastric (T12–L1)', 'Ilioinguinal (L1)', 'Genitofemoral (L1–L2)',
    'Lateral femoral cutaneous (L2–L3)', 'Femoral (L2–L4)', 'Obturator (L2–L4)', 'Accessory obturator (L3–L4)',
    'Other cutaneous nerves (dorsal rami)', 'Anterior and posterior spinal roots (L1–L4)', 'Surrounding anatomy'],
  ['Roots (L4–S4)', 'Superior gluteal (L4–S1)', 'Inferior gluteal (L5–S2)', 'Nerve to piriformis (S1–S2)',
    'Nerve to obturator internus (L5–S2)', 'Nerve to quadratus femoris (L4–S1)', 'Posterior femoral cutaneous (S1–S3)',
    'Pudendal (S2–S4)', 'Sciatic (L4–S3)', 'Other cutaneous nerves (dorsal rami)',
    'Anterior and posterior spinal roots (L4–S4)', 'Surrounding anatomy'],
  ['Femoral (L2–L4)', 'Obturator (L2–L4)', 'Sciatic (L4–S3)', 'Tibial (L4–S3)', 'Common fibular (L4–S2)',
    'Superficial fibular (L5–S2)', 'Deep fibular (L4–S1)', 'Medial plantar (L4–L5)',
    'Lateral plantar (S1–S2)', 'Saphenous (L3–L4)', 'Sural (S1–S2)', 'Other cutaneous nerves'],
  ['Anterior and posterior spinal roots (L1–S4)', 'Surrounding anatomy'],
];
test('Explore Atlas registers the supplied model, preserving Full anatomy first and all exact collection lists', () => {
  assert.equal(ATLAS_VIEWS[0], FULL_ANATOMY_VIEW);
  assert.ok(ATLAS_VIEWS.includes(LUMBOSACRAL_PLEXUS_VIEW));
  assert.equal(LUMBOSACRAL_PLEXUS_VIEW.modelUid, '95150214a50c40d78a845399448b7ccb');
  assert.deepEqual(LUMBOSACRAL_GROUPS.map(group => group.label),
    ['Lumbar plexus (L1–L4)', 'Sacral plexus (L4–S4)', 'Lower limb nerves', 'Cauda equina']);
  LUMBOSACRAL_GROUPS.forEach((group, i) => assert.deepEqual(group.children?.map(child => child.label), expected[i]));
});
test('main nerves support source spelling aliases, exported duplicates and side labels', () => {
  for (const [name, section, id] of [
    ['Iliohypogastric nerve.r.', 'lumbar', 'iliohypogastric'],
    ['Ilio-inguinal nerve.l.001_123', 'lumbar', 'ilioinguinal'],
    ['Pudental nerve.r', 'sacral', 'pudendal'],
    ['Nerve to quadratus femoris muscle.l', 'sacral', 'quadratus-femoris'],
    ['Nerve to obturator internus muscle.l', 'sacral', 'obturator-internus'],
    ['Common peroneal nerve.l', 'lower-limb', 'common-fibular'],
  ]) {
    assert.ok(matches(name, section, id), name);
    assert.equal(make(name).systemId, 'nervous', name);
  }
  assert.ok(matches('Femoral nerve.l', 'lumbar', 'femoral', 'left'));
  assert.equal(matches('Femoral nerve.r', 'lumbar', 'femoral', 'left'), null);
  assert.equal(matches('Femoral nerve.l.r', 'lumbar', 'femoral', 'left'), null);
  assert.ok(matches('Femoral nerve.l.r', 'lumbar', 'femoral'));
});
test('roots overlap at L4 but do not substitute anterior/posterior spinal roots for plexus rami', () => {
  assert.ok(matches('L4 root.l', 'lumbar', 'roots', 'l4'));
  assert.ok(matches('L4 root.l', 'sacral', 'roots', 'l4'));
  assert.ok(matches('Lumbar plexus.l', 'lumbar', 'roots'));
  assert.ok(matches('Sacral plexus.l', 'sacral', 'roots'));
  assert.ok(matches('S1 root left_123', 'sacral', 'roots', 's1', 'left'));
  assert.equal(matches('S1 root left', 'sacral', 'roots', 's1', 'right'), null);
  assert.equal(matches('L5 root.l', 'lumbar', 'roots'), null);
  assert.equal(matches('S4 root.r', 'lower-limb'), null);
  for (const name of ['L1 anterior root.l', 'L2 posterior root.l']) {
    assert.ok(matches(name, 'lumbar', 'spinal-roots'), name);
    assert.equal(matches(name, 'lumbar', 'roots'), null, name);
    assert.equal(matches(name, 'sacral'), null, name);
  }
  for (const name of ['S1 anterior root.l', 'S4 posterior root.r']) {
    assert.ok(matches(name, 'sacral', 'spinal-roots'), name);
    assert.equal(matches(name, 'sacral', 'roots'), null, name);
    assert.equal(matches(name, 'lumbar'), null, name);
  }
});
test('overlapping categories include only the requested main nerves and anatomically assigned targets', () => {
  for (const name of ['Femoral nerve.l', 'Obturator nerve.r']) {
    assert.ok(matches(name, 'lumbar'));
    assert.ok(matches(name, 'lower-limb'));
    assert.equal(matches(name, 'sacral'), null);
  }
  assert.ok(matches('Sciatic nerve.l', 'sacral'));
  assert.ok(matches('Sciatic nerve.l', 'lower-limb'));
  assert.equal(matches('Sciatic nerve.l', 'lumbar'), null);
  for (const name of ['Anterior branch of obturator nerve.l', 'Muscular branches of deep fibular nerve.l']) {
    assert.ok(matches(name, 'lower-limb'), name);
    assert.ok(matches(name, name.startsWith('Anterior') ? 'lumbar' : 'sacral'), name);
    assert.equal(matches(name, name.startsWith('Anterior') ? 'sacral' : 'lumbar'), null, name);
  }
  for (const name of ['Median nerve.l', 'Humerus.l', 'Tendon of extensor digitorum longus.l', 'Unknown mesh'])
    assert.equal(matches(name), null, name);
  assert.ok(matches('Rectus femoris muscle.l', 'lumbar', 'femoral', 'muscles'));
  assert.equal(matches('Rectus femoris muscle.l', 'lumbar', 'obturator'), null);
  assert.equal(matches('Rectus femoris muscle.l', 'lumbar', 'femoral', 'without-muscles'), null);
  assert.ok(matches('Femoral nerve.l', 'lumbar', 'femoral', 'without-muscles'));
  assert.ok(matches('Tibialis anterior muscle.l', 'lower-limb', 'deep-fibular'));
  assert.equal(matches('Tibialis anterior muscle.l', 'lower-limb', 'tibial'), null);
});
test('Sacral plexus excludes both Tensor fasciae latae meshes from its menus, context and scene without removing gluteal nerves', () => {
  const nodes = ['Superior gluteal nerve.l', 'Superior gluteal nerve.r', 'Tensor fasciae latae.l',
    'Tensor fasciae latae.r', 'Gluteus medius muscle.l'].map((name, i) => make(name, i + 1));
  for (const parts of [[], ['superior-gluteal'], ['superior-gluteal', 'muscles'], ['left'], ['right']]) {
    const path = [...root, 'sacral', ...parts];
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.ok(plan);
    for (const node of nodes.slice(2, 4)) {
      assert.equal(lumbosacralPathForGroup(node, path), null);
      assert.ok(!lumbosacralContextIds(nodes, path).includes(node.instanceID));
      assert.ok(plan.hide.includes(node.instanceID));
      assert.ok(!isNodeInRegion(node, path, () => null));
    }
  }
  assert.equal(matches('Tensor fasciae latae.r', 'sacral', 'superior-gluteal', 'muscles'), null);
  assert.equal(matches('Tensor fasciae latae.r.001_123', 'sacral'), null);
  assert.equal(matches('Tensor fasciae latae.l.001_123', 'sacral'), null);
  assert.equal(matches('Tensor fasciae latae.l'), null);
  assert.ok(matches('Gluteus medius muscle.l', 'sacral', 'superior-gluteal'));
  assert.ok(matches('Gluteus minimus muscle.l', 'sacral', 'superior-gluteal'));
  assert.ok(matches('Superior gluteal nerve.l', 'sacral'));
  assert.ok(matches('Superior gluteal nerve.r', 'sacral'));
});
test('scene isolation, menu scope and context share memberships and hide unknown/opposite-side objects', () => {
  const nodes = ['Femoral nerve.l', 'Femoral nerve.r', 'Rectus femoris muscle.l',
    'Rectus femoris muscle.r', 'Obturator nerve.l', 'Humerus.l', 'Unknown mesh'].map((name, i) => make(name, i + 1));
  const path = [...root, 'lower-limb', 'femoral', 'left'];
  const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
  assert.deepEqual(plan.show, [1, 3]);
  assert.deepEqual(plan.hide, [2, 4, 5, 6, 7]);
  assert.deepEqual(lumbosacralContextIds(nodes, path), [3]);
  assert.deepEqual(lumbosacralForegroundIds(nodes, path), [1]);
  nodes.forEach(node => assert.equal(isNodeInRegion(node, path, () => null), plan.show.includes(node.instanceID)));
  assert.ok(isNodeAllowedInAtlasView(nodes[0], LUMBOSACRAL_PLEXUS_VIEW));
  assert.ok(!isNodeAllowedInAtlasView(nodes[5], LUMBOSACRAL_PLEXUS_VIEW));
  const off = [...path, 'without-muscles'];
  const noMuscles = planRegionIsolation(nodes, 'nervous', off, node => advancedNeuroanatomyPathForGroup(node, off))!;
  assert.deepEqual(noMuscles.show, [1]);
});
test('root annotations preserve original source names, identities and membership', () => {
  const node = make('Pudental nerve.r', 42);
  const labeled = withLumbosacralRootContributions([node])[0];
  assert.equal(labeled.name, 'Pudental nerve.r (S2–S4)');
  assert.equal(labeled.rawName, node.rawName);
  assert.equal(labeled.instanceID, 42);
  assert.deepEqual(matches(node.rawName, 'sacral'), lumbosacralPathForGroup(labeled, [...root, 'sacral']));
  assert.equal(withLumbosacralRootContributions([labeled])[0].name, labeled.name);
});
test('shared menu retains categories and controls without redundant missing-nerve or description text', () => {
  const nodes = ['Femoral nerve.l', 'Rectus femoris muscle.l', 'Pectineus muscle.l'].map((name, i) => make(name, i + 1));
  const props = { variant: 'sidebar' as const, nodes, activeNerveId: `${root.join('/')}/lower-limb`,
    onActivateNerve: () => {}, isolatedRegionPath: null, onIsolateRegion: () => {},
    onRestoreRegion: () => {}, onSetRegionVisibility: () => {}, selectedNodeId: 1 };
  const html = renderToStaticMarkup(createElement(LumbosacralPlexusMenu, props));
  for (const text of ['Lower limb nerves',
    'Femoral nerve.l (L2–L4)', 'button-lumbosacral-side-left', 'button-lumbosacral-muscles'])
    assert.ok(html.includes(text), text);
  const lumbar = renderToStaticMarkup(createElement(LumbosacralPlexusMenu, { ...props, activeNerveId: `${root.join('/')}/lumbar` }));
  assert.ok(lumbar.includes('Accessory obturator (L3–L4)'));
  const sacral = renderToStaticMarkup(createElement(LumbosacralPlexusMenu, { ...props, activeNerveId: `${root.join('/')}/sacral` }));
  for (const markup of [html, lumbar, sacral]) {
    for (const removed of ['No separately named nerve mesh', 'not substitutes for missing nerve geometry',
      'Root contributions are teaching annotations', 'nerves stay opaque; muscle context'])
      assert.ok(!markup.includes(removed), removed);
  }
  for (const variant of ['strip', 'fullscreen'] as const) {
    const markup = renderToStaticMarkup(createElement(LumbosacralPlexusMenu, { ...props, variant }));
    for (const text of ['Lumbar plexus (L1–L4)', 'Sacral plexus (L4–S4)', 'Lower limb nerves', 'Cauda equina'])
      assert.ok(markup.includes(text), `${variant}: ${text}`);
    assert.ok(!markup.includes('No separately named nerve mesh'));
    assert.ok(!markup.includes('Root contributions are teaching annotations'));
  }
});

test('live-only explicitly named branches inherit their parent scopes and get browsable groups without inventing geometry', () => {
  const nodes = ['Articular branch of femoral nerve.l.001_123', 'Articular branch of femoral nerve.r',
    'Muscular branches of tibial nerve.l', 'Branches of femoral artery.l', 'Tendon of femoral muscle.l',
    'Branch of unknown nerve.l'].map((name, i) => make(name, i + 1));
  assert.equal(nodes[0].systemId, 'nervous');
  for (const section of ['lumbar', 'lower-limb']) {
    const selected = [...root, section, 'femoral', 'branches', 'other-model-branches', 'left', 'without-muscles'];
    const plan = planRegionIsolation(nodes, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!;
    assert.deepEqual(plan.show, [1]);
    assert.ok(isNodeInRegion(nodes[0], selected, () => null));
    assert.ok(lumbosacralForegroundIds(nodes, selected).includes(1));
  }
  assert.ok(matches(nodes[2].rawName, 'sacral', 'sciatic'));
  assert.ok(matches(nodes[2].rawName, 'lower-limb', 'tibial'));
  assert.equal(matches(nodes[2].rawName, 'lumbar'), null);
  for (const node of nodes.slice(3)) assert.equal(matches(node.rawName), null);
  const groups = lumbosacralGroupsForNodes(nodes);
  const femoral = groups[0].children!.find(group => group.id.endsWith('/femoral'))!;
  assert.equal(femoral.children!.find(group => group.id.endsWith('/branches'))!.children!
    .filter(group => group.id.endsWith('/other-model-branches')).length, 1);
  const tibial = groups[2].children!.find(group => group.id.endsWith('/tibial'))!;
  assert.ok(tibial.children!.find(group => group.id.endsWith('/branches'))!.children!
    .some(group => group.id.endsWith('/other-model-branches')));
  assert.equal(lumbosacralGroupsForNodes([]), LUMBOSACRAL_GROUPS);
  assert.ok(!LUMBOSACRAL_GROUPS[0].children!.find(group => group.id.endsWith('/femoral'))!.children!
    .find(group => group.id.endsWith('/branches'))!.children!.some(group => group.id.endsWith('/other-model-branches')));
  const html = renderToStaticMarkup(createElement(LumbosacralPlexusMenu, {
    nodes, selectedNodeId: 1, variant: 'sidebar', activeNerveId: `${root.join('/')}/lumbar`, onActivateNerve: () => {},
    isolatedRegionPath: null, onIsolateRegion: () => {}, onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
  }));
  assert.ok(html.includes('Articular branch of femoral nerve'));
});

test('Cauda equina omits muscle controls and extra disc switches in sidebar and fullscreen, preserving other collections', () => {
  const props = {
    nodes: ['Intervertebral disc L1-L2', 'Intervertebral disc L5-S1', 'L1 anterior root.l'].map((name, i) => make(name, i + 1)),
    activeNerveId: `${root.join('/')}/cauda-equina`, onActivateNerve: () => {},
    isolatedRegionPath: null, onIsolateRegion: () => {}, onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
  };
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    for (const lumbosacralMuscles of [true, false]) {
      for (const isolatedRegionPath of [null, [...root, 'cauda-equina', 'spinal-roots', 'left', 'without-muscles']]) {
        const html = renderToStaticMarkup(createElement(LumbosacralPlexusMenu, {
          ...props, variant, lumbosacralMuscles, isolatedRegionPath,
        }));
        for (const text of ['cauda-disc-controls', 'button-cauda-discs-show', 'button-cauda-discs-hide',
          'button-lumbosacral-muscles', 'Muscle context', 'Muscles are semitransparent context'])
          assert.ok(!html.includes(text), `${variant} must omit ${text}`);
        assert.ok(html.includes('button-lumbosacral-side-left'));
      }
    }
    for (const section of ['lumbar', 'sacral', 'lower-limb']) {
      const other = renderToStaticMarkup(createElement(LumbosacralPlexusMenu, {
        ...props, variant, activeNerveId: `${root.join('/')}/${section}`,
      }));
      assert.ok(other.includes('button-lumbosacral-muscles'), `${section} retains muscle controls`);
      assert.ok(!other.includes('cauda-disc-controls'));
    }
  }
});
