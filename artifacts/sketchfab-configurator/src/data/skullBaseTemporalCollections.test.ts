import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import {
  SKULL_BASE_ROOT_PATH, SKULL_BASE_GROUPS, skullBasePathForGroup,
  skullBaseContextIds, skullBaseSystemForNode, isSkullBaseContext,
} from './skullBaseTaxonomy';
import { skullBaseName, skullBaseNervousSource } from './skullBaseSources';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';

const path = (...parts: string[]) => [...SKULL_BASE_ROOT_PATH, 'petrous-temporal', ...parts];
const scene = (names: readonly string[]): SceneNode[] => names.map((rawName, i) =>
  ({ rawName, name: rawName, instanceID: i + 1, systemId: 'nervous', visible: true, type: 'MatrixTransform' }));
const temporal = SKULL_BASE_GROUPS.find(g => g.id === path().join('/'))!;
const isolate = (nodes: SceneNode[], requested: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
const scopes = (group: NervousGroup): string[][] =>
  [group.id.split('/'), ...(group.children ?? []).flatMap(scopes)];
const group = (...parts: string[]) => {
  let result = temporal;
  for (const id of parts) result = result.children!.find(g => g.id.split('/').at(-1) === id)!;
  assert.ok(result);
  return result;
};

test('Temporal bone is renamed without changing its navigation identity or other collection labels', () => {
  assert.equal(temporal.label, 'Temporal bone');
  assert.equal(temporal.id, path().join('/'));
  assert.equal(SKULL_BASE_GROUPS.find(g => g.id.endsWith('/middle-fossa'))?.label, 'Middle cranial fossa');
  assert.equal(SKULL_BASE_GROUPS.find(g => g.id.endsWith('/posterior-fossa'))?.label, 'Posterior cranial fossa');
});

test('Temporal bone rejects maxillary nerve aliases throughout its menus without removing the other main trigeminal trunks', () => {
  const excluded = ['Maxillary nerve.l', 'Maxillary nerve.r.001', 'Trigeminal nerve maxillary n (V).r'];
  for (const name of excluded) for (const requested of scopes(temporal))
    assert.equal(skullBasePathForGroup(scene([name])[0], requested), null, `${name}: ${requested.join('/')}`);
  const retained = ['Trigeminal nerve root.l', 'Trigeminal nerve (Gasserian) ganglion.r',
    'Ophthalmic nerve.l', 'Mandibular nerve.r'];
  const nodes = scene([...retained, ...excluded]);
  for (const requested of [path(), path('petrous-carotid'), path('surgical-relationships')]) {
    assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4]);
    assert.deepEqual(isolate(nodes, requested).hide, [5, 6, 7]);
  }
  for (const region of ['middle-fossa', 'anterior-fossa-orbit'])
    assert.ok(skullBasePathForGroup(scene(['Maxillary nerve.l'])[0], [...SKULL_BASE_ROOT_PATH, region]),
      'Other regions retain their maxillary nerve memberships');
});

test('Internal Acoustic Meatus and CPA includes bilateral vestibular and cochlear nuclei through shared SSA controls', () => {
  const requested = path('acoustic-meatus-cpa', 'brainstem-nuclei');
  assert.equal(group('acoustic-meatus-cpa', 'brainstem-nuclei').label, 'Vestibular and cochlear nuclei');
  const examples = [
    ['Vestibular nuclei', 'vestibular'],
    ['Posterior cochlear nucleus', 'dorsal-cochlear'],
    ['Anterior cochlear nucleus', 'ventral-cochlear'],
  ];
  const names = examples.flatMap(([name]) => [`${name}.l`, `${name}.r`]);
  const nodes = scene([...names, 'Motor nucleus of facial nerve.l', 'Nucleus of solitary tract.r',
    'Nucleus of hypoglossal nerve.l', 'Red nucleus.r', 'Midbrain']);
  for (const [i, [name, leaf]] of examples.entries()) {
    for (const side of ['l', 'r']) {
      const n = scene([`${name}.${side}`])[0];
      assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)));
      for (const scope of [path(), path('acoustic-meatus-cpa'), requested])
        assert.deepEqual(skullBasePathForGroup(n, scope), [...requested, 'ssa', leaf]);
      assert.equal(isSkullBaseContext(n), false);
      assert.ok(isNodeInRegion(n, requested, () => null));
    }
    assert.deepEqual(isolate(nodes, [...requested, 'ssa', leaf]).show, [i * 2 + 1, i * 2 + 2]);
  }
  assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(isolate(nodes, requested).hide, [7, 8, 9, 10, 11]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
});

