import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollectionContextOpacity } from './collectionContextOpacity';
import { headNeckBoneContextIds } from './headNeckBoneContext';
import { upperLimbBoneContextPlan } from './upperLimbBoneContext';
import { UPPER_LIMB_TOPOGRAPHY_MODEL_UID } from '../data/upperLimbRegionalAtlas';
import { HEAD_NECK_TOPOGRAPHY_MODEL_UID, HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES } from '../data/headNeckTopography';
import { BRAINSTEM_CEREBELLUM_VIEW } from '../data/atlasViews';
import { BRAINSTEM_CEREBELLUM_ROOT, brainstemCerebellumContextIds } from '../data/brainstemCerebellumAtlas';
import type { SketchfabMaterial } from '../types/sketchfab';
import { BRAINSTEM_TRANSPARENCY, ACCUMBENS_LIGHT_BLUE, refractionContextOpacity, brainMenuOpacity, brainstemCerebellumOpacity, cranialNerveOpacity, autonomicNerveOpacity, lumbosacralPlexusOpacity, longTractOpacity, temporalAssociationOpacity } from './materialTransparency';
import { BRAIN_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW, THALAMUS_CAPSULE_VIEW, CRANIAL_NERVES_VIEW, TEMPORAL_ASSOCIATION_VIEW, AUTONOMIC_NERVOUS_SYSTEM_VIEW, LUMBOSACRAL_PLEXUS_VIEW, LONG_TRACTS_VIEW, SPINAL_CORD_VIEW, SPINAL_REFERENCE_VIEWS } from '../data/atlasViews';
import { TEMPORAL_ASSOCIATION_GROUPS } from '../data/temporalAssociationTaxonomy';
import { cranialNerveContextIds, cranialNerveForegroundIds } from '../data/cranialNerveTaxonomy';
import { whiteMatterContextIds } from '../data/whiteMatterContext';
import { AUTONOMIC_GROUPS, AUTONOMIC_ROOT_PATH, autonomicContextIds, autonomicForegroundIds } from '../data/autonomicTaxonomy';
import { systemForMeshName } from '../data/anatomicalSystems';
import type { SceneNode } from '../types/sketchfab';
import { BRACHIAL_ROOT_PATH, brachialContextIds, brachialForegroundIds, brachialTrunkColorNodes, brachialDivisionColorNodes, brachialCordColorNodes } from '../data/brachialPlexusTaxonomy';
import { BRACHIAL_TRUNK_LIGHT_PURPLE } from '../data/brachialTrunkContext';
import { LUMBOSACRAL_ROOT_PATH, lumbosacralContextIds, lumbosacralForegroundIds } from '../data/lumbosacralPlexusTaxonomy';
import { LONG_TRACT_ROOT_PATH, longTractContextIds } from '../data/longTractTaxonomy';
import { MIDBRAIN_GAZE_ID } from '../data/midbrainGazeDefinition';
import { THALAMUS_CAPSULE_ROOT_PATH, thalamusCapsuleContextIds } from '../data/thalamusCapsuleTaxonomy';
import { thalamusContextOpacity } from './thalamusCortexMaterial';
import { brainstemContextIds } from '../data/brainstemTaxonomy';
import { skullBaseContextIds, SKULL_BASE_MODEL_UID } from '../data/skullBaseTaxonomy';
import { skullBaseOpacity } from './materialTransparency';
import { SPINAL_NERVE_PATH, spinalRootContextIds } from '../data/spinalCordAtlas';

test('Upper limb bones use screenshot refraction in mixed views and become opaque in bone-only views', async () => {
  const f = fixture();
  const original = structuredClone(f.original);
  const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
  const nodes = ['Humerus.l', 'Radius.l', 'Median nerve.l', 'Brachialis muscle.l'].map((rawName, i) => ({
    rawName, name: rawName, instanceID: i + 1, type: 'MatrixTransform', visible: true,
  }));
  const plan = () => upperLimbBoneContextPlan(UPPER_LIMB_TOPOGRAPHY_MODEL_UID, nodes);
  assert.deepEqual(upperLimbBoneContextPlan(HEAD_NECK_TOPOGRAPHY_MODEL_UID, nodes),
    { transparentBoneIds: [], opaqueBoneIds: [] });
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => [geometry[id - 1]],
    material: id => f.materials.get(id), register: material => { f.materials.set(material.id, material); },
    automaticContextNodes: () => plan().transparentBoneIds,
    alwaysOpaqueNodes: () => plan().opaqueBoneIds,
    contextOpacity: (material, id) => id !== undefined && plan().transparentBoneIds.includes(id)
      ? refractionContextOpacity(material) : undefined,
    onError: message => f.errors.push(message),
  });
  await manager.setNodes([4]);
  for (const geo of geometry.slice(0, 2))
    assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity, refractionContextOpacity(original));
  assert.equal(f.nucleus.materialID, original.id, 'Shared-material nerve stays unchanged');
  nodes[2].visible = false; nodes[3].visible = false;
  await manager.refresh();
  assert.deepEqual(plan(), { transparentBoneIds: [], opaqueBoneIds: [1, 2] });
  for (const geo of geometry.slice(0, 2))
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  nodes[2].visible = true;
  await manager.refresh();
  for (const geo of geometry.slice(0, 2))
    assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity, refractionContextOpacity(original));
  assert.ok(manager.nodeIds.has(4), 'Visibility changes retain explicit surrounding-muscle context');
  await manager.setNodes([]);
  assert.deepEqual([...manager.nodeIds], [1, 2], 'Show all/reset retains automatic mixed-view refraction');
  assert.deepEqual(f.original, original, 'Source materials are never modified');
  assert.deepEqual(f.errors, []);
});

test('Head and neck bones use exact screenshot refraction without altering shared nerve/vessel materials or other atlases', async () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const boneNames = HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES.filter(entry => entry.systemId === 'skeletal').slice(0, 2).map(entry => entry.name);
  assert.equal(boneNames.length, 2);
  const nodes: SceneNode[] = [...boneNames, 'Vagus nerve (X).l', 'Common carotid artery.l', 'Hip bone.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    // Deliberately unreliable model classification: source taxonomy wins.
    systemId: i < 2 ? 'nervous' : 'skeletal',
  }));
  const bones = headNeckBoneContextIds(HEAD_NECK_TOPOGRAPHY_MODEL_UID, nodes);
  assert.deepEqual(bones, [1, 2]);
  assert.deepEqual(headNeckBoneContextIds(BRAIN_VIEW.modelUid, nodes), []);
  assert.deepEqual(headNeckBoneContextIds(SKULL_BASE_MODEL_UID, nodes), []);
  const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => [geometry[id - 1]],
    material: id => f.materials.get(id), register: material => { f.materials.set(material.id, material); },
    contextOpacity: (material, id) => id !== undefined && bones.includes(id) ? refractionContextOpacity(material) : undefined,
    onError: message => f.errors.push(message),
  });
  const expected = {
    ...original.channels.Opacity, enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false, useNormalOffset: false,
    ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  };
  for (const merge of [false, true, false]) {
    // Opening, mixed collections, and restoring/replacing a regional view.
    await manager.setNodes(bones, merge, false, undefined, bones);
    for (const geo of geometry.slice(0, 2))
      assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity, expected);
    for (const geo of geometry.slice(2)) assert.equal(geo.materialID, 'shared');
    assert.deepEqual(f.original, original);
  }
  await manager.setNodes([]);
  assert.ok(geometry.every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('Posterior fossa CPA, jugular and magnum landmarks use private refraction without fading vessels or nerves', async () => {
  for (const [section, contextNames, foregroundNames] of [
    ['cpa', ['Pons', 'Declive'], ['Glossopharyngeal nerve (IX).l', 'Vagus nerve (X).r']],
    ['jugular-foramen', ['Midbrain', 'Medulla oblongata'], ['Accessory nerve (XI).r', 'Sigmoid sinus.l']],
    ['foramen-magnum', ['Obliquus superior capitis muscle.r', 'Rectus posterior minor capitis muscle.l'],
      ['Cervical vertebral venous pleus', 'Jugular bulb.r']],
  ] as const) {
    const f = fixture(), original = JSON.parse(JSON.stringify(f.original));
    const nodes: SceneNode[] = [...contextNames, ...foregroundNames].map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', systemId: null, visible: true,
    }));
    const context = skullBaseContextIds(nodes, ['advanced-neuroanatomy', 'skull-base', 'posterior-fossa', section]);
    assert.deepEqual(context, [1, 2]);
    const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
    const manager = createCollectionContextOpacity({
      api: () => f.api, geometry: id => [geometry[id - 1]],
      material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
      contextOpacity: material => skullBaseOpacity(SKULL_BASE_MODEL_UID, material),
      onError: message => f.errors.push(message),
    });
    await manager.setNodes(context, false, true, [3, 4], context);
    for (const geo of geometry.slice(0, 2))
      assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity, skullBaseOpacity(SKULL_BASE_MODEL_UID, original));
    for (const geo of geometry.slice(2)) assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity?.factor, 1);
    assert.deepEqual(f.original, original);
    await manager.setNodes([]);
    assert.ok(geometry.every(geo => geo.materialID === 'shared'));
    assert.deepEqual(f.errors, []);
  }
});

test('Sellar peduncles, gross brainstem and hypothalamic surface fade privately while foreground anatomy remains opaque', async () => {
  for (const contextNames of [['Superior cerebellar peduncle.l', 'Middle cerebellar peduncle.r'],
    ['Inferior cerebellar peduncle.l', 'Pons'],
    ['Hypothalamus', 'Hypothalamic capsule'],
    ['Hypothalamus capsule', 'Capsule of hypothalamus']]) {
    for (const foregroundNames of [['Pituitary gland', 'Optic chiasm.l'],
      ['Ophthalmic artery.r', 'Anterior_hypothalamic_nucleus.r']]) {
    const f = fixture();
    const original = JSON.parse(JSON.stringify(f.original));
    const nodes: SceneNode[] = [...contextNames, ...foregroundNames].map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', systemId: null, visible: true,
    }));
    const context = skullBaseContextIds(nodes, ['advanced-neuroanatomy', 'skull-base', 'sella-cavernous-sinus']);
    assert.deepEqual(context, [1, 2]);
    const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
    const manager = createCollectionContextOpacity({
      api: () => f.api, geometry: id => [geometry[id - 1]],
      material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
      contextOpacity: material => skullBaseOpacity(SKULL_BASE_MODEL_UID, material),
      onError: message => f.errors.push(message),
    });
    await manager.setNodes(context, false, true, [3, 4], context);
    for (const geo of geometry.slice(0, 2))
      assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity, skullBaseOpacity(SKULL_BASE_MODEL_UID, original));
    for (const geo of geometry.slice(2)) assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity?.factor, 1);
    assert.deepEqual(f.original, original);
    await manager.setNodes([]);
    assert.ok(geometry.every(geo => geo.materialID === 'shared'));
    assert.deepEqual(f.errors, []);
    }
  }
});

