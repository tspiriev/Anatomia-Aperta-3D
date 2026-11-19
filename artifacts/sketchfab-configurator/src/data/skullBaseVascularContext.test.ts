import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { SKULL_BASE_ROOT_PATH, SKULL_BASE_GROUPS, skullBasePathForGroup,
  skullBaseContextIds, skullBaseSystemForNode, skullBaseBoneTransparencyPlan } from './skullBaseTaxonomy';
import { isSkullBaseVascularContext, isSkullBaseMeningealOrigin } from './skullBaseVascularContext';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { skullBaseName, skullBaseNervousSource, skullBaseVascularSource } from './skullBaseSources';

const path = (...parts: string[]) => [...SKULL_BASE_ROOT_PATH, ...parts];
const node = (rawName: string, instanceID = 1): SceneNode =>
  ({ rawName, name: rawName, instanceID, systemId: null, visible: true, type: 'MatrixTransform' });
const sort = (ids: readonly number[]) => [...ids].sort((a, b) => a - b);
const cases = [
  { section: 'arterial', leaf: 'ophthalmic',
    vessels: ['Ophthalmic artery.l', 'Central retinal artery.r'],
    context: ['Eyeball.l', 'Cornea.r', 'Sclera.l', 'Retina.r', 'Lens.l', 'Iris.r', 'Vitreous body.l',
      'Anterior segment of eyeball.r', 'Posterior segment of eyeball.l', 'Ciliary body-curve.r'],
    excluded: ['Lacrimal gland.l', 'Nasolacrimal duct.r', 'Internal axis of eyeball.r', 'Optic nerve (II).l',
      'Temporal bone.r', 'Maxillary artery.r'] },
  { section: 'arterial', leaf: 'meningeal',
    vessels: ['Middle meningeal artery.l', 'Middle meningeal artery.r',
      'Maxillary artery.l', 'Maxillary artery.r', 'External carotid artery.l', 'External carotid artery.r'],
    context: ['Temporal bone.l', 'Temporal bone.r', 'Petrous temporal bone.l'],
    excluded: ['Occipital bone', 'Sphenoid bone', 'Facial artery.l', 'Inferior alveolar artery.r',
      'Internal carotid artery.r', 'Oculomotor nerve (cisternal and cavernous part).l'] },
  { section: 'arterial', leaf: 'vertebral',
    vessels: ['Vertebral artery.l', 'Vertebral artery.r'],
    context: ['Atlas (C1)', 'Axis (C2)', 'C3', 'Cervical vertebra 4', 'Cervical vertebra (C5)',
      'Sixth cervical vertebra', 'C7', 'Clivus', 'Occipital bone', 'Sphenoid bone'],
    excluded: ['T1', 'Thoracic vertebra 1', 'Cervical vertebral venous pleus', 'Cochlea.l',
      'Temporal bone.r', 'Basilar artery', 'Pons'] },
  { section: 'arterial', leaf: 'basilar',
    vessels: ['Basilar artery', 'Superior cerebellar artery.l', 'Posterior inferior cerebellar artery.r'],
    context: ['Midbrain', 'Pons', 'Medulla oblongata', 'Cerebellum', 'Vermis',
      'Culmen.l', 'Flocculus.r', 'Tonsil of cerebellum.l'],
    excluded: ['Dentate_nucleus.l', 'Nucleus_emboliformis.r', 'Superior cerebellar peduncle.l',
      'Nucleus of hypoglossal nerve.r', 'Reticular formation brainstem', 'Occipital bone', 'Thalamus.l'] },
  { section: 'venous', leaf: 'cavernous',
    vessels: ['Cavernous_Sinus_R', 'Anterior_Intercavernous_Sinus'],
    context: ['Sphenoid bone', 'Sphenoid.l'],
    excluded: ['Occipital bone', 'Temporal bone.r', 'Internal carotid artery.l', 'Inferior petrosal sinus.r'] },
  { section: 'venous', leaf: 'basilarPlexus',
    vessels: ['Basilar venous plexus clivus'],
    context: ['Clivus', 'Occipital bone', 'Sphenoid bone'],
    excluded: ['Basilar artery', 'Temporal bone.r', 'Pons', 'Cavernous_Sinus_R', 'Internal jugular vein.l'] },
] as const;

