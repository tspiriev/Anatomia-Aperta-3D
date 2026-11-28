import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LOWER_LIMB_SOURCE_OBJECTS as rows, LOWER_LIMB_TOPOGRAPHY_GROUPS as groups,
  LOWER_LIMB_TOPOGRAPHY_ROOT as ROOT, LOWER_LIMB_TOPOGRAPHY_MODEL_UID,
  lowerLimbPathForGroup as pathFor, lowerLimbSystemForNode, lowerLimbSettings, lowerLimbSide,
} from './lowerLimbTopography';
import { LOWER_LIMB_TOPOGRAPHY_VIEW as view, isNodeAllowedInAtlasView } from './atlasViews';
import { ATLAS_NAVIGATION_MENUS } from './atlasNavigation';
import { planRegionIsolation, captureRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { LowerLimbTopographyMenu } from '../components/LowerLimbTopographyMenu';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { searchAnatomy } from './anatomySearch';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const p = (...parts: string[]) => [...ROOT, ...parts];
const nodes: SceneNode[] = rows.map((row, i) => ({
  rawName: row.rawName, name: row.rawName, instanceID: i + 1, type: 'MatrixTransform',
  systemId: lowerLimbSystemForNode({ rawName: row.rawName, systemId: null }), visible: true,
}));
const n = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, `Exact source object ${name}`);
  return node;
};
const flatten = (items: readonly NervousGroup[]): NervousGroup[] =>
  items.flatMap(item => [item, ...flatten(item.children ?? [])]);

test('Lower limb is the fourth Topographic anatomy submenu with its own source model', () => {
  assert.equal(view.href, '/atlas/lower-limb');
  assert.equal(view.modelUid, 'ab91928f086c44ad95006b14831e2c80');
  assert.equal(view.modelUid, LOWER_LIMB_TOPOGRAPHY_MODEL_UID);
  assert.deepEqual(ATLAS_NAVIGATION_MENUS.find(menu => menu.id === 'topographic-anatomy')?.views.map(v => v.label),
    ['Head', 'Neck', 'Upper limb', 'Lower limb']);
  assert.ok(!ATLAS_NAVIGATION_MENUS.find(menu => menu.id === 'nervous-system')?.views.includes(view));
  assert.equal(rows.length, 1005);
  assert.equal(new Set(rows.map(row => row.rawName)).size, rows.length);
  assert.deepEqual(groups.map(group => group.id.split('/')[2]),
    ['lumbar-pelvic', 'hip-gluteal', 'thigh', 'knee', 'leg', 'ankle', 'foot']);
});

test('Strict source scope excludes nonregional export objects and unknown live names', () => {
  for (const rawName of ['Proper hepatic artery', 'Splenic artery', 'HCS_RV_Purkinje_05',
    'Articular capsules of metacarpophalangeal joints.r', 'FJ4263_BP29309_FMA7007_Trunk of C4 nerve.l.001']) {
    assert.equal(isNodeAllowedInAtlasView(n(rawName), view), false, rawName);
    assert.equal(pathFor(n(rawName), ROOT), null);
  }
  assert.equal(pathFor({ rawName: 'Invented lower limb nerve.r' }, ROOT), null);
  assert.equal(pathFor(n('Femur.r'), ['advanced-neuroanatomy', 'upper-limb-topography']), null);
});

test('Runtime suffix normalization keeps exact CSV identities and side labels', () => {
  const original = n('Femur.r');
  assert.deepEqual(pathFor({ rawName: 'Femur.r_54321' }, p('thigh')),
    pathFor(original, p('thigh')));
  assert.ok(pathFor(n('Femur.r'), ROOT, 'right'));
  assert.equal(pathFor(n('Femur.r'), ROOT, 'left'), null);
  assert.ok(pathFor(n('Vertebra L3'), ROOT, 'left'));
  assert.ok(pathFor(n('Vertebra L3'), ROOT, 'right'));
  for (const rawName of ['Common plantar digital branches of medial plantar nerve',
    'Descending branch of lateral circumflex femoral artery']) {
    assert.equal(lowerLimbSide(rawName), 'ambiguous');
    assert.ok(pathFor(n(rawName), ROOT));
    assert.equal(pathFor(n(rawName), ROOT, 'left'), null);
    assert.equal(pathFor(n(rawName), ROOT, 'right'), null);
  }
});

test('Named vessels are cardiovascular despite their source muscle collection', () => {
  for (const rawName of ['Popliteal artery.r', 'Popliteal vein.r', 'Posterior tibial artery.r']) {
    assert.equal(rows.find(row => row.rawName === rawName)?.collection, 'Muscular system');
    assert.equal(lowerLimbSystemForNode(n(rawName)), 'vascular');
  }
  assert.ok(pathFor(n('Popliteal artery.r'), p('knee', 'popliteal', 'arteries')));
  assert.ok(pathFor(n('Posterior tibial artery.r'), p('ankle', 'tarsal-tunnel', 'arteries')));
});

