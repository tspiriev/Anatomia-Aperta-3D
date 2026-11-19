import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import {
  SKULL_BASE_ROOT_PATH, SKULL_BASE_GROUPS, skullBasePathForGroup,
  skullBaseContextIds, skullBaseSystemForNode, isSkullBaseContext,
} from './skullBaseTaxonomy';
import { skullBaseName, skullBaseNervousSource } from './skullBaseSources';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';

const path = (...parts: string[]) => [...SKULL_BASE_ROOT_PATH, 'middle-fossa', ...parts];
const scene = (names: readonly string[]): SceneNode[] => names.map((rawName, i) =>
  ({ rawName, name: rawName, instanceID: i + 1, systemId: 'nervous', visible: true, type: 'MatrixTransform' }));
const isolate = (nodes: SceneNode[], requested: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
const middle = SKULL_BASE_GROUPS.find(g => g.id === path().join('/'))!;
const trigeminal = middle.children!.find(g => g.id.endsWith('/trigeminal-region'))!;

test('Middle Cranial Fossa Foramina adds bilateral Gasserian ganglia with an independent ganglion-only control', () => {
  const requested = path('foramina');
  const ganglionPath = [...requested, 'gasserianGanglion'];
  const nodes = scene(['Sphenoid bone.l', 'Temporal bone.r',
    'Trigeminal nerve (Gasserian) ganglion.l', 'Trigeminal nerve (Gasserian) ganglion.r',
    'Maxillary nerve.l', 'Posterior division of mandibular nerve.r', 'Trigeminal nerve root.l', 'Oculomotor nerve.r', 'Unknown mesh']);
  const group = middle.children!.find(g => g.id === requested.join('/'))!;
  assert.equal(group.children?.find(g => g.id === ganglionPath.join('/'))?.label, 'Gasserian (trigeminal) ganglion');
  for (const name of ['Trigeminal nerve (Gasserian) ganglion', 'Trigeminal ganglion', 'Gasserian ganglion']) {
    for (const suffix of ['.l', '.r', '.l.001', '.r.002']) {
      const n = scene([`${name}${suffix}`])[0];
      assert.deepEqual(skullBasePathForGroup(n, requested), ganglionPath, n.rawName);
      assert.deepEqual(skullBasePathForGroup(n, ganglionPath), ganglionPath, n.rawName);
      assert.ok(isNodeInRegion(n, requested, () => null));
      assert.equal(isSkullBaseContext(n), false, 'Ganglia retain source appearance');
      assert.equal(skullBaseSystemForNode(n), 'nervous');
    }
  }
  assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(isolate(nodes, requested).hide, [7, 8, 9]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), [1, 2]);
  assert.deepEqual(isolate(nodes, ganglionPath).show, [3, 4]);
  assert.deepEqual(skullBaseContextIds(nodes, ganglionPath), []);
  assert.equal(skullBasePathForGroup(nodes[6], ganglionPath), null, 'Do not add the root to a ganglion-only control');
});

