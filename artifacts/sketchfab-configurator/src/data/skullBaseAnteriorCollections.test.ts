import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import {
  SKULL_BASE_ROOT_PATH, SKULL_BASE_GROUPS, skullBasePathForGroup, skullBaseContextIds,
  skullBaseSystemForNode, isSkullBaseContext,
} from './skullBaseTaxonomy';
import { skullBaseNervousSource, skullBaseName } from './skullBaseSources';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';

const path = (...parts: string[]) => [...SKULL_BASE_ROOT_PATH, 'anterior-fossa-orbit', ...parts];
const scene = (names: readonly string[]): SceneNode[] => names.map((rawName, i) =>
  ({ rawName, name: rawName, instanceID: i + 1, systemId: null, type: 'MatrixTransform', visible: true }));
const matches = (name: string, p: readonly string[]) => skullBasePathForGroup(scene([name])[0], p);
const isolate = (nodes: SceneNode[], p: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', p, n => advancedNeuroanatomyPathForGroup(n, p))!;
const group = (p: readonly string[]) => {
  let groups = SKULL_BASE_GROUPS;
  let result = groups[0];
  for (const part of p.slice(2)) {
    result = groups.find(g => g.id.split('/').at(-1) === part)!;
    assert.ok(result, p.join('/'));
    groups = result.children ?? [];
  }
  return result;
};

test('Anterior Skull Base exposes maxillae, vomer and palatines as transparent skeletal anatomy', () => {
  const examples = [
    ['Maxilla.l', 'maxilla'], ['Maxilla.r', 'maxilla'], ['Maxillary bone.l', 'maxilla'],
    ['Vomer', 'vomer'], ['Vomer bone', 'vomer'],
    ['Palatine bone.l', 'palatine'], ['Palatine bone.r', 'palatine'], ['Palatine.l', 'palatine'],
  ];
  const nodes = scene([...examples.map(([name]) => name), 'Maxillary nerve.l', 'Maxillary artery.l',
    'Nasal septal cartilage', 'Thalamus.l']);
  const requested = path('anterior-skull-base');
  for (const n of nodes.slice(0, examples.length)) {
    const component = examples[n.instanceID - 1][1];
    assert.ok(group(requested).children?.some(g => g.id === [...requested, component].join('/')));
    for (const inheritedSystem of [null, 'nervous', 'skeletal'] as const) {
      const bone = { ...n, systemId: inheritedSystem };
      assert.equal(skullBaseSystemForNode(bone), 'skeletal');
      assert.ok(isSkullBaseContext(bone));
      assert.deepEqual(skullBasePathForGroup(bone, requested), [...requested, component]);
    }
    assert.ok(isNodeInRegion(n, requested, () => null));
    assert.ok(skullBaseContextIds(nodes, requested).includes(n.instanceID));
  }
  const plan = isolate(nodes, requested);
  assert.deepEqual(plan.show, nodes.slice(0, examples.length).map(n => n.instanceID));
  assert.deepEqual(plan.hide, nodes.slice(examples.length).map(n => n.instanceID));
  for (const component of ['maxilla', 'vomer', 'palatine']) {
    const selection = [...requested, component];
    assert.deepEqual(isolate(nodes, selection).show,
      examples.flatMap(([, id], i) => id === component ? [i + 1] : []));
  }
});

test('Orbit includes orbital veins, cavernous and both intercavernous sinuses as opaque vessels', () => {
  const names = ['Superior ophthalmic vein.l', 'Inferior ophthalmic vein.r', 'Orbital veins.j',
    'Cavernous_Sinus_L', 'Cavernous_Sinus_R', 'Anterior_Intercavernous_Sinus', 'Posterior_Intercavernous_Sinus'];
  const nodes = scene([...names, 'Superior sagittal sinus', 'Sigmoid sinus.r', 'Internal jugular vein.l', 'Thalamus.l']);
  const requested = path('orbit', 'venous');
  assert.equal(group(requested).label, 'Venous Anatomy');
  for (const n of nodes.slice(0, names.length)) {
    assert.ok(skullBasePathForGroup(n, path('orbit')), n.rawName);
    assert.ok(skullBasePathForGroup(n, requested), n.rawName);
    assert.equal(isSkullBaseContext(n), false, n.rawName);
    assert.ok(matches(n.rawName, path('venous')), 'Existing standalone venous memberships remain intact');
  }
  assert.deepEqual(isolate(nodes, requested).show, nodes.slice(0, names.length).map(n => n.instanceID));
  assert.deepEqual(isolate(nodes, requested).hide, nodes.slice(names.length).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  assert.deepEqual(isolate(nodes, [...requested, 'cavernous']).show, [4, 5, 6, 7]);
  assert.deepEqual(isolate(nodes, [...requested, 'orbitalVeins']).show, [1, 2, 3]);
});

test('Orbit has independent opaque oculomotor nuclei and retains the general regional nuclear menu', () => {
  const requested = path('orbit', 'brainstem-nuclei');
  assert.equal(group(requested).label, 'Oculomotor nuclei');
  const examples = [
    ['Nucleus of oculomotor nerve.l', 'gse', 'oculomotor'],
    ['Nucleus of oculomotor nerve.r', 'gse', 'oculomotor'],
    ['Accessory nucleus of oculomotor nerve.l', 'gve', 'edinger-westphal'],
    ['Accessory nucleus of oculomotor nerve.r', 'gve', 'edinger-westphal'],
  ];
  const excluded = ['Nucleus of trochlear nerve.l', 'Nucleus of abducens nerve.r',
    'Principal (pontine) neucleus of trigeminal nerve.l', 'Nucleus of hypoglossal nerve.r',
    'Red nucleus.l', 'Reticular formation brainstem', 'Midbrain'];
  const nodes = scene([...examples.map(([name]) => name), ...excluded]);
  for (const [name, functional, nucleus] of examples) {
    assert.ok(skullBaseNervousSource.has(skullBaseName(name)));
    const selection = [...requested, functional, nucleus];
    assert.deepEqual(matches(name, requested), selection);
    assert.deepEqual(matches(name, path('orbit')), selection);
    assert.deepEqual(matches(name, path('brainstem-nuclei')), [...path('brainstem-nuclei'), functional, nucleus]);
    assert.equal(isSkullBaseContext(scene([name])[0]), false);
  }
  const plan = isolate(nodes, requested);
  assert.deepEqual(plan.show, [1, 2, 3, 4]);
  assert.deepEqual(plan.hide, nodes.slice(4).map(n => n.instanceID));
  assert.deepEqual(isolate(nodes, [...requested, 'gse', 'oculomotor']).show, [1, 2]);
  assert.deepEqual(isolate(nodes, [...requested, 'gve', 'edinger-westphal']).show, [3, 4]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  assert.ok(matches('Midbrain', path('orbit', 'brainstem')));
});

test('Orbit includes Gasserian ganglion and trigeminal root without broadening that subgroup to distal branches', () => {
  const names = ['Trigeminal nerve (Gasserian) ganglion.l', 'Trigeminal nerve (Gasserian) ganglion.r',
    'Trigeminal nerve root.l', 'Trigeminal nerve root.r'];
  const nodes = scene([...names, 'Maxillary nerve.l', 'Mandibular nerve.r', 'Infraorbital nerve.l', 'Thalamus.r']);
  const requested = path('orbit', 'trigeminalRootGanglion');
  assert.ok(group(path('orbit')).children?.some(g => g.id === requested.join('/')));
  for (const n of nodes.slice(0, names.length)) {
    assert.deepEqual(skullBasePathForGroup(n, requested), requested);
    assert.ok(matches(n.rawName, path('orbit')));
    assert.equal(isSkullBaseContext(n), false);
  }
  assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4]);
  assert.deepEqual(isolate(nodes, requested).hide, [5, 6, 7, 8]);
});

test('Ethmoidal Region includes ophthalmic supply and separately selectable anterior/posterior ethmoidal nerves', () => {
  const names = ['Ophthalmic artery.l', 'Ophthalmic artery.r', 'Anterior ethmoidal nerve.l',
    'Anterior ethmoidal nerve.r', 'Posterior ethmoidal nerve.l', 'Posterior ethmoidal nerve.r',
    'Anterior ethmoidal artery.l', 'Posterior ethmoidal artery.r', 'Ethmoid bone'];
  const nodes = scene([...names, 'Lateral posterior inferior nasal nerve.l',
    'Lateral posterior superior nasal nerve.r', 'Oculomotor nerve (cisternal and cavernous part).l',
    'Maxillary artery.r', 'Thalamus.l']);
  const requested = path('ethmoidal-region');
  assert.ok(group(requested).children?.some(g => g.id.endsWith('/ophthalmic')));
  const plan = isolate(nodes, requested);
  assert.deepEqual(plan.show, nodes.slice(0, names.length).map(n => n.instanceID));
  assert.deepEqual(plan.hide, nodes.slice(names.length).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, requested), [9]);
  assert.deepEqual(isolate(nodes, [...requested, 'anteriorEthmoidalNerves']).show, [3, 4]);
  assert.deepEqual(isolate(nodes, [...requested, 'posteriorEthmoidalNerves']).show, [5, 6]);
  assert.ok(matches('Ophthalmic artery.l.001', [...requested, 'ophthalmic']));
});

test('Optional distinctly named ethmoidal terminal meshes are supported without pretending they exist in the supplied export', () => {
  const anterior = ['External nasal branch of anterior ethmoidal nerve.l',
    'Internal nasal branches of anterior ethmoidal nerve.r',
    'Medial internal nasal branches of anterior ethmoidal nerve.l',
    'Lateral internal nasal branches of anterior ethmoidal nerve.r'];
  const posterior = ['Terminal branches of posterior ethmoidal nerve.l'];
  for (const name of [...anterior, ...posterior])
    assert.equal(skullBaseNervousSource.has(skullBaseName(name)), false, 'Do not claim nonexistent export rows');
  const nodes = scene([...anterior, ...posterior]);
  assert.deepEqual(isolate(nodes, path('ethmoidal-region', 'anteriorEthmoidalNerves')).show, [1, 2, 3, 4]);
  assert.deepEqual(isolate(nodes, path('ethmoidal-region', 'posteriorEthmoidalNerves')).show, [5]);
});