test('Inner Ear and Labyrinth includes all bilateral ossicles at source appearance', () => {
  const names = ['Malleus.l', 'Malleus.r', 'Incus.l', 'Incus.r', 'Stapes.l', 'Stapes.r', 'Cochlea.l', 'Vestibule.r'];
  const nodes = scene([...names, 'Tympanic membrane.l', 'Cochlear nerve.r', 'Olive.l']);
  const requested = path('inner-ear');
  for (const n of nodes.slice(0, names.length)) {
    assert.ok(skullBasePathForGroup(n, requested), n.rawName);
    assert.ok(skullBasePathForGroup(n, path()), n.rawName);
    assert.equal(isSkullBaseContext(n), false, 'Do not fade the small ear structures');
  }
  assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(isolate(nodes, requested).hide, [9, 10, 11]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  for (const leaf of ['malleus', 'incus', 'stapes'])
    assert.ok(group('inner-ear').children?.some(g => g.id.endsWith(`/${leaf}`)));
});

test('Middle Ear includes glossopharyngeal, Jacobson, tympanic plexus and lesser/deep petrosal nerves', () => {
  const names = ['Glossopharyngeal nerve (IX).l', 'Glossopharyngeal nerve (IX).r',
    'Tympanic nerve (Jacobson).l', 'Tympanic nerve (Jacobson).r',
    'Tympanic plexus.l', 'Tympanic plexus.r', 'Lesser petrosal nerve.l', 'Lesser petrosal nerve.r',
    'Deep petrosal nerve.l', 'Deep petrosal nerve.r'];
  const nodes = scene([...names, 'Maxillary nerve.l', 'Inferior salivatory nucleus.r', 'Olive.l', 'Unidentified mesh']);
  const requested = path('middle-ear');
  for (const n of nodes.slice(0, names.length)) {
    assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)), n.rawName);
    assert.ok(skullBasePathForGroup(n, requested), n.rawName);
    assert.equal(isSkullBaseContext(n), false);
  }
  assert.deepEqual(isolate(nodes, requested).show, nodes.slice(0, names.length).map(n => n.instanceID));
  assert.deepEqual(isolate(nodes, requested).hide, [11, 12, 13, 14]);
  assert.deepEqual(isolate(nodes, [...requested, 'lesserPetrosal']).show, [7, 8]);
  assert.deepEqual(isolate(nodes, [...requested, 'deepPetrosal']).show, [9, 10]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
});

test('Facial and Petrosal Nerves includes transparent gross brainstem and opaque facial, solitary and superior salivatory nuclei', () => {
  const requested = path('facial-petrosal');
  const root = [...requested, 'brainstem-nuclei'];
  const examples = [
    ['Motor nucleus of facial nerve', 'sve', 'facial'],
    ['Superior salivatory nucleus', 'gve', 'superior-salivatory'],
    ['Nucleus of solitary tract', 'gva-sva', 'solitary'],
  ];
  const names = [...examples.flatMap(([name]) => [`${name}.l`, `${name}.r`]), 'Midbrain', 'Pons', 'Medulla oblongata'];
  const nodes = scene([...names, 'Inferior salivatory nucleus.l', 'Vestibular nuclei.r',
    'Nucleus of hypoglossal nerve.l', 'Central tegmental tract (nucleus tractus solitarii).l', 'Olive.r']);
  for (const [i, [name, functional, nucleus]] of examples.entries()) {
    for (const side of ['l', 'r']) {
      const n = scene([`${name}.${side}`])[0];
      assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)));
      assert.deepEqual(skullBasePathForGroup(n, requested), [...root, functional, nucleus]);
      assert.deepEqual(skullBasePathForGroup(n, path('brainstem-nuclei')),
        [...path('brainstem-nuclei'), functional, nucleus], 'Existing regional nuclear control remains available');
      assert.equal(isSkullBaseContext(n), false);
    }
    assert.deepEqual(isolate(nodes, [...root, functional, nucleus]).show, [i * 2 + 1, i * 2 + 2]);
  }
  assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(isolate(nodes, requested).hide, [10, 11, 12, 13, 14]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), [7, 8, 9]);
  assert.deepEqual(isolate(nodes, root).show, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(skullBaseContextIds(nodes, root), []);
});

test('Tensor tympani is transparent in the whole Temporal bone model without a standalone muscle category', () => {
  const nodes = scene(['Tensor typmani muscle.l', 'Tensor typmani muscle.r',
    'Tensor tympani muscle.r.001', 'Tensor tympani nerve.r', 'Tensor veli palatini muscle.l', 'Unidentified mesh']);
  assert.ok(!JSON.stringify(temporal).includes('/tensorTympani"'));
  for (const requested of [path(), path('middle-ear'), path('middle-ear', 'tensorTympaniNerve')]) {
    assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4]);
    assert.deepEqual(isolate(nodes, requested).hide, [5, 6]);
    assert.deepEqual(skullBaseContextIds(nodes, requested), [1, 2, 3]);
  }
  for (const n of nodes.slice(0, 3)) {
    assert.equal(skullBaseSystemForNode(n), 'muscular');
    assert.equal(isSkullBaseContext(n), true);
    assert.equal(skullBasePathForGroup(n, path('tensorTympani')), null);
  }
});