test('Middle fossa includes cochlea and labyrinth anatomy, not cochlear nerves or nuclei in its ear control', () => {
  const names = ['Cochlea.l', 'Cochlea.r', 'Vestibule.l', 'Vestibule.r', 'Labyrinth.l',
    'Membranous labyrinth.r', 'Anterior semicircular canal.l', 'Posterior semicircular duct.r'];
  const nodes = scene([...names, 'Cochlear nerve.l', 'Anterior cochlear nucleus.r',
    'Superior rectus muscle.l', 'Unidentified mesh']);
  const requested = path('innerEar');
  assert.equal(middle.children?.find(g => g.id === requested.join('/'))?.label, 'Cochlea, vestibule and labyrinth');
  for (const n of nodes.slice(0, names.length)) {
    assert.deepEqual(skullBasePathForGroup(n, requested), requested);
    assert.ok(skullBasePathForGroup(n, path()));
    assert.equal(skullBaseSystemForNode(n), 'organs');
    assert.equal(isSkullBaseContext(n), false, 'Inner ear retains source appearance');
  }
  assert.deepEqual(isolate(nodes, requested).show, nodes.slice(0, names.length).map(n => n.instanceID));
  assert.deepEqual(isolate(nodes, requested).hide, nodes.slice(names.length).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
});

test('Middle fossa venous anatomy includes superior petrosal and sigmoid sinuses and separately modeled jugular bulbs', () => {
  const names = ['Superior petrosal sinus.l', 'Superior petrosal sinus.r', 'Sigmoid sinus.l',
    'Sigmoid sinus.r', 'Jugular bulb.l', 'Jugular bulb.r', 'Superior bulb of internal jugular vein.l'];
  const nodes = scene([...names, 'Transverse sinus.l', 'Internal jugular vein.r', 'Thalamus.l', 'Unidentified mesh']);
  const requested = path('venous');
  for (const n of nodes.slice(0, names.length)) {
    assert.ok(skullBasePathForGroup(n, requested), n.rawName);
    assert.ok(skullBasePathForGroup(n, path()), n.rawName);
    assert.equal(skullBaseSystemForNode(n), 'vascular');
    assert.equal(isSkullBaseContext(n), false);
  }
  assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(isolate(nodes, requested).hide, [8, 9, 10, 11]);
  assert.deepEqual(isolate(nodes, [...requested, 'sigmoid']).show, [3, 4]);
  assert.deepEqual(isolate(nodes, [...requested, 'jugularBulb']).show, [5, 6, 7]);
  assert.deepEqual(isolate(nodes, [...requested, 'petrosalSinuses']).show, [1, 2]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
});

test('Cavernous Sinus includes Gasserian ganglia and root with semitransparent gross brainstem', () => {
  const names = ['Trigeminal nerve (Gasserian) ganglion.l', 'Trigeminal nerve (Gasserian) ganglion.r',
    'Trigeminal nerve root.l', 'Trigeminal nerve root.r', 'Midbrain', 'Pons', 'Medulla oblongata'];
  const nodes = scene([...names, 'Nucleus of hypoglossal nerve.l', 'Red nucleus.r',
    'Olive.l', 'Thalamus.r', 'Unidentified mesh']);
  const requested = path('cavernous-sinus');
  for (const n of nodes.slice(0, names.length)) assert.ok(skullBasePathForGroup(n, requested), n.rawName);
  assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(isolate(nodes, requested).hide, [8, 9, 10, 11, 12]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), [5, 6, 7]);
  assert.deepEqual(isolate(nodes, [...requested, 'trigeminalRootGanglion']).show, [1, 2, 3, 4]);
  assert.deepEqual(isolate(nodes, [...requested, 'brainstem']).show, [5, 6, 7]);
});

test('Cavernous Sinus adds bilateral ocular motor, parasympathetic and trigeminal sensory nuclei through shared controls', () => {
  const requested = path('cavernous-sinus', 'brainstem-nuclei');
  const examples = [
    ['Nucleus of oculomotor nerve', 'gse', 'oculomotor'],
    ['Nucleus of trochlear nerve', 'gse', 'trochlear'],
    ['Nucleus of abducens nerve', 'gse', 'abducens'],
    ['Accessory nucleus of oculomotor nerve', 'gve', 'edinger-westphal'],
    ['Mesencephalic nucleus of trigeminal nerve', 'gsa', 'mesencephalic-trigeminal'],
    ['Spinal nucleus of trigeminal nerve', 'gsa', 'spinal-trigeminal'],
    ['Principal (pontine) neucleus of trigeminal nerve', 'gsa', 'principal-trigeminal'],
  ];
  const names = examples.flatMap(([name]) => [`${name}.l`, `${name}.r`]);
  const context = ['Midbrain', 'Pons', 'Medulla oblongata'];
  const excluded = ['Motor nucleus of facial nerve.l', 'Superior salivatory nucleus.r',
    'Inferior salivatory nucleus.l', 'Nucleus of hypoglossal nerve.r', 'Red nucleus.l',
    'Anterior cochlear nucleus.r', 'Motor nucleus of trigeminal nerve.l', 'Unidentified mesh'];
  const nodes = scene([...names, ...context, ...excluded]).map(n => ({ ...n, visible: false }));
  const group = middle.children!.find(g => g.id === path('cavernous-sinus').join('/'))!
    .children!.find(g => g.id === requested.join('/'))!;
  assert.match(group.label, /Brainstem nuclei/);
  assert.deepEqual(group.children?.map(g => g.id.split('/').at(-1)), ['gse', 'gve', 'gsa']);
  for (const [i, [name, category, leaf]] of examples.entries()) {
    for (const side of ['l', 'r']) {
      const n = scene([`${name}.${side}`])[0];
      assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)), n.rawName);
      for (const scope of [path('cavernous-sinus'), requested, [...requested, category, leaf]])
        assert.deepEqual(skullBasePathForGroup(n, scope), [...requested, category, leaf]);
      assert.ok(isNodeInRegion(n, requested, () => null));
      assert.equal(isSkullBaseContext(n), false, 'Nuclei remain opaque');
      assert.equal(skullBaseSystemForNode(n), 'nervous');
    }
    assert.deepEqual(isolate(nodes, [...requested, category, leaf]).show, [i * 2 + 1, i * 2 + 2]);
  }
  const nuclearIds = names.map((_, i) => i + 1);
  const contextIds = context.map((_, i) => names.length + i + 1);
  const nuclearPlan = isolate(nodes, requested);
  assert.deepEqual(nuclearPlan.show, nuclearIds);
  assert.deepEqual(nuclearPlan.hide, nodes.slice(names.length).map(n => n.instanceID));
  assert.ok(nuclearPlan.affected.every(n => !n.visible), 'Restore preserves previous visibility');
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  assert.deepEqual(isolate(nodes, path('cavernous-sinus')).show, [...nuclearIds, ...contextIds]);
  assert.deepEqual(skullBaseContextIds(nodes, path('cavernous-sinus')), contextIds,
    'Existing gross brainstem context stays semitransparent, not the nuclei');
  for (const name of excluded)
    assert.equal(skullBasePathForGroup(scene([name])[0], path('cavernous-sinus')), null, name);
});

