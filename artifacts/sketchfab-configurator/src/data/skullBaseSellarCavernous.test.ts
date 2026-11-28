import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { SKULL_BASE_GROUPS, SKULL_BASE_ROOT_PATH, skullBasePathForGroup,
  skullBaseContextIds, skullBaseSystemForNode, isSkullBaseContext } from './skullBaseTaxonomy';
import { SELLAR_CAVERNOUS_ID, isSellarPeduncleContext, isSellarHypothalamusContext } from './skullBaseSellarCavernous';
import cardiovascularCsv from '@assets/Cardiovascular_system_final_1790945714118.csv?raw';
import { skullBaseName, skullBaseNervousSource } from './skullBaseSources';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';

const path = (...parts: string[]) => [...SKULL_BASE_ROOT_PATH, SELLAR_CAVERNOUS_ID, ...parts];
const scene = (names: readonly string[]): SceneNode[] => names.map((rawName, i) =>
  ({ rawName, name: rawName, instanceID: i + 1, systemId: null, visible: false, type: 'MatrixTransform' }));
const isolate = (nodes: SceneNode[], requested = path()) =>
  planRegionIsolation(nodes, 'nervous', requested, n => advancedNeuroanatomyPathForGroup(n, requested))!;
const matches = (name: string, ...parts: string[]) => skullBasePathForGroup(scene([name])[0], path(...parts));
const bilateral = (names: readonly string[]) => names.flatMap(name => [`${name}.l`, `${name}.r`]);

test('Sellar category uses the shared tree with seven independently controlled anatomical sections', () => {
  const root = SKULL_BASE_GROUPS.find(g => g.id === path().join('/'))!;
  assert.equal(root.label, 'Sella and cavernous sinus');
  assert.deepEqual(root.children?.map(g => g.id.split('/').at(-1)),
    ['orientation', 'sellar-structures', 'optic-pathway', 'venous', 'carotid-sympathetic', 'nerves', 'brainstem-nuclei']);
  for (const section of root.children!) assert.ok(section.children?.length, section.label);
});

test('Sellar scene includes requested glands, optic pathway, vessels, nerves, nuclei and transparent orientation only', () => {
  const context = ['Sphenoid bone.l', 'Midbrain', 'Pons', 'Medulla oblongata',
    ...bilateral(['Superior cerebellar peduncle', 'Middle cerebellar peduncle', 'Inferior cerebellar peduncle']), 'Hypothalamus'];
  const gland = ['Pituitary gland', 'Adenohypophysis.l', 'Neurohypophysis.r'];
  const foreground = [...gland, ...bilateral(['Optic nerve (II)', 'Optic chiasm', 'Optic tract']),
    'Cavernous_Sinus_L', 'Cavernous_Sinus_R', 'Anterior_Intercavernous_Sinus', 'Posterior_Intercavernous_Sinus',
    ...bilateral(['Internal carotid artery', 'Ophthalmic artery', 'Internal carotid artery sympathetic plexus',
      'Carotid artery symapthetic', 'Deep petrosal nerve', 'Oculomotor nerve (cisternal and cavernous part)',
      'Trochlear nerve (IV)', 'Abducens nerve (VI)', 'Trigeminal nerve (Gasserian) ganglion', 'Trigeminal nerve root',
      'Ophthalmic nerve', 'Maxillary nerve', 'Zygomatic nerve', 'Infraorbital nerve',
      'Ganglionic branch of maxillary nerve', 'Mandibular nerve']),
    'Nucleus of oculomotor nerve.l', 'Accessory nucleus of oculomotor nerve.r',
    'Nucleus of trochlear nerve.l', 'Nucleus of abducens nerve.r',
    'Mesencephalic nucleus of trigeminal nerve.l', 'Spinal nucleus of trigeminal nerve.r',
    'Principal (pontine) neucleus of trigeminal nerve.l'];
  const excluded = ['Anterior division of mandibular nerve.l', 'Posterior division of mandibular nerve.r',
    'Inferior alveolar nerve.l', 'Lingual nerve.r', 'Auriculotemporal nerve.l', 'Masseteric nerve.r',
    'Greater palatine nerve.l', 'Nasopalatine nerve.r', 'Zygomaticotemporal nerve.l', 'Zygomaticofacial nerve.r',
    'Lateral posterior superior nasal nerve.l', 'Posterior superior alveolar nerve.r',
    'Motor nucleus of facial nerve.l', 'Superior salivatory nucleus.r', 'Nucleus of hypoglossal nerve.l',
    'Medial longitudinal fascicle - Fibers to oculomotor nerve.l', 'Optic radiation.l',
    'Superior rectus muscle.l', 'Temporal bone.r', 'Basilar artery', 'External carotid artery.r',
    'Peduncle of flocculus.l', 'Base of cerebral peduncle (Midbrain).l', 'Unknown mesh'];
  const nodes = scene([...context, ...foreground, ...excluded]);
  const plan = isolate(nodes);
  const members = nodes.slice(0, context.length + foreground.length);
  assert.deepEqual(new Set(plan.show), new Set(members.map(n => n.instanceID)));
  assert.deepEqual(plan.hide, nodes.slice(members.length).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, path()), nodes.slice(0, context.length).map(n => n.instanceID));
  assert.ok(plan.affected.every(n => !n.visible), 'Restore preserves the actual previous scene');
  for (const n of members) {
    assert.ok(skullBasePathForGroup(n, path()), n.rawName);
    assert.ok(isNodeInRegion(n, path(), () => null), n.rawName);
  }
  for (const n of nodes.slice(members.length)) assert.equal(skullBasePathForGroup(n, path()), null, n.rawName);
  for (const name of gland) assert.equal(skullBaseSystemForNode(scene([name])[0]), 'organs');
  assert.equal(skullBaseSystemForNode(scene(['Hypothalamus'])[0]), 'nervous');
});