test('Petrosal bone, brainstem and V / Gasserian reference use private semitransparent materials while nuclei, autonomic ganglia and carotid plexuses stay opaque', async () => {
  for (const [contextNames, section] of [
    [['Midbrain', 'Pons'], 'brainstem-nuclei'],
    [['Medulla oblongata', 'Temporal bone.l'], 'brainstem-nuclei'],
    [['Temporal bone.l', 'Sphenoid bone.r'], 'iii-ciliary'],
    [['Midbrain', 'Pons'], 'iii-ciliary'],
    [['Medulla oblongata', 'Sphenoid bone.r'], 'iii-ciliary'],
    [['Trigeminal nerve root.l', 'Trigeminal nerve (Gasserian) ganglion.r'], 'v-connections'],
    [['Midbrain', 'Pons'], 'vii-petrosal'],
    [['Midbrain.l', 'Pons.r'], 'vii-petrosal'],
    [['Medulla oblongata.l', 'Medulla oblongata.r'], 'vii-petrosal'],
    [['Medulla oblongata', 'Temporal bone.l'], 'vii-petrosal'],
    [['Petrous temporal bone.r', 'Sphenoid bone.l'], 'vii-petrosal'],
    [['Midbrain', 'Pons'], 'ix-otic'],
    [['Midbrain.l', 'Pons.r'], 'ix-otic'],
    [['Medulla oblongata.l', 'Medulla oblongata.r'], 'ix-otic'],
    [['Medulla oblongata', 'Temporal bone.l'], 'ix-otic'],
    [['Temporal bone.l', 'Temporal bone.r'], 'ix-otic'],
  ] as const) {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const scene: SceneNode[] = [...contextNames,
    section === 'brainstem-nuclei' ? 'Accessory nucleus of oculomotor nerve.l'
      : section === 'ix-otic' ? 'Otic ganglion.l' : section === 'vii-petrosal' ? 'Pterygopalatine ganglion.l' : 'Ciliary ganglion.l',
    section === 'brainstem-nuclei' ? 'Superior salivatory nucleus.r' : 'Internal carotid artery sympathetic plexus.r'].map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', systemId: 'nervous', visible: true,
    }));
  const path = ['advanced-neuroanatomy', 'skull-base', 'petrosal-autonomic', section,
    section === 'brainstem-nuclei' ? 'gve'
      : section === 'v-connections' ? 'v1-ciliary' : section === 'vii-petrosal' ? 'autonomicVII' : 'incoming'];
  const context = skullBaseContextIds(scene, path);
  assert.deepEqual(context, [1, 2]);
  const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => [geometry[id - 1]],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => skullBaseOpacity(SKULL_BASE_MODEL_UID, material),
    onError: message => f.errors.push(message),
  });
  await manager.setNodes(context, false, true, [3, 4], context);
  for (const geo of geometry.slice(0, 2))
    assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity, skullBaseOpacity(SKULL_BASE_MODEL_UID, original));
  for (const geo of geometry.slice(2)) assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity?.factor, 1);
  assert.deepEqual(f.original, original);
  await manager.setNodes([]);
  assert.ok(geometry.every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
  }
});

test('Sympathetic orbital views keep both ganglia and the lacrimal gland opaque beside private transparent bone context', async () => {
  for (const foreground of [['Pterygopalatine ganglion.l', 'Ciliary ganglion.r'],
    ['Pterygopalatine ganglion.r', 'Lacrimal gland.l']]) {
    const f = fixture();
    const original = JSON.parse(JSON.stringify(f.original));
    const scene: SceneNode[] = ['Temporal bone.l', 'Sphenoid bone.r', ...foreground].map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', systemId: 'nervous', visible: true,
    }));
    const path = ['advanced-neuroanatomy', 'skull-base', 'petrosal-autonomic', 'sympathetic', 'orbital-lacrimal'];
    const context = skullBaseContextIds(scene, path);
    assert.deepEqual(context, [1, 2]);
    const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
    const manager = createCollectionContextOpacity({
      api: () => f.api, geometry: id => [geometry[id - 1]],
      material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
      contextOpacity: material => skullBaseOpacity(SKULL_BASE_MODEL_UID, material),
      onError: message => f.errors.push(message),
    });
    await manager.setNodes(context, false, true, [3, 4], context);
    for (const geo of geometry.slice(0, 2))
      assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity, skullBaseOpacity(SKULL_BASE_MODEL_UID, original));
    for (const geo of geometry.slice(2)) assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity?.factor, 1);
    assert.deepEqual(f.original, original);
    await manager.setNodes([]);
    assert.ok(geometry.every(geo => geo.materialID === 'shared'));
    assert.deepEqual(f.errors, []);
  }
});

test('Root anatomy fades only private white-matter geometry and restores it without altering shared root or gray-matter materials', async () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const scene: SceneNode[] = ['White matter of spinal cord', 'C1 spinal nerve.l', 'Anterior horn of spinal cord']
    .map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
    }));
  assert.deepEqual(spinalRootContextIds(scene, SPINAL_NERVE_PATH), [1]);
  await f.manager.setNodes(spinalRootContextIds(scene, SPINAL_NERVE_PATH));
  assert.notEqual(f.cortex.materialID, 'shared', 'White matter has its own context material');
  const faded = f.materials.get(f.cortex.materialID!)!;
  assert.equal(faded.channels.Opacity.enable, true);
  assert.ok(faded.channels.Opacity.factor > 0 && faded.channels.Opacity.factor < 1);
  assert.equal(f.brainstem.materialID, 'shared', 'Root retains its original shared source material');
  assert.equal(f.nucleus.materialID, 'shared', 'Gray matter retains its original shared source material');
  assert.deepEqual(f.original, original);
  await f.manager.setNodes([]);
  for (const geometry of [f.cortex, f.brainstem, f.nucleus]) assert.equal(geometry.materialID, 'shared');
  assert.deepEqual(f.original, original);
  assert.deepEqual(f.errors, []);
});

test('all temporal/association categories share every screenshot refraction setting without changing other atlases', () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const expected = {
    ...original.channels.Opacity,
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false, useNormalOffset: false,
    ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  };
  assert.equal(TEMPORAL_ASSOCIATION_GROUPS.length, 4);
  for (const category of TEMPORAL_ASSOCIATION_GROUPS) {
    const opacity = temporalAssociationOpacity(TEMPORAL_ASSOCIATION_VIEW.modelUid, f.original)!;
    assert.deepEqual(opacity, expected, category.label);
    opacity.refractionColor![0] = 0;
    assert.deepEqual(temporalAssociationOpacity(TEMPORAL_ASSOCIATION_VIEW.modelUid, f.original), expected);
  }
  assert.deepEqual(f.original, original);
  for (const view of [BRAIN_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW, THALAMUS_CAPSULE_VIEW, CRANIAL_NERVES_VIEW])
    assert.equal(temporalAssociationOpacity(view.modelUid, f.original), undefined);
  assert.equal(BRAINSTEM_TRANSPARENCY.factor, 0.18);
});

test('temporal context uses private refraction materials, leaves source fibers unchanged and restores originals', async () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => id === 1 ? [f.cortex] : [f.nucleus],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => temporalAssociationOpacity(TEMPORAL_ASSOCIATION_VIEW.modelUid, material),
    onError: message => f.errors.push(message),
  });
  await manager.setNodes([1], false, false, undefined, [], [], true);
  assert.deepEqual(f.materials.get(f.cortex.materialID!)!.channels.Opacity,
    temporalAssociationOpacity(TEMPORAL_ASSOCIATION_VIEW.modelUid, original));
  assert.equal(f.nucleus.materialID, 'shared');
  assert.deepEqual(f.original, original);
  await manager.setNodes([]);
  assert.equal(f.cortex.materialID, 'shared');
  assert.equal(f.nucleus.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('all five autonomic categories use the exact screenshot refraction settings without changing other atlases or source materials', () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const expected = {
    ...original.channels.Opacity,
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false,
    useNormalOffset: false, ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  };
  assert.equal(AUTONOMIC_GROUPS.length, 5);
  for (const group of AUTONOMIC_GROUPS) {
    const opacity = autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, f.original)!;
    assert.deepEqual(opacity, expected, group.label);
    opacity.refractionColor![0] = 0;
    assert.deepEqual(autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, f.original), expected);
  }
  for (const view of [BRAIN_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW, THALAMUS_CAPSULE_VIEW, CRANIAL_NERVES_VIEW, TEMPORAL_ASSOCIATION_VIEW])
    assert.equal(autonomicNerveOpacity(view.modelUid, f.original), undefined);
  assert.deepEqual(f.original, original);
});

test('autonomic refraction applies only to designated context, protects shared nerve material and restores original geometry materials', async () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const manager = createCollectionContextOpacity({
    api: () => f.api,
    geometry: id => id === 1 ? [f.cortex] : id === 2 ? [f.brainstem] : id === 3 ? [f.nucleus] : [f.septal],
    material: id => f.materials.get(id),
    register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, material),
    onError: message => f.errors.push(message),
  });
  const scene: SceneNode[] = ['Vertebra C3', 'Vertebra T1', 'Roots of brachial plexus.r', 'White matter of spinal cord']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
      visible: true, systemId: i < 2 ? 'skeletal' : 'nervous' }));
  const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic'];
  await manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem])
    assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity,
      autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, original));
  for (const geo of [f.nucleus, f.septal])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  assert.deepEqual(f.original, original);
  await manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.original, original);
  assert.deepEqual(f.errors, []);
});

test('brainstem and cerebellum context uses its dedicated refraction preset without fading shared nuclei or tract materials', async () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const scene: SceneNode[] = ['Midbrain.l', 'Declive', 'Red nucleus.r', 'Dentate_nucleus.r']
    .map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
    }));
  const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => [geometry[id - 1]],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => brainstemCerebellumOpacity(BRAINSTEM_CEREBELLUM_VIEW.modelUid, material),
    onError: message => f.errors.push(message),
  });
  const context = brainstemCerebellumContextIds(scene, BRAINSTEM_CEREBELLUM_ROOT);
  assert.deepEqual(context, [1, 2]);
  await manager.setNodes(context);
  for (const geo of geometry.slice(0, 2)) {
    assert.notEqual(geo.materialID, 'shared');
    assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity,
      brainstemCerebellumOpacity(BRAINSTEM_CEREBELLUM_VIEW.modelUid, original));
  }
  for (const geo of geometry.slice(2)) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.original, original);
  await manager.setNodes([]);
  for (const geo of geometry) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('pelvic sympathetic L3–L5 receive the approved refraction while the pelvic nerve stays opaque', async () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const scene: SceneNode[] = ['Vertebra L3', 'Vertebra L4', 'Vertebra L5', 'Inferior hypogastric nerves and plexus.r']
    .map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: systemForMeshName(rawName),
    }));
  const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => [geometry[id - 1]],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, material),
    onError: message => f.errors.push(message),
  });
  const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'pelvic'];
  assert.deepEqual(autonomicContextIds(scene, path), [1, 2, 3]);
  assert.deepEqual(autonomicForegroundIds(scene, path), [4]);
  await manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
  for (const geo of geometry.slice(0, 3)) {
    assert.notEqual(geo.materialID, 'shared');
    assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity,
      autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, original));
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.133);
  }
  assert.equal(f.materials.get(f.septal.materialID!)!.channels.Opacity.factor, 1);
  assert.deepEqual(f.original, original);
  await manager.setNodes([]);
  for (const geo of geometry) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.original, original);
  assert.deepEqual(f.errors, []);
});

test('abdominal sympathetic aorta uses approved refraction without fading nerves or modifying shared source materials', async () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const scene: SceneNode[] = ['Abdominal aorta', 'Vertebra L1', 'Least splanchnic nerve.l', 'Coeliac ganglia']
    .map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: systemForMeshName(rawName),
    }));
  const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => [geometry[id - 1]],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, material),
    onError: message => f.errors.push(message),
  });
  const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'abdominal'];
  assert.deepEqual(autonomicContextIds(scene, path), [1, 2]);
  assert.deepEqual(autonomicForegroundIds(scene, path), [3, 4]);
  await manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
  for (const geo of geometry.slice(0, 2)) {
    assert.notEqual(geo.materialID, 'shared', 'Use a private context material');
    assert.deepEqual(f.materials.get(geo.materialID!)!.channels.Opacity,
      autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, original));
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.133);
  }
  for (const geo of geometry.slice(2))
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  assert.deepEqual(f.original, original);
  await manager.setNodes([]);
  for (const geo of geometry) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.original, original);
  assert.deepEqual(f.errors, []);
});

test('parasympathetic thoracic vessels and stomach receive refraction while the vagus stays opaque, then restore source materials', async () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const scene: SceneNode[] = ['Thoracic aorta', 'Stomach', 'Vagus nerve (X).l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: i === 0 ? 'vascular' : i === 1 ? 'organs' : 'nervous',
  }));
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => id === 1 ? [f.cortex] : id === 2 ? [f.brainstem] : [f.nucleus],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, material),
    onError: message => f.errors.push(message),
  });
  const path = [...AUTONOMIC_ROOT_PATH, 'parasympathetic'];
  await manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
  for (const geometry of [f.cortex, f.brainstem])
    assert.deepEqual(f.materials.get(geometry.materialID!)!.channels.Opacity,
      autonomicNerveOpacity(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, original));
  assert.equal(f.materials.get(f.nucleus.materialID!)!.channels.Opacity.factor, 1);
  assert.deepEqual(f.original, original);
  await manager.setNodes([]);
  for (const geometry of [f.cortex, f.brainstem, f.nucleus]) assert.equal(geometry.materialID, 'shared');
  assert.deepEqual(f.original, original);
  assert.deepEqual(f.errors, []);
});

