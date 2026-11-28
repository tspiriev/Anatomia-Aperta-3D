import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import {
  SKULL_BASE_GROUPS, SKULL_BASE_ROOT_PATH, skullBasePathForGroup,
  skullBaseSystemForNode, skullBaseContextIds, isSkullBaseContext,
} from './skullBaseTaxonomy';
import { PETROSAL_AUTONOMIC_ID, petrosalAutonomicShowSupportIds, petrosalAutonomicShowContextIds } from './skullBasePetrosalAutonomic';
import { skullBaseNervousSource, skullBaseName } from './skullBaseSources';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';

const path = (...parts: string[]) => [...SKULL_BASE_ROOT_PATH, PETROSAL_AUTONOMIC_ID, ...parts];
const scene = (names: readonly string[]): SceneNode[] => names.map((rawName, i) =>
  ({ rawName, name: rawName, instanceID: i + 1, systemId: 'vascular', visible: true, type: 'MatrixTransform' }));
const isolate = (nodes: SceneNode[], requested: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
const matches = (name: string, requested: readonly string[]) =>
  skullBasePathForGroup(scene([name])[0], requested);
const root = SKULL_BASE_GROUPS.find(g => g.id === path().join('/'))!;

test('Petrosal nerves and autonomic ganglia is a sixth shared-tree category with functional pathways', () => {
  assert.equal(root.label, 'Petrosal nerves and autonomic ganglia');
  assert.deepEqual(root.children?.map(g => g.id.split('/').at(-1)), [
    'orientation', 'brainstem-nuclei', 'iii-ciliary', 'v-connections', 'vii-petrosal',
    'ix-otic', 'lesserPetrosal', 'sympathetic', 'ganglia', 'tympanic-anatomy',
  ]);
});

test('Lesser petrosal has a direct entry and retains the IX route for bilateral live names without an old-export requirement', () => {
  const requested = path('lesserPetrosal');
  assert.equal(root.children?.find(group => group.id === requested.join('/'))?.label, 'Lesser petrosal nerve');
  const nerves = ['Lesser petrosal nerve.l', 'Lesser petrosal nerve.r',
    'Lesser_superficial_petrosal_nerve_L', 'Lesser superficial petrosal nerve.r.001',
    'Small superficial petrosal nerve.l'];
  const context = ['Temporal bone.l', 'Sphenoid bone.r', 'Pons', 'Medulla oblongata', 'Midbrain'];
  const nodes = scene([...nerves, ...context, 'Greater petrosal nerve.l', 'Deep petrosal nerve.r', 'Unknown mesh']);
  for (const name of nerves) {
    assert.deepEqual(matches(name, requested), requested);
    assert.deepEqual(matches(name, path('ix-otic', 'incoming')), path('ix-otic', 'incoming', 'lesserPetrosal'));
    assert.equal(matches(name, path('vii-petrosal')), null);
    assert.equal(skullBaseSystemForNode(scene([name])[0]), 'nervous');
  }
  const nerveIds = nerves.map((_, i) => i + 1), contextIds = context.map((_, i) => nerves.length + i + 1);
  assert.deepEqual(isolate(nodes, requested).show, [...nerveIds, ...contextIds]);
  assert.deepEqual(petrosalAutonomicShowContextIds(nodes, [1], requested), contextIds);
  for (const name of context) assert.equal(matches(name, requested), null);
});

test('Brainstem parasympathetic nuclei are separate from the spinal sympathetic origin and cervical relay', () => {
  const requested = path('brainstem-nuclei');
  const examples = [
    ['Accessory nucleus of oculomotor nerve', 'edinger-westphal'],
    ['Superior salivatory nucleus', 'superior-salivatory'],
    ['Inferior salivatory nucleus', 'inferior-salivatory'],
  ];
  const names = examples.flatMap(([name]) => [`${name}.l`, `${name}.r`]);
  const nodes = scene([...names, 'Intermediolateral nucleus', 'Superior cervical sympathetic ganglion.l',
    'Nucleus of hypoglossal nerve.r', 'Reticular formation brainstem', 'Unidentified mesh']);
  assert.equal(root.children?.find(g => g.id === requested.join('/'))?.label, 'Brainstem parasympathetic nuclei');
  for (const [i, [name, leaf]] of examples.entries()) {
    for (const side of ['l', 'r']) {
      const rawName = `${name}.${side}`;
      assert.ok(skullBaseNervousSource.has(skullBaseName(rawName)));
      assert.deepEqual(matches(rawName, requested), [...requested, 'gve', leaf]);
      assert.equal(isSkullBaseContext(scene([rawName])[0]), false);
    }
    assert.deepEqual(isolate(nodes, [...requested, 'gve', leaf]).show, [i * 2 + 1, i * 2 + 2]);
  }
  assert.deepEqual(isolate(nodes, requested).show, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  for (const n of nodes.slice(6, 8)) {
    assert.ok(skullBasePathForGroup(n, path('sympathetic')));
    assert.equal(skullBasePathForGroup(n, requested), null, 'Never call spinal/cervical structures brainstem nuclei');
    assert.equal(skullBaseSystemForNode(n), 'nervous');
  }
});

test('Brainstem parasympathetic nuclear Show and isolation retain transparent gross brainstem without changing nuclear-only Hide', () => {
  const context = ['Midbrain', 'Pons', 'Medulla oblongata', 'Brainstem', 'Brain stem',
    'Temporal bone.l', 'Sphenoid bone.r'];
  const nuclei = ['Accessory nucleus of oculomotor nerve.l', 'Accessory nucleus of oculomotor nerve.r',
    'Superior salivatory nucleus.l', 'Superior salivatory nucleus.r',
    'Inferior salivatory nucleus.l', 'Inferior salivatory nucleus.r'];
  const excluded = ['Intermediolateral nucleus', 'Superior cervical sympathetic ganglion.r',
    'Nucleus of oculomotor nerve.l', 'Nucleus of hypoglossal nerve.r', 'Reticular formation brainstem',
    'Iris.l', 'Unknown mesh'];
  const nodes = scene([...context, ...nuclei, ...excluded]).map(n => ({ ...n, visible: false }));
  const contextIds = context.map((_, i) => i + 1);
  const nucleusIds = nuclei.map((_, i) => context.length + i + 1);
  for (const [suffix, members] of [
    [[], nucleusIds],
    [['gve'], nucleusIds],
    [['gve', 'edinger-westphal'], nucleusIds.slice(0, 2)],
    [['gve', 'superior-salivatory'], nucleusIds.slice(2, 4)],
    [['gve', 'inferior-salivatory'], nucleusIds.slice(4, 6)],
  ] as const) {
    const requested = path('brainstem-nuclei', ...suffix);
    const plan = isolate(nodes, requested);
    assert.deepEqual(new Set(plan.show), new Set([...contextIds, ...members]));
    assert.deepEqual(skullBaseContextIds(nodes, requested), contextIds);
    assert.deepEqual(petrosalAutonomicShowSupportIds(nodes, members, requested), contextIds);
    assert.deepEqual(petrosalAutonomicShowContextIds(nodes, members, requested), contextIds);
    assert.ok(plan.affected.every(n => !n.visible), 'Restore retains the previous composition');
    for (const name of context) assert.equal(matches(name, requested), null, 'Hide remains nuclear-only');
    for (const name of excluded) assert.equal(matches(name, requested), null, name);
    for (const id of members) assert.ok(!contextIds.includes(id), 'Nuclei are not faded');
  }
  assert.deepEqual(skullBaseContextIds(nodes, path('ganglia')), contextIds.slice(5),
    'Do not add brainstem context to unrelated ganglion selections');
});

test('III pathway contains only its parasympathetic trunk / inferior route, ciliary ganglia and outgoing short ciliary nerves', () => {
  const names = ['Oculomotor nerve (cisternal and cavernous part).l', 'Inferior branch of right oculomotor nerve.r',
    'Ciliary ganglion.l', 'Ciliary ganglion.r', 'Short ciliary nerves.l', 'Short ciliary nerves.r',
    'Accessory nucleus of oculomotor nerve.r', 'Long cilliary nerve.l'];
  const excluded = ['Lateral rectus muscle.r', 'Superior oblique muscle.l',
    'Iris.l', 'Ciliary body-curve.r', 'Superior rectus muscle.l', 'Nucleus of oculomotor nerve.l',
    'Superior branch of the oculomotor nerve.r', 'Oculomotor nerve (branch to levator palpebrae muscle).l',
    'Oculomotr nerve - branch to superior rectus m.l',
    'Medial longitudinal fascicle - Fibers to oculomotor nerve.l', 'Otic ganglion.r', 'Unidentified mesh'];
  const nodes = scene([...names, ...excluded]);
  const requested = path('iii-ciliary');
  for (const n of nodes.slice(0, names.length)) {
    assert.ok(skullBasePathForGroup(n, requested), n.rawName);
    assert.ok(isNodeInRegion(n, requested, () => null));
  }
  assert.deepEqual(isolate(nodes, requested).show, nodes.slice(0, names.length).map(n => n.instanceID));
  assert.deepEqual(isolate(nodes, requested).hide, nodes.slice(names.length).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  assert.ok(matches(names[0], path('iii-ciliary', 'incoming')));
  assert.ok(matches('Short ciliary nerves.l', path('iii-ciliary', 'outgoing')));
  assert.equal(matches('Short ciliary nerves.l', path('iii-ciliary', 'incoming')), null);
});

test('Four cranial autonomic ganglia are individually selectable, not replaced by bundled branch meshes', () => {
  const examples = [
    ['Ciliary ganglion', 'autonomicCiliaryGanglion'],
    ['Pterygopalatine ganglion', 'autonomicPterygopalatineGanglion'],
    ['Otic ganglion', 'autonomicOticGanglion'],
    ['Submandibular ganglion', 'autonomicSubmandibularGanglion'],
  ];
  const names = examples.flatMap(([name]) => [`${name}.l`, `${name}.r`]);
  const nodes = scene([...names, 'Submadinular ganglia nerves.l', 'Trigeminal nerve (Gasserian) ganglion.r']);
  for (const [i, [name, id]] of examples.entries()) {
    assert.ok(skullBaseNervousSource.has(skullBaseName(name)));
    const requested = path('ganglia', id);
    assert.deepEqual(isolate(nodes, requested).show, [i * 2 + 1, i * 2 + 2]);
    for (const side of ['l', 'r']) {
      const n = scene([`${name}.${side}`])[0];
      assert.deepEqual(skullBasePathForGroup(n, requested), requested);
      assert.equal(skullBaseSystemForNode(n), 'nervous');
      assert.equal(isSkullBaseContext(n), false);
    }
  }
  assert.deepEqual(isolate(nodes, path('ganglia')).show, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('VII pathways connect pterygopalatine and submandibular ganglia to available glands through their proper V carriers', () => {
  const lacrimal = ['Greater petrosal nerve.l', 'Vidian nerve (nerve of the pterygoid canal).r',
    'Pterygopalatine ganglion.l', 'Ganglionic branch of maxillary nerve.r', 'Zygomatic nerve.l',
    'Zygomaticotemporal nerve.r', 'Lacrimal nerve.l', 'Greater palatine nerve.r',
    'Nasopalatine nerve.l', 'Lacrimal gland.r', 'Mucosa of nasal cavity'];
  const salivary = ['Chorda tympani.l', 'Lingual nerve.r', 'Submadinular ganglia nerves.l',
    'Submandibular ganglion.r', 'Submandibular gland.l', 'Sublingual gland.r'];
  const nodes = scene([...lacrimal, ...salivary, 'Otic ganglion.l', 'Lesser petrosal nerve.r',
    'Parotid gland.l', 'Unidentified mesh']);
  assert.deepEqual(isolate(nodes, path('vii-petrosal', 'greater-petrosal')).show,
    lacrimal.map((_, i) => i + 1));
  assert.deepEqual(isolate(nodes, path('vii-petrosal', 'chorda-tympani')).show,
    salivary.map((_, i) => lacrimal.length + i + 1));
  assert.equal(matches('Lesser petrosal nerve.r', path('vii-petrosal')), null,
    'Lesser petrosal is IX, not a VII parasympathetic branch');
  assert.ok(matches('Deep petrosal nerve.r', path('vii-petrosal', 'greater-petrosal', 'sympathetic-contributor')));
  assert.equal(matches('Deep petrosal nerve.r', path('vii-petrosal', 'greater-petrosal', 'incoming')), null,
    'The sympathetic contributor must not be called the VII parasympathetic input');
  assert.ok(matches('Facial nerve (VII).l', path('vii-petrosal')));
  assert.equal(matches('Motor nucleus of facial nerve.l', path('vii-petrosal')), null);
  assert.ok(matches('Superior salivatory nucleus.r', path('vii-petrosal')));
  assert.equal(matches('Orbicularis oris muscle.r', path('vii-petrosal')), null);
});

test('VII Show and isolation retain transparent gross brainstem / petrous / sphenoid orientation and the relevant opaque petrosal pathway only', () => {
  const context = ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone.l', 'Sphenoid bone.r'];
  const trunk = ['Facial nerve (VII).l', 'Intermediate nerve.r', 'Geniculate ganglion.l'];
  const petrosal = ['Greater superficial petrosal nerve.l', 'Deep petrosal nerve.r',
    'Vidian nerve (nerve of the pterygoid canal).l', 'Internal carotid artery sympathetic plexus.r',
    'Pterygopalatine ganglion.l'];
  const distal = ['Ganglionic branch of maxillary nerve.r', 'Zygomatic nerve.l', 'Lacrimal nerve.r'];
  const salivary = ['Chorda tympani.l', 'Lingual nerve.r', 'Submadinular ganglia nerves.l', 'Submandibular ganglion.r'];
  const foreground = [...trunk, ...petrosal, ...distal, ...salivary, 'Superior salivatory nucleus.r'];
  const excluded = ['Frontalis muscle.l', 'Orbicularis oris muscle.r', 'Orbital part of orbicularis oculi.l',
    'Palpebral part of orbicularis oculi.r', 'Zygomaticus major muscle.l', 'Buccinator muscle.r',
    'Platysma.l', 'Stylohyoid muscle.r', 'Posterior belly of digastric muscle.l', 'Stapedius muscle.r',
    'Superior rectus muscle.l', 'Masseter muscle.r', 'Stylopharyngeus muscle.l',
    'Temporal branch of facial nerve.r', 'Nerve to stapedius.l', 'Motor nucleus of facial nerve.r',
    'Lesser petrosal nerve.l', 'Otic ganglion.r', 'Iris.l', 'Unknown mesh'];
  const nodes = scene([...context, ...foreground, ...excluded]).map(n => ({ ...n, visible: false }));
  const ids = (names: readonly string[]) => nodes.filter(n => names.includes(n.rawName)).map(n => n.instanceID);
  const contextIds = ids(context);
  for (const [suffix, members] of [
    [[], foreground],
    [['autonomicVII'], [...trunk, ...petrosal]],
    [['greater-petrosal'], [...petrosal, ...distal]],
    [['greater-petrosal', 'incoming'], [petrosal[0], petrosal[2]]],
    [['greater-petrosal', 'sympathetic-contributor'], [petrosal[1], petrosal[3]]],
    [['chorda-tympani'], salivary],
    [['brainstem-nuclei'], ['Superior salivatory nucleus.r']],
  ] as const) {
    const requested = path('vii-petrosal', ...suffix);
    const plan = isolate(nodes, requested);
    assert.deepEqual(new Set(plan.show), new Set([...contextIds, ...ids(members)]), requested.join('/'));
    assert.deepEqual(skullBaseContextIds(nodes, requested), contextIds);
    assert.deepEqual(petrosalAutonomicShowContextIds(nodes, ids(members), requested), contextIds);
    assert.ok(plan.affected.every(n => !n.visible), 'Restore preserves the visibility before isolation');
    assert.ok(ids(excluded).every(id => plan.hide.includes(id)));
    for (const name of foreground) assert.ok(!contextIds.includes(ids([name])[0]), name);
  }
  for (const name of excluded) assert.equal(matches(name, path('vii-petrosal')), null, name);
  for (const requested of [path(), path('vii-petrosal'), path('vii-petrosal', 'autonomicVII')]) {
    const support = petrosalAutonomicShowSupportIds(nodes, ids(trunk), requested);
    assert.deepEqual(new Set([...ids(trunk), ...support]), new Set([...contextIds, ...ids(trunk), ...ids(petrosal)]));
    assert.deepEqual(petrosalAutonomicShowContextIds(nodes, ids(trunk), requested), contextIds);
  }
  assert.equal(matches('Deep petrosal nerve.r', path('vii-petrosal', 'greater-petrosal', 'incoming')), null);
  assert.ok(matches('Deep petrosal nerve.r', path('vii-petrosal', 'greater-petrosal', 'sympathetic-contributor')));
  assert.equal(matches('Temporal bone.l', path('vii-petrosal', 'autonomicVII')), null,
    'Nerve-only Hide must not include retained bones');
});

test('Individual VII/chorda Show restores bilateral gross brainstem and keeps shared carriers in their selected pathway', () => {
  const context = ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r',
    'Medulla oblongata.l', 'Medulla oblongata.r', 'Temporal bone.l', 'Sphenoid bone.r'];
  const names = ['Facial nerve (VII).l', 'Chorda tympani.r', 'Lingual nerve.l',
    'Greater petrosal nerve.r', 'Vidian nerve (nerve of the pterygoid canal).l',
    'Superior salivatory nucleus.r', 'Iris.l', 'Unknown mesh'];
  const nodes = scene([...context, ...names]).map(n => ({ ...n, visible: false }));
  const contextIds = context.map((_, i) => i + 1);
  const id = (name: string) => nodes.find(n => n.rawName === name)!.instanceID;
  for (const [name, requested] of [
    ['Chorda tympani.r', path()],
    ['Greater petrosal nerve.r', path()],
    ['Lingual nerve.l', path('vii-petrosal', 'chorda-tympani', 'incoming')],
    ['Vidian nerve (nerve of the pterygoid canal).l', path('vii-petrosal', 'greater-petrosal', 'incoming')],
    ['Superior salivatory nucleus.r', path('vii-petrosal', 'brainstem-nuclei')],
  ] as const) {
    const support = petrosalAutonomicShowSupportIds(nodes, [id(name)], requested);
    assert.deepEqual(support, contextIds, name);
    assert.deepEqual(petrosalAutonomicShowContextIds(nodes, [id(name)], requested), contextIds, name);
    assert.deepEqual(new Set([id(name), ...support]), new Set([id(name), ...contextIds]));
    assert.ok(!support.includes(id('Iris.l')) && !support.includes(id('Unknown mesh')));
  }
  assert.deepEqual(petrosalAutonomicShowContextIds(nodes, [id('Lingual nerve.l')], path()), contextIds.slice(6),
    'A shared lingual carrier alone does not imply VII');
  assert.deepEqual(petrosalAutonomicShowContextIds(nodes,
    [id('Vidian nerve (nerve of the pterygoid canal).l')], path('sympathetic', 'deep-petrosal')), contextIds.slice(6),
    'A sympathetic Vidian selection must not switch to VII');
  assert.deepEqual(petrosalAutonomicShowContextIds(nodes, [id('Chorda tympani.r')],
    ['advanced-neuroanatomy', 'cranial-nerves', 'vii']), [], 'Other atlases are unchanged');
});

test('IX otic pathway includes Jacobson, tympanic plexus and membrane, lesser petrosal, auriculotemporal and parotid targets', () => {
  const names = ['Glossopharyngeal nerve (IX).l', 'Tympanic nerve (Jacobson).r', 'Tympanic plexus.l',
    'Tympanic membrane.r', 'Lesser petrosal nerve.l', 'Otic ganglion.r', 'Auriculotemporal nerve.l',
    'Parotid gland.l', '(Accessory parotid gland).r', 'Inferior salivatory nucleus.r'];
  const nodes = scene([...names, 'Chorda tympani.l', 'Submandibular ganglion.r', 'Lingual nerve.l',
    'Submandibular gland.r', 'Greater petrosal nerve.l', 'Unidentified mesh',
    'Stylopharyngeus muscle.l', 'Nucleus ambiguus.l', 'Nucleus of solitary tract.r']);
  const requested = path('ix-otic');
  assert.deepEqual(isolate(nodes, requested).show, nodes.slice(0, names.length).map(n => n.instanceID));
  assert.deepEqual(isolate(nodes, requested).hide, nodes.slice(names.length).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  for (const n of nodes.slice(0, names.length)) assert.ok(isNodeInRegion(n, requested, () => null));
});

test('IX overview and subgroups retain transparent gross brainstem and temporal bones for Show and isolation', () => {
  const context = ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone.l', 'Temporal bone.r', 'Sphenoid bone.l'];
  const foreground = ['Glossopharyngeal nerve (IX).l', 'Tympanic nerve (Jacobson).r', 'Tympanic plexus.l',
    'Lesser petrosal nerve.r', 'Otic ganglion.l', 'Auriculotemporal nerve.r', 'Parotid gland.l',
    'Tympanic membrane.r', 'Inferior salivatory nucleus.l'];
  const excluded = ['Greater petrosal nerve.l', 'Deep petrosal nerve.r', 'Facial nerve (VII).l',
    'Chorda tympani.r', 'Submandibular ganglion.l', 'Stylopharyngeus muscle.r', 'Masseter muscle.l',
    'Nucleus ambiguus.r', 'Iris.l', 'Unknown mesh'];
  const nodes = scene([...context, ...foreground, ...excluded]).map(n => ({ ...n, visible: false }));
  const ids = (names: readonly string[]) => nodes.filter(n => names.includes(n.rawName)).map(n => n.instanceID);
  const contextIds = ids(context);
  for (const [suffix, members] of [
    [[], foreground],
    [['incoming'], foreground.slice(0, 4)],
    [['incoming', 'autonomicIX'], [foreground[0]]],
    [['autonomicOticGanglion'], [foreground[4]]],
    [['outgoing'], foreground.slice(5, 7)],
    [['tympanicMembrane'], [foreground[7]]],
    [['brainstem-nuclei'], [foreground[8]]],
  ] as const) {
    const requested = path('ix-otic', ...suffix);
    const plan = isolate(nodes, requested);
    assert.deepEqual(new Set(plan.show), new Set([...contextIds, ...ids(members)]), requested.join('/'));
    assert.deepEqual(skullBaseContextIds(nodes, requested), contextIds);
    assert.deepEqual(petrosalAutonomicShowSupportIds(nodes, ids(members), requested), contextIds);
    assert.deepEqual(petrosalAutonomicShowContextIds(nodes, ids(members), requested), contextIds);
    assert.ok(ids(excluded).every(id => plan.hide.includes(id)));
    assert.ok(plan.affected.every(n => !n.visible), 'Previous-view visibility is preserved');
    assert.ok(ids(members).every(id => !contextIds.includes(id)), 'IX pathway structures are not faded');
    for (const n of nodes.slice(0, context.length)) assert.ok(isNodeInRegion(n, requested, () => null));
  }
  assert.deepEqual(petrosalAutonomicShowSupportIds(nodes, ids([foreground[0]]), path()), contextIds,
    'Showing IX from the category also recovers the hidden brainstem and bones');
  assert.equal(matches('Temporal bone.l', path('ix-otic', 'incoming', 'autonomicIX')), null,
    'Nerve-only Hide does not include temporal context');
});

test('Individual IX tympanic, lesser-petrosal, otic and parotid Show restores bilateral semitransparent brainstem', () => {
  const context = ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r',
    'Medulla oblongata.l', 'Medulla oblongata.r', 'Temporal bone.l', 'Sphenoid bone.r'];
  const uniqueIX = ['Glossopharyngeal nerve (IX).l', 'Tympanic nerve (Jacobson).r', 'Tympanic nerve.l',
    'Tympanic plexus.r', 'Lesser petrosal nerve.l', 'Otic ganglion.r',
    'Parotid gland.l', '(Accessory parotid gland).r', 'Inferior salivatory nucleus.l'];
  const nodes = scene([...context, ...uniqueIX, 'Auriculotemporal nerve.r', 'Lingual nerve.l',
    'Chorda tympani.r', 'Iris.l', 'Unknown mesh']).map(n => ({ ...n, visible: false }));
  const contextIds = context.map((_, i) => i + 1);
  const id = (name: string) => nodes.find(n => n.rawName === name)!.instanceID;
  for (const name of uniqueIX) {
    for (const requested of [path(), path('ix-otic')]) {
      assert.deepEqual(petrosalAutonomicShowSupportIds(nodes, [id(name)], requested), contextIds, name);
      assert.deepEqual(petrosalAutonomicShowContextIds(nodes, [id(name)], requested), contextIds, name);
    }
  }
  for (const [name, requested] of [
    ['Tympanic nerve (Jacobson).r', path('ix-otic', 'incoming', 'tympanicNerve')],
    ['Lesser petrosal nerve.l', path('ix-otic', 'incoming', 'lesserPetrosal')],
    ['Otic ganglion.r', path('ix-otic', 'autonomicOticGanglion')],
    ['Auriculotemporal nerve.r', path('ix-otic', 'outgoing', 'autonomicAuriculotemporal')],
    ['Parotid gland.l', path('ix-otic', 'outgoing', 'autonomicParotidTargets')],
    ['Inferior salivatory nucleus.l', path('ix-otic', 'brainstem-nuclei', 'gve', 'inferior-salivatory')],
  ] as const) {
    assert.deepEqual(petrosalAutonomicShowSupportIds(nodes, [id(name)], requested), contextIds, name);
    assert.deepEqual(petrosalAutonomicShowContextIds(nodes, [id(name)], requested), contextIds, name);
    for (const gross of context.slice(0, 6)) assert.equal(matches(gross, requested), null,
      'Nerve/ganglion-only Hide must not hide the retained brainstem');
  }
  assert.deepEqual(petrosalAutonomicShowContextIds(nodes, [id('Auriculotemporal nerve.r')], path()),
    contextIds.slice(6), 'Do not infer IX from a shared V3 carrier alone');
  assert.deepEqual(petrosalAutonomicShowContextIds(nodes, [id('Otic ganglion.r')], path('ganglia')),
    contextIds.slice(6), 'Preserve an explicitly selected ganglion-only view');
  assert.deepEqual(petrosalAutonomicShowSupportIds(nodes, [id('Lesser petrosal nerve.l')],
    ['advanced-neuroanatomy', 'cranial-nerves', 'ix']), [], 'Other atlases are unchanged');
});

test('V connections preserve the source branches and distinguish V1, V2 and V3 glandular carriers', () => {
  const cases = [
    ['v1-ciliary', ['Ophthalmic nerve.l', 'Nasociliary nerve.r',
      'Communicating branch of right nasociliary nerve to cilliary ganglion.l',
      'Long cilliary nerve.r', 'Ciliary ganglion.l', 'Short ciliary nerves.r']],
    ['v2-pterygopalatine', ['Maxillary nerve.r', 'Trigeminal nerve maxillary n (V).l',
      'Pterygopalatine ganglion.r', 'Lateral posterior superior nasal nerve.l', 'Zygomaticotemporal nerve.r',
      'Greater palatine nerve.l']],
    ['v3-salivary', ['Mandibular nerve.l', 'Auriculotemporal nerve.r', 'Lingual nerve.l',
      'Otic ganglion.r', 'Submandibular ganglion.l']],
  ] as const;
  for (const [id, names] of cases) for (const name of names)
    assert.ok(matches(name, path('v-connections', id)), name);
  for (const name of ['Trigeminal nerve root.l', 'Trigeminal nerve (Gasserian) ganglion.r'])
    assert.ok(matches(name, path('v-connections')), name);
  for (const name of ['Inferior alveolar nerve.l', 'Right masseteric nerve.r', 'Tensor tympani muscle.r',
    'Mesencephalic nucleus of trigeminal nerve.l', 'Zygomaticofacial nerve.r',
    'Lacrimal gland.r', 'Parotid gland.r', 'Submandibular gland.l', 'Sublingual gland.l'])
    assert.equal(matches(name, path('v-connections')), null, name);
});

test('Sympathetic connections use cervical relay, carotid plexuses, deep petrosal and Vidian, never mislabel greater petrosal', () => {
  const names = ['Intermediolateral nucleus', 'Superior cervical sympathetic ganglion.l',
    'Carotid artery symapthetic.r', 'Internal carotid artery sympathetic.l',
    'Deep petrosal nerve.r', 'Vidian nerve (nerve of the pterygoid canal).l',
    'Pterygopalatine ganglion.r', 'Long cilliary nerve.l', 'Lacrimal gland.r'];
  const nodes = scene([...names, 'Greater petrosal nerve.r', 'Superior salivatory nucleus.l',
    'Middle cervical sympathetic ganglion.r', 'Reticular formation brainstem', 'Iris.l']);
  assert.deepEqual(isolate(nodes, path('sympathetic')).show, names.map((_, i) => i + 1));
  assert.deepEqual(isolate(nodes, path('sympathetic')).hide, [10, 11, 12, 13, 14]);
  assert.deepEqual(skullBaseContextIds(nodes, path('sympathetic')), []);
});

test('Sympathetic orbital view combines bilateral pterygopalatine / lacrimal and ciliary routes without inventing a ganglion-to-ganglion relay', () => {
  const bilateral = (names: readonly string[]) => names.flatMap(name => [`${name}.l`, `${name}.r`]);
  const shared = bilateral(['Internal carotid artery sympathetic plexus']);
  const lacrimal = bilateral(['Deep petrosal nerve', 'Vidian nerve (nerve of the pterygoid canal)',
    'Pterygopalatine ganglion', 'Maxillary nerve', 'Trigeminal nerve maxillary n (V)',
    'Ganglionic branch of maxillary nerve', 'Zygomatic nerve', 'Zygomaticotemporal nerve',
    'Communicating branch of zygomatic nerve to lacrimal nerve', 'Lacrimal nerve', 'Lacrimal gland']);
  const ciliary = bilateral(['Ophthalmic nerve', 'Nasociliary nerve',
    'Communicating branch of right nasociliary nerve to cilliary ganglion',
    'Ciliary ganglion', 'Short ciliary nerves', 'Long cilliary nerve']);
  const context = bilateral(['Temporal bone', 'Sphenoid bone']);
  const excluded = ['Iris.l', 'Ciliary body-curve.r', 'Superior rectus muscle.l', 'Orbicularis oris muscle.r',
    'Greater petrosal nerve.l', 'Lesser petrosal nerve.r', 'Otic ganglion.l', 'Submandibular ganglion.r',
    'Greater palatine nerve.l', 'Nasopalatine nerve.r', 'Mucosa of nasal cavity', 'Parotid gland.l',
    'Lacrimal sac.r', 'Lacrimal canaliculus.l', 'Zygomaticofacial nerve.r', 'Lingual nerve.l',
    'Superior cervical sympathetic ganglion.r', 'Intermediolateral nucleus', 'Midbrain', 'Unknown mesh'];
  const nodes = scene([...shared, ...lacrimal, ...ciliary, ...context, ...excluded]).map(n => ({ ...n, visible: false }));
  const ids = (names: readonly string[]) => nodes.filter(n => names.includes(n.rawName)).map(n => n.instanceID);
  const groupPath = path('sympathetic', 'orbital-lacrimal');
  for (const [suffix, members] of [
    [[], [...shared, ...lacrimal, ...ciliary]],
    [['lacrimal-route'], [...shared, ...lacrimal]],
    [['ciliary-route'], [...shared, ...ciliary]],
  ] as const) {
    const requested = [...groupPath, ...suffix];
    const plan = isolate(nodes, requested);
    assert.deepEqual(new Set(plan.show), new Set(ids([...members, ...context])), requested.join('/'));
    assert.deepEqual(skullBaseContextIds(nodes, requested), ids(context));
    assert.deepEqual(petrosalAutonomicShowSupportIds(nodes, ids(members), requested), ids(context));
    assert.ok(ids(excluded).every(id => plan.hide.includes(id)));
    assert.ok(plan.affected.every(n => !n.visible), 'Restore retains the original visibility');
    for (const name of members) assert.ok(matches(name, requested), name);
  }
  assert.equal(matches('Ciliary ganglion.l', [...groupPath, 'lacrimal-route']), null);
  assert.equal(matches('Pterygopalatine ganglion.r', [...groupPath, 'ciliary-route']), null);
  assert.equal(matches('Lacrimal gland.l', [...groupPath, 'ciliary-route']), null);
  assert.equal(matches('Temporal bone.l', groupPath), null, 'Nerve/gland-only Hide excludes retained bones');
  for (const name of excluded) assert.equal(matches(name, groupPath), null, name);
  const group = root.children?.find(g => g.id.endsWith('/sympathetic'))?.children
    ?.find(g => g.id === groupPath.join('/'));
  assert.equal(group?.children?.length, 2, 'Both parallel routes use the shared collection controls');
  assert.match(group!.children![1].label, /not a pterygopalatine-to-ciliary relay/);
});

test('The new whole collection excludes unrelated cranial nerves, cardiac plexuses, unknown geometry and brainstem tracts', () => {
  const nodes = scene(['Facial nerve (VII).l', 'Ciliary ganglion.r', 'Submandibular gland.l',
    'Midbrain', 'Trochlear nerve (IV).r', 'Abducens nerve (VI).l', 'Vagus nerve (X).r',
    'Cardiac plexus', 'Reticular formation brainstem', 'Medial longitudinal fascicle - Fibers to oculomotor nerve.l',
    'Unidentified mesh']);
  assert.deepEqual(isolate(nodes, path()).show, [1, 2, 3, 4]);
  assert.deepEqual(isolate(nodes, path()).hide, [5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(skullBaseContextIds(nodes, path()), [4]);
});

test('The entire autonomic category excludes iris, ocular targets, all muscle targets and unrelated somatic branches', () => {
  const excluded = ['Iris.l', 'Iris.r', 'Ciliary body-curve.l', 'Sphincter pupillae.r', 'Dilator pupillae.l',
    'Superior rectus muscle.l', 'Inferior rectus muscle.r', 'Medial rectus muscle.l', 'Lateral rectus muscle.r',
    'Inferior oblique muscle.l', 'Orbicularis oris muscle.r', 'Orbital part of orbicularis oculi.l',
    'Frontalis muscle.r', 'Platysma.l', 'Masseter muscle.r', 'Tensor tympani muscle.l',
    'Stylopharyngeus muscle.r', 'Stapedius muscle.l', 'Temporalis muscle.r',
    'Superior branch of the oculomotor nerve.l', 'Oculomotr nerve - branch to superior rectus muscle.r',
    'Nerve to stapedius.l', 'Temporal branches of facial nerve.r', 'Buccal branches of facial nerve.l',
    'Inferior alveolar nerve.r', 'Right masseteric nerve.l', 'Anterior division of mandibular nerve.r',
    'Tonsillar branches of glossopharyngeal nerve.l', 'Carotid sinus nerve.r',
    'Motor nucleus of facial nerve.l', 'Nucleus of oculomotor nerve.r', 'Nucleus ambiguus.l'];
  const nodes = scene(['Ciliary ganglion.l', ...excluded]);
  const plan = isolate(nodes, path());
  assert.deepEqual(plan.show, [1]);
  assert.equal(plan.hide.length, excluded.length);
  for (const name of excluded) assert.equal(matches(name, path()), null, name);
});

test('Every pathway and individual ganglion isolation retains only temporal / petrous and sphenoid bones as translucent context', () => {
  const bones = ['Temporal bone.l', 'Temporal bone.r.001', 'Sphenoid bone.l', 'Sphenoid bone.r.001'];
  const nodes = scene([...bones, 'Ciliary ganglion.l', 'Short ciliary nerves.r', 'Iris.l',
    'Superior rectus muscle.r', 'Maxilla.l', 'Unidentified mesh']);
  for (const requested of [path('iii-ciliary'), path('iii-ciliary', 'outgoing'),
    path('ganglia', 'autonomicCiliaryGanglion')]) {
    const expected = requested.at(-1) === 'outgoing' ? 6
      : requested[3] === 'ganglia' ? 5 : null;
    const plan = isolate(nodes, requested);
    assert.deepEqual(new Set(plan.show), new Set([1, 2, 3, 4, ...(expected ? [expected] : [5, 6])]));
    assert.deepEqual(skullBaseContextIds(nodes, requested), [1, 2, 3, 4]);
    for (const n of nodes.slice(0, 4)) {
      assert.equal(skullBaseSystemForNode(n), 'skeletal', 'Correct source-system contamination');
      assert.equal(isSkullBaseContext(n), true);
      assert.ok(isNodeInRegion(n, requested, () => null));
    }
    assert.deepEqual(plan.affected.map(n => n.visible), nodes.map(n => n.visible), 'Restore snapshot stays intact');
  }
  assert.equal(matches(bones[0], path('iii-ciliary', 'outgoing')), null,
    'Bone context must not become nerve-only Show/Hide membership');
  assert.equal(matches('Maxilla.l', path()), null);
  assert.ok(matches('Superior rectus muscle.r', [...SKULL_BASE_ROOT_PATH, 'anterior-fossa-orbit', 'orbit']),
    'Other Skull base categories retain their existing muscles');
});

test('Preganglionic inputs and postganglionic carriers remain distinct in each ganglionic route', () => {
  const examples = [
    [['iii-ciliary'], ['Oculomotor nerve (cisternal and cavernous part).l'], ['Short ciliary nerves.r']],
    [['vii-petrosal', 'greater-petrosal'], ['Greater petrosal nerve.l', 'Vidian nerve.r'],
      ['Zygomaticotemporal nerve.l', 'Lacrimal nerve.r', 'Greater palatine nerve.l']],
    [['vii-petrosal', 'chorda-tympani'], ['Chorda tympani.l'], ['Submadinular ganglia nerves.r']],
    [['ix-otic'], ['Glossopharyngeal nerve (IX).l', 'Tympanic plexus.r', 'Lesser petrosal nerve.l'],
      ['Auriculotemporal nerve.r', 'Parotid gland.l']],
  ] as const;
  for (const [scope, incoming, outgoing] of examples) {
    for (const name of incoming) {
      assert.ok(matches(name, path(...scope, 'incoming')), name);
      assert.equal(matches(name, path(...scope, 'outgoing')), null, name);
    }
    for (const name of outgoing) {
      assert.ok(matches(name, path(...scope, 'outgoing')), name);
      assert.equal(matches(name, path(...scope, 'incoming')), null, name);
    }
  }
  assert.ok(matches('Long cilliary nerve.r', path('sympathetic', 'ciliary')));
  assert.ok(matches('Long cilliary nerve.r', path('iii-ciliary', 'orbital-carriers')));
  assert.equal(matches('Long cilliary nerve.r', path('iii-ciliary', 'outgoing')), null,
    'Long ciliary nerves are parallel sympathetic / sensory carriers, not III parasympathetic output');
});

test('III overview and incoming isolation retain gross brainstem and bones plus opaque orbital and parallel petrosal routes', () => {
  const foreground = ['Oculomotor nerve (cisternal and cavernous part).l',
    'Inferior branch of right oculomotor nerve.r', 'Ciliary ganglion.l', 'Short ciliary nerves.r',
    'Nasociliary nerve.l', 'Communicating branch of right nasociliary nerve to cilliary ganglion.r',
    'Long cilliary nerve.r', 'Internal carotid artery sympathetic plexus.l',
    'Carotid artery Sympathetic plexus.r', 'Greater superficial petrosal nerve.l',
    'Deep petrosal nerve.r', 'Vidian nerve (nerve of the pterygoid canal).l', 'Pterygopalatine ganglion.r'];
  const context = ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone.l', 'Sphenoid bone.r'];
  const excluded = ['Iris.l', 'Superior rectus muscle.r', 'Superior branch of the oculomotor nerve.l',
    'Vagus nerve (X).r', 'Unknown mesh'];
  const nodes = scene([...foreground, ...context, ...excluded]).map(n => ({ ...n, visible: false }));
  const expectedShow = nodes.slice(0, foreground.length + context.length).map(n => n.instanceID);
  const expectedContext = nodes.slice(foreground.length, foreground.length + context.length).map(n => n.instanceID);
  for (const requested of [path('iii-ciliary'), path('iii-ciliary', 'incoming'),
    path('iii-ciliary', 'incoming', 'autonomicIII')]) {
    const plan = isolate(nodes, requested);
    assert.deepEqual(plan.show, expectedShow);
    assert.deepEqual(skullBaseContextIds(nodes, requested), expectedContext);
    assert.equal(plan.hide.length, excluded.length);
    assert.ok(plan.affected.every(n => n.visible === false), 'Restore preserves the actual pre-isolation visibility');
  }
  assert.equal(matches('Greater superficial petrosal nerve.l', path('iii-ciliary', 'incoming')), null);
  assert.ok(matches('Greater superficial petrosal nerve.l', path('iii-ciliary', 'parallel-petrosal')));
  assert.equal(matches('Deep petrosal nerve.r', path('iii-ciliary', 'outgoing')), null);
  assert.deepEqual(skullBaseContextIds(nodes, path('ganglia')), expectedContext.slice(3),
    'The III brainstem-retention rule must not leak to other pathways');
  for (const requested of [path(), path('iii-ciliary'), path('iii-ciliary', 'incoming', 'autonomicIII')]) {
    const support = petrosalAutonomicShowSupportIds(nodes, [1, 2], requested);
    assert.deepEqual([...new Set([1, 2, ...support])], expectedShow, 'Show restores hidden companions as well as gross anatomy');
  }
  assert.deepEqual(petrosalAutonomicShowSupportIds(nodes, [1, 2],
    [...SKULL_BASE_ROOT_PATH, 'anterior-fossa-orbit', 'orbit']), []);
});

test('V and each autonomic subdivision retain translucent temporal / brainstem / trigeminal orientation without muscles or gland targets', () => {
  const context = ['Temporal bone.l', 'Temporal bone.r', 'Sphenoid bone.l',
    'Midbrain', 'Pons', 'Medulla oblongata', 'Trigeminal nerve root.l', 'Trigeminal nerve root.r',
    'Trigeminal nerve (Gasserian) ganglion.l', 'Trigeminal nerve (Gasserian) ganglion.r'];
  const pathways = [
    ['v1-ciliary', ['Ophthalmic nerve.l', 'Nasociliary nerve.r',
      'Communicating branch of right nasociliary nerve to cilliary ganglion.l',
      'Ciliary ganglion.r', 'Short ciliary nerves.l', 'Long cilliary nerve.r']],
    ['v2-pterygopalatine', ['Maxillary nerve.r', 'Ganglionic branch of maxillary nerve.l',
      'Pterygopalatine ganglion.r', 'Zygomatic nerve.l', 'Zygomaticotemporal nerve.r',
      'Lacrimal nerve.l', 'Greater palatine nerve.r', 'Nasopalatine nerve.l']],
    ['v3-salivary', ['Mandibular nerve.l', 'Posterior division of mandibular nerve.r',
      'Auriculotemporal nerve.l', 'Lingual nerve.r', 'Submadinular ganglia nerves.l',
      'Otic ganglion.r', 'Submandibular ganglion.l']],
  ] as const;
  const foreground = pathways.flatMap(([, names]) => [...names]);
  const excluded = ['Iris.l', 'Masseter muscle.r', 'Temporalis muscle.l',
    'Medial pterygoid muscle.r', 'Lateral pterygoid muscle.l', 'Tensor tympani muscle.r',
    'Tensor veli palatini muscle.l', 'Mylohyoid muscle.r', 'Anterior belly of digastric muscle.l',
    'Orbicularis oris muscle.r', 'Stylopharyngeus muscle.l', 'Superior rectus muscle.r',
    'Lacrimal gland.l', 'Parotid gland.r', 'Submandibular gland.l', 'Sublingual gland.r',
    'Inferior alveolar nerve.l', 'Buccal nerve.r', 'Zygomaticofacial nerve.l',
    'Anterior division of mandibular nerve.r', 'Motor nucleus of trigeminal nerve.l', 'Unknown mesh'];
  const nodes = scene([...context, ...foreground, ...excluded]).map(n => ({ ...n, visible: false }));
  const ids = (names: readonly string[]) => nodes.filter(n => names.includes(n.rawName)).map(n => n.instanceID);
  const expectedContext = ids(context);
  for (const [branch, members] of [['', foreground] as const, ...pathways]) {
    const requested = branch ? path('v-connections', branch) : path('v-connections');
    const memberIds = ids(members);
    const plan = isolate(nodes, requested);
    assert.deepEqual(new Set(plan.show), new Set([...expectedContext, ...memberIds]), requested.join('/'));
    assert.deepEqual(skullBaseContextIds(nodes, requested), expectedContext);
    assert.deepEqual(petrosalAutonomicShowContextIds(nodes, memberIds, requested), expectedContext);
    assert.deepEqual(petrosalAutonomicShowSupportIds(nodes, memberIds, requested), expectedContext);
    assert.ok(plan.affected.every(n => n.visible === false), 'Previous-view snapshot is unchanged');
    for (const n of nodes.slice(0, context.length)) assert.ok(isNodeInRegion(n, requested, () => null));
    assert.ok(memberIds.every(id => !expectedContext.includes(id)), 'Autonomic nerves / ganglia stay foreground');
  }
  for (const name of excluded) assert.equal(matches(name, path('v-connections')), null, name);
  assert.equal(matches(context[8], path('v-connections', 'v1-ciliary')), null,
    'Retained Gasserian reference must not become a ciliary-only Hide member');
  assert.ok(!skullBaseContextIds(nodes, path('iii-ciliary')).includes(ids([context[8]])[0]),
    'Gasserian transparency stays local to V');
  assert.deepEqual(petrosalAutonomicShowContextIds(nodes, ids([context[8]]),
    [...SKULL_BASE_ROOT_PATH, 'anterior-fossa-orbit', 'orbit']), []);
  assert.ok(matches('Parotid gland.r', path('ix-otic')), 'Other secretory pathways keep their targets');
});