test('Sellar V1 includes every reviewed source V1 branch while V2 and V3 stay deliberately narrow', () => {
  const names = [...skullBaseNervousSource.keys()].filter(name =>
    /ophthalmic|nasociliary|infratrochlear|supratrochlear|supraorbital|lacrimal nerve|frontal nerve|ethmoidal nerve|long cill?iary/.test(name));
  assert.ok(names.length >= 10);
  for (const name of names) {
    assert.ok(matches(name, 'nerves', 'sellarV1'), name);
    assert.ok(skullBaseNervousSource.has(skullBaseName(name)));
  }
  for (const name of ['Anterior division of mandibular nerve.l', 'Posterior division of mandibular nerve.r',
    'Auriculotemporal nerve.l', 'Inferior alveolar nerve.r', 'Lingual nerve.l'])
    assert.equal(matches(name, 'nerves'), null, name);
  const v3 = scene(bilateral(['Mandibular nerve', 'Mandibular nerve (V3)', 'Trigeminal nerve mandibular n (V)']));
  assert.deepEqual(isolate(v3, path('nerves', 'sellarV3Trunk')).show, [1, 2, 3, 4, 5, 6]);
  for (const [name, leaf] of [['Maxillary nerve', 'sellarV2Trunk'], ['Zygomatic nerve', 'sellarV2Zygomatic'],
    ['Infraorbital nerve', 'sellarV2Infraorbital'], ['Ganglionic branch of maxillary nerve', 'sellarV2Ganglionic']]) {
    const nodes = scene([...bilateral([name]), 'Greater palatine nerve.l', 'Lingual nerve.r']);
    assert.deepEqual(isolate(nodes, path('nerves', 'v2', leaf)).show, [1, 2]);
  }
});