test('lumbosacral transparency matches every screenshot setting and leaves other atlas presets and source materials unchanged', () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const expected = {
    ...original.channels.Opacity,
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false, useNormalOffset: false,
    ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  };
  const opacity = lumbosacralPlexusOpacity(LUMBOSACRAL_PLEXUS_VIEW.modelUid, f.original)!;
  assert.deepEqual(opacity, expected);
  opacity.refractionColor![0] = 0;
  assert.deepEqual(lumbosacralPlexusOpacity(LUMBOSACRAL_PLEXUS_VIEW.modelUid, f.original), expected);
  assert.deepEqual(f.original, original);
  for (const view of [BRAIN_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW, THALAMUS_CAPSULE_VIEW,
    CRANIAL_NERVES_VIEW, AUTONOMIC_NERVOUS_SYSTEM_VIEW, TEMPORAL_ASSOCIATION_VIEW])
    assert.equal(lumbosacralPlexusOpacity(view.modelUid, f.original), undefined);
});

test('lumbar and sacral context use private refraction materials, retain opaque roots and restore original assignments', async () => {
  for (const [category, level, side] of [['lumbar', 'L1', 'left'], ['sacral', 'S4', 'right']]) {
    const f = fixture();
    const original = JSON.parse(JSON.stringify(f.original));
    const suffix = side === 'left' ? 'l' : 'r';
    const scene: SceneNode[] = ['Spinal dura', `${level} anterior root.${suffix}`,
      `${level} posterior root.${suffix}`, 'White matter of spinal cord'].map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
    }));
    const manager = createCollectionContextOpacity({
      api: () => f.api,
      geometry: id => id === 1 ? [f.cortex] : id === 2 ? [f.brainstem] : id === 3 ? [f.nucleus] : [f.septal],
      material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
      contextOpacity: material => lumbosacralPlexusOpacity(LUMBOSACRAL_PLEXUS_VIEW.modelUid, material),
      onError: message => f.errors.push(message),
    });
    const path = [...LUMBOSACRAL_ROOT_PATH, category, 'spinal-roots', side];
    assert.deepEqual(lumbosacralContextIds(scene, path), [1]);
    await manager.setNodes(lumbosacralContextIds(scene, path), false, true, lumbosacralForegroundIds(scene, path));
    assert.deepEqual(f.materials.get(f.cortex.materialID!)!.channels.Opacity,
      lumbosacralPlexusOpacity(LUMBOSACRAL_PLEXUS_VIEW.modelUid, original));
    for (const geometry of [f.brainstem, f.nucleus, f.septal])
      assert.equal(f.materials.get(geometry.materialID!)!.channels.Opacity.factor, 1);
    assert.deepEqual(f.original, original);
    await manager.setNodes([]);
    for (const geometry of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geometry.materialID, 'shared');
    assert.deepEqual(f.original, original);
    assert.deepEqual(f.errors, []);
  }
});

test('long-tract transparency matches all screenshot settings and its inherited spinal view without changing other models', () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const expected = {
    ...original.channels.Opacity,
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false, useNormalOffset: false,
    ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  };
  const opacity = longTractOpacity(LONG_TRACTS_VIEW.modelUid, f.original)!;
  assert.deepEqual(opacity, expected);
  opacity.refractionColor![0] = 0;
  assert.deepEqual(longTractOpacity(LONG_TRACTS_VIEW.modelUid, f.original), expected);
  assert.deepEqual(longTractOpacity(SPINAL_CORD_VIEW.modelUid, f.original), expected);
  assert.deepEqual(f.original, original);
  for (const view of [BRAIN_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW, THALAMUS_CAPSULE_VIEW, CRANIAL_NERVES_VIEW,
    TEMPORAL_ASSOCIATION_VIEW, AUTONOMIC_NERVOUS_SYSTEM_VIEW, LUMBOSACRAL_PLEXUS_VIEW, ...SPINAL_REFERENCE_VIEWS])
    assert.equal(longTractOpacity(view.modelUid, f.original), undefined);
});

test('descending and cerebellar contexts use private refraction materials without changing source tract or nuclear materials, then restore', async () => {
  for (const [names, parts] of [
    [['Base of cerebral peduncle (Midbrain).l', 'Base of cerebral peduncle (Midbrain).r',
      'Corticospinal tract arm.l', 'Putamen.r'], ['descending-motor', 'corticospinal', 'arm']],
    [['Thalamus.l', 'Thalamus.r', '11_Ventral_lateral_VL', 'Dentatorubrothalamic tract.r'],
      ['cerebellar', 'efferents', 'dentatorubrothalamic']],
  ]) {
    const f = fixture();
    const original = JSON.parse(JSON.stringify(f.original));
    const scene: SceneNode[] = names.map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
    }));
    const manager = createCollectionContextOpacity({
      api: () => f.api,
      geometry: id => id === 1 ? [f.cortex] : id === 2 ? [f.brainstem] : id === 3 ? [f.nucleus] : [f.septal],
      material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
      contextOpacity: material => longTractOpacity(LONG_TRACTS_VIEW.modelUid, material),
      onError: message => f.errors.push(message),
    });
    const path = [...LONG_TRACT_ROOT_PATH, ...parts];
    assert.deepEqual(longTractContextIds(scene, path), [1, 2]);
    await manager.setNodes(longTractContextIds(scene, path));
    for (const geometry of [f.cortex, f.brainstem])
      assert.deepEqual(f.materials.get(geometry.materialID!)!.channels.Opacity,
        longTractOpacity(LONG_TRACTS_VIEW.modelUid, original));
    for (const geometry of [f.nucleus, f.septal]) assert.equal(geometry.materialID, 'shared');
    assert.deepEqual(f.original, original);
    await manager.setNodes([]);
    for (const geometry of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geometry.materialID, 'shared');
    assert.deepEqual(f.original, original);
    assert.deepEqual(f.errors, []);
  }
});

test('Neck bone refraction is node-specific even with a shared source material; manual unfade/refade and leaving Neck restore correctly', async () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  let neckBoneIds = new Set([1, 2]);
  const manager = createCollectionContextOpacity({
    api: () => f.api,
    geometry: id => id === 1 ? [f.cortex] : id === 2 ? [f.brainstem] : id === 3 ? [f.nucleus] : [f.septal],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: (material, id) => id !== undefined && neckBoneIds.has(id) ? refractionContextOpacity(material) : undefined,
    onError: message => f.errors.push(message),
  });
  const expected = {
    ...original.channels.Opacity, enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false, useNormalOffset: false,
    ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  };
  await manager.setNodes([1, 2], false, true, [3, 4]);
  for (const geometry of [f.cortex, f.brainstem])
    assert.deepEqual(f.materials.get(geometry.materialID!)!.channels.Opacity, expected);
  for (const geometry of [f.nucleus, f.septal])
    assert.equal(f.materials.get(geometry.materialID!)!.channels.Opacity.factor, 1);
  assert.deepEqual(f.original, original);
  // Unfade and refade a single bone without changing its sibling's preset.
  await manager.setNodes([2], false, true, [1, 3, 4]);
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.Opacity.factor, 1);
  assert.deepEqual(f.materials.get(f.brainstem.materialID!)!.channels.Opacity, expected);
  await manager.setNodes([1, 2], false, true, [3, 4]);
  assert.deepEqual(f.materials.get(f.cortex.materialID!)!.channels.Opacity, expected);
  // Non-bone contexts sharing the same source material keep the default preset.
  neckBoneIds = new Set([1]);
  await manager.setNodes([1, 2], false, true, [3, 4]);
  assert.deepEqual(f.materials.get(f.cortex.materialID!)!.channels.Opacity, expected);
  assert.deepEqual(f.materials.get(f.brainstem.materialID!)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  // The same bone faded outside Neck must not reuse its old refraction clone.
  neckBoneIds.clear();
  await manager.setNodes([1], false, true, [2, 3, 4]);
  assert.deepEqual(f.materials.get(f.cortex.materialID!)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  await manager.setNodes([]);
  for (const geometry of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geometry.materialID, 'shared');
  assert.deepEqual(f.original, original);
  assert.deepEqual(f.errors, []);
});

test('Cranial nerve semitransparency matches all screenshot settings and is scoped to its atlas', () => {
  const f = fixture();
  const original = JSON.parse(JSON.stringify(f.original));
  const expected = {
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false,
    useNormalOffset: false, ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  };
  const opacity = cranialNerveOpacity(CRANIAL_NERVES_VIEW.modelUid, f.original)!;
  assert.deepEqual(opacity, expected);
  opacity.refractionColor![0] = 0;
  assert.deepEqual(cranialNerveOpacity(CRANIAL_NERVES_VIEW.modelUid, f.original), expected);
  assert.deepEqual(f.original, original);
  for (const uid of [BRAIN_VIEW.modelUid, CENTRAL_NERVOUS_SYSTEM_VIEW.modelUid, THALAMUS_CAPSULE_VIEW.modelUid])
    assert.equal(cranialNerveOpacity(uid, f.original), undefined);
});

test('I–XII apply refraction only to designated context, keep foreground separate, and restore source materials', async () => {
  for (const nerve of ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii']) {
    const f = fixture();
    const names = ['Midbrain.l', 'Pons.r', 'Medulla oblongata.l', 'Frontal lobe.l', 'Occipital lobe.r',
      'Thalamus.r', 'Postcentral gyrus.l', 'Temporal bone.l', 'Occipital bone.r',
      'Oculomotor nerve.l', 'Nucleus of oculomotor nerve.l', 'Trigeminal nerve.r'];
    const scene: SceneNode[] = names.map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: systemForMeshName(rawName),
    }));
    const geometry = scene.map((_, i) => ({ ...f.brainstem, instanceID: 1000 + i }));
    const original = JSON.parse(JSON.stringify(f.original));
    const manager = createCollectionContextOpacity({
      api: () => f.api, geometry: id => [geometry[id - 1]],
      material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
      contextOpacity: material => cranialNerveOpacity(CRANIAL_NERVES_VIEW.modelUid, material),
      onError: message => f.errors.push(message),
    });
    const path = ['advanced-neuroanatomy', 'cranial-nerves', nerve];
    const ids = cranialNerveContextIds(scene, path);
    assert.ok(ids.length, `${nerve}: available context`);
    for (let i = 0; i < 2; i++) {
      await manager.setNodes(ids, false, true, cranialNerveForegroundIds(scene, path));
      for (const node of scene) {
        const geo = geometry[node.instanceID - 1];
        const opacity = f.materials.get(geo.materialID!)!.channels.Opacity!;
        if (ids.includes(node.instanceID))
          assert.deepEqual(opacity, cranialNerveOpacity(CRANIAL_NERVES_VIEW.modelUid, original), `${nerve}/${node.rawName}`);
        else if (geo.materialID !== 'shared')
          assert.equal(opacity.enable, false, `${nerve}: opaque ${node.rawName}`);
      }
      assert.deepEqual(f.original, original);
      await manager.setNodes([]);
      for (const geo of geometry) assert.equal(geo.materialID, 'shared');
    }
    assert.deepEqual(f.errors, []);
  }
});

