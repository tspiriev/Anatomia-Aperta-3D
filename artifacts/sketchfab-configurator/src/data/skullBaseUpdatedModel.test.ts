import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import {
  SKULL_BASE_GROUPS, SKULL_BASE_ROOT_PATH, skullBasePathForGroup, skullBaseSystemForNode,
  skullBaseContextIds, isSkullBaseContext,
} from './skullBaseTaxonomy';
import {
  SKULL_BASE_CEREBELLAR_SECTIONS, SKULL_BASE_WHOLE_CEREBELLUM_PATH,
  SKULL_BASE_VASCULAR_CEREBELLUM_PATH, SKULL_BASE_CEREBELLUM_DETAIL_PATH,
  isSkullBaseCerebellarSurface,
} from './skullBaseCerebellum';
import { skullBaseCerebellumDisplay, WHOLE_CEREBELLUM_NAME } from '../lib/skullBaseCerebellumDisplay';
import { expandWholeBrainIds } from '../lib/basalWholeBrain';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';

const path = (...parts: string[]) => [...SKULL_BASE_ROOT_PATH, ...parts];
const scene = (names: readonly string[]): SceneNode[] => names.map((rawName, i) =>
  ({ rawName, name: rawName, instanceID: i + 1, systemId: 'vascular', visible: true, type: 'MatrixTransform' }));
const isolate = (nodes: SceneNode[], requested: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;

test('Correctly named tensor tympani is included and transparent in all three requested muscle collections', () => {
  const nodes = scene(['Tensor tympani muscle.l', 'Tensor tympani muscle.r.001',
    'Tensor typmani muscle.l', 'Tensor fasciae latae.r', 'Unidentified mesh']);
  for (const region of ['middle-fossa', 'petrous-temporal', 'posterior-fossa']) {
    const requested = path(region);
    const group = SKULL_BASE_GROUPS.find(g => g.id === requested.join('/'))!;
    assert.ok(!JSON.stringify(group).includes('/tensorTympani"'), 'Muscle belongs in the view, not a separate menu category');
    assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3]);
    assert.deepEqual(isolate(nodes, requested).hide, [4, 5]);
    assert.deepEqual(skullBaseContextIds(nodes, requested), [1, 2, 3]);
    for (const n of nodes.slice(0, 3)) assert.equal(skullBaseSystemForNode(n), 'muscular');
  }
});

test('Correctly named superior petrosal sinus works in Middle fossa, Temporal bone, Posterior fossa and vascular anatomy', () => {
  const nodes = scene(['Superior petrosal sinus.l', 'Superior petrosal sinus.r.001',
    'Superior cerebellar artery.l', 'Unidentified mesh']);
  const scopes = [
    path('middle-fossa', 'venous', 'petrosalSinuses'),
    path('petrous-temporal', 'petrosal-veins', 'superiorPetrosalSinuses'),
    path('posterior-fossa', 'venous', 'superiorPetrosalSinuses'),
    path('vascular', 'venous', 'petrosalVeins'),
  ];
  for (const requested of scopes) {
    assert.deepEqual(isolate(nodes, requested).show, [1, 2]);
    assert.deepEqual(isolate(nodes, requested).hide, [3, 4]);
    assert.deepEqual(skullBaseContextIds(nodes, requested), []);
    for (const n of nodes.slice(0, 2)) {
      assert.ok(skullBasePathForGroup(n, requested.slice(0, 3)), 'Whole collection includes the sinus');
      assert.equal(skullBaseSystemForNode(n), 'vascular');
      assert.equal(isSkullBaseContext(n), false);
    }
  }
});

test('Both live carotid sympathetic names, typo and plexus variants are opaque neural structures in exactly the requested collections', () => {
  const names = ['Carotid artery sympathetic.l', 'Internal carotid artery sympathetic.r',
    'Carotid artery symapthetic.l', 'Internal carotid artery symapthetic.r',
    'Carotid artery sympathetic plexus.r', 'Internal carotid artery sympathetic plexus.l',
    'Carotid artery symapthetic plexus.l', 'Internal carotid artery symapthetic plexus.r.001'];
  const nodes = scene([...names, 'Internal carotid artery.l', 'Deep petrosal nerve.r', 'Unidentified mesh']);
  for (const region of ['anterior-fossa-orbit', 'middle-fossa', 'petrous-temporal']) {
    const requested = path(region, 'carotidSympathetic');
    assert.equal(SKULL_BASE_GROUPS.find(g => g.id === path(region).join('/'))?.children
      ?.find(g => g.id === requested.join('/'))?.label, 'Carotid artery sympathetic plexus');
    for (const n of nodes.slice(0, names.length)) {
      assert.deepEqual(skullBasePathForGroup(n, requested), requested);
      assert.ok(skullBasePathForGroup(n, path(region)), n.rawName);
      assert.ok(isNodeInRegion(n, requested, () => null));
      assert.equal(skullBaseSystemForNode(n), 'nervous', 'Do not confuse the nerve plexus with its associated artery');
      assert.equal(isSkullBaseContext(n), false, 'Preserve nerve appearance');
      assert.equal(skullBasePathForGroup(n, path('posterior-fossa')), null);
      assert.equal(skullBasePathForGroup(n, path('vascular', 'arterial')), null);
    }
    assert.deepEqual(isolate(nodes, requested).show, nodes.slice(0, names.length).map(n => n.instanceID));
    assert.deepEqual(isolate(nodes, requested).hide, [9, 10, 11]);
    assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  }
});