test('Trigeminal Region adds the modeled trigeminal nuclei through existing functional nuclear controls', () => {
  const requested = path('trigeminal-region', 'brainstem-nuclei');
  const examples = [
    ['Mesencephalic nucleus of trigeminal nerve', 'mesencephalic-trigeminal'],
    ['Spinal nucleus of trigeminal nerve', 'spinal-trigeminal'],
    ['Principal (pontine) neucleus of trigeminal nerve', 'principal-trigeminal'],
  ];
  const names = examples.flatMap(([name]) => [`${name}.l`, `${name}.r`]);
  const nodes = scene([...names, 'Nucleus of oculomotor nerve.l', 'Motor nucleus of facial nerve.r',
    'Olive.l', 'Midbrain', 'Unidentified mesh']);
  const nuclearGroup = trigeminal.children!.find(g => g.id === requested.join('/'))!;
  assert.equal(nuclearGroup.label, 'Trigeminal nerve nuclei');
  assert.deepEqual(nuclearGroup.children?.map(g => g.id.split('/').at(-1)), ['gsa']);
  for (const [i, [name, leaf]] of examples.entries()) {
    for (const side of ['l', 'r']) {
      const n = scene([`${name}.${side}`])[0];
      assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)));
      assert.deepEqual(skullBasePathForGroup(n, requested), [...requested, 'gsa', leaf]);
      assert.deepEqual(skullBasePathForGroup(n, path('trigeminal-region')), [...requested, 'gsa', leaf]);
      assert.deepEqual(skullBasePathForGroup(n, path('brainstem-nuclei')),
        [...path('brainstem-nuclei'), 'gsa', leaf], 'General regional nuclear control is preserved');
      assert.equal(isSkullBaseContext(n), false);
    }
    assert.deepEqual(isolate(nodes, [...requested, 'gsa', leaf]).show, [i * 2 + 1, i * 2 + 2]);
  }
  assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(isolate(nodes, requested).hide, [7, 8, 9, 10, 11]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
});