test('Brainstem collection fades only gross surfaces using Brain refraction and restores shared source materials', async () => {
  for (const rawName of ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r',
    'Medulla oblongata.l', 'Medulla oblongata.r', 'Pons.r.001_123']) {
    const f = fixture();
    const scene: SceneNode[] = [rawName, 'Nucleus of oculomotor nerve.l', 'Medial lemniscus arms.l',
      'Superior colliculus.l'].map((name, i) => ({
      instanceID: i + 1, rawName: name, name, type: 'MatrixTransform', systemId: 'nervous', visible: true,
    }));
    const root = ['advanced-neuroanatomy', 'brainstem'];
    assert.deepEqual(brainstemContextIds(scene, root), [1]);
    assert.deepEqual(brainstemContextIds(scene, [...root, 'gross-anatomy']), [1]);
    assert.deepEqual(brainstemContextIds(scene, [...root, 'nuclei']), [1]);
    assert.deepEqual(brainstemContextIds(scene, [...root, 'nuclei', 'gse', 'oculomotor']), [1]);
    assert.deepEqual(brainstemContextIds(scene, [...root, 'white-matter']), [1]);
    assert.deepEqual(brainstemContextIds(scene, [...root, 'white-matter', 'auditory']), [1]);
    for (const p of [['advanced-neuroanatomy', 'white-matter'],
      ['advanced-neuroanatomy', 'basal-forebrain']])
      assert.deepEqual(brainstemContextIds(scene, p), []);
    const geometry = [f.brainstem, f.nucleus, f.septal, f.cortex];
    const manager = createCollectionContextOpacity({
      api: () => f.api, geometry: id => [geometry[id - 1]],
      material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
      contextOpacity: material => brainMenuOpacity(BRAIN_VIEW.modelUid, material),
      onError: message => f.errors.push(message),
    });
    for (const path of [[...root, 'nuclei', 'gse', 'oculomotor'],
      [...root, 'white-matter'], [...root, 'white-matter', 'auditory'],
      [...root, 'white-matter', 'medial-longitudinal-fascicle']]) {
      await manager.setNodes(brainstemContextIds(scene, path));
      assert.deepEqual(f.materials.get(f.brainstem.materialID!)!.channels.Opacity,
        brainMenuOpacity(BRAIN_VIEW.modelUid, f.original));
      for (const geo of [f.nucleus, f.septal, f.cortex]) assert.equal(geo.materialID, 'shared');
      assert.equal(f.original.channels.Opacity.factor, 0.8);
      await manager.setNodes([]);
      for (const geo of geometry) assert.equal(geo.materialID, 'shared');
    }
    assert.deepEqual(f.errors, []);
  }
});

test('Brain semitransparency matches every screenshot setting, without changing other atlases or source materials', () => {
  const f = fixture();
  f.original.channels.Opacity = {
    enable: false, type: 'blending', factor: 0.8, invert: true,
    refractionColor: [0.2, 0.3, 0.4], useAlbedoTint: true,
    useNormalOffset: true, ior: 1.5, roughnessFactor: 0.7, useMicrosurfaceTexture: false,
  };
  const before = JSON.parse(JSON.stringify(f.original));
  const expected = {
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false,
    useNormalOffset: false, ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  };
  const first = brainMenuOpacity(BRAIN_VIEW.modelUid, f.original)!;
  assert.deepEqual(first, expected);
  assert.deepEqual(f.original, before);
  first.refractionColor![0] = 0;
  assert.deepEqual(brainMenuOpacity(BRAIN_VIEW.modelUid, f.original), expected);
  for (const uid of [CENTRAL_NERVOUS_SYSTEM_VIEW.modelUid, THALAMUS_CAPSULE_VIEW.modelUid, 'another-model'])
    assert.equal(brainMenuOpacity(uid, f.original), undefined, uid);
  assert.deepEqual(BRAINSTEM_TRANSPARENCY, { enable: true, factor: 0.18 });
});

test('Brain context creates and reapplies private refraction, preserves foreground colors and restores its source material', async () => {
  const f = fixture();
  f.original.channels.AlbedoPBR = { enable: true, color: [0.3, 0.6, 0.8], factor: 1 };
  const original = JSON.parse(JSON.stringify(f.original));
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => id === 1 ? [f.cortex] : [f.nucleus],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => brainMenuOpacity(BRAIN_VIEW.modelUid, material),
    onError: message => f.errors.push(message),
  });
  for (let i = 0; i < 2; i++) {
    await manager.setNodes([1]);
    const faded = f.materials.get(f.cortex.materialID!)!;
    assert.deepEqual(faded.channels.Opacity, brainMenuOpacity(BRAIN_VIEW.modelUid, original));
    assert.deepEqual(faded.channels.AlbedoPBR, original.channels.AlbedoPBR);
    assert.equal(f.nucleus.materialID, 'shared');
    assert.deepEqual(f.original, original);
    await manager.setNodes([]);
    assert.equal(f.cortex.materialID, 'shared');
  }
  assert.deepEqual(f.errors, []);
});

test('dedicated cerebral cortex keeps the creator refraction settings on create and SDK reapply without altering shared nuclei', async () => {
  const f = fixture();
  f.original.name = 'MAT_Nervous_Cerebral_Cortex.007';
  const requested = thalamusContextOpacity('8abdb885c8c146068ca1c801a16f2b9f', f.original)!;
  assert.deepEqual(requested, {
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false,
    useNormalOffset: false, ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  });
  assert.equal(thalamusContextOpacity('another-model', f.original), undefined);
  assert.equal(thalamusContextOpacity('another-model', { ...f.original, name: 'Fiber material' }), undefined);
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => id === 1 ? [f.cortex] : [f.nucleus],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => thalamusContextOpacity('8abdb885c8c146068ca1c801a16f2b9f', material),
    onError: message => f.errors.push(message),
  });
  await manager.setNodes([1]);
  assert.deepEqual(f.materials.get(f.cortex.materialID!)!.channels.Opacity, requested);
  assert.equal(f.nucleus.materialID, 'shared');
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await manager.setNodes([]);
  assert.equal(f.cortex.materialID, 'shared');
  await manager.setNodes([1]);
  assert.deepEqual(f.materials.get(f.cortex.materialID!)!.channels.Opacity, requested);
  assert.deepEqual(f.errors, []);
});

test('gross outlines, basal ganglia and superior peduncles use cortex refraction settings without changing shared foreground fibers or nuclei', async () => {
  for (const name of ['MAT_Nervous_Brainstem', 'MAT_Nervous_Cerebellum.001', 'MAT_Thalamic_background_core', 'Nervous system Mat.001']) {
    const f = fixture();
    f.original.name = name;
    const manager = createCollectionContextOpacity({
      api: () => f.api, geometry: id => id === 1 ? [f.brainstem] : [f.nucleus],
      material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
      contextOpacity: material => thalamusContextOpacity('8abdb885c8c146068ca1c801a16f2b9f', material),
      onError: message => f.errors.push(message),
    });
    await manager.setNodes([1]);
    const opacity = f.materials.get(f.brainstem.materialID!)!.channels.Opacity!;
    assert.equal(opacity.factor, 0.133);
    assert.equal(opacity.type, 'refraction');
    assert.equal(opacity.ior, 1);
    assert.equal(opacity.roughnessFactor, 0);
    assert.equal(f.nucleus.materialID, 'shared');
    assert.equal(f.original.channels.Opacity.factor, 0.8);
    await manager.setNodes([]);
    assert.equal(f.brainstem.materialID, 'shared');
    assert.deepEqual(f.errors, []);
  }
});