for (const example of cases) {
  test(`${example.leaf} vascular isolation retains its exact transparent context and opaque foreground`, () => {
    const selection = path('vascular', example.section, example.leaf);
    const nodes = [...example.vessels, ...example.context, ...example.excluded, 'Unidentified mesh']
      .map((name, i) => node(name, i + 1));
    const vesselIds = nodes.slice(0, example.vessels.length).map(n => n.instanceID);
    const contextIds = nodes.slice(example.vessels.length, example.vessels.length + example.context.length)
      .map(n => n.instanceID);
    const plan = planRegionIsolation(nodes, 'nervous', selection,
      n => advancedNeuroanatomyPathForGroup(n, selection))!;
    assert.ok(plan);
    assert.deepEqual(sort(plan.show), [...vesselIds, ...contextIds]);
    assert.deepEqual(sort(plan.hide), nodes.slice(vesselIds.length + contextIds.length).map(n => n.instanceID));
    assert.deepEqual(skullBaseContextIds(nodes, selection), contextIds);
    assert.deepEqual(plan.show.filter(id => !contextIds.includes(id)), vesselIds,
      'Only landmarks receive refraction; parent arteries and veins stay opaque');
    for (const n of nodes.slice(example.vessels.length, example.vessels.length + example.context.length)) {
      assert.ok(isNodeInRegion(n, selection, () => null), `${n.rawName}: selectable in isolated scene`);
      assert.equal(skullBasePathForGroup(n, selection), null, 'Context does not inflate vessel menus');
      assert.ok(isSkullBaseVascularContext(n, selection));
      assert.equal(isSkullBaseVascularContext(n, path('vascular', example.section)), false,
        'Whole arterial/venous menu remains vessel-only');
    }
    for (const name of example.vessels)
      assert.ok(skullBaseVascularSource.has(skullBaseName(name)), `Source vessel: ${name}`);
  });
}

test('all source eyeball meshes are transparent in ophthalmic isolation, excluding tear apparatus and guide axis', () => {
  const selection = path('vascular', 'arterial', 'ophthalmic');
  const names = [...skullBaseNervousSource].filter(([, memberships]) => memberships.has('Eye')).map(([name]) => name);
  assert.ok(names.length >= 15, 'Source eye names are normalized across left/right sides');
  for (const name of names) {
    const excluded = /lacrimal|internal axis/.test(name);
    assert.equal(isSkullBaseVascularContext(node(name), selection), !excluded, name);
  }
});

test('middle meningeal origin is local to vascular meningeal isolation and is not transparent', () => {
  const selection = path('vascular', 'arterial', 'meningeal');
  for (const name of ['External carotid artery.l', 'Maxillary artery.r']) {
    const n = node(name);
    assert.ok(isSkullBaseMeningealOrigin(n, selection));
    assert.equal(isSkullBaseVascularContext(n, selection), false);
    assert.deepEqual(skullBasePathForGroup(n, selection), selection);
    for (const requested of [path('middle-fossa', 'foramina'), path('anterior-fossa-orbit', 'arterial', 'meningeal'),
      path('vascular', 'arterial', 'ophthalmic')])
      assert.equal(isSkullBaseMeningealOrigin(n, requested), false);
  }
});

test('cervical context respects bone transparency without affecting eye, brainstem or cerebellum', () => {
  const nodes = ['C3', 'Axis (C2)', 'Occipital bone', 'Cornea.l', 'Pons', 'Cerebellum']
    .map((name, i) => node(name, i + 1));
  for (const n of nodes.slice(0, 3)) assert.equal(skullBaseSystemForNode(n), 'skeletal');
  assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, [1, 2, 3, 4, 5, 6], false),
    { contextIds: [4, 5, 6], opaqueBoneIds: [1, 2, 3] });
  assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, [4, 5, 6], true),
    { contextIds: [4, 5, 6, 1, 2, 3], opaqueBoneIds: [] });
});

test('jugular veins merge with remaining veins and inferior petrosal sinuses have an independent shared entry', () => {
  const root = path('vascular', 'venous');
  const group = SKULL_BASE_GROUPS.find(g => g.id.endsWith('/vascular'))!.children!
    .find(g => g.id === root.join('/'))!;
  assert.deepEqual(group.children?.map(g => g.label), [
    'Cavernous and intercavernous sinuses', 'Superior petrosal and sigmoid sinuses', 'Basilar venous plexus',
    'Inferior petrosal sinuses', 'Jugular veins and other available veins and sinuses',
  ]);
  assert.ok(!group.children?.some(g => g.id.endsWith('/jugular')));
  const examples = [
    ['Internal jugular vein.l', 'skullVeins'], ['Internal jugular vein.r', 'skullVeins'],
    ['External jugular vein.l', 'skullVeins'], ['Facial vein.r', 'skullVeins'],
    ['Inferior petrosal sinus.l', 'inferiorPetrosalSinuses'],
    ['Inferior petrosal sinus.r', 'inferiorPetrosalSinuses'],
    ['Superior petrosal sinus.l', 'petrosalVeins'], ['Sigmoid sinus.r', 'petrosalVeins'],
  ];
  const nodes = examples.map(([name], i) => node(name, i + 1));
  for (const [name, component] of examples) {
    assert.ok(skullBaseVascularSource.has(skullBaseName(name)), name);
    assert.deepEqual(skullBasePathForGroup(node(name), root), [...root, component], name);
  }
  for (const component of ['skullVeins', 'inferiorPetrosalSinuses', 'petrosalVeins']) {
    const selection = [...root, component];
    const plan = planRegionIsolation(nodes, 'nervous', selection,
      n => advancedNeuroanatomyPathForGroup(n, selection))!;
    assert.deepEqual(plan.show, examples.flatMap(([, id], i) => id === component ? [i + 1] : []));
    assert.deepEqual(skullBaseContextIds(nodes, selection), []);
  }
  assert.ok(skullBasePathForGroup(node('Inferior petrosal sinus.r'), path('petrous-temporal', 'petrosal-veins')),
    'Regional venous memberships are unchanged');
});
