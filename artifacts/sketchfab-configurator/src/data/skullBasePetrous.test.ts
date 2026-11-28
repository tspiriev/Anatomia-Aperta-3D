import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { SKULL_BASE_GROUPS, SKULL_BASE_ROOT_PATH, skullBasePathForGroup,
  skullBaseContextIds, skullBaseSystemForNode } from './skullBaseTaxonomy';
import { skullBaseNervousSource, skullBaseVascularSource, skullBaseName } from './skullBaseSources';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import { formatAnatomicalName } from '../lib/anatomicalDisplayName';

const path = (...parts: string[]) => [...SKULL_BASE_ROOT_PATH, 'petrous-temporal', ...parts];
const node = (rawName: string, instanceID = 1, systemId: SceneNode['systemId'] = null): SceneNode =>
  ({ rawName, name: rawName, instanceID, systemId, visible: true, type: 'MatrixTransform' });
const matches = (name: string, ...parts: string[]) => Boolean(skullBasePathForGroup(node(name), path(...parts)));

test('Temporal bone keeps exact trigeminal roots, V1/V3 trunks and existing nuclei, not V2 or distal branches', () => {
  const keep = ['Temporal bone.l', 'Temporal bone.r', 'Trigeminal nerve root.l', 'Motor root of trigeminal nerve.r',
    'Trigeminal nerve (Gasserian) ganglion.l', 'Ophthalmic nerve.r', 'Mandibular nerve.l',
    'Principal (pontine) neucleus of trigeminal nerve.r'];
  const remove = ['Sphenoid bone', 'Occipital bone', 'Frontal bone', 'Tentorium cerebelli',
    'Maxillary nerve.r', 'Trigeminal nerve maxillary n (V).l',
    'Inferior alveolar nerve.r', 'Trunk of right inferior alveolar nerve.r', 'Auriculotemporal nerve.l',
    'Zygomatic nerve.r', 'Nasociliary nerve.l', 'Right masseteric nerve.r', 'Greater palatine nerve.l',
    'Pterygopalatine ganglion.r', 'Otic ganglion.l', 'Spinal trigeminal tract.r',
    'Oculomotor nerve (cisternal and cavernous part).r'];
  for (const name of keep) assert.ok(matches(name), name);
  const group = SKULL_BASE_GROUPS.find(group => group.id === path().join('/'))!;
  assert.ok(!JSON.stringify(group).includes('/sphenoid'));
  assert.ok(!JSON.stringify(group).includes('/trigeminal"'));
  for (const name of remove) {
    assert.equal(matches(name), false, name);
    for (const child of group.children ?? []) {
      assert.equal(skullBasePathForGroup(node(name), child.id.split('/')), null, `${name}: ${child.label}`);
    }
  }
  const nodes = [...keep, ...remove].map((name, i) => node(name, i + 1));
  const plan = planRegionIsolation(nodes, 'nervous', path(),
    n => advancedNeuroanatomyPathForGroup(n, path()))!;
  assert.deepEqual(plan.show, keep.map((_, i) => i + 1));
  assert.deepEqual(plan.hide, remove.map((_, i) => keep.length + i + 1));
  assert.ok(advancedNeuroanatomyPathForGroup(node('Inferior alveolar nerve.r'),
    [...SKULL_BASE_ROOT_PATH, 'middle-fossa']), 'Other regional memberships are unchanged');
});