test('superior cerebellar peduncles receive private refraction materials while connecting tracts remain unchanged', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Superior cerebellar peduncle.l', 'Superior cerebellar peduncle.r',
    'Dentatorubrothalamic tract.l', 'Interpositothalamic tract.r'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  const geometry = [f.cortex, f.brainstem, f.nucleus, f.septal];
  const manager = createCollectionContextOpacity({
    api: () => f.api, geometry: id => [geometry[id - 1]],
    material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
    contextOpacity: material => thalamusContextOpacity('8abdb885c8c146068ca1c801a16f2b9f', material),
    onError: message => f.errors.push(message),
  });
  const p = [...THALAMUS_CAPSULE_ROOT_PATH, 'internal-capsule', 'posterior-limb'];
  const context = thalamusCapsuleContextIds(scene, p);
  assert.deepEqual(context, [1, 2]);
  await manager.setNodes(context);
  for (const geo of [f.cortex, f.brainstem]) {
    const opacity = f.materials.get(geo.materialID!)!.channels.Opacity!;
    assert.equal(opacity.factor, 0.133);
    assert.equal(opacity.type, 'refraction');
    assert.equal(opacity.ior, 1);
  }
  for (const geo of [f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  await manager.setNodes([]);
  for (const geo of geometry) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('VPL, VPM and Somatosensory brainstem context uses private refraction without fading shared sensory nuclei or tracts', async () => {
  for (const id of ['vpl', 'vpm', 'somatosensory']) {
    const f = fixture();
    const foreground = id === 'vpl' ? ['12_Ventral_posterolateral_VPL', 'Medial lemmniscus arms.l']
      : ['13_Ventral_posteromedial_VPM', 'Trigeminal lemniscus pain.l'];
    const scene: SceneNode[] = ['Pons.l', 'Postcentral gyrus.l', ...foreground].map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
    }));
    const geometry = [f.brainstem, f.cortex, f.nucleus, f.septal];
    const manager = createCollectionContextOpacity({
      api: () => f.api, geometry: id => [geometry[id - 1]],
      material: id => f.materials.get(id), register: mat => { f.materials.set(mat.id, mat); },
      contextOpacity: material => thalamusContextOpacity('8abdb885c8c146068ca1c801a16f2b9f', material),
      onError: message => f.errors.push(message),
    });
    const p = id === 'somatosensory'
      ? [...THALAMUS_CAPSULE_ROOT_PATH, 'thalamocortical-pathways', id]
      : [...THALAMUS_CAPSULE_ROOT_PATH, 'thalamic-nuclei', 'ventral-posterior', id];
    const context = thalamusCapsuleContextIds(scene, p);
    assert.deepEqual(context, [1, 2]);
    await manager.setNodes(context);
    for (const geo of [f.brainstem, f.cortex]) {
      const opacity = f.materials.get(geo.materialID!)!.channels.Opacity!;
      assert.equal(opacity.type, 'refraction');
      assert.equal(opacity.factor, 0.133);
    }
    for (const geo of [f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
    await manager.setNodes([]);
    for (const geo of geometry) assert.equal(geo.materialID, 'shared');
    assert.deepEqual(f.errors, []);
  }
});

test('thalamocortical cortex fades privately while nuclei and projections retain shared source materials', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Precentral gyrus.l', 'Precentral gyrus.r', '10_Ventral_anterior_VA',
    'Thalamocortical fibers to VL and VA.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  const p = [...THALAMUS_CAPSULE_ROOT_PATH, 'thalamocortical-pathways', 'motor'];
  assert.deepEqual(thalamusCapsuleContextIds(scene, p), [1, 2]);
  await f.manager.setNodes(thalamusCapsuleContextIds(scene, p));
  for (const geo of [f.cortex, f.brainstem])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('descending peduncular bases fade privately to 18% without changing shared corticospinal or basal-ganglia materials', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Base of cerebral peduncle (Midbrain).l', 'Base of cerebral peduncle (Midbrain).r',
    'Corticospinal tract arm.l', 'Putamen.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const p = [...LONG_TRACT_ROOT_PATH, 'descending-motor', 'corticospinal', 'arm'];
  assert.deepEqual(longTractContextIds(scene, p), [1, 2]);
  await f.manager.setNodes(longTractContextIds(scene, p));
  for (const geo of [f.cortex, f.brainstem])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('cerebellar thalamic surfaces fade privately to 18% without altering shared relay-nucleus or fiber materials', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Thalamus.l', 'Thalamus.r', '11_Ventral_lateral_VL', 'Dentatorubrothalamic tract.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const p = [...LONG_TRACT_ROOT_PATH, 'cerebellar', 'efferents', 'dentatorubrothalamic'];
  assert.deepEqual(longTractContextIds(scene, p), [1, 2]);
  await f.manager.setNodes(longTractContextIds(scene, p));
  for (const geo of [f.cortex, f.brainstem])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('brainstem thalamic surfaces fade privately to 18% while VPM and face fibers retain their shared source material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Thalamus.l', 'Thalamus.r', '13_Ventral_posteromedial_VPM', 'Somatosensory tract face.l']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const p = [...LONG_TRACT_ROOT_PATH, 'brainstem-connections', 'central-tegmental', 'tract'];
  assert.deepEqual(longTractContextIds(scene, p), [1, 2]);
  await f.manager.setNodes(longTractContextIds(scene, p));
  for (const geo of [f.cortex, f.brainstem])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('ascending thalamus fades privately without fading its relay nucleus, somatosensory fibers or postcentral cortex on shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Thalamus.l', '12_Ventral_posterolateral_VPL', 'Somatosensory tract arm.l', 'Postcentral gyrus.l']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const p = [...LONG_TRACT_ROOT_PATH, 'ascending-sensory', 'dorsal-column-medial-lemniscus'];
  assert.deepEqual(longTractContextIds(scene, p), [1]);
  await f.manager.setNodes(longTractContextIds(scene, p));
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  assert.equal(f.cortex.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('gaze orientation fades gross brainstem/white matter without altering shared-material gray matter or superior colliculus', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Midbrain.l', 'White matter of spinal cord', 'Anterior horn of spinal cord', 'Superior colliculus.l']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const p = [...LONG_TRACT_ROOT_PATH, MIDBRAIN_GAZE_ID, 'tectospinal-pathway', 'brainstem'];
  assert.deepEqual(longTractContextIds(scene, p), [1, 2]);
  await f.manager.setNodes(longTractContextIds(scene, p));
  for (const geo of [f.cortex, f.brainstem])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('vestibular brainstem context fades privately while MLF, medial vestibulospinal tract and nuclei preserve shared source material, restoring on exit', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Pons.l', 'Medial longitudinal fascicle.l', 'Medial vestibulospinal tract', 'Vestibular nuclei.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = [...LONG_TRACT_ROOT_PATH, 'vestibular-oculomotor', 'medial-longitudinal-fasciculus'];
  assert.deepEqual(longTractContextIds(scene, path), [1]);
  await f.manager.setNodes(longTractContextIds(scene, path));
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.equal(f.original.channels.Opacity.factor, 0.8, 'original opacity is not overwritten');
  await f.manager.setNodes([]);
  assert.equal(f.cortex.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('long-tract reticular formation, white cord and gross brainstem fade to 18% without changing a shared tract material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Reticular formation brainstem', 'White matter of spinal cord', 'Pons.l', 'Medial reticulospinal tract']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = [...LONG_TRACT_ROOT_PATH, 'brainstem-connections', 'reticular', 'reticulospinal'];
  assert.deepEqual(longTractContextIds(scene, path), [1, 2, 3]);
  await f.manager.setNodes(longTractContextIds(scene, path));
  for (const geo of [f.cortex, f.brainstem, f.nucleus])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  assert.equal(f.septal.materialID, 'shared', 'tract keeps its unmodified source material');
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('Lumbosacral targets fade on private materials while shared-material nerves stay opaque, restoring on exit', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Femoral nerve.l', 'Sartorius muscle.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: i === 0 ? 'nervous' : 'muscular',
  }));
  const path = [...LUMBOSACRAL_ROOT_PATH, 'lumbar', 'femoral', 'left'];
  await f.manager.setNodes(lumbosacralContextIds(scene, path), false, true, lumbosacralForegroundIds(scene, path));
  assert.equal(f.materials.get(f.brainstem.materialID!)!.channels.Opacity.factor, 0.18);
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  assert.equal(f.cortex.materialID, 'shared');
  assert.equal(f.brainstem.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('Lumbar context bones are semitransparent, preserving opaque cord and nerve on shared materials', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Vertebra L1', 'Hip bone.l', 'White matter of spinal cord', 'Femoral nerve.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: i < 2 ? 'skeletal' : 'nervous',
  }));
  const path = [...LUMBOSACRAL_ROOT_PATH, 'lumbar', 'femoral', 'left'];
  await f.manager.setNodes(lumbosacralContextIds(scene, path), false, true, lumbosacralForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.nucleus, f.septal])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});
test('Sacral context fades bones but not cord or sciatic nerve, restoring shared materials when leaving the collection', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Sacrum', 'Hip bone.r', 'White matter of spinal cord', 'Sciatic nerve.r'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: i < 2 ? 'skeletal' : 'nervous',
  }));
  const path = [...LUMBOSACRAL_ROOT_PATH, 'sacral', 'sciatic', 'right'];
  await f.manager.setNodes(lumbosacralContextIds(scene, path), false, true, lumbosacralForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.nucleus, f.septal])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  const lowerLimb = [...LUMBOSACRAL_ROOT_PATH, 'lower-limb', 'sciatic', 'right'];
  await f.manager.setNodes(lumbosacralContextIds(scene, lowerLimb), false, true, lumbosacralForegroundIds(scene, lowerLimb));
  for (const geo of [f.cortex, f.brainstem, f.nucleus]) assert.equal(geo.materialID, 'shared');
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('Lumbar spinal dura fades without fading shared-material anterior/posterior roots or spinal cord', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Spinal dura', 'L1 anterior root.l', 'L1 posterior root.l', 'White matter of spinal cord'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  const path = [...LUMBOSACRAL_ROOT_PATH, 'lumbar', 'spinal-roots', 'left'];
  await f.manager.setNodes(lumbosacralContextIds(scene, path), false, true, lumbosacralForegroundIds(scene, path));
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.brainstem, f.nucleus, f.septal])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('Sacral dura fades while shared-material sacral roots and filum terminale remain opaque', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Spinal dura', 'S4 anterior root.r', 'S4 posterior root.r', 'Filum terminale'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  const path = [...LUMBOSACRAL_ROOT_PATH, 'sacral', 'spinal-roots', 'right'];
  await f.manager.setNodes(lumbosacralContextIds(scene, path), false, true, lumbosacralForegroundIds(scene, path));
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.brainstem, f.nucleus, f.septal])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('inguinal ligament fades without fading femoral and saphenous branch meshes sharing its source material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Inguinal ligament.r', 'Femoral nerve.r', 'Infrapatellar branch of saphenous nerve.r', 'Saphenous nerve.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 0 ? 'skeletal' : 'nervous' }));
  const path = [...LUMBOSACRAL_ROOT_PATH, 'lumbar', 'femoral', 'right', 'without-muscles'];
  await f.manager.setNodes(lumbosacralContextIds(scene, path), false, true, lumbosacralForegroundIds(scene, path));
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.brainstem, f.nucleus, f.septal])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('Cauda equina bones and discs fade without fading roots or filum on the same source material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Intervertebral disc L5-S1', 'L1 anterior root.l', 'Filum terminale', 'Vertebra L5']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 0 || i === 3 ? 'skeletal' : 'nervous' }));
  const path = [...LUMBOSACRAL_ROOT_PATH, 'cauda-equina', 'spinal-roots', 'left'];
  assert.deepEqual(lumbosacralContextIds(scene, path), [1, 4]);
  assert.deepEqual(lumbosacralForegroundIds(scene, path), [2, 3]);
  await f.manager.setNodes(lumbosacralContextIds(scene, path), false, true, lumbosacralForegroundIds(scene, path));
  for (const geo of [f.cortex, f.septal])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.brainstem, f.nucleus])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('sacral femur and cuneiform bones become semitransparent without fading shared-material leg and foot nerves', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Femur.l', 'Common fibular nerve.l', 'Medial cuneiform bone.l', 'Proper plantar digital branches of lateral plantar nerve.l']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 0 || i === 2 ? 'skeletal' : 'nervous' }));
  const path = [...LUMBOSACRAL_ROOT_PATH, 'sacral', 'sciatic', 'left', 'without-muscles'];
  assert.deepEqual(lumbosacralContextIds(scene, path), [1, 3]);
  assert.deepEqual(lumbosacralForegroundIds(scene, path), [2, 4]);
  await f.manager.setNodes(lumbosacralContextIds(scene, path), false, true, lumbosacralForegroundIds(scene, path));
  for (const geo of [f.cortex, f.nucleus])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.brainstem, f.septal])
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

function fixture(delayed = false, protectNuclei = false, permanent = false, colored = false) {
  const original: SketchfabMaterial = { id: 'shared', name: 'Cortex and nuclei', channels: { Opacity: { enable: true, factor: 0.8 } } };
  const materials = new Map([[original.id, original]]);
  const cortex = { instanceID: 10, materialID: 'shared' };
  const brainstem = { instanceID: 11, materialID: 'shared' };
  const nucleus = { instanceID: 12, materialID: 'shared' };
  const septal = { instanceID: 13, materialID: 'shared' };
  const assigned = new Map<number, string>();
  const pending: (() => void)[] = [];
  const errors: string[] = [];
  const updates: SketchfabMaterial[] = [];
  let created = 0;
  const api = {
    createMaterial: (material: SketchfabMaterial, callback: (error: null, material: SketchfabMaterial) => void) => {
      const clone = { ...structuredClone(material), id: `clone-${++created}` };
      // Simulate a returned material whose opacity defaults differ from the
      // requested creation channel: the brainstem update must set it explicitly.
      clone.channels.Opacity = { enable: false, factor: 1 };
      if (delayed) pending.push(() => callback(null, clone)); else callback(null, clone);
    },
    setMaterial: (material: SketchfabMaterial, callback: () => void) => {
      updates.push(structuredClone(material)); callback();
    },
    assignMaterial: (geo: { instanceID: number }, id: string, callback: (error: null) => void) => {
      assigned.set(geo.instanceID, id); callback(null);
    },
  } as unknown as SketchfabAPI;
  const manager = createCollectionContextOpacity({
    api: () => api,
    geometry: id => id === 1 ? (protectNuclei ? [cortex, nucleus, septal] : [cortex])
      : id === 2 ? [brainstem] : id === 3 ? [nucleus] : [septal],
    opaqueNodes: () => protectNuclei ? [3, 4] : [],
    alwaysOpaqueNodes: () => permanent ? [3] : [],
    coloredNodes: () => colored ? [{ instanceID: 3, color: ACCUMBENS_LIGHT_BLUE }] : [],
    material: id => materials.get(id), register: mat => { materials.set(mat.id, mat); },
    onError: message => errors.push(message),
  });
  return { manager, api, materials, original, cortex, brainstem, nucleus, septal, assigned, pending, errors, updates, get created() { return created; } };
}