test('Middle fossa trigeminal nerve includes semitransparent gross brainstem without fading nerves or adding unrelated nuclei', () => {
  const gross = ['Midbrain', 'Pons', 'Medulla oblongata', 'Brainstem', 'Brain stem'];
  const nerves = ['Trigeminal nerve root.l', 'Trigeminal nerve (Gasserian) ganglion.r',
    'Ophthalmic nerve.l', 'Maxillary nerve.r'];
  const excluded = ['Nucleus of oculomotor nerve.l', 'Red nucleus.r', 'Olive.l',
    'Thalamus.r', 'Superior rectus muscle.l', 'Unknown mesh'];
  const nodes = scene([...gross, ...nerves, ...excluded]).map(n => ({ ...n, visible: false }));
  const grossIds = gross.map((_, i) => i + 1);
  const memberIds = [...gross, ...nerves].map((_, i) => i + 1);
  const requested = path('trigeminal-region', 'trigeminal');
  for (const n of nodes.slice(0, memberIds.length)) {
    assert.deepEqual(skullBasePathForGroup(n, requested), requested, n.rawName);
    assert.ok(isNodeInRegion(n, requested, () => null), n.rawName);
    assert.equal(isSkullBaseContext(n), gross.includes(n.rawName));
  }
  const plan = isolate(nodes, requested);
  assert.deepEqual(plan.show, memberIds);
  assert.deepEqual(plan.hide, nodes.slice(memberIds.length).map(n => n.instanceID));
  assert.ok(plan.affected.every(n => !n.visible), 'Restore retains previous visibility');
  assert.deepEqual(skullBaseContextIds(nodes, requested), grossIds);
  assert.deepEqual(skullBaseContextIds(nodes, path('trigeminal-region')), grossIds);
  assert.deepEqual(skullBaseContextIds(nodes, path('trigeminal-region', 'v1')), []);
  assert.deepEqual(skullBaseContextIds(nodes, path('trigeminal-region', 'brainstem-nuclei')), []);
});

test('Tensor tympani stays in Middle fossa and trigeminal nerve view with all identifiable V3 muscle targets, not a separate category', () => {
  const names = ['Tensor typmani muscle.l', 'Tensor typmani muscle.r', 'Tensor tympani muscle.r.001',
    'Temporalis muscle.l', 'Superficial part of masseter.l', 'Deep part of masseter.r',
    'Medial pterygoid muscle.l', 'Superior head of lateral pterygoid muscle.r',
    'Inferior head of lateral pterygoid muscle.l', 'Mylohyoid muscle.r',
    'Anterior belly of digastric muscle.l', 'Tensor veli palatini muscle.r'];
  const nodes = scene([...names, 'Posterior belly of digastric muscle.r', 'Stylohyoid muscle.l',
    'Platysma.l', 'Tensor fasciae latae.r', 'Masseteric fascia.l', 'Masseter.ol',
    'Temporalis muscle.er', 'Olive.l', 'Unidentified mesh']);
  const requested = path('trigeminal-region', 'trigeminal');
  assert.ok(!middle.children?.some(g => g.id.endsWith('/tensorTympani')));
  assert.ok(!JSON.stringify(middle).includes('/tensorTympani"'), 'No separate tensor isolation control in this collection');
  for (const n of nodes.slice(0, names.length)) {
    for (const scope of [path(), path('trigeminal-region'), requested]) {
      assert.ok(skullBasePathForGroup(n, scope), n.rawName);
      assert.ok(isNodeInRegion(n, scope, () => null), 'Selection includes the same muscle targets');
    }
    assert.equal(skullBaseSystemForNode(n), 'muscular', 'Overrides inherited nervous-system membership');
    assert.ok(isSkullBaseContext(n), n.rawName);
    assert.equal(skullBasePathForGroup(n, path('tensorTympani')), null, 'Removed standalone path cannot isolate it');
  }
  for (const scope of [path(), path('trigeminal-region'), requested]) {
    assert.deepEqual(isolate(nodes, scope).show, nodes.slice(0, names.length).map(n => n.instanceID));
    assert.deepEqual(isolate(nodes, scope).hide, nodes.slice(names.length).map(n => n.instanceID));
    assert.deepEqual(skullBaseContextIds(nodes, scope), nodes.slice(0, names.length).map(n => n.instanceID));
  }
  for (const region of ['anterior-fossa-orbit', 'petrous-temporal', 'posterior-fossa'])
    assert.equal(skullBasePathForGroup(scene(['Temporalis muscle.l'])[0], [...SKULL_BASE_ROOT_PATH, region]), null,
      'Other regional muscle memberships remain unchanged');
});