test('petrous middle ear includes ossicles, membrane, tympanic pathways and correctly named tensor tympani', () => {
  for (const side of ['l', 'r']) {
    for (const name of ['Malleus', 'Incus', 'Stapes', 'Tympanic membrane', 'Tympanic plexus',
      'Tympanic nerve (Jacobson)', 'Tensor typmani muscle', 'Tensor tympani nerve', 'Auditory tube', 'Chorda tympani']) {
      assert.ok(matches(`${name}.${side}`, 'middle-ear'), `${name}.${side}`);
    }
    for (const name of ['Tympanic membrane', 'Tympanic plexus', 'Tympanic nerve (Jacobson)', 'Tensor typmani muscle']) {
      assert.ok(skullBaseNervousSource.has(skullBaseName(`${name}.${side}`)), name);
    }
    assert.equal(formatAnatomicalName(`Tensor typmani muscle.${side}`),
      `Tensor tympani muscle (${side === 'l' ? 'Left' : 'Right'})`);
  }
  const nodes = [node('Temporal bone.r', 1, 'skeletal'), node('Tensor typmani muscle.r', 2, 'nervous'),
    node('Malleus.r', 3, 'skeletal'), node('Incus.r', 4, 'skeletal'), node('Stapes.r', 5, 'skeletal'),
    node('Tympanic membrane.r', 6, 'nervous'), node('Tympanic plexus.r', 7, 'nervous')];
  assert.deepEqual(skullBaseContextIds(nodes, path('middle-ear')), [1, 2],
    'Temporal bone and muscle are semitransparent; small ear structures retain source appearance');
  for (const n of nodes.slice(2, 6)) assert.equal(skullBaseSystemForNode(n), 'organs');
});

test('petrous IX, X and VII include relevant local branches, not distal cardiac pathways', () => {
  for (const side of ['l', 'r']) {
    for (const name of ['Glossopharyngeal nerve (IX)', 'Vagus nerve (X)', 'Pharyngeal branch of the vagus nerve',
      'Tympanic nerve (Jacobson)', 'Tympanic plexus', 'Lesser petrosal nerve']) {
      assert.ok(matches(`${name}.${side}`, 'jugular-foramen'), `${name}.${side}`);
    }
    assert.ok(matches(`Facial nerve (VII).${side}`, 'facial-petrosal'));
    assert.ok(matches(`Chorda tympani.${side}`, 'facial-petrosal'));
    assert.ok(matches(`Deep petrosal nerve.${side}`, 'facial-petrosal'));
  }
  assert.ok(matches('Superior laryngeal nerve.l', 'jugular-foramen'));
  for (const name of ['Right recurrent laryngeal nerve.r', 'Superior Cardiac nerve vagus.l',
    'Inferior cardiac nerve vagus.r', 'Cardiac plexus', 'Aortic plexus']) {
    assert.equal(matches(name), false, name);
  }
  assert.ok(matches('Motor nucleus of facial nerve.l', 'facial-petrosal'));
});

test('petrous venous anatomy includes the requested sinuses and internal jugular veins without fabricating a bulb', () => {
  for (const side of ['l', 'r']) {
    for (const name of ['Superior petrosal sinus', 'Inferior petrosal sinus', 'Sigmoid sinus', 'Internal jugular vein']) {
      const rawName = `${name}.${side}`;
      assert.ok(skullBaseVascularSource.has(skullBaseName(rawName)), rawName);
      assert.ok(matches(rawName, 'petrosal-veins'), rawName);
    }
    assert.ok(matches(`Internal jugular vein.${side}`, 'jugular-foramen'));
    assert.equal(matches(`External jugular vein.${side}`), false);
  }
  assert.equal([...skullBaseVascularSource.keys()].some(name => /jugular.*bulb|bulb.*jugular/.test(name)), false,
    'Source export has no separately named jugular bulb');
  assert.ok(matches('Jugular bulb.r', 'petrosal-veins'), 'A separately named mesh is accepted if supplied at runtime');
  assert.equal(skullBaseSystemForNode(node('Jugular bulb.r')), 'vascular');
  const nodes = [node('Internal jugular vein.r', 1, 'vascular')];
  const plan = planRegionIsolation(nodes, 'nervous', path('petrosal-veins', 'jugularBulb'),
    n => advancedNeuroanatomyPathForGroup(n, path('petrosal-veins', 'jugularBulb')));
  assert.equal(plan, null, 'The vein must not be substituted for nonexistent bulb geometry');
});