test('Trunks context fades nerve segments independently of shared trunk materials and restores their opacity in Overview', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Roots of brachial plexus.l',
    'Anterior division of superior trunk of brachial plexus.l', 'Lateral cord of brachial plexus.l',
    'Superior trunk of brachial plexus.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  const p = [...BRACHIAL_ROOT_PATH, 'trunks'];
  await f.manager.setNodes(brachialContextIds(scene, p), false, true, brachialForegroundIds(scene, p));
  for (const geo of [f.cortex, f.brainstem, f.nucleus]) {
    assert.equal(f.materials.get(geo.materialID!)?.channels.Opacity?.factor, 0.18);
  }
  assert.equal(f.materials.get(f.septal.materialID!)?.channels.Opacity?.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  const overview = [...BRACHIAL_ROOT_PATH, 'overview'];
  await f.manager.setNodes(brachialContextIds(scene, overview), false, true, brachialForegroundIds(scene, overview));
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) {
    assert.equal(f.materials.get(geo.materialID!)?.channels.Opacity?.factor, 1);
  }
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});
test('category-only trunk color survives reapply, leaves shared nerves untouched and restores on exit', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Roots of brachial plexus.l',
    'Anterior division of superior trunk of brachial plexus.l', 'Lateral cord of brachial plexus.l',
    'Superior trunk of brachial plexus.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  const p = [...BRACHIAL_ROOT_PATH, 'trunks'];
  await f.manager.setNodes(brachialContextIds(scene, p), false, true, brachialForegroundIds(scene, p), [], brachialTrunkColorNodes(scene, p));
  for (let i = 0; i < 2; i++) {
    const trunkMaterial = f.materials.get(f.septal.materialID!)!;
    assert.deepEqual(trunkMaterial.channels.AlbedoPBR.color, BRACHIAL_TRUNK_LIGHT_PURPLE);
    assert.deepEqual(trunkMaterial.channels.DiffuseColor.color, BRACHIAL_TRUNK_LIGHT_PURPLE);
    assert.equal(trunkMaterial.channels.Opacity.factor, 1);
    for (const geo of [f.cortex, f.brainstem, f.nucleus]) {
      const mat = f.materials.get(geo.materialID!)!;
      assert.equal(mat.channels.Opacity.factor, 0.18);
      assert.equal(mat.channels.AlbedoPBR, undefined);
    }
    await f.manager.setNodes([...f.manager.nodeIds], false, true);
  }
  const divisionPath = [...BRACHIAL_ROOT_PATH, 'divisions'];
  await f.manager.setNodes(brachialContextIds(scene, divisionPath), false, true, brachialForegroundIds(scene, divisionPath), [], []);
  assert.equal(f.materials.get(f.septal.materialID!)!.channels.AlbedoPBR, undefined);
  assert.equal(f.materials.get(f.septal.materialID!)!.channels.Opacity.factor, 0.18);
  await f.manager.setNodes([]);
  assert.equal(f.septal.materialID, 'shared');
  assert.equal(f.original.channels.AlbedoPBR, undefined);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  assert.deepEqual(f.errors, []);
});
test('Overview keeps precentral gyri, basal ganglia and ventricles opaque on materials shared with its transparent brain shell', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Frontal lobe.l', 'Precentral gyrus.l', 'Putamen.l', 'Lateral ventricle.l']
    .map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
    }));
  const p = [...BRACHIAL_ROOT_PATH, 'overview'];
  await f.manager.setNodes(brachialContextIds(scene, p), false, true, brachialForegroundIds(scene, p));
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.Opacity.factor, 0.18);
  for (const geo of [f.brainstem, f.nucleus, f.septal]) {
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  }
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});
test('Cords uses private purple cord materials, transparent roots/bones and opaque collateral nerves, restoring on exit', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Roots of brachial plexus.l', 'Scapula.l',
    'Lateral cord of brachial plexus.l', 'Lateral pectoral nerve.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: rawName.startsWith('Scapula') ? 'skeletal' : 'nervous',
  }));
  const p = [...BRACHIAL_ROOT_PATH, 'cords'];
  await f.manager.setNodes(brachialContextIds(scene, p), false, true, brachialForegroundIds(scene, p), [], brachialCordColorNodes(scene, p));
  for (const geo of [f.cortex, f.brainstem]) assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  assert.equal(f.materials.get(f.nucleus.materialID!)!.channels.Opacity.factor, 1);
  assert.deepEqual(f.materials.get(f.nucleus.materialID!)!.channels.AlbedoPBR.color, BRACHIAL_TRUNK_LIGHT_PURPLE);
  assert.equal(f.materials.get(f.septal.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.materials.get(f.septal.materialID!)!.channels.AlbedoPBR, undefined);
  await f.manager.setNodes([...f.manager.nodeIds], false, true);
  assert.deepEqual(f.materials.get(f.nucleus.materialID!)!.channels.AlbedoPBR.color, BRACHIAL_TRUNK_LIGHT_PURPLE);
  const trunkPath = [...BRACHIAL_ROOT_PATH, 'trunks'];
  await f.manager.setNodes(brachialContextIds(scene, trunkPath), false, true, brachialForegroundIds(scene, trunkPath), [], []);
  assert.equal(f.materials.get(f.nucleus.materialID!)!.channels.AlbedoPBR, undefined);
  assert.equal(f.materials.get(f.nucleus.materialID!)!.channels.Opacity.factor, 0.18);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.equal(f.original.channels.AlbedoPBR, undefined);
  assert.deepEqual(f.errors, []);
});
test('Terminal nerves restores cord colors and fades cords and hand bones, leaving main nerves opaque and ligaments untouched', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Lateral cord of brachial plexus.l', 'Median nerve.l', 'Scaphoid bone.l',
    'Scapholunate interosseous ligament.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: i === 2 ? 'skeletal' : i === 3 ? 'joints' : 'nervous',
  }));
  const cordPath = [...BRACHIAL_ROOT_PATH, 'cords'];
  await f.manager.setNodes(brachialContextIds(scene, cordPath), false, true, brachialForegroundIds(scene, cordPath), [], brachialCordColorNodes(scene, cordPath));
  assert.deepEqual(f.materials.get(f.cortex.materialID!)!.channels.AlbedoPBR.color, BRACHIAL_TRUNK_LIGHT_PURPLE);
  const p = [...BRACHIAL_ROOT_PATH, 'terminal', 'median', 'left'];
  await f.manager.setNodes(brachialContextIds(scene, p), false, true, brachialForegroundIds(scene, p), [], []);
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.Opacity.factor, 0.18);
  assert.equal(f.materials.get(f.cortex.materialID!)!.channels.AlbedoPBR, undefined);
  assert.equal(f.materials.get(f.nucleus.materialID!)!.channels.Opacity.factor, 0.18);
  assert.equal(f.materials.get(f.nucleus.materialID!)!.channels.AlbedoPBR, undefined);
  assert.equal(f.materials.get(f.brainstem.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.materials.get(f.brainstem.materialID!)!.channels.AlbedoPBR, undefined);
  // Hand ligaments are not terminal-nerve members (brachialPathForGroup), so the
  // ligament keeps its untouched source material.
  assert.equal(f.septal.materialID, 'shared');
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});
test('Terminal nerves fades humerus, radius and ulna without fading a main nerve on their shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Humerus.l', 'Radius.l', 'Ulna.l', 'Median nerve.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: i < 3 ? 'skeletal' : 'nervous',
  }));
  const p = [...BRACHIAL_ROOT_PATH, 'terminal', 'median', 'left'];
  await f.manager.setNodes(brachialContextIds(scene, p), false, true, brachialForegroundIds(scene, p), [], []);
  for (const geo of [f.cortex, f.brainstem, f.nucleus]) {
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 0.18);
  }
  assert.equal(f.materials.get(f.septal.materialID!)!.channels.Opacity.factor, 1);
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});
test('switching Trunks to Divisions reverses opacity roles without modifying shared source materials', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Roots of brachial plexus.l',
    'Anterior division of superior trunk of brachial plexus.l', 'Lateral cord of brachial plexus.l',
    'Superior trunk of brachial plexus.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  for (const [category, opaqueGeometry] of [['trunks', f.septal], ['divisions', f.brainstem]] as const) {
    const p = [...BRACHIAL_ROOT_PATH, category];
    await f.manager.setNodes(brachialContextIds(scene, p), false, true, brachialForegroundIds(scene, p));
    for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) {
      assert.equal(f.materials.get(geo.materialID!)?.channels.Opacity?.factor, geo === opaqueGeometry ? 1 : 0.18);
    }
  }
  const overview = [...BRACHIAL_ROOT_PATH, 'overview'];
  await f.manager.setNodes(brachialContextIds(scene, overview), false, true, brachialForegroundIds(scene, overview));
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) {
    assert.equal(f.materials.get(geo.materialID!)?.channels.Opacity?.factor, 1);
  }
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.equal(f.original.channels.Opacity.factor, 0.8);
  assert.deepEqual(f.errors, []);
});
test('switching Trunks to Divisions transfers purple to the divisions only and removes it on exit', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Roots of brachial plexus.l',
    'Anterior division of superior trunk of brachial plexus.l', 'Lateral cord of brachial plexus.l',
    'Superior trunk of brachial plexus.l'].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  for (const [category, purpleGeometry] of [['trunks', f.septal], ['divisions', f.brainstem]] as const) {
    const p = [...BRACHIAL_ROOT_PATH, category];
    await f.manager.setNodes(brachialContextIds(scene, p), false, true, brachialForegroundIds(scene, p), [],
      [...brachialTrunkColorNodes(scene, p), ...brachialDivisionColorNodes(scene, p)]);
    for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) {
      const material = f.materials.get(geo.materialID!)!;
      assert.equal(material.channels.Opacity.factor, geo === purpleGeometry ? 1 : 0.18);
      if (geo === purpleGeometry) assert.deepEqual(material.channels.AlbedoPBR.color, BRACHIAL_TRUNK_LIGHT_PURPLE);
      else assert.equal(material.channels.AlbedoPBR, undefined);
    }
  }
  const p = [...BRACHIAL_ROOT_PATH, 'overview'];
  await f.manager.setNodes(brachialContextIds(scene, p), false, true, brachialForegroundIds(scene, p), [], []);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) {
    assert.equal(f.materials.get(geo.materialID!)!.channels.AlbedoPBR, undefined);
    assert.equal(f.materials.get(geo.materialID!)!.channels.Opacity.factor, 1);
  }
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.equal(f.original.channels.AlbedoPBR, undefined);
  assert.deepEqual(f.errors, []);
});

test('sympathetic vertebrae fade to 18% while roots sharing their material stay opaque, then restore', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Vertebra C3', 'Vertebra T1', 'Roots of brachial plexus.r', 'White matter of spinal cord']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
      visible: true, systemId: i < 2 ? 'skeletal' : 'nervous' }));
  const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic'];
  await f.manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
  assert.equal(f.materials.get(f.cortex.materialID)!.channels.Opacity?.factor, 0.18);
  assert.equal(f.materials.get(f.brainstem.materialID)!.channels.Opacity?.factor, 0.18);
  assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1);
  assert.equal(f.materials.get(f.septal.materialID)!.channels.Opacity?.factor, 1);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('sympathetic spinal gray matter stays opaque beside translucent vertebrae sharing the same material', async () => {
  for (const rawName of ['Anterior horn of spinal cord', 'Posterior horn of spinal cord',
    'Lateral intermediate substance', 'Intermediolateral nucleus', 'Intermediomedial nucleus']) {
    const f = fixture();
    const scene: SceneNode[] = [
      { instanceID: 1, rawName: 'Vertebra T1', name: 'Vertebra T1', type: 'MatrixTransform', visible: true, systemId: 'skeletal' },
      { instanceID: 3, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' },
    ];
    const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic'];
    await f.manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
    assert.equal(f.materials.get(f.cortex.materialID)!.channels.Opacity?.factor, 0.18);
    assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1, rawName);
    assert.deepEqual(f.errors, []);
  }
});

test('C1-C4 dorsal root naming variants stay opaque on a shared translucent vertebral material', async () => {
  for (const rawName of ['C1 anterior posterior.l', 'C2 anterior posterior.r', 'C3 dorsal root.l', 'C4 posterior root.r']) {
    const f = fixture();
    const scene: SceneNode[] = [
      { instanceID: 1, rawName: 'Vertebra C3', name: 'Vertebra C3', type: 'MatrixTransform', visible: true, systemId: 'skeletal' },
      { instanceID: 3, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' },
    ];
    const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'cervical'];
    await f.manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
    assert.equal(f.materials.get(f.cortex.materialID)!.channels.Opacity?.factor, 0.18);
    assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1, rawName);
    assert.deepEqual(f.errors, []);
  }
});

test('sympathetic head nerves, ganglia, eye and lacrimal gland stay opaque beside shared translucent vertebrae', async () => {
  for (const rawName of ['Vidian nerve (nerve of the pterygoid canal).l', 'Pterygopalatine ganglion.r',
    'Nasociliary nerve.l', 'Lacrimal nerve.r', 'Ganglionic branch of maxillary nerve.l',
    'Ciliary ganglion.r', 'Short ciliary nerves.l', 'Lacrimal gland.r', 'Iris.l', 'Posterior segment of eyeball.r']) {
    const f = fixture();
    const scene: SceneNode[] = [
      { instanceID: 1, rawName: 'Vertebra C3', name: 'Vertebra C3', type: 'MatrixTransform', visible: true, systemId: 'skeletal' },
      { instanceID: 3, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' },
    ];
    const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic'];
    await f.manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
    assert.equal(f.materials.get(f.cortex.materialID)!.channels.Opacity?.factor, 0.18);
    assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1, rawName);
    assert.deepEqual(f.errors, []);
  }
});

test('submandibular ganglion nerve meshes remain opaque against a shared translucent parasympathetic skull material', async () => {
  for (const rawName of ['Submandibular ganglia nerves.l', 'Submandibular ganglion nerves.r.001_123',
    'Ganglionic branches of lingual nerve.l', 'Communicating branch of lingual nerve to submandibular ganglion.r']) {
    const f = fixture();
    const scene: SceneNode[] = [
      { instanceID: 1, rawName: 'Sphenoid bone', name: 'Sphenoid bone', type: 'MatrixTransform', visible: true, systemId: 'skeletal' },
      { instanceID: 3, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' },
    ];
    const path = [...AUTONOMIC_ROOT_PATH, 'parasympathetic'];
    await f.manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
    assert.equal(f.materials.get(f.cortex.materialID)!.channels.Opacity?.factor, 0.18);
    assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1, rawName);
    await f.manager.setNodes([]);
    assert.equal(f.nucleus.materialID, 'shared');
    assert.deepEqual(f.errors, []);
  }
});