test('Sellar nuclei have individual bilateral controls and remain opaque, without unrelated cranial nuclei', () => {
  const examples = [['Nucleus of oculomotor nerve', 'gse', 'oculomotor'],
    ['Nucleus of trochlear nerve', 'gse', 'trochlear'], ['Nucleus of abducens nerve', 'gse', 'abducens'],
    ['Accessory nucleus of oculomotor nerve', 'gve', 'edinger-westphal'],
    ['Mesencephalic nucleus of trigeminal nerve', 'gsa', 'mesencephalic-trigeminal'],
    ['Spinal nucleus of trigeminal nerve', 'gsa', 'spinal-trigeminal'],
    ['Principal (pontine) neucleus of trigeminal nerve', 'gsa', 'principal-trigeminal']];
  for (const [name, category, leaf] of examples) {
    const nodes = scene([...bilateral([name]), 'Motor nucleus of facial nerve.l', 'Midbrain']);
    const requested = path('brainstem-nuclei', category, leaf);
    assert.deepEqual(isolate(nodes, requested).show, [1, 2]);
    assert.deepEqual(skullBaseContextIds(nodes, requested), []);
    for (const n of nodes.slice(0, 2)) assert.equal(isSkullBaseContext(n), false);
  }
});

test('Sellar peduncle transparency is local and does not change optic, gland, nerve or other atlas appearances', () => {
  const nodes = scene(['Superior cerebellar peduncle.l', 'Middle cerebellar peduncle.r',
    'Inferior cerebellar peduncle.l', 'Hypothalamus', 'Pituitary gland', 'Optic tract.l']);
  assert.deepEqual(skullBaseContextIds(nodes, path('orientation', 'sellarPeduncles')), [1, 2, 3]);
  assert.deepEqual(skullBaseContextIds(nodes, path('optic-pathway')), []);
  assert.deepEqual(skullBaseContextIds(nodes, path('sellar-structures')), [4]);
  for (const n of nodes)
    assert.equal(isSellarPeduncleContext(n, [...SKULL_BASE_ROOT_PATH, 'posterior-fossa']), false);
});

test('Sellar ophthalmic arteries have independent bilateral source-backed controls and remain opaque', () => {
  for (const side of ['l', 'r']) {
    assert.ok(cardiovascularCsv.includes(`Ophthalmic artery.${side}`), 'Use the actual cardiovascular source');
    for (const suffix of ['', '_123', '.001_123']) {
      const nodes = scene([`Ophthalmic artery.${side}${suffix}`, 'Hypothalamus', 'Pituitary gland',
        'Internal carotid artery.r', 'Lacrimal artery.r', 'Basilar artery']);
      const artery = nodes[0], requested = path('carotid-sympathetic', 'sellarOphthalmicArtery');
      assert.equal(skullBaseSystemForNode(artery), 'vascular');
      assert.ok(skullBasePathForGroup(artery, requested));
      assert.deepEqual(isolate(nodes, requested).show, [1]);
      assert.deepEqual(skullBaseContextIds(nodes, requested), []);
      assert.ok(!skullBaseContextIds(nodes, path()).includes(1));
      assert.equal(isolate(nodes).affected.find(n => n.instanceID === 1)?.visible, false);
    }
  }
  const root = SKULL_BASE_GROUPS.find(g => g.id === path().join('/'))!;
  const carotid = root.children!.find(g => g.id.endsWith('/carotid-sympathetic'))!;
  assert.ok(carotid.children!.some(g => g.label === 'Ophthalmic artery'));
});

test('Sellar hypothalamic surface aliases fade locally without changing nuclei, glands, arteries or optic pathways', () => {
  for (const surface of ['Hypothalamus', 'Hypothalamic capsule', 'Hypothalamus capsule', 'Capsule of hypothalamus']) {
    const nodes = scene([surface, 'Anterior_hypothalamic_nucleus.r', 'Pituitary gland',
      'Ophthalmic artery.r', 'Optic chiasm', 'Optic tract.r']);
    assert.deepEqual(skullBaseContextIds(nodes, path()), [1], surface);
    for (const n of nodes.slice(1)) assert.equal(isSellarHypothalamusContext(n, path()), false, n.rawName);
    assert.equal(isSellarHypothalamusContext(nodes[0], [...SKULL_BASE_ROOT_PATH, 'posterior-fossa']), false);
    assert.equal(isSkullBaseContext(nodes[0]), false, 'Do not change global hypothalamic opacity');
  }
});