test('Parent tissue selections include all descendant compartments and plantar layers', () => {
  for (const name of ['Rectus femoris muscle.r', 'Adductor longus.r', 'Semitendinosus muscle.r'])
    assert.ok(pathFor(n(name), p('thigh', 'muscles')), name);
  for (const name of ['Deep fibular nerve.r', 'Tibial nerve.r', 'Saphenous nerve.r', 'Sural nerve.r'])
    assert.ok(pathFor(n(name), p('leg', 'nerves')), name);
  for (const [name, layer] of [
    ['Abductor hallucis.r', 'layer-1'], ['Quadratus plantae muscle.r', 'layer-2'],
    ['Medial head of flexor hallucis brevis.r', 'layer-3'], ['Plantar interossei muscles.r', 'layer-4'],
  ]) {
    assert.ok(pathFor(n(name), p('foot', 'plantar', layer, 'muscles')), name);
    assert.ok(pathFor(n(name), p('foot', 'plantar', 'muscles')), name);
    assert.ok(pathFor(n(name), p('foot', 'muscles')), name);
  }
});

test('Named connective anatomy is retained and not presented as a muscle', () => {
  for (const [name, region, tissue] of [
    ['Calcaneal tendon.r', 'ankle', 'fasciae'], ['Transverse ligament of knee.r', 'knee', 'joints'],
    ['Popliteofibular ligament.r', 'knee', 'joints'], ['Plantar intercuneiform ligaments.r', 'foot', 'joints'],
    ['Talocalcaneal interosseous ligament.r', 'ankle', 'joints'],
    ['Nucleus pulposus L5-S1', 'lumbar-pelvic', 'joints'],
    ['Subtendinous bursa of tibialis anterior.r', 'ankle', 'bursae'],
  ]) {
    assert.ok(pathFor(n(name), p(region, tissue)), name);
    assert.equal(pathFor(n(name), p(region, 'muscles')), null, name);
  }
});

test('Every offered collection is nonempty and its scene/menu memberships agree', () => {
  for (const group of flatten(groups)) {
    const requested = group.id.split('/');
    const expected = nodes.filter(node => pathFor(node, requested)).map(node => node.instanceID);
    assert.ok(expected.length, group.id);
    assert.deepEqual(menuCollectionNodeIds(nodes, [group], () => null, pathFor), expected, group.id);
  }
});

test('Combined regional isolation keeps all tissue systems and hides the entire out-of-region model', () => {
  for (const group of groups) {
    const requested = group.id.split('/');
    const plan = planRegionIsolation(nodes, 'nervous', requested, node => pathFor(node, requested));
    assert.ok(plan, group.id);
    assert.equal(plan.affected.length, nodes.length);
    assert.deepEqual(plan.show, nodes.filter(node => pathFor(node, requested)).map(node => node.instanceID));
    assert.ok(!plan.show.includes(n('Proper hepatic artery').instanceID));
    assert.ok(plan.show.some(id => nodes.find(node => node.instanceID === id)?.systemId === 'muscular'));
    assert.ok(plan.show.some(id => nodes.find(node => node.instanceID === id)?.systemId === 'skeletal'));
    assert.ok(plan.show.some(id => nodes.find(node => node.instanceID === id)?.systemId === 'vascular'));
    assert.ok(isNodeInRegion(nodes.find(node => node.instanceID === plan.show[0])!, requested, () => null));
  }
});

test('Bones are hideable transparent landmarks in combined views, opaque in bone-only views', () => {
  const requested = p('foot', 'plantar', 'layer-1');
  const members = nodes.filter(node => pathFor(node, requested));
  const ids = members.map(node => node.instanceID);
  const settings = lowerLimbSettings(nodes, ids, requested);
  assert.ok(settings.contextIds.includes(n('Talus.r').instanceID));
  assert.ok(!settings.contextIds.includes(n('Abductor hallucis.r').instanceID));
  assert.equal(lowerLimbSettings(nodes, [], requested).contextIds.length, 0);
  assert.equal(lowerLimbSettings(nodes, ids, p('foot', 'bones')).contextIds.length, 0);
  const hidden = nodes.map(node => ({ ...node, visible: node.instanceID !== n('Talus.r').instanceID }));
  const snapshot = captureRegionIsolation(hidden, requested, null, null);
  assert.equal(snapshot.visibility.get(n('Talus.r').instanceID), false);
  assert.equal(snapshot.visibility.size, nodes.length);
});

test('Sidebar, fullscreen and strip reuse shared menus and recovery controls', () => {
  const noop = () => {};
  for (const variant of ['sidebar', 'fullscreen', 'strip'] as const) {
    const html = renderToStaticMarkup(createElement(LowerLimbTopographyMenu, {
      nodes, variant, activeNerveId: p('foot').join('/'), isolatedRegionPath: p('foot'),
      onActivateNerve: noop, onSetRegionVisibility: noop, selectedNodeId: null,
      toggleVisibility: noop, onSelect: noop, onIsolateRegion: noop, onRestoreRegion: noop,
      onLowerLimbSideChange: noop,
    }));
    if (variant === 'strip') assert.match(html, /Hip and gluteal region/);
    else {
      assert.match(html, /Show all/);
      assert.match(html, /Restore previous view/);
      assert.match(html, /lower-limb-side-left/);
      assert.match(html, /lower-limb-side-right/);
    }
  }
});

test('Homepage search links source structures to real Lower limb collections', async () => {
  const result = await searchAnatomy('popliteal artery', 10);
  const destination = result.results.flatMap(row => row.destinations).find(d => d.atlasId === view.id);
  assert.ok(destination);
  assert.equal(destination.href, '/atlas/lower-limb');
  assert.equal(destination.menuLabel, 'Topographic anatomy');
  assert.ok(destination.collections.some(label => label.includes('Popliteal fossa')));
});