test('head/neck cervical and skull bones fade to 18% while carotids, glands, eyes, bodies and nerves stay opaque and restore', async () => {
  const pairs = [
    ['Atlas (C1)', 'Left common carotid artery', 'Parotid gland.l'],
    ['Axis (C2)', 'External carotid artery.r', 'Submandibular gland.r'],
    ['Temporal bone.l', 'Internal carotid artery.l', 'Sublingual gland.l'],
    ['Sphenoid bone', 'Carotid body left.l', 'Lacrimal gland.r'],
    ['Vertebra C7', 'C1 anterior posterior.l', 'Iris.r'],
    ['Vertebra C4', 'Dorsal ramus C4.l', 'Roots of brachial plexus.r'],
    ['Atlas (C1)', 'C1 spinal nerve.l.001', 'C2 spinal nerve.r'],
    ['Vertebra C4', 'C3 spinal nerve.l', 'C4 spinal nerve.r'],
    ['Atlas (C1)', 'Dorsal ramus C1.r', 'Dorsal ramus C2.l'],
    ['Vertebra C3', 'Dorsal ramus C3.l', 'Roots of brachial plexus.l'],
    ['Temporal bone.r', 'Submandibular ganglia nerves.r', 'Vidian nerve (nerve of the pterygoid canal).l'],
    ['Midbrain.l', 'Superior salivatory nucleus.r', 'Inferior salivatory nucleus.l'],
    ['Pons.r', 'Tympanic plexus.l', 'Tympanic membrane.r'],
    ['Medulla oblongata.l', 'Lesser petrosal nerve.r', 'Middle cervical sympathetic ganglion.l'],
    ['Pons.l', 'Cervicothoracic Ganglion (Stellatum).r', 'Ansa Subclavia.r'],
    ['Midbrain.r', 'Left subclavian artery', 'Right subclavian artery'],
    ['Midbrain.r', 'Brachiocephalic trunk', 'Right subclavian artery'],
    ['Medulla oblongata.r', 'Aortic arch', 'Inferior cervical sympathetic ganglion.l'],
    ['Medulla oblongata.l', 'Posterior nucleus of vagus nerve.r', 'Submandibular ganglia nerves.l'],
    ['Brainstem', 'Posterior nucleus of vagus nerve.l', 'Submandibular ganglionic nerves.r'],
  ];
  for (const [bone, first, second] of pairs) {
    const f = fixture();
    const scene: SceneNode[] = [bone, 'Vertebra C3', first, second].map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: systemForMeshName(rawName),
    }));
    const path = [...AUTONOMIC_ROOT_PATH, 'head-neck'];
    await f.manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
    for (const geo of [f.cortex, f.brainstem]) assert.equal(f.materials.get(geo.materialID)!.channels.Opacity?.factor, 0.18, bone);
    for (const geo of [f.nucleus, f.septal]) assert.equal(f.materials.get(geo.materialID)!.channels.Opacity?.factor, 1, `${first}, ${second}`);
    await f.manager.setNodes([]);
    for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
    assert.deepEqual(f.errors, []);
  }
});

test('autonomic plexus torso, heart and arterial context is 18% while spinal cord, paravertebral ganglia and pelvic nerves remain opaque', async () => {
  const groups = [
    ['Vertebra T12', 'Right coronary artery', 'White matter of spinal cord', 'Intermediolateral nucleus'],
    ['Vertebra L3', 'Right ventricle', 'Anterior horn of spinal cord', 'Posterior horn of spinal cord'],
    ['Sacrum', 'Left pulmonary artery', 'Lateral intermediate substance', 'Intermediomedial nucleus'],
    ['Vertebra T1', 'Aortic arch', 'Sympathetic ganglia Thoracic region.l', 'Inferior hypogastric nerves and plexus'],
    ['Vertebra L1', 'Heart and coronary vessels (semitransparent)', 'Superior hypogastric plexus', 'Paravertebral sympathetic ganglia.r'],
    ['Thoracic aorta', 'Abdominal aorta', 'Coeliac ganglia', 'Abdominal aorta_Enteric_Plexus_Fine'],
    ['Coeliac trunk', 'Hepatic portal vein', 'Right renal arteryNerve Plexus', 'Superior mesenteric ganglia'],
    ['Left renal artery', 'Right renal vein', 'Anterior horn of spinal cord', 'Intermediomedial nucleus'],
    ['Thoracic aorta', 'Abdominal aorta', 'Greater splanchnic nerves.l', 'Lesser splanchinc nerves.r'],
    ['Vertebra T12', 'Coeliac trunk', 'Least splanchnic nerve.r', 'Lesser splanchnic nerve.l'],
  ];
  for (const names of groups) {
    const f = fixture();
    const scene: SceneNode[] = names.map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: systemForMeshName(rawName),
    }));
    const path = [...AUTONOMIC_ROOT_PATH, 'plexuses'];
    await f.manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
    for (const geo of [f.cortex, f.brainstem]) assert.equal(f.materials.get(geo.materialID)!.channels.Opacity?.factor, 0.18, names.join(', '));
    for (const geo of [f.nucleus, f.septal]) assert.equal(f.materials.get(geo.materialID)!.channels.Opacity?.factor, 1, names.join(', '));
    await f.manager.setNodes([]);
    for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
    assert.deepEqual(f.errors, []);
  }
});

test('enteric visceral organs are 18% opaque while their enteric plexuses remain opaque on shared materials, and restore cleanly', async () => {
  for (const names of [
    ['Stomach', 'Liver', 'Stomach_Enteric_Plexus_Fine', 'Duodenum_Enteric_Plexus_Fine'],
    ['Pancreas', 'Urinary bladder', 'Jejunum_Enteric_Plexus_Fine', 'Transverse colon.001_Enteric_Plexus_Fine'],
    ['Urinary bladder', 'Pancreas', 'Urinary bladder Nerve Plexus', 'Prostate Nerve Plexus'],
  ]) {
    const f = fixture();
    const scene: SceneNode[] = names.map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: systemForMeshName(rawName),
    }));
    const path = [...AUTONOMIC_ROOT_PATH, 'enteric'];
    await f.manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
    for (const geo of [f.cortex, f.brainstem]) assert.equal(f.materials.get(geo.materialID)!.channels.Opacity?.factor, 0.18);
    for (const geo of [f.nucleus, f.septal]) assert.equal(f.materials.get(geo.materialID)!.channels.Opacity?.factor, 1);
    await f.manager.setNodes([]);
    for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
    assert.deepEqual(f.errors, []);
  }
});

test('parasympathetic bone and brainstem fade to 18% without fading trigeminal carriers or otic pathway sharing their material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Sphenoid bone', 'Pons.l', 'Lingual nerve.r', 'Otic ganglion.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
      visible: true, systemId: i === 0 ? 'skeletal' : 'nervous' }));
  const path = [...AUTONOMIC_ROOT_PATH, 'parasympathetic'];
  await f.manager.setNodes(autonomicContextIds(scene, path), false, true, autonomicForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) assert.equal(f.materials.get(geo.materialID)!.channels.Opacity?.factor, 0.18);
  for (const geo of [f.nucleus, f.septal]) assert.equal(f.materials.get(geo.materialID)!.channels.Opacity?.factor, 1);
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('automatic context is 18% opacity without fading nuclei sharing the same source material, and restores assignments', async () => {
  const f = fixture();
  await f.manager.setNodes([1, 2]);
  assert.equal(f.created, 1);
  assert.equal(f.updates.length, 1);
  assert.deepEqual(f.updates[0].channels.Opacity, BRAINSTEM_TRANSPARENCY);
  assert.equal(f.materials.get(f.cortex.materialID)!.channels.Opacity?.factor, 0.18);
  assert.equal(f.brainstem.materialID, f.cortex.materialID);
  assert.equal(f.nucleus.materialID, 'shared');
  assert.equal(f.original.channels.Opacity?.factor, 0.8);
  assert.ok(!f.assigned.has(12));
  await f.manager.setNodes([]);
  assert.equal(f.cortex.materialID, 'shared');
  assert.equal(f.brainstem.materialID, 'shared');
  await f.manager.setNodes([1]);
  assert.equal(f.created, 1, 'Repeated collection navigation reuses the cloned material');
  assert.deepEqual(f.errors, []);
});

test('optic pathway gives only brainstem/occipital cortex 18% opacity while other lobes stay unchanged and LGB stays opaque', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Precentral gyrus.l', 'Pons.r', 'Cuneus.r', 'Lateral geniculate body.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'ii'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.brainstem, f.nucleus]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  assert.equal(f.cortex.materialID, 'shared', 'Frontal cortex is not optic context');
  for (const geo of [f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  assert.equal(f.original.channels.Opacity?.factor, 0.8, 'Never change the shared source material');
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('II keeps the right optic tract opaque against semitransparent occipital structures without fading temporal cortex', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Medial occipitotemporal gyrus (Parahippocampal*).l', 'Cuneus.r',
    'Optic tract.r', 'Lateral geniculate body.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'ii'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  assert.equal(f.cortex.materialID, 'shared', 'Temporal cortex is not optic context');
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  assert.deepEqual(f.errors, []);
});

test('II peduncular bases are semitransparent and its ventricular landmarks remain opaque, including when isolating the optic fibers', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Base of cerebral peduncle (Midbrain).l', 'Base of cerebral peduncle (Midbrain).r',
    'Optic tract.r', 'Third ventricle']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'ii', 'tracts'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('oculomotor view keeps IV/VI nuclei opaque against semitransparent brainstem, including when materials are shared', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Pons.l', 'Medulla oblongata.r', 'Nucleus of trochlear nerve.l', 'Nucleus of abducens nerve.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'iii'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  assert.equal(f.original.channels.Opacity?.factor, 0.8);
  assert.deepEqual(f.errors, []);
});

test('III sphenoid is semitransparent while both annuli remain opaque with shared materials, then Restore releases the overrides', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Sphenoid bone', 'Pons.r', 'Common tendinous ring.l', 'Common tendinous ring.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 0 ? 'skeletal' : i > 1 ? 'muscular' : 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'iii'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('IV keeps superior oblique and shared ocular nuclei opaque against translucent brainstem despite shared materials', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Pons.r', 'Medulla oblongata.l', 'Superior oblique muscle.r', 'Nucleus of oculomotor nerve.l']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 2 ? 'muscular' : 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'iv'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  assert.equal(f.original.channels.Opacity?.factor, 0.8);
  assert.deepEqual(f.errors, []);
});