const surfaceNames = SKULL_BASE_CEREBELLAR_SECTIONS.flatMap(section =>
  section.parts.filter(part => part.surface).flatMap(part => part.names))
  .flatMap(name => [`${name}.l`, `${name}.r`]);

test('Posterior and vascular whole-cerebellum controls contain every surface piece, not deep nuclei or vessels, and fade all pieces', () => {
  const nodes = scene([...surfaceNames, 'Cerebellum.l', 'Cerebellar hemisphere.r', 'Vermis',
    'Dentate_nucleus.l', 'Superior cerebellar peduncle.r', 'Superior cerebellar artery.l',
    'Midbrain', 'Unidentified mesh']);
  const surfaces = nodes.filter(n => isSkullBaseCerebellarSurface(n.rawName)).map(n => n.instanceID);
  for (const requested of [SKULL_BASE_WHOLE_CEREBELLUM_PATH, SKULL_BASE_VASCULAR_CEREBELLUM_PATH]) {
    const parent = SKULL_BASE_GROUPS.find(g => g.id === requested.slice(0, -1).join('/'))!;
    assert.equal(parent.children?.find(g => g.id === requested.join('/'))?.label,
      'Cerebellum — whole (semitransparent)');
    assert.deepEqual(isolate(nodes, requested).show, surfaces);
    assert.deepEqual(isolate(nodes, requested).hide,
      nodes.filter(n => !surfaces.includes(n.instanceID)).map(n => n.instanceID));
    assert.deepEqual(skullBaseContextIds(nodes, requested), surfaces);
    for (const n of nodes.filter(n => surfaces.includes(n.instanceID))) {
      assert.deepEqual(skullBasePathForGroup(n, requested), requested);
      assert.ok(skullBasePathForGroup(n, requested.slice(0, -1)));
      assert.equal(skullBaseSystemForNode(n), 'nervous');
      assert.ok(isSkullBaseContext(n));
    }
  }
});

test('Cerebellum is displayed once and any clicked surface expands to the same complete visibility selection', () => {
  const nodes = scene([...surfaceNames, 'Dentate_nucleus.l', 'Superior cerebellar artery.r', 'Unidentified mesh']);
  nodes[0].visible = false;
  const display = skullBaseCerebellumDisplay(nodes, path('posterior-fossa'), path('posterior-fossa'));
  const surfaces = nodes.filter(n => isSkullBaseCerebellarSurface(n.rawName));
  assert.deepEqual(display.memberIds, surfaces.map(n => n.instanceID));
  assert.equal(display.representativeId, surfaces[0].instanceID);
  const combined = display.nodes.filter(n => n.rawName === 'Cerebellum');
  assert.equal(combined.length, 1);
  assert.equal(combined[0].name, WHOLE_CEREBELLUM_NAME);
  assert.equal(combined[0].visible, true, 'Partially visible shell stays hideable as a whole');
  assert.equal(display.nodes.length, 4, 'Deep nucleus, vessel and unknown structure stay independent');
  for (const n of surfaces)
    assert.deepEqual(expandWholeBrainIds([n.instanceID], display.memberIds), display.memberIds);
  const vascular = skullBaseCerebellumDisplay(nodes, path('vascular'), path('vascular'));
  assert.deepEqual(vascular.memberIds, display.memberIds);
  const hidden = skullBaseCerebellumDisplay(nodes.map(n => ({ ...n, visible: false })), [], []);
  assert.equal(hidden.nodes.find(n => n.rawName === 'Cerebellum')?.visible, false);
});

test('Detailed cerebellar teaching views retain independent part selection instead of hiding every lobule', () => {
  const nodes = scene([...surfaceNames, 'Dentate_nucleus.l']);
  for (const [active, isolated] of [
    [SKULL_BASE_CEREBELLUM_DETAIL_PATH, path('posterior-fossa')],
    [path('posterior-fossa'), [...SKULL_BASE_CEREBELLUM_DETAIL_PATH, 'anterior-lobe', 'culmen']],
  ]) {
    const display = skullBaseCerebellumDisplay(nodes, active, isolated);
    assert.deepEqual(display.memberIds, []);
    assert.deepEqual(display.nodes, nodes);
    assert.equal(display.representativeId, null);
  }
});