test('VI brainstem and sphenoid are 18% opaque without fading lateral rectus or annulus, and Restore releases overrides', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Pons.r', 'Sphenoid bone', 'Lateral rectus muscle.r', 'Common tendinous ring.l']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 0 ? 'nervous' : i === 1 ? 'skeletal' : 'muscular' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'vi'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('V gives brainstem/thalamus and postcentral endpoint 18% opacity while VPM stays opaque with shared materials', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Pons.r', 'Thalamus.l', '13_Ventral_posteromedial_VPM.l', 'Postcentral gyrus.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'v'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('V masticatory muscles receive 18% opacity without fading mandibular branches or trigeminal nuclei on shared materials', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Temporalis muscle.l', 'Superficial part of masseter.r',
    'Lingual nerve.r', 'Principal (pontine) neucleus of trigeminal nerve.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i < 2 ? 'muscular' : 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'v'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('IV orbital bones are 18% opaque without fading superior oblique on shared material, and Restore releases overrides', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Sphenoid bone', 'Ethmoid bone', 'Frontal bone', 'Superior oblique muscle.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i < 3 ? 'skeletal' : 'muscular' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'iv'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem, f.nucleus]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  assert.deepEqual(f.materials.get(f.septal.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('VII makes brainstem, temporal bone and facial muscle 18% opaque while its nucleus stays opaque, even after the muscle was foreground', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Pons.r', 'Temporal bone.r', 'Orbicularis oris muscle.r', 'Motor nucleus of facial nerve.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 1 ? 'skeletal' : i === 2 ? 'muscular' : 'nervous' }));
  await f.manager.setNodes([1, 2], false, true, [3, 4]);
  assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1);
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'vii'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem, f.nucleus]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  assert.deepEqual(f.materials.get(f.septal.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  assert.equal(f.original.channels.Opacity?.factor, 0.8);
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('cochlear basal-ganglia context explicitly overrides accumbens opacity protection only until leaving or restoring, including mixed views', async () => {
  const f = fixture(false, true, true, true);
  const scene: SceneNode[] = ['Pons.r', 'Temporal bone.r', 'Nucleus accumbens.r', 'Medial geniculate body.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 1 ? 'skeletal' : 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'viii', 'cochlear'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path), [3]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  assert.deepEqual(f.materials.get(f.septal.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  await f.manager.setNodes([1], true, true, [4]);
  assert.deepEqual(f.materials.get(f.nucleus.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  await f.manager.setNodes([]);
  assert.deepEqual(f.materials.get(f.nucleus.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  assert.ok([f.cortex, f.brainstem, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('IX brainstem and temporal bone are 18% opaque while stylopharyngeus and inferior salivatory nucleus stay opaque on a shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Pons.r', 'Temporal bone.r', 'Stylopharyngeus muscle.r', 'Inferior salivatory nucleus.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 1 ? 'skeletal' : i === 2 ? 'muscular' : 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'ix'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('X vessels, organs and esophageal plexus are 18% opaque while recurrent laryngeal nerve remains opaque on a shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Aortic arch', 'Stomach', 'Oesophagus Nerve Plexus', 'Left recurrent laryngeal nerve.l']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 0 ? 'vascular' : i === 1 ? 'organs' : 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'x'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem, f.nucleus]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  assert.deepEqual(f.materials.get(f.septal.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('VIII cochlear lateral superior temporal gyri receive 18% opacity while the cochlear nerve stays opaque on a shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Superior temporal gyrus (Lateral part).l', 'Superior temporal gyrus (Lateral part).r', 'Cochlear nerve.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'viii', 'cochlear'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  assert.deepEqual(f.materials.get(f.nucleus.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  assert.deepEqual(f.errors, []);
});

test('VIII vestibular nuclei and superior temporal gyri receive 18% opacity while the nerve stays opaque on a shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Vestibular nuclei.r', 'Superior temporal gyrus (Lateral part).r', 'Vestibular nerve.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'viii', 'vestibular'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  assert.deepEqual(f.materials.get(f.nucleus.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('XI brainstem and temporal bone are 18% opaque without fading accessory nucleus or sternocleidomastoid on a shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Pons.r', 'Temporal bone.r', 'Nucleus of accessory nerve.r', 'Sternocleidomastoid muscle.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 1 ? 'skeletal' : i === 3 ? 'muscular' : 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'xi'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('XII brainstem and occipital bone are 18% opaque while hypoglossal nucleus and genioglossus remain opaque on a shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Medulla oblongata.r', 'Occipital bone', 'Nucleus of hypoglossal nerve.r', 'Genioglossus muscle.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
      systemId: i === 1 ? 'skeletal' : i === 3 ? 'muscular' : 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'xii'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('white matter brain and thalamus context fade at 18% without fading nuclei or fibers on shared materials', async () => {
  for (const branch of ['thalamic', 'basal-forebrain']) {
    const f = fixture();
    const scene: SceneNode[] = ['Precentral gyrus.l', 'Thalamus.l', '01_Anterior_ventral_AV',
      'Ansa peduncularis Amygdalothalamic fibers.l'].map((rawName, i) => ({
      instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
    }));
    const contextIds = whiteMatterContextIds(scene, ['advanced-neuroanatomy', 'white-matter', branch]);
    assert.deepEqual(contextIds, [1, 2]);
    await f.manager.setNodes(contextIds, false, true, [3, 4]);
    for (const geo of [f.cortex, f.brainstem])
      assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
    for (const geo of [f.nucleus, f.septal])
      assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
    await f.manager.setNodes([]);
    assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
    assert.deepEqual(f.errors, []);
  }
});

test('I thalamus capsules receive 18% opacity without fading AV or olfactory nerve on a shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Thalamus.r', 'Thalamus.l', '01_Anterior_ventral_AV', 'Olfactory nerve (I).r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'i'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('II occipital surfaces receive 18% opacity while right optic tract and optic radiation stay opaque on a shared material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Cuneus.l', 'Right occipital lobe', 'Right optic tract', 'Optic radiation.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'ii'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('cross-system cranial foreground remains opaque on later updates, merges between nerve groups and releases on explicit Restore', async () => {
  const f = fixture();
  await f.manager.setNodes([1], false, true, [3]);
  assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1);
  await f.manager.setNodes([1], false, true);
  assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1);
  await f.manager.setNodes([2], true, true, [4]);
  assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1);
  assert.equal(f.materials.get(f.septal.materialID)!.channels.Opacity?.factor, 1);
  await f.manager.setNodes([]);
  assert.ok([f.nucleus, f.septal, f.cortex, f.brainstem].every(geo => geo.materialID === 'shared'));
});

// I's context is thalamus-only; supratentorial lobes are excluded (olfactoryBasalForebrainPath).
test('I thalamic context is semitransparent while both amygdalae remain opaque on shared materials', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Thalamus capsule (semitransparent)', 'Thalamus.l', 'Amygdaloid body.l', 'Amygdaloid body.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'i'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  for (const geo of [f.cortex, f.brainstem]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  }
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('V chorda tympani and its salivatory/taste nuclei remain opaque against shared translucent brainstem material', async () => {
  const f = fixture();
  const scene: SceneNode[] = ['Pons.r', 'Chorda tympani.l', 'Superior salivatory nucleus.r', 'Nucleus of solitary tract.l']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'v', 'chorda-tympani'];
  await f.manager.setNodes(cranialNerveContextIds(scene, path), false, true, cranialNerveForegroundIds(scene, path));
  assert.deepEqual(f.materials.get(f.cortex.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  for (const geo of [f.brainstem, f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
  }
  await f.manager.setNodes([]);
  assert.ok([f.cortex, f.brainstem, f.nucleus, f.septal].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(f.errors, []);
});

test('mixed context adds preserve previous fades, and an individual context node can be restored', async () => {
  const f = fixture();
  await f.manager.setNodes([1]);
  await f.manager.setNodes([2], true);
  assert.deepEqual([...f.manager.nodeIds], [1, 2]);
  await f.manager.setNodes([2]);
  assert.equal(f.cortex.materialID, 'shared');
  assert.equal(f.materials.get(f.brainstem.materialID)!.channels.Opacity?.factor, 0.18);
});

test('accumbens and septal geometry stays fully opaque despite transparent shared materials and nesting under cortex', async () => {
  const f = fixture(false, true);
  f.original.channels.Opacity = { enable: true, factor: 0.18 };
  await f.manager.setNodes([1, 2]);
  for (const geo of [f.nucleus, f.septal]) {
    assert.deepEqual(f.materials.get(geo.materialID)!.channels.Opacity, { enable: false, factor: 1 });
    assert.notEqual(geo.materialID, f.cortex.materialID);
    assert.equal(f.assigned.get(geo.instanceID), geo.materialID);
  }
  assert.deepEqual([...f.manager.nodeIds], [1, 2], 'Opaque nuclei are not marked as faded nodes');
  assert.deepEqual(f.materials.get(f.cortex.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  assert.deepEqual(f.materials.get(f.brainstem.materialID)!.channels.Opacity, BRAINSTEM_TRANSPARENCY);
  assert.equal(f.original.channels.Opacity.factor, 0.18, 'Do not alter other structures sharing the original material');
  await f.manager.setNodes([2]);
  assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1);
  assert.equal(f.materials.get(f.septal.materialID)!.channels.Opacity?.factor, 1);
  await f.manager.setNodes([], false, true, [1, 2]);
  assert.equal(f.manager.foregroundProtected, true);
  assert.equal(f.materials.get(f.cortex.materialID)!.channels.Opacity?.factor, 1);
  assert.equal(f.materials.get(f.nucleus.materialID)!.channels.Opacity?.factor, 1,
    'Making whole-brain context opaque must not reset nuclear opacity');
  await f.manager.setNodes([]);
  for (const geo of [f.cortex, f.brainstem, f.nucleus, f.septal]) assert.equal(geo.materialID, 'shared');
  assert.deepEqual(f.errors, []);
});

test('Restore before material creation finishes prevents delayed context from reappearing', async () => {
  const f = fixture(true);
  const pending = f.manager.setNodes([1, 2]);
  await f.manager.setNodes([]);
  f.pending.forEach(finish => finish());
  await pending;
  assert.equal(f.cortex.materialID, 'shared');
  assert.equal(f.brainstem.materialID, 'shared');
  assert.ok([...f.assigned.values()].every(id => id === 'shared'));
});

test('anterior commissure opacity is disabled before and after collection context, on a private material', async () => {
  const f = fixture(false, true, true);
  f.original.channels.Opacity = { enable: true, factor: 0.18 };
  await f.manager.setNodes([]);
  const anteriorMaterial = f.nucleus.materialID;
  assert.deepEqual(f.materials.get(anteriorMaterial)!.channels.Opacity, { enable: false, factor: 1 });
  assert.equal(f.cortex.materialID, 'shared', 'Do not remove transparency from other structures');
  await f.manager.setNodes([1, 2]);
  assert.equal(f.nucleus.materialID, anteriorMaterial);
  assert.notEqual(f.septal.materialID, anteriorMaterial, 'Other opaque structures cannot share its protected material');
  f.materials.get(f.septal.materialID)!.channels.Opacity = { enable: true, factor: 0.18 };
  assert.deepEqual(f.materials.get(anteriorMaterial)!.channels.Opacity, { enable: false, factor: 1 });
  await f.manager.setNodes([]);
  assert.equal(f.cortex.materialID, 'shared');
  assert.equal(f.nucleus.materialID, anteriorMaterial, 'Restore must not reapply transparent source material');
  assert.deepEqual(f.errors, []);
});

test('accumbens is light blue and opaque without recoloring shared source materials, and survives Restore', async () => {
  const f = fixture(false, true, true, true);
  await f.manager.setNodes([]);
  const blue = f.nucleus.materialID;
  assert.deepEqual(f.materials.get(blue)!.channels.AlbedoPBR?.color, ACCUMBENS_LIGHT_BLUE);
  assert.deepEqual(f.materials.get(blue)!.channels.Opacity, { enable: false, factor: 1 });
  await f.manager.setNodes([1, 2]);
  assert.equal(f.nucleus.materialID, blue);
  assert.notEqual(f.septal.materialID, blue);
  assert.equal(f.materials.get(f.septal.materialID)!.channels.AlbedoPBR, undefined);
  assert.equal(f.original.channels.AlbedoPBR, undefined);
  await f.manager.setNodes([]);
  assert.equal(f.nucleus.materialID, blue);
  assert.deepEqual(f.materials.get(blue)!.channels.AlbedoPBR?.color, ACCUMBENS_LIGHT_BLUE);
  assert.deepEqual(f.errors, []);
});

test('protected hypothalamic nuclei retain their colors while disabling source transparency in ordinary, context and mixed views', async () => {
  const f = fixture(false, true, true);
  f.original.channels.Opacity = { enable: true, factor: 0.18 };
  f.original.channels.AlbedoPBR = { enable: true, color: [0.3, 0.7, 0.6], factor: 1 };
  for (const [ids, merge] of [[[], false], [[1], false], [[2], true], [[], false]] as const) {
    await f.manager.setNodes(ids, merge);
    const material = f.materials.get(f.nucleus.materialID)!;
    assert.deepEqual(material.channels.Opacity, { enable: false, factor: 1 });
    assert.deepEqual(material.channels.AlbedoPBR, f.original.channels.AlbedoPBR);
    assert.notEqual(f.nucleus.materialID, f.cortex.materialID);
  }
  assert.deepEqual(f.original.channels.Opacity, { enable: true, factor: 0.18 });
  assert.deepEqual(f.errors, []);
});
