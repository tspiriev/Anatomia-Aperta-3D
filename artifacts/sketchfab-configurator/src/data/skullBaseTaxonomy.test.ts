import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode, SketchfabMaterial } from '../types/sketchfab';
import {
  SKULL_BASE_GROUPS, SKULL_BASE_ROOT_PATH as ROOT, SKULL_BASE_MODEL_UID,
  skullBasePathForGroup as pathFor, skullBaseContextIds, skullBaseSystemForNode, isSkullBaseContext,
  skullBaseBoneTransparencyPlan,
} from './skullBaseTaxonomy';
import { skullBaseVascularSource, skullBaseNervousSource, skullBaseName, skullBaseVesselKind } from './skullBaseSources';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { SKULL_BASE_VIEW, FULL_ANATOMY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { skullBaseOpacity } from '../lib/materialTransparency';
import { formatAnatomicalName } from '../lib/anatomicalDisplayName';
import { BRAINSTEM_GROUP, classifyBrainstemObject } from './brainstemTaxonomy';
import { SKULL_BASE_EXTERNAL_CAROTID_NAMES, isSkullBaseExternalCarotid } from './skullBaseExternalCarotid';

const node = (rawName: string, instanceID = 1, systemId: SceneNode['systemId'] = null): SceneNode =>
  ({ rawName, name: rawName, instanceID, systemId, visible: true, type: 'MatrixTransform' });
const path = (...parts: string[]) => [...ROOT, ...parts];
const matches = (name: string, ...parts: string[]) => Boolean(pathFor(node(name), path(...parts)));

test('redundant anterior glandular branch is excluded bilaterally from anterior fossa without deleting vascular anatomy', () => {
  const exported = 'FJ5024_BP29706_FMA49489_Anterior glandular branch of right supe';
  const variants = [exported, exported.replace('FJ5024', 'J5024'), exported.replace('right', 'left')];
  const requestedPaths = [
    path('anterior-fossa-orbit'),
    path('anterior-fossa-orbit', 'arterial'),
    path('anterior-fossa-orbit', 'arterial', 'externalCarotidBranches'),
  ];
  for (const base of variants) for (const suffix of ['', '.l', '.r', '.l.001', '.r.002']) {
    const n = node(`${base}${suffix}`, 2);
    assert.equal(isSkullBaseExternalCarotid(n.rawName), false, n.rawName);
    for (const requested of requestedPaths) {
      assert.equal(pathFor(n, requested), null, n.rawName);
      assert.equal(isNodeInRegion(n, requested, () => null), false, n.rawName);
      const nodes = [node('External carotid artery.l', 1), n];
      const plan = planRegionIsolation(nodes, 'nervous', requested,
        candidate => advancedNeuroanatomyPathForGroup(candidate, requested))!;
      assert.deepEqual(plan.show, [1]);
      assert.deepEqual(plan.hide, [2]);
    }
  }
  for (const suffix of ['', '.l', '.r', '.l.001', '.r.002']) {
    const n = node(`${exported}${suffix}`);
    assert.ok(skullBaseVascularSource.has(skullBaseName(n.rawName)));
    assert.equal(skullBaseSystemForNode(n), 'vascular');
    assert.ok(pathFor(n, path('vascular', 'arterial')), 'Keep the original vascular-atlas membership');
  }
});

test('seven requested categories and detailed petrous subdivisions use the dedicated model', () => {
  assert.equal(SKULL_BASE_VIEW.modelUid, SKULL_BASE_MODEL_UID);
  assert.deepEqual(SKULL_BASE_GROUPS.map(g => g.label), [
    'Anterior cranial fossa and orbit', 'Middle cranial fossa', 'Temporal bone',
    'Posterior cranial fossa', 'Skull base vascular anatomy', 'Petrosal nerves and autonomic ganglia',
    'Sella and cavernous sinus',
  ]);
  assert.deepEqual(SKULL_BASE_GROUPS.map(g => g.children?.length), [9, 12, 12, 8, 4, 10, 7]);
  assert.deepEqual(SKULL_BASE_GROUPS[2].children?.map(g => g.label), [
    'Petrous Bone and Petrous Apex', 'Internal Acoustic Meatus and Cerebellopontine Angle',
    'Inner Ear and Labyrinth', 'Middle Ear and Tympanic Anatomy', 'Facial Nerve and Petrosal Nerves', 'Petrous Carotid Region',
    'Petrosal Venous Anatomy', 'Jugular Foramen and Cranial Nerves IX–X', 'Surgical Relationships', 'Auditory (Eustachian) tube',
    'Cranial nerve nuclei', 'Carotid artery sympathetic plexus',
  ]);
});

test('source exports preserve nerve memberships and provide the new vascular names', () => {
  assert.ok(skullBaseNervousSource.get(skullBaseName('Cochlear nerve.r'))?.has('NS_CN08_VESTIBULOCOCHLEAR'));
  assert.ok(skullBaseNervousSource.get(skullBaseName('Oculomotor nerve (cisternal and cavernous part).l'))?.has('NS_CN05_TRIGEMINAL'));
  assert.ok(skullBaseVascularSource.has(skullBaseName('Basilar venous plexus clivus')));
  assert.ok(skullBaseVascularSource.has(skullBaseName('Cavernous_Sinus_R')));
});

test('orbit and apex include the requested nerves, ciliary structures and artery branches', () => {
  for (const name of ['Optic nerve (II).r', 'Oculomotor nerve (cisternal and cavernous part).l',
    'Trochlear nerve (IV).r', 'Abducens nerve (VI).l', 'Ophthalmic nerve.r',
    'Ciliary ganglion.l', 'Short ciliary nerves.r', 'Long cilliary nerve.l',
    'Ophthalmic artery.l', 'Central retinal artery.r', 'Short posterior ciliary arteries.l',
    'Supra-orbital artery.r', 'Superior rectus muscle.l']) {
    assert.ok(matches(name, 'anterior-fossa-orbit', 'orbit'), name);
  }
  assert.ok(matches('Optic nerve (II).l', 'anterior-fossa-orbit', 'orbital-apex'));
  assert.ok(matches('Anterior ethmoidal nerve.r', 'anterior-fossa-orbit', 'ethmoidal-region'));
  assert.ok(matches('Posterior ethmoidal artery.l', 'anterior-fossa-orbit', 'ethmoidal-region'));
});

test('anterior cranial fossa exposes scoped arterial and venous collections with cross-system isolation', () => {
  const arterial = ['Ophthalmic artery.l', 'Anterior ethmoidal artery.r', 'Posterior ethmoidal artery.l',
    'Anterior cerebral artery.r', 'Anterior communicating artery', 'Orbitofrontal branches of anterior cerebral artery.l'];
  const venous = ['Superior ophthalmic vein.l', 'Inferior ophthalmic vein.r', 'Orbital veins.j',
    'Superior sagittal sinus', 'Cavernous_Sinus_R', 'Anterior_Intercavernous_Sinus'];
  const requested = path('anterior-fossa-orbit');
  for (const name of arterial) {
    assert.ok(matches(name, 'anterior-fossa-orbit', 'arterial'), name);
    assert.equal(matches(name, 'anterior-fossa-orbit', 'venous'), false, name);
  }
  for (const name of venous) {
    assert.ok(matches(name, 'anterior-fossa-orbit', 'venous'), name);
    assert.equal(matches(name, 'anterior-fossa-orbit', 'arterial'), false, name);
  }
  for (const name of ['Vertebral artery.r', 'Sigmoid sinus.l', 'Internal jugular vein.r'])
    assert.equal(matches(name, 'anterior-fossa-orbit'), false, name);
  const names = [...arterial, ...venous, 'Frontal bone', 'Vertebral artery.r', 'Unidentified mesh'];
  const nodes = names.map((name, i) => node(name, i + 1, name === 'Frontal bone' ? 'skeletal' : 'vascular'));
  const plan = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  assert.deepEqual(plan.show, nodes.slice(0, -2).map(n => n.instanceID));
  assert.deepEqual(plan.hide, nodes.slice(-2).map(n => n.instanceID));
});

test('anterior fossa retains ICA but excludes basilar, PICA and SCA from menus and isolation', () => {
  const requested = path('anterior-fossa-orbit', 'arterial');
  const group = SKULL_BASE_GROUPS[0].children!.find(g => g.id === requested.join('/'))!;
  const examples = [
    ['Internal carotid artery.l', 'carotid', 'Internal carotid artery'],
    ['Internal carotid artery.r', 'carotid', 'Internal carotid artery'],
  ];
  for (const [name, component, label] of examples) {
    assert.ok(skullBaseVascularSource.has(skullBaseName(name)), name);
    assert.equal(group.children?.find(g => g.id.endsWith(`/${component}`))?.label, label);
    for (const scope of [path('anterior-fossa-orbit'), requested, [...requested, component]])
      assert.deepEqual(pathFor(node(name), scope), [...requested, component], name);
    assert.ok(matches(name, 'vascular', 'arterial'), 'Original vascular membership remains');
    assert.equal(matches(name, 'anterior-fossa-orbit', 'venous'), false);
    assert.equal(isSkullBaseContext(node(name)), false, 'Vessels retain source appearance');
  }
  const removed = ['Basilar artery', 'Posterior inferior cerebellar artery.l',
    'Posterior inferior cerebellar artery.r', 'Superior cerebellar artery.l', 'Superior cerebellar artery.r'];
  for (const name of removed) {
    assert.equal(pathFor(node(name), path('anterior-fossa-orbit')), null, name);
    assert.ok(matches(name, 'vascular', 'arterial'), 'Preserve dedicated vascular scope');
    assert.ok(matches(name, 'posterior-fossa'), 'Preserve posterior fossa scope');
  }
  for (const component of ['basilarTrunk', 'pica', 'sca']) {
    assert.ok(!group.children?.some(g => g.id.endsWith(`/${component}`)));
    assert.equal(pathFor(node('Basilar artery'), [...requested, component]), null);
  }
  const excluded = [...removed, 'Posterior cerebral artery.l', 'Posterior cerebral artery.r',
    'Anterior inferior cerebellar artery.l', 'Anterior inferior cerebellar artery.r',
    'Pontine branches of basilar artery', 'Vertebral artery.r', 'Unidentified mesh'];
  const nodes = [...examples.map(([name]) => name), ...excluded].map((name, i) => node(name, i + 1));
  for (const scope of [path('anterior-fossa-orbit'), requested]) {
    const plan = planRegionIsolation(nodes, 'nervous', scope,
      n => advancedNeuroanatomyPathForGroup(n, scope))!;
    assert.deepEqual(plan.show, nodes.slice(0, examples.length).map(n => n.instanceID));
    assert.deepEqual(plan.hide, nodes.slice(examples.length).map(n => n.instanceID));
  }
  for (const component of ['carotid']) {
    const scope = [...requested, component];
    const plan = planRegionIsolation(nodes, 'nervous', scope,
      n => advancedNeuroanatomyPathForGroup(n, scope))!;
    assert.deepEqual(plan.show, examples.flatMap(([, id], i) => id === component ? [i + 1] : []));
  }
});

test('anterior fossa adds the mandible as transparent skeletal anatomy without adding teeth or broadening other fossae', () => {
  const requested = path('anterior-fossa-orbit');
  const mandiblePath = [...requested, 'anterior-skull-base', 'mandible'];
  const group = SKULL_BASE_GROUPS[0].children!.find(g => g.id.endsWith('/anterior-skull-base'))!;
  assert.equal(group.children?.find(g => g.id === mandiblePath.join('/'))?.label, 'Mandible (semitransparent)');
  for (const inheritedSystem of [null, 'nervous', 'skeletal'] as const) {
    const jaw = node('Mandible', 1, inheritedSystem);
    const nodes = [jaw, node('Upper canine.l', 2), node('Internal carotid artery.r', 3),
      node('Basilar artery', 4), node('Unidentified mesh', 5)];
    assert.equal(skullBaseSystemForNode(jaw), 'skeletal');
    assert.ok(isSkullBaseContext(jaw));
    assert.deepEqual(pathFor(jaw, requested), mandiblePath);
    assert.deepEqual(pathFor({ ...jaw, rawName: 'Mandible.001_123' }, mandiblePath), mandiblePath);
    assert.equal(pathFor(jaw, [...requested, 'arterial']), null);
    assert.deepEqual(skullBaseContextIds(nodes, requested), [1]);
    for (const scope of [requested, mandiblePath]) {
      const plan = planRegionIsolation(nodes, 'nervous', scope,
        n => advancedNeuroanatomyPathForGroup(n, scope))!;
      assert.deepEqual(plan.show, scope === requested ? [1, 3] : [1]);
      assert.ok(plan.hide.includes(2), 'No teeth added with mandible');
      assert.ok(plan.hide.includes(4), 'Basilar remains outside this region');
      assert.ok(plan.hide.includes(5));
    }
    assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, [1], false), { contextIds: [], opaqueBoneIds: [1, 2] });
    for (const region of ['middle-fossa', 'petrous-temporal', 'posterior-fossa'])
      assert.equal(pathFor(jaw, path(region)), null);
  }
});

test('anterior fossa external carotid includes the complete source-backed ECA tree and excludes contaminated source collection vessels', () => {
  const requested = path('anterior-fossa-orbit', 'arterial', 'externalCarotidBranches');
  const menu = SKULL_BASE_GROUPS[0].children!.find(g => g.id.endsWith('/arterial'))!;
  assert.equal(menu.children?.find(g => g.id === requested.join('/'))?.label,
    'External carotid artery and all available branches');
  const names = [...SKULL_BASE_EXTERNAL_CAROTID_NAMES];
  const excluded = ['Internal carotid artery.r', 'Vertebral artery.l', 'Basilar artery',
    'Superior cerebellar artery.l', 'Posterior inferior cerebellar artery.r', 'Ophthalmic artery.l',
    'Anterior cerebral artery.l', 'Anterior spinal artery.l', 'Medial occipital artery.r',
    'Lateral occipital artery.l', 'Parieto-occipital artery.r',
    'Anterior basal segmental artery of left lung', 'Inferior thyroid artery.l',
    'External jugular vein.l', 'Maxillary nerve.r', 'Unidentified mesh'];
  const nodes = [...names, ...excluded].map((name, i) => node(name, i + 1));
  assert.equal(names.length, 32);
  for (const n of nodes.slice(0, names.length)) {
    assert.ok(skullBaseVascularSource.has(skullBaseName(n.rawName)), n.rawName);
    assert.ok(isSkullBaseExternalCarotid(n.rawName), n.rawName);
    assert.deepEqual(pathFor(n, requested), requested, n.rawName);
    assert.ok(pathFor(n, path('anterior-fossa-orbit', 'arterial')), n.rawName);
    assert.equal(isSkullBaseContext(n), false, 'All arteries remain opaque');
    assert.ok(matches(n.rawName, 'vascular', 'arterial'), 'Preserve dedicated vascular anatomy');
  }
  for (const name of excluded) {
    assert.equal(isSkullBaseExternalCarotid(name), false, name);
    assert.equal(pathFor(node(name), requested), null, name);
  }
  const plan = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  assert.deepEqual(plan.show, nodes.slice(0, names.length).map(n => n.instanceID));
  assert.deepEqual(plan.hide, nodes.slice(names.length).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  for (const name of ['External carotid artery', 'Facial artery', 'Maxillary artery', 'Inferior alveolar artery',
    'Middle meningeal artery', 'Superficial temporal artery', 'Ascending pharyngeal artery', 'Occipital artery']) {
    for (const side of ['l', 'r']) {
      const n = node(`${name}.${side}.001`);
      assert.deepEqual(pathFor(n, requested), requested, n.rawName);
      assert.equal(matches(n.rawName, 'middle-fossa', 'foramina'), name === 'Middle meningeal artery');
    }
  }
});

test('anterior fossa preserves separate named maxillary sinus-supply artery controls', () => {
  const requested = path('anterior-fossa-orbit', 'arterial');
  const menu = SKULL_BASE_GROUPS[0].children!.find(g => g.id === requested.join('/'))!;
  const examples = [
    ['Maxillary artery', 'maxillary', 'Maxillary artery'],
    ['Infra-orbital artery', 'infraorbitalArteries', 'Infra-orbital arteries'],
    ['Posterior superior alveolar artery', 'posteriorSuperiorAlveolar', 'Posterior superior alveolar arteries'],
    ['Posterior lateral nasal branches of sphenopalatine artery.', 'sphenopalatineBranches',
      'Sphenopalatine artery and nasal/septal branches'],
    ['Posterior septal branches of sphenopalatine artery', 'sphenopalatineBranches',
      'Sphenopalatine artery and nasal/septal branches'],
  ];
  const names = examples.flatMap(([name]) => ['l', 'r'].map(side => `${name}.${side}`));
  const excluded = ['Facial nerve (VII).r', 'Infraorbital nerve.l', 'Unidentified mesh'];
  const nodes = [...names, ...excluded].map((name, i) => node(name, i + 1));
  for (const [name, component, label] of examples) {
    assert.equal(menu.children?.find(g => g.id === [...requested, component].join('/'))?.label, label);
    for (const side of ['l', 'r']) {
      const n = node(`${name}.${side}`);
      assert.ok(skullBaseVascularSource.has(skullBaseName(n.rawName)), n.rawName);
      for (const scope of [path('anterior-fossa-orbit'), requested, [...requested, component]])
        assert.deepEqual(pathFor(n, scope), [...requested, component], n.rawName);
      assert.equal(matches(n.rawName, 'anterior-fossa-orbit', 'venous'), false);
      assert.ok(matches(n.rawName, 'vascular', 'arterial'), 'Original vascular membership stays intact');
      assert.equal(isSkullBaseContext(n), false, 'Arteries retain original materials');
    }
  }
  for (const scope of [path('anterior-fossa-orbit'), requested]) {
    const plan = planRegionIsolation(nodes, 'nervous', scope,
      n => advancedNeuroanatomyPathForGroup(n, scope))!;
    assert.deepEqual(plan.show, nodes.slice(0, names.length).map(n => n.instanceID));
    assert.deepEqual(plan.hide, nodes.slice(names.length).map(n => n.instanceID));
  }
  for (const component of new Set(examples.map(([, id]) => id))) {
    const scope = [...requested, component];
    const plan = planRegionIsolation(nodes, 'nervous', scope,
      n => advancedNeuroanatomyPathForGroup(n, scope))!;
    assert.deepEqual(plan.show, examples.flatMap(([, id], i) => id === component ? [i * 2 + 1, i * 2 + 2] : []));
  }
});

test('anterior fossa adds nasal bones and source facial arteries and veins to the existing sections', () => {
  const requested = path('anterior-fossa-orbit');
  const group = SKULL_BASE_GROUPS.find(g => g.id === requested.join('/'))!;
  for (const [section, component, label] of [
    ['anterior-skull-base', 'nasal', 'Nasal bones'],
    ['arterial', 'facialArteries', 'Facial arteries and branches'],
    ['venous', 'facialVeins', 'Facial veins and tributaries'],
  ]) {
    assert.equal(group.children?.find(g => g.id.endsWith(`/${section}`))?.children
      ?.find(g => g.id.endsWith(`/${component}`))?.label, label);
  }
  const arterial = ['Facial artery.l', 'Facial artery.r', 'Transverse facial artery.l', 'Transverse facial artery.r',
    'Angular artery.l', 'Angular artery.r', 'Superior labial artery.l', 'Inferior labial artery.r', 'Submental artery.l'];
  const venous = ['Facial vein.l', 'Facial vein.r', 'Common facial vein.l', 'Common facial vein.r',
    'Angular vein.l', 'Angular vein.r', 'Superior labial vein.r', 'Inferior labial veins.l', 'Submental vein.r'];
  for (const [names, section, component, other] of [
    [arterial, 'arterial', 'facialArteries', 'venous'], [venous, 'venous', 'facialVeins', 'arterial'],
  ] as const) {
    for (const name of names) {
      assert.ok(skullBaseVascularSource.has(skullBaseName(name)), name);
      assert.deepEqual(pathFor(node(name), path('anterior-fossa-orbit', section)),
        path('anterior-fossa-orbit', section, component), name);
      assert.equal(matches(name, 'anterior-fossa-orbit', other), false, name);
      assert.ok(matches(name, 'vascular', section), 'Full vascular membership is preserved');
      assert.equal(isSkullBaseContext(node(name)), false, 'Vessels retain source appearance');
    }
  }
  const names = ['Nasal bone.l', 'Nasal bone.r', ...arterial, ...venous,
    'Facial nerve (VII).l', 'Branch to angular gyrus.l', 'Occipital bone', 'Unidentified mesh'];
  const nodes = names.map((name, i) => node(name, i + 1));
  for (const n of nodes.slice(0, 2)) {
    assert.deepEqual(pathFor(n, requested), path('anterior-fossa-orbit', 'anterior-skull-base', 'nasal'));
    assert.equal(skullBaseSystemForNode(n), 'skeletal');
    assert.equal(isSkullBaseContext(n), true, 'Nasal bones use existing bone transparency');
    assert.equal(matches(n.rawName, 'middle-fossa'), false);
    assert.equal(matches(n.rawName, 'petrous-temporal'), false);
  }
  const plan = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  assert.deepEqual(plan.show, nodes.slice(0, -4).map(n => n.instanceID));
  assert.deepEqual(plan.hide, nodes.slice(-4).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, requested), [1, 2]);
});

test('anterior fossa keeps semitransparent brainstem inside Orbit and removes standalone brainstem and thalamus', () => {
  const requested = path('anterior-fossa-orbit');
  const group = SKULL_BASE_GROUPS.find(g => g.id === requested.join('/'))!;
  for (const id of ['brainstem', 'thalamus'])
    assert.ok(!group.children?.some(g => g.id === [...requested, id].join('/')));
  const selection = [...requested, 'orbit', 'brainstem'];
  assert.equal(group.children?.find(g => g.id.endsWith('/orbit'))?.children
    ?.find(g => g.id === selection.join('/'))?.label, 'Brainstem gross anatomy (semitransparent)');
  const names = ['Midbrain', 'Pons', 'Medulla oblongata'];
  const nodes = [...names, 'Thalamus.l', 'Thalamus.r', '00_Thalamic_background_core.l', 'Thalamic capsule.r',
    'Caudate nucleus.l', 'Nucleus of hypoglossal nerve.r', '05_Midline_nuclei']
    .map((name, i) => node(name, i + 1, 'nervous'));
  for (const n of nodes.slice(0, names.length)) {
    assert.deepEqual(pathFor(n, requested), selection);
    assert.deepEqual(pathFor(n, selection), selection);
  }
  for (const scope of [requested, [...requested, 'orbit'], selection]) {
    const plan = planRegionIsolation(nodes, 'nervous', scope,
      n => advancedNeuroanatomyPathForGroup(n, scope))!;
    assert.deepEqual(plan.show, [1, 2, 3]);
    assert.deepEqual(plan.hide, nodes.slice(names.length).map(n => n.instanceID));
    assert.deepEqual(skullBaseContextIds(nodes, scope), [1, 2, 3]);
  }
  assert.equal(matches('Thalamus.r', 'middle-fossa'), false, 'Middle fossa thalamus exclusion is preserved');
});

test('anterior fossa exposes trigeminal, oculomotor, trochlear and abducens nuclei through shared functional menus', () => {
  const region = path('anterior-fossa-orbit');
  const root = [...region, 'brainstem-nuclei'];
  const group = SKULL_BASE_GROUPS[0].children!.find(g => g.id === root.join('/'))!;
  assert.equal(group.label, 'Cranial nerve nuclei');
  assert.deepEqual(group.children?.map(g => g.id.split('/').at(-1)), ['gse', 'gve', 'gsa']);
  assert.deepEqual(group.children?.flatMap(g => g.children?.map(c => c.id.split('/').slice(-2).join('/')) ?? []),
    ['gse/oculomotor', 'gse/trochlear', 'gse/abducens', 'gve/edinger-westphal', 'gsa/mesencephalic-trigeminal',
      'gsa/spinal-trigeminal', 'gsa/principal-trigeminal']);
  const examples = [
    ['Nucleus of oculomotor nerve', 'gse', 'oculomotor'],
    ['Nucleus of trochlear nerve', 'gse', 'trochlear'],
    ['Nucleus of abducens nerve', 'gse', 'abducens'],
    ['Accessory nucleus of oculomotor nerve', 'gve', 'edinger-westphal'],
    ['Mesencephalic nucleus of trigeminal nerve', 'gsa', 'mesencephalic-trigeminal'],
    ['Spinal nucleus of trigeminal nerve', 'gsa', 'spinal-trigeminal'],
    ['Principal (pontine) neucleus of trigeminal nerve', 'gsa', 'principal-trigeminal'],
  ];
  const nodes = examples.flatMap(([name]) => ['l', 'r'].map(side => `${name}.${side}`))
    .map((name, i) => node(name, i + 1, 'nervous'));
  for (const [i, [name, functional, nucleus]] of examples.entries()) {
    for (const side of ['l', 'r']) {
      const n = node(`${name}.${side}`);
      assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)), n.rawName);
      const selection = [...root, functional, nucleus];
      for (const scope of [region, root, [...root, functional], selection])
        assert.deepEqual(pathFor(n, scope), selection, n.rawName);
      assert.equal(isSkullBaseContext(n), false, 'Nuclei stay opaque');
      assert.ok(matches(n.rawName, 'middle-fossa', 'brainstem-nuclei'));
      assert.ok(matches(n.rawName, 'posterior-fossa', 'brainstem-nuclei'));
    }
    const selection = [...root, functional, nucleus];
    const plan = planRegionIsolation(nodes, 'nervous', selection,
      n => advancedNeuroanatomyPathForGroup(n, selection))!;
    assert.deepEqual(plan.show, [i * 2 + 1, i * 2 + 2]);
    assert.equal(plan.hide.length, nodes.length - 2);
  }
  const excluded = ['Nucleus of hypoglossal nerve.r', 'Motor nucleus of facial nerve.r',
    'Superior salivatory nucleus.l', 'Vestibular nuclei.l', 'Red nucleus.r', 'Gracile nucleus.l'];
  const all = [...nodes, ...excluded.map((name, i) => node(name, nodes.length + i + 1, 'nervous')),
    node('Midbrain', 100, 'nervous')];
  for (const scope of [region, root]) {
    const plan = planRegionIsolation(all, 'nervous', scope,
      n => advancedNeuroanatomyPathForGroup(n, scope))!;
    assert.deepEqual(plan.show, [...nodes.map(n => n.instanceID), ...(scope === region ? [100] : [])]);
    for (const name of excluded) assert.equal(pathFor(node(name), scope), null, name);
  }
  assert.deepEqual(skullBaseContextIds(all, root), []);
  assert.deepEqual(skullBaseContextIds(all, region), [100]);
});

test('anterior fossa includes all exported peripheral trigeminal nerves and branches without source contaminants', () => {
  const region = path('anterior-fossa-orbit');
  const selection = [...region, 'trigeminalAllBranches'];
  assert.equal(SKULL_BASE_GROUPS[0].children?.find(g => g.id === selection.join('/'))?.label,
    'Trigeminal nerve, ganglia and all available branches');
  const exported = [...skullBaseNervousSource].filter(([name, memberships]) =>
    memberships.has('NS_CN05_TRIGEMINAL') && /nerve|gangli/.test(name)
    && !/oculomotor|oculomotr|nucle|neucle|tract/.test(name)).map(([name]) => name);
  assert.ok(exported.length > 35, 'Whole source-backed branch coverage, not only V1–V3 trunks');
  const elsewhere = ['Anterior division of mandibular nerve.l', 'Anterior division of mandibular nerve.r',
    'Posterior division of mandibular nerve.l', 'Posterior division of mandibular nerve.r',
    'Lingual nerve.l', 'Lingual nerve.r', 'Buccal nerve.l', 'Buccal nerve.r',
    'Tensor tympani nerve.l', 'Tensor tympani nerve.r'];
  const names = [...exported, ...elsewhere];
  const excluded = ['Oculomotor nerve (cisternal and cavernous part).l',
    'Oculomotr nerve - branch to superior rectus m.r', 'Spinal trigeminal tract.r',
    'Principal (pontine) neucleus of trigeminal nerve.l', 'Mesencephalic nucleus of trigeminal nerve.r',
    'Common tendinous ring.r', 'Facial nerve (VII).r', 'Tensor typmani muscle.l',
    'Ophthalmic artery.l', 'Unidentified mesh'];
  const nodes = [...names, ...excluded].map((name, i) => node(name, i + 1, 'nervous'));
  for (const name of names) {
    assert.ok(skullBaseNervousSource.has(skullBaseName(name)), name);
    assert.ok(pathFor(node(name), region), name);
    assert.deepEqual(pathFor(node(name), selection), selection, name);
    assert.equal(isSkullBaseContext(node(name)), false, 'Nerves and ganglia retain source appearance');
  }
  const plan = planRegionIsolation(nodes, 'nervous', selection,
    n => advancedNeuroanatomyPathForGroup(n, selection))!;
  assert.deepEqual(plan.show, nodes.slice(0, names.length).map(n => n.instanceID));
  assert.deepEqual(plan.hide, nodes.slice(names.length).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, selection), []);
  assert.ok(matches('Principal (pontine) neucleus of trigeminal nerve.l',
    'anterior-fossa-orbit', 'brainstem-nuclei', 'gsa', 'principal-trigeminal'),
  'Nuclei remain in their separate collection');
  assert.equal(matches('Lingual nerve.l', 'petrous-temporal'), false, 'Petrous trunk-only scope is unchanged');
});

test('cavernous and trigeminal relationships overlap without changing source taxonomy', () => {
  for (const name of ['Cavernous_Sinus_L', 'Cavernous_Sinus_R', 'Anterior_Intercavernous_Sinus',
    'Posterior_Intercavernous_Sinus', 'Internal carotid artery.r', 'Maxillary nerve.l']) {
    assert.ok(matches(name, 'middle-fossa', 'cavernous-sinus'), name);
  }
  assert.ok(matches('Internal carotid artery.r', 'petrous-temporal', 'petrous-carotid'));
  assert.ok(matches('Internal carotid artery.r', 'vascular', 'arterial'));
  assert.ok(matches('Anterior division of mandibular nerve.l', 'middle-fossa', 'trigeminal-region'));
  assert.ok(matches('Posterior division of mandibular nerve.r', 'middle-fossa', 'foramina'));
});

test('all detailed petrous relationships match modeled bone, nerve, ear and venous anatomy', () => {
  const examples = [
    ['Temporal bone.r', 'petrous-apex'], ['Cochlear nerve.r', 'acoustic-meatus-cpa'],
    ['Cochlea.l', 'inner-ear'], ['Vestibule.r', 'inner-ear'],
    ['Lesser petrosal nerve.l', 'facial-petrosal'], ['Deep petrosal nerve.r', 'facial-petrosal'],
    ['Internal carotid artery.l', 'petrous-carotid'], ['Inferior petrosal sinus.r', 'petrosal-veins'],
    ['Sigmoid sinus.l', 'petrosal-veins'],
    ['Vestibulocochlear nerve (VIII).r.001', 'surgical-relationships'],
  ];
  for (const [name, section] of examples) assert.ok(matches(name, 'petrous-temporal', section), name);
});

test('petrous venous anatomy exposes superior and inferior petrosal sinuses independently with both sides', () => {
  const requested = path('petrous-temporal', 'petrosal-veins');
  const group = SKULL_BASE_GROUPS.find(g => g.id.endsWith('/petrous-temporal'))!.children!
    .find(g => g.id === requested.join('/'))!;
  assert.deepEqual(group.children?.map(g => g.label), [
    'Superior petrosal sinuses', 'Inferior petrosal sinuses', 'Sigmoid sinuses',
    'Jugular bulb (if separately modeled)', 'Internal jugular veins', 'Temporal bone and petrous region',
  ]);
  const names = ['Superior petrosal sinus.l', 'Superior petrosal sinus.r',
    'Inferior petrosal sinus.l', 'Inferior petrosal sinus.r', 'Sigmoid sinus.l', 'Occipital bone', 'Tentorium cerebelli'];
  const nodes = names.map((name, i) => node(name, i + 1, 'vascular'));
  for (const [component, ids] of [
    ['superiorPetrosalSinuses', [1, 2]], ['inferiorPetrosalSinuses', [3, 4]],
  ] as const) {
    const selection = [...requested, component];
    for (const id of ids) {
      assert.ok(skullBaseVascularSource.has(skullBaseName(nodes[id - 1].rawName)));
      assert.deepEqual(pathFor(nodes[id - 1], requested), selection);
      assert.equal(isSkullBaseContext(nodes[id - 1]), false);
    }
    const plan = planRegionIsolation(nodes, 'nervous', selection,
      n => advancedNeuroanatomyPathForGroup(n, selection))!;
    assert.deepEqual(plan.show, [...ids]);
    assert.deepEqual(plan.hide, nodes.filter(n => !ids.some(id => id === n.instanceID)).map(n => n.instanceID));
  }
  const whole = planRegionIsolation(nodes, 'nervous', path('petrous-temporal'),
    n => advancedNeuroanatomyPathForGroup(n, path('petrous-temporal')))!;
  assert.deepEqual(whole.show, [1, 2, 3, 4, 5]);
  assert.deepEqual(whole.hide, [6, 7]);
});

test('petrous temporal collection excludes occipital bone and tentorium throughout its menus and isolated views', () => {
  const requested = path('petrous-temporal');
  const group = SKULL_BASE_GROUPS.find(g => g.id === requested.join('/'))!;
  assert.ok(!JSON.stringify(group).includes('/occipital'));
  assert.ok(!JSON.stringify(group).includes('/tentorium'));
  const removed = ['Occipital bone', 'Occipital bone.l', 'Occipital', 'Sphenoid bone', 'Tentorium cerebelli', 'Tentorium'];
  for (const name of removed) {
    assert.equal(matches(name, 'petrous-temporal'), false, name);
    for (const child of group.children ?? []) assert.equal(pathFor(node(name), child.id.split('/')), null, child.label);
  }
  assert.ok(matches('Occipital bone', 'posterior-fossa', 'foramen-magnum'), 'Unrelated occipital membership remains');
  const nodes = [node('Temporal bone.r', 1, 'skeletal'), node('Sphenoid bone', 2, 'skeletal'),
    node('Facial nerve (VII).l', 3, 'nervous'), node('Occipital bone', 4, 'skeletal'),
    node('Tentorium cerebelli', 5, 'nervous')];
  const plan = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  assert.deepEqual(plan.show, [1, 3]);
  assert.deepEqual(plan.hide, [2, 4, 5]);
});

test('petrous bone includes trigeminal, facial and lower cranial nuclei in existing functional categories', () => {
  const region = path('petrous-temporal');
  const root = [...region, 'brainstem-nuclei'];
  const group = SKULL_BASE_GROUPS[2].children!.find(g => g.id === root.join('/'))!;
  assert.equal(group.label, 'Cranial nerve nuclei');
  assert.deepEqual(group.children?.map(g => g.id.split('/').at(-1)), ['gse', 'sve', 'gve', 'gsa', 'gva-sva']);
  const examples = [
    ['Mesencephalic nucleus of trigeminal nerve', 'gsa', 'mesencephalic-trigeminal'],
    ['Spinal nucleus of trigeminal nerve', 'gsa', 'spinal-trigeminal'],
    ['Principal (pontine) neucleus of trigeminal nerve', 'gsa', 'principal-trigeminal'],
    ['Motor nucleus of facial nerve', 'sve', 'facial'],
    ['Superior salivatory nucleus', 'gve', 'superior-salivatory'],
    ['Nucleus of hypoglossal nerve', 'gse', 'hypoglossal'],
    ['Nucleus ambiguus', 'sve', 'ambiguus'],
    ['Nucleus of accessory nerve', 'sve', 'accessory'],
    ['Inferior salivatory nucleus', 'gve', 'inferior-salivatory'],
    ['Posterior nucleus of vagus nerve', 'gve', 'dorsal-vagus'],
    ['Nucleus of solitary tract', 'gva-sva', 'solitary'],
  ];
  assert.deepEqual(group.children?.flatMap(g => g.children?.map(c => c.id) ?? []).sort(),
    examples.map(([, functional, nucleus]) => [...root, functional, nucleus].join('/')).sort());
  const names = examples.flatMap(([name]) => ['l', 'r'].map(side => `${name}.${side}`));
  const excluded = ['Nucleus of oculomotor nerve.l', 'Nucleus of trochlear nerve.r',
    'Nucleus of abducens nerve.l', 'Accessory nucleus of oculomotor nerve.r',
    'Olive.l', 'Red nucleus.r',
    'Reticular formation brainstem', 'Gracile nucleus.l', 'Unidentified mesh'];
  const nodes = [...names, ...excluded].map((name, i) => node(name, i + 1, 'nervous'));
  for (const [i, [name, functional, nucleus]] of examples.entries()) {
    const selection = [...root, functional, nucleus];
    for (const side of ['l', 'r']) {
      const n = node(`${name}.${side}`);
      assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)), n.rawName);
      for (const scope of [region, root, [...root, functional], selection])
        assert.deepEqual(pathFor(n, scope), selection, n.rawName);
      assert.equal(isSkullBaseContext(n), false, 'Nuclei retain source appearance');
      assert.ok(matches(n.rawName, 'posterior-fossa', 'brainstem-nuclei'), 'Posterior membership preserved');
    }
    const plan = planRegionIsolation(nodes, 'nervous', selection,
      n => advancedNeuroanatomyPathForGroup(n, selection))!;
    assert.deepEqual(plan.show, [i * 2 + 1, i * 2 + 2]);
    assert.deepEqual(plan.hide, nodes.filter(n => !plan.show.includes(n.instanceID)).map(n => n.instanceID));
  }
  for (const scope of [region, root]) {
    const plan = planRegionIsolation(nodes, 'nervous', scope,
      n => advancedNeuroanatomyPathForGroup(n, scope))!;
    assert.deepEqual(plan.show, nodes.slice(0, names.length).map(n => n.instanceID));
    assert.deepEqual(plan.hide, nodes.slice(names.length).map(n => n.instanceID));
    assert.deepEqual(skullBaseContextIds(nodes, scope), []);
  }
  assert.equal(matches('Nucleus of hypoglossal nerve.r', 'middle-fossa'), false,
    'Lower cranial nuclei stay excluded from Middle fossa');
});

test('middle fossa and petrous bone include correctly named tensor tympani and source auditory tubes', () => {
  const muscles = ['Tensor typmani muscle.l', 'Tensor typmani muscle.r', 'Tensor tympani muscle.r.001'];
  const tubes = ['Auditory tube.l', 'Auditory tube.r', 'Eustachian tube.l', 'Pharyngotympanic tube.r'];
  for (const branch of ['middle-fossa', 'petrous-temporal']) {
    const group = SKULL_BASE_GROUPS.find(g => g.id === path(branch).join('/'))!;
    const muscleParts = branch === 'middle-fossa' ? ['trigeminal-region', 'trigeminal'] : ['middle-ear', 'tensorTympaniNerve'];
    assert.equal(group.children?.find(g => g.id.endsWith('/tensorTympani'))?.label, undefined);
    assert.equal(group.children?.find(g => g.id.endsWith('/auditoryTube'))?.label, 'Auditory (Eustachian) tube');
    for (const name of muscles) assert.ok(matches(name, branch, ...muscleParts), name);
    for (const name of tubes) assert.ok(matches(name, branch, 'auditoryTube'), name);
    assert.equal(matches('Tensor tympani nerve.r', branch, 'tensorTympani'), false);
    assert.equal(matches('Tensor veli palatini muscle.l', branch, 'tensorTympani'), false);
    const nodes = [node(muscles[0], 1, 'nervous'), node(tubes[0], 2, 'nervous'), node('Occipital bone', 3, 'skeletal')];
    const plan = planRegionIsolation(nodes, 'nervous', path(branch),
      n => advancedNeuroanatomyPathForGroup(n, path(branch)))!;
    assert.deepEqual(plan.show, [1, 2]);
    assert.deepEqual(plan.hide, [3]);
    assert.deepEqual(skullBaseContextIds(nodes, path(branch)), [1], 'Only the muscle uses semitransparency');
    assert.equal(skullBaseSystemForNode(nodes[0]), 'muscular');
    assert.equal(skullBaseSystemForNode(nodes[1]), 'organs');
  }
  for (const name of ['Tensor typmani muscle.l', 'Tensor typmani muscle.r', 'Auditory tube.l', 'Auditory tube.r']) {
    assert.ok(skullBaseNervousSource.has(skullBaseName(name)), `Export contains ${name}`);
  }
  assert.equal(formatAnatomicalName('Tensor typmani muscle.l'), 'Tensor tympani muscle (Left)');
  assert.equal(formatAnatomicalName('Tensor typmani muscle.r.001'), 'Tensor tympani muscle (Right)');
});

test('posterior fossa includes Tensor tympani directly without a separate muscle control', () => {
  for (const branch of ['posterior-fossa']) {
    const requested = path(branch);
    const selection = [...requested, 'tensorTympani'];
    const group = SKULL_BASE_GROUPS.find(g => g.id === requested.join('/'))!;
    assert.equal(group.children?.find(g => g.id === selection.join('/')), undefined);
    const names = ['Tensor typmani muscle.l', 'Tensor typmani muscle.r',
      'Tensor tympani muscle.r.001', 'Tensor tympani nerve.r', 'Tensor veli palatini muscle.l', 'Unidentified mesh'];
    const nodes = names.map((name, i) => node(name, i + 1, 'nervous'));
    for (const n of nodes.slice(0, 3)) {
      assert.ok(pathFor(n, requested), 'Included in whole collection');
      assert.equal(pathFor(n, selection), null, 'No standalone muscle category');
      assert.equal(skullBaseSystemForNode(n), 'muscular');
      assert.ok(formatAnatomicalName(n.rawName).startsWith('Tensor tympani muscle'));
    }
    const plan = planRegionIsolation(nodes, 'nervous', requested,
      n => advancedNeuroanatomyPathForGroup(n, requested))!;
    assert.deepEqual(plan.show, [1, 2, 3]);
    assert.deepEqual(plan.hide, [4, 5, 6]);
    assert.deepEqual(skullBaseContextIds(nodes, requested), [1, 2, 3]);
  }
});

test('middle cranial fossa excludes thalamus and unrelated basal ganglia from menus and isolation', () => {
  const requested = path('middle-fossa');
  const basal = ['Caudate nucleus.l', 'Putamen.r', 'Globus pallidus externus.l',
    'Globus pallidus internus.r', 'Nucleus accumbens', 'Subthalamic nucleus.l', 'Substantia nigra.r'];
  for (const name of basal) {
    assert.equal(matches(name, 'middle-fossa'), false, name);
    assert.equal(matches(name, 'middle-fossa', 'sphenoid-central'), false, name);
  }
  const group = SKULL_BASE_GROUPS.find(g => g.id === requested.join('/'))!;
  assert.ok(!JSON.stringify(group).includes('basalGanglia'));
  assert.ok(!JSON.stringify(group).includes('/thalamus'));
  for (const name of ['Thalamus.l', 'Thalamus.r', '00_Thalamic_background_core.l', '05_Midline_nuclei']) {
    assert.equal(matches(name, 'middle-fossa'), false, name);
    assert.equal(matches(name, 'middle-fossa', 'sphenoid-central'), false, name);
  }
  const nodes = [node('Thalamus.r', 1, 'nervous'), node('Sphenoid bone', 2, 'skeletal'),
    ...basal.map((name, i) => node(name, i + 3, 'nervous'))];
  const plan = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  assert.deepEqual(plan.show, [2]);
  assert.deepEqual(plan.hide, [1, ...basal.map((_, i) => i + 3)]);
});

test('middle cranial fossa keeps gross brainstem transparent and its separate nuclear anatomy opaque', () => {
  const requested = path('middle-fossa');
  const brainstem = path('middle-fossa', 'brainstem');
  const group = SKULL_BASE_GROUPS.find(g => g.id === requested.join('/'))!;
  assert.equal(group.children?.find(g => g.id === brainstem.join('/'))?.label, 'Brainstem gross anatomy (semitransparent)');
  const nodes = ['Midbrain', 'Pons', 'Medulla oblongata', 'Caudate nucleus.l', 'Nucleus of abducens nerve.r']
    .map((name, i) => node(name, i + 1, 'nervous'));
  for (const n of nodes.slice(0, 3)) assert.deepEqual(pathFor(n, brainstem), brainstem);
  assert.deepEqual(skullBaseContextIds(nodes, requested), [1, 2, 3]);
  for (const selection of [requested, brainstem]) {
    const plan = planRegionIsolation(nodes, 'nervous', selection,
      n => advancedNeuroanatomyPathForGroup(n, selection))!;
    assert.deepEqual(plan.show, selection === requested ? [1, 2, 3, 5] : [1, 2, 3]);
    assert.deepEqual(plan.hide, selection === requested ? [4] : [4, 5]);
  }
});

test('middle fossa retains VII and VIII and excludes lower cranial nuclei and olive', () => {
  const requested = path('middle-fossa');
  const nuclear = [...requested, 'brainstem-nuclei'];
  const group = SKULL_BASE_GROUPS.find(g => g.id === requested.join('/'))!;
  for (const [component, label, names] of [
    ['facial', 'Facial nerve (VII)', ['Facial nerve (VII).l', 'Facial nerve (VII).r']],
    ['vestibulocochlear', 'Vestibulocochlear, cochlear and vestibular nerves',
      ['Vestibulocochlear nerve (VIII).l', 'Vestibulocochlear nerve (VIII).r.001',
        'Cochlear nerve.l', 'Cochlear nerve.r', 'Vestibular nerve.l', 'Vestibular nerve.r']],
  ] as const) {
    const selection = [...requested, component];
    assert.equal(group.children?.find(g => g.id === selection.join('/'))?.label, label);
    const nodes = [...names, 'Reticular formation brainstem', 'Nucleus of hypoglossal nerve.r',
      'Olive.l', 'Facial nerve (VII).l', 'Vestibulocochlear nerve (VIII).l']
      .map((name, i) => node(name, i + 1, 'nervous'));
    for (const n of nodes.slice(0, names.length)) {
      assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)));
      assert.deepEqual(pathFor(n, requested), selection);
      assert.deepEqual(pathFor(n, selection), selection);
      assert.equal(isSkullBaseContext(n), false);
      assert.equal(pathFor(n, nuclear), null);
    }
    const plan = planRegionIsolation(nodes, 'nervous', selection,
      n => advancedNeuroanatomyPathForGroup(n, selection))!;
    const expected = nodes.filter(n => names.some(name => skullBaseName(name) === skullBaseName(n.rawName)))
      .map(n => n.instanceID);
    assert.deepEqual(plan.show, expected);
    assert.deepEqual(skullBaseContextIds(nodes, selection), []);
  }
  const lower = ['Nucleus of hypoglossal nerve', 'Nucleus ambiguus', 'Nucleus of accessory nerve',
    'Inferior salivatory nucleus', 'Posterior nucleus of vagus nerve', 'Nucleus of solitary tract'];
  const menu = JSON.stringify(group.children?.find(g => g.id === nuclear.join('/')));
  for (const id of ['hypoglossal', 'ambiguus', 'accessory', 'inferior-salivatory', 'dorsal-vagus', 'solitary'])
    assert.ok(!menu.includes(`/${id}"`), id);
  for (const name of lower) for (const side of ['l', 'r']) {
    const n = node(`${name}.${side}`);
    assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)));
    for (const scope of [requested, nuclear, ...group.children!.map(g => g.id.split('/'))])
      assert.equal(pathFor(n, scope), null, `${name}: ${scope.join('/')}`);
    assert.ok(matches(n.rawName, 'posterior-fossa', 'brainstem-nuclei'), 'Posterior scope unchanged');
  }
  const nodes = ['Olive.l', 'Olive.r', 'Midbrain', 'Motor nucleus of facial nerve.l',
    'Vestibular nuclei.r', 'Nucleus of hypoglossal nerve.r', 'Reticular formation brainstem']
    .map((name, i) => node(name, i + 1, 'nervous'));
  const plan = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  assert.deepEqual(plan.show, [3, 4, 5]);
  assert.deepEqual(plan.hide, [1, 2, 6, 7]);
  assert.deepEqual(skullBaseContextIds(nodes, requested), [3]);
  assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, [3], false).contextIds, [3]);
  assert.ok(!JSON.stringify(group).includes('/olive"'));
  assert.equal(matches('Olive.l', 'middle-fossa'), false);
  for (const region of ['anterior-fossa-orbit', 'posterior-fossa', 'petrous-temporal', 'vascular'])
    assert.equal(matches('Olive.l', region), false, 'Other Skull base scopes remain unchanged');
});

for (const region of ['middle-fossa', 'posterior-fossa']) {
test(`${region} includes only cranial nerve nuclei in the existing functional categories`, () => {
  const requested = path(region, 'brainstem-nuclei');
  const source = BRAINSTEM_GROUP.children!.find(group => group.id.endsWith('/nuclei'))!;
  const group = SKULL_BASE_GROUPS.find(group => group.id.endsWith(`/${region}`))!.children!
    .find(group => group.id === requested.join('/'))!;
  assert.equal(group.label, 'Cranial nerve nuclei');
  assert.deepEqual(group.children?.map(group => group.label),
    source.children?.filter(group => !group.id.endsWith('/other')
      && !(region === 'middle-fossa' && group.id.endsWith('/gva-sva'))).map(group => group.label));
  const names = [...skullBaseNervousSource.keys()].filter(name => {
    const p = classifyBrainstemObject(name);
    return p?.[2] === 'nuclei' && p[3] !== 'other'
      && !(region === 'middle-fossa'
        && ['hypoglossal', 'ambiguus', 'accessory', 'inferior-salivatory', 'dorsal-vagus', 'solitary'].includes(p[4]))
      && !['gracile', 'cuneate', 'accessory-cuneate', 'lateral-lemniscus'].includes(p[4]);
  });
  assert.ok(names.length >= (region === 'middle-fossa' ? 11 : 17),
    'Retains the requested direct cranial nerve motor and sensory nuclei, not non-CN relay nuclei');
  for (const name of names) {
    const sourcePath = classifyBrainstemObject(name)!;
    const expected = [...requested, ...sourcePath.slice(3)];
    assert.deepEqual(pathFor(node(name), requested), expected, name);
    assert.deepEqual(pathFor(node(name), expected), expected, `Individual nuclear selection: ${name}`);
    assert.deepEqual(pathFor(node(name), path(region)), expected, `Whole-region selection: ${name}`);
    assert.equal(isSkullBaseContext(node(name)), false, `Cranial nerve nuclei stay opaque: ${name}`);
  }
  const nodes = [...names, 'Thalamus.r', 'Caudate nucleus.l', 'Midbrain', 'Vestibular nerve fibers to nuclei.l']
    .map((name, i) => node(name, i + 1, 'nervous'));
  const plan = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  assert.deepEqual(plan.show, names.map((_, i) => i + 1));
  assert.deepEqual(plan.hide, nodes.slice(names.length).map(node => node.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, requested), []);
  assert.equal(matches('Substantia nigra pars compacta.l', region, 'brainstem-nuclei', 'other', 'substantia-nigra', 'compacta'), false);
  assert.equal(matches('Red nucleus.l', 'anterior-fossa-orbit'), false);
  assert.equal(matches('Red nucleus.l', 'petrous-temporal'), false);
});
}

test('Skull base keeps reticular formation excluded and removes tectal and other non-cranial nuclei from its collections', () => {
  const reticular = ['Reticular formation brainstem', 'Reticular formation brainstem.l',
    'Reticular formation brainstem.r.001', 'Brainstem reticular formation'];
  const paths: string[][] = [[...ROOT]];
  const visit = (groups: typeof SKULL_BASE_GROUPS) => {
    for (const group of groups) {
      paths.push(group.id.split('/'));
      if (group.children) visit([...group.children]);
    }
  };
  visit(SKULL_BASE_GROUPS);
  assert.ok(!JSON.stringify(SKULL_BASE_GROUPS).includes('/reticular'));
  for (const name of reticular) {
    const n = node(name);
    assert.equal(isNodeAllowedInAtlasView(n, SKULL_BASE_VIEW), false, `Excluded from opening/show-all scope: ${name}`);
    assert.equal(isNodeAllowedInAtlasView(n, FULL_ANATOMY_VIEW), true, 'Other atlas scopes are unchanged');
    assert.equal(isSkullBaseContext(n), false);
    for (const selection of paths) assert.equal(pathFor(n, selection), null, `${name}: ${selection.join('/')}`);
  }
  assert.equal(classifyBrainstemObject('Reticular formation brainstem')?.at(-1), 'reticular',
    'Shared Brainstem atlas taxonomy is not altered');
  const nodes = ['Superior colliculus.l', 'Superior colliculus.r', 'Inferior colliculus.l', 'Inferior colliculus.r',
    'Red nucleus.l', 'Reticular formation brainstem', 'Nucleus of oculomotor nerve.l']
    .map((name, i) => node(name, i + 1, 'nervous'));
  for (const n of nodes.slice(0, 4)) assert.equal(isSkullBaseContext(n), true, n.rawName);
  for (const selection of paths) {
    const expected = nodes.slice(0, 4).filter(n => pathFor(n, selection)).map(n => n.instanceID);
    assert.deepEqual(skullBaseContextIds(nodes, selection), expected, selection.join('/'));
  }
  for (const region of ['middle-fossa', 'posterior-fossa']) {
    const requested = path(region, 'brainstem-nuclei');
    const plan = planRegionIsolation(nodes, 'nervous', requested,
      n => advancedNeuroanatomyPathForGroup(n, requested))!;
    assert.deepEqual(plan.show, [7]);
    assert.deepEqual(plan.hide, [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(skullBaseContextIds(nodes, requested), []);
    assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, [1, 2, 3, 4], false).contextIds, [1, 2, 3, 4],
      'Turning bone transparency off does not make colliculi opaque');
    const group = SKULL_BASE_GROUPS.find(g => g.id.endsWith(`/${region}`))!;
    assert.ok(!JSON.stringify(group).includes('Superior colliculus'));
    assert.ok(!JSON.stringify(group).includes('Inferior colliculus'));
  }
});

test('all Skull base nuclear scopes reject non-cranial relay nuclei while retaining source principal trigeminal nuclei', () => {
  const excluded = ['Superior colliculus', 'Inferior colliculus', 'Reticular formation brainstem',
    'Red nucleus', 'Substantia nigra pars compacta', 'Substantia nigra pars reticularis',
    'Superior olivary complex', 'Periaqueductal gray matter', 'Ventral tegmental area',
    'Nucleus of Darkschewitsch', 'Interstitial nucleus of Cajal', 'Gracile nucleus', 'Cuneate nucleus',
    'Accessory Cuneate nucleus', 'N. of the lateral lemniscus'];
  for (const region of ['middle-fossa', 'posterior-fossa']) {
    const root = path(region, 'brainstem-nuclei');
    const menu = SKULL_BASE_GROUPS.find(g => g.id === path(region).join('/'))!.children!
      .find(g => g.id === root.join('/'))!;
    const paths: string[][] = [path(region), root];
    const walk = (groups: NonNullable<typeof menu.children>) => {
      for (const group of groups) {
        paths.push(group.id.split('/'));
        if (group.children) walk(group.children);
      }
    };
    walk(menu.children!);
    for (const name of excluded) for (const p of paths) {
      assert.equal(pathFor(node(`${name}.r`), p), null, `${name}: ${p.join('/')}`);
      assert.equal(pathFor(node(`${name}.l.001`), p), null, `${name}: ${p.join('/')}`);
    }
    for (const side of ['l', 'r']) {
      const n = node(`Principal (pontine) neucleus of trigeminal nerve.${side}`);
      assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)));
      assert.deepEqual(pathFor(n, root), [...root, 'gsa', 'principal-trigeminal']);
      assert.deepEqual(pathFor(n, [...root, 'gsa', 'principal-trigeminal']),
        [...root, 'gsa', 'principal-trigeminal']);
      assert.equal(isSkullBaseContext(n), false);
    }
  }
  assert.ok(BRAINSTEM_GROUP.children!.find(g => g.id.endsWith('/nuclei'))!.children!
    .some(g => g.id.endsWith('/other')), 'Other atlases retain their complete shared nuclear taxonomy');
  assert.equal(classifyBrainstemObject('Superior colliculus.l')?.at(-1), 'superior-colliculus');
});

test('middle cranial fossa exposes regional venous anatomy independently and keeps it in whole-collection isolation', () => {
  const requested = path('middle-fossa');
  const venousPath = path('middle-fossa', 'venous');
  const veins = ['Cavernous_Sinus_L', 'Cavernous_Sinus_R', 'Anterior_Intercavernous_Sinus',
    'Posterior_Intercavernous_Sinus', 'Superior petrosal sinus.l', 'Inferior petrosal sinus.r',
    'Sphenoid venous plexus', 'FJ5194_BP28746_FMA50984_Right superficial middle cerebral vein', 'Sigmoid sinus.l'];
  const others = ['Internal carotid artery.r', 'Internal jugular vein.r',
    'Basilar venous plexus clivus', 'Caudate nucleus.l'];
  assert.equal(SKULL_BASE_GROUPS.find(g => g.id === requested.join('/'))?.children
    ?.find(g => g.id === venousPath.join('/'))?.label, 'Venous Anatomy');
  for (const name of veins) {
    assert.ok(matches(name, 'middle-fossa', 'venous'), name);
    assert.ok(matches(name, 'vascular', 'venous'), `Original vascular membership: ${name}`);
    assert.equal(isSkullBaseContext(node(name, 1, 'vascular')), false, name);
  }
  for (const name of others) assert.equal(matches(name, 'middle-fossa', 'venous'), false, name);
  const nodes = [...veins, ...others].map((name, i) => node(name, i + 1, 'vascular'));
  const plan = planRegionIsolation(nodes, 'nervous', venousPath,
    n => advancedNeuroanatomyPathForGroup(n, venousPath))!;
  assert.deepEqual(plan.show, veins.map((_, i) => i + 1));
  assert.deepEqual(plan.hide, others.map((_, i) => veins.length + i + 1));
  const whole = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  for (const id of plan.show) assert.ok(whole.show.includes(id));
});

test('posterior fossa exposes all four requested sinus groups with source-backed transverse naming', () => {
  const requested = path('posterior-fossa', 'venous');
  const group = SKULL_BASE_GROUPS.find(g => g.id.endsWith('/posterior-fossa'))!.children!
    .find(g => g.id === requested.join('/'))!;
  assert.equal(group.label, 'Venous Anatomy');
  assert.deepEqual(group.children?.map(g => g.label), [
    'Sigmoid sinuses', 'Transverse sinuses', 'Superior petrosal sinuses', 'Inferior petrosal sinuses',
  ]);
  const examples = [
    ['Sigmoid sinus.l', 'sigmoid'], ['Sigmoid sinus.r', 'sigmoid'],
    ['FJ5222_BP28771_FMA50764_Right transverse sinus', 'transverseSinuses'],
    ['Superior petrosal sinus.l', 'superiorPetrosalSinuses'], ['Superior petrosal sinus.r', 'superiorPetrosalSinuses'],
    ['Inferior petrosal sinus.l', 'inferiorPetrosalSinuses'], ['Inferior petrosal sinus.r', 'inferiorPetrosalSinuses'],
  ];
  for (const [name, component] of examples) {
    assert.ok(skullBaseVascularSource.has(skullBaseName(name)), name);
    assert.deepEqual(pathFor(node(name), requested), [...requested, component], name);
    assert.ok(matches(name, 'posterior-fossa'), name);
    assert.ok(matches(name, 'vascular', 'venous'), 'Original vascular membership remains');
    assert.equal(isSkullBaseContext(node(name)), false);
  }
  const other = ['Cavernous_Sinus_R', 'Superior sagittal sinus', 'Basilar artery', 'Occipital bone'];
  const nodes = [...examples.map(([name]) => name), ...other].map((name, i) => node(name, i + 1, 'vascular'));
  const plan = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  assert.deepEqual(plan.show, examples.map((_, i) => i + 1));
  assert.deepEqual(plan.hide, nodes.slice(examples.length).map(n => n.instanceID));
  for (const component of ['sigmoid', 'transverseSinuses', 'superiorPetrosalSinuses', 'inferiorPetrosalSinuses']) {
    const selection = [...requested, component];
    const selected = planRegionIsolation(nodes, 'nervous', selection,
      n => advancedNeuroanatomyPathForGroup(n, selection))!;
    assert.deepEqual(selected.show, examples.flatMap(([, id], i) => id === component ? [i + 1] : []));
  }
});

test('vascular anatomy includes all identifiable arterial and venous source structures without changing regional scopes', () => {
  const vascular = path('vascular');
  const group = SKULL_BASE_GROUPS.find(g => g.id === vascular.join('/'))!;
  assert.deepEqual(group.children?.map(g => g.label), ['Arterial Anatomy', 'Venous Anatomy', 'Bones (semitransparent)',
    'Cerebellum — whole (semitransparent)']);
  const names = [...skullBaseVascularSource.keys()].filter(name => skullBaseVesselKind(name));
  assert.ok(names.length > 400, 'Whole-set source coverage, intersected with actual runtime nodes by the shared menu');
  for (const name of names) {
    const kind = skullBaseVesselKind(name)!;
    assert.ok(matches(name, 'vascular', kind), `Included ${kind} vessel: ${name}`);
    assert.equal(matches(name, 'vascular', kind === 'arterial' ? 'venous' : 'arterial'), false, name);
    assert.equal(isSkullBaseContext(node(name)), false, name);
  }
  for (const name of ['Branch to angular gyrus.l', 'Posterior temporal branch.r', 'Anterior temporal branch.l',
    'Distal lateral striate branches.r', 'Common carotid artery.l', 'External carotid artery.r',
    'Ascending pharyngeal artery.l', 'Occipital artery.r', 'Thoracic aorta', 'Coeliac trunk']) {
    assert.equal(skullBaseVesselKind(name), 'arterial', name);
  }
  for (const name of ['Cervical vertebral venous pleus', 'Thoracic vertebral venosu plexus', '????????']) {
    assert.equal(skullBaseVesselKind(name), 'venous', name);
  }
  assert.equal(skullBaseVesselKind('??????'), 'venous', 'Creator-identified small cardiac vein alias');
  assert.equal(skullBaseSystemForNode(node('??????')), 'vascular');
  for (const name of ['?x.l', 'HCS_Bundle_of_His', 'Interatrial septum.j', 'Occipital bone', 'Unidentified mesh']) {
    assert.equal(skullBaseVesselKind(name), null, name);
    assert.equal(matches(name, 'vascular'), name === 'Occipital bone', name);
  }
  const nodes = ['Common carotid artery.l', 'Branch to angular gyrus.r', 'Superior petrosal sinus.l',
    'Thoracic vertebral venosu plexus', 'Occipital bone', '?x.l'].map((name, i) => node(name, i + 1, 'vascular'));
  for (const [scope, show] of [[vascular, [1, 2, 3, 4, 5]], [path('vascular', 'arterial'), [1, 2]],
    [path('vascular', 'venous'), [3, 4]]] as const) {
    const plan = planRegionIsolation(nodes, 'nervous', scope,
      n => advancedNeuroanatomyPathForGroup(n, scope))!;
    assert.deepEqual(plan.show, [...show]);
    assert.deepEqual(plan.hide, nodes.filter(n => !show.some(id => id === n.instanceID)).map(n => n.instanceID));
  }
  assert.equal(matches('Common carotid artery.l', 'anterior-fossa-orbit'), false);
  assert.equal(matches('Thoracic vertebral venosu plexus', 'posterior-fossa'), false);
});

test('vascular anatomy includes mandible and all source teeth even when their inherited system is missing or nervous', () => {
  const names = ['Mandible', ...['Upper', 'Lower'].flatMap(jaw =>
    ['canine', 'medial incisor', 'lateral incisor', 'first premolar', 'second premolar',
      'first molar tooth', 'second molar tooth'].flatMap(tooth =>
      ['l', 'r'].map(side => `${jaw} ${tooth}.${side}`)))];
  const vascular = path('vascular'), bones = path('vascular', 'bones');
  for (const system of [null, 'nervous'] as const) {
    const dental = names.map((name, i) => node(name, i + 1, system));
    const nodes = [...dental, node('Internal carotid artery.r', 30, 'vascular'),
      node('Cavernous_Sinus_R', 31, 'vascular'), node('Inferior alveolar nerve.r', 32, 'nervous')];
    const ids = dental.map(n => n.instanceID);
    for (const n of dental) {
      assert.equal(skullBaseSystemForNode(n), 'skeletal', n.rawName);
      assert.deepEqual(pathFor(n, vascular), bones, n.rawName);
      assert.deepEqual(pathFor(n, bones), bones, n.rawName);
      assert.equal(pathFor(n, path('vascular', 'arterial')), null);
      assert.equal(pathFor(n, path('vascular', 'venous')), null);
      for (const region of ['anterior-fossa-orbit', 'middle-fossa', 'petrous-temporal', 'posterior-fossa'])
        assert.deepEqual(pathFor(n, path(region)), region === 'anterior-fossa-orbit' && n.rawName === 'Mandible'
          ? path('anterior-fossa-orbit', 'anterior-skull-base', 'mandible') : null,
        'Only the requested mandible is added to anterior fossa; other regional scopes remain unchanged');
      assert.equal(skullBaseSystemForNode({ ...n, rawName: `${n.rawName}.001` }), 'skeletal');
    }
    for (const selection of [vascular, bones]) {
      const isolation = planRegionIsolation(nodes, 'nervous', selection,
        n => advancedNeuroanatomyPathForGroup(n, selection))!;
      assert.deepEqual(isolation.show, selection === vascular ? [...ids, 30, 31] : ids);
      assert.ok(isolation.hide.includes(32));
      assert.deepEqual(skullBaseContextIds(nodes, selection), ids);
    }
    const off = skullBaseBoneTransparencyPlan(nodes, ids, false);
    assert.deepEqual(off.contextIds, []);
    assert.deepEqual(off.opaqueBoneIds, ids);
    assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, off.contextIds, true).contextIds, ids);
  }
  for (const name of ['Mandibular nerve.l', 'Inferior alveolar nerve.r', 'Superior alveolar artery.r',
    'Branch to canine tooth', 'Masseter muscle.r'])
    assert.notEqual(skullBaseSystemForNode(node(name, 1, 'nervous')), 'skeletal', name);
});

test('vascular anatomy includes actual model bones as semitransparent context with separate bone controls', () => {
  const vascular = path('vascular');
  const bones = path('vascular', 'bones');
  const nodes = [node('Frontal bone', 1, 'skeletal'), node('Occipital bone', 2, 'skeletal'),
    node('Parietal bone.r', 3, 'skeletal'), node('Mandible', 4, 'skeletal'),
    node('Internal carotid artery.r', 5, 'vascular'), node('Cavernous_Sinus_R', 6, 'vascular'),
    node('Caudate nucleus.l', 7, 'nervous'), node('Unidentified mesh', 8)];
  for (const n of nodes.slice(0, 4)) {
    assert.deepEqual(pathFor(n, vascular), bones);
    assert.deepEqual(pathFor(n, bones), bones);
    assert.equal(pathFor(n, path('vascular', 'arterial')), null, 'Arterial scope stays vessel-only');
    assert.equal(pathFor(n, path('vascular', 'venous')), null, 'Venous scope stays vessel-only');
  }
  for (const [scope, show] of [[vascular, [1, 2, 3, 4, 5, 6]], [bones, [1, 2, 3, 4]]] as const) {
    const plan = planRegionIsolation(nodes, 'nervous', scope,
      n => advancedNeuroanatomyPathForGroup(n, scope))!;
    assert.deepEqual(plan.show, [...show]);
    assert.deepEqual(skullBaseContextIds(nodes, scope), [1, 2, 3, 4], 'Only bones receive semitransparency');
  }
  const context = skullBaseContextIds(nodes, vascular);
  assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, context, false),
    { contextIds: [], opaqueBoneIds: [1, 2, 3, 4] });
  assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, [], true),
    { contextIds: [1, 2, 3, 4], opaqueBoneIds: [] });
  assert.equal(matches('Occipital bone', 'petrous-temporal'), false, 'Petrous exclusion remains intact');
});

test('posterior fossa retains only trigeminal root and Gasserian ganglion, excluding all oculomotor nerves', () => {
  const region = path('posterior-fossa');
  const group = SKULL_BASE_GROUPS.find(g => g.id === region.join('/'))!;
  const permitted = ['Trigeminal nerve root.l', 'Trigeminal nerve root.r',
    'Trigeminal nerve (Gasserian) ganglion.l', 'Trigeminal nerve (Gasserian) ganglion.r'];
  const excluded = [...skullBaseNervousSource].filter(([name, memberships]) =>
    memberships.has('NS_CN05_TRIGEMINAL') && !/nucle|neucle/.test(name)
    && !permitted.some(raw => skullBaseName(raw) === name)).map(([name]) => name);
  assert.ok(excluded.some(name => /oculomotor/.test(name)), 'Covers misfiled III source nerves');
  assert.ok(excluded.some(name => /oculomotr/.test(name)), 'Covers misspelled III source nerves');
  assert.ok(excluded.some(name => /maxillary/.test(name)), 'Covers V2 trunk and branches');
  assert.ok(excluded.some(name => /motor root/.test(name)), 'Only the requested trigeminal nerve root remains');
  const paths = [region];
  const walk = (groups: typeof SKULL_BASE_GROUPS) => {
    for (const child of groups) {
      paths.push(child.id.split('/'));
      if (child.children) walk([...child.children]);
    }
  };
  walk([...group.children!]);
  for (const name of excluded) for (const scope of paths)
    assert.equal(pathFor(node(name), scope), null, `${name}: ${scope.join('/')}`);
  const nodes = [...permitted, ...excluded].map((name, i) => node(name, i + 1, 'nervous'));
  for (const section of ['clivus-petroclival', 'cpa']) {
    const scope = [...region, section];
    const selection = [...scope, 'trigeminalRootGanglion'];
    assert.equal(group.children?.find(g => g.id === scope.join('/'))?.children
      ?.find(g => g.id === selection.join('/'))?.label, 'Trigeminal nerve root and Gasserian ganglion');
    for (const n of nodes.slice(0, permitted.length)) {
      assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)));
      assert.deepEqual(pathFor(n, scope), selection);
      assert.equal(isSkullBaseContext(n), false);
    }
    for (const requested of [region, scope, selection]) {
      const plan = planRegionIsolation(nodes, 'nervous', requested,
        n => advancedNeuroanatomyPathForGroup(n, requested))!;
      assert.deepEqual(plan.show, [1, 2, 3, 4]);
      assert.deepEqual(plan.hide, nodes.slice(4).map(n => n.instanceID));
    }
  }
  assert.ok(matches('Oculomotor nerve (cisternal and cavernous part).l', 'anterior-fossa-orbit', 'orbit'));
  assert.ok(matches('Maxillary nerve.l', 'anterior-fossa-orbit', 'trigeminalAllBranches'));
  assert.ok(matches('Maxillary nerve.l', 'middle-fossa', 'trigeminal-region'));
  assert.equal(matches('Maxillary nerve.l', 'petrous-temporal', 'petrous-carotid'), false);
  assert.ok(matches('Nucleus of oculomotor nerve.l', 'posterior-fossa', 'brainstem-nuclei'),
    'Separate nuclear collection is unchanged');
});

test('posterior fossa regions include their requested cross-system anatomy', () => {
  for (const [name, section] of [
    ['Basilar artery', 'clivus-petroclival'], ['Basilar venous plexus clivus', 'clivus-petroclival'],
    ['Abducens nerve (VI).r', 'clivus-petroclival'], ['Facial nerve (VII).l', 'cpa'],
    ['Glossopharyngeal nerve (IX).l', 'jugular-foramen'], ['Vagus nerve (X).r.002', 'jugular-foramen'],
    ['Accessory nerve (XI).r', 'jugular-foramen'], ['Internal jugular vein.l', 'jugular-foramen'],
    ['Occipital bone', 'foramen-magnum'], ['Vertebral artery.r', 'foramen-magnum'],
    ['Hypoglossal nerve (XII).l', 'foramen-magnum'], ['Atlas (C1)', 'foramen-magnum'],
  ]) assert.ok(matches(name, 'posterior-fossa', section), name);
});

test('foraminal regions use real bone meshes, not invented separate foramina', () => {
  assert.ok(matches('Sphenoid bone', 'middle-fossa', 'foramina'));
  assert.ok(matches('Middle meningeal artery.r.001', 'middle-fossa', 'foramina'));
  for (const name of ['Foramen ovale marker', 'Foramen rotundum', 'Annulus of Zinn landmark', 'Petrosal approach simulation']) {
    assert.equal(matches(name), false, name);
  }
});

test('cross-system isolation hides unknown and out-of-region meshes and supports selection membership', () => {
  const nodes = [node('Cochlea.l', 1, 'organs'), node('Temporal bone.r', 2, 'skeletal'),
    node('Cochlear nerve.r', 3, 'nervous'), node('Femur.l', 4, 'skeletal'), node('Unidentified mesh', 5)];
  const requested = path('petrous-temporal', 'inner-ear');
  const plan = planRegionIsolation(nodes, 'nervous', requested,
    n => advancedNeuroanatomyPathForGroup(n, requested))!;
  assert.deepEqual(plan.show, [1, 2]);
  assert.deepEqual(plan.hide, [3, 4, 5]);
  assert.ok(isNodeInRegion(nodes[0], requested, () => null));
  assert.ok(isNodeAllowedInAtlasView(nodes[4], SKULL_BASE_VIEW), 'source opening retains unknown meshes');
});

test('muscles, bones, brainstem, basal ganglia and thalamus are transparent, not nerves or vessels', () => {
  const names = ['Frontal bone', 'Inferior oblique muscle.r', 'Midbrain', 'Pons', 'Medulla oblongata',
    'Caudate nucleus.l', 'Putamen.r', 'Globus pallidus externus.l', 'Nucleus accumbens',
    'Thalamus.r', '00_Thalamic_background_core.l'];
  for (const name of names) assert.ok(isSkullBaseContext(node(name)), name);
  for (const name of ['Facial nerve (VII).l', 'Internal carotid artery.r', 'Cochlea.r', 'Cavernous_Sinus_R']) {
    assert.equal(isSkullBaseContext(node(name)), false, name);
  }
  const nodes = [node('Temporal bone.r', 1), node('Pons', 2), node('Facial nerve (VII).l', 3)];
  assert.deepEqual(skullBaseContextIds(nodes, path('petrous-temporal', 'acoustic-meatus-cpa')), [1, 2]);
  assert.equal(skullBaseSystemForNode(node('Cavernous_Sinus_R')), 'vascular');
});

test('screenshot refraction is exact, scoped to skull base and does not mutate source materials', () => {
  const material = { id: 'source', name: 'source', channels: { Opacity: { enable: false, factor: 1 } } } as SketchfabMaterial;
  const before = JSON.stringify(material);
  const opacity = skullBaseOpacity(SKULL_BASE_MODEL_UID, material)!;
  assert.deepEqual(opacity, { enable: true, factor: 0.133, type: 'refraction', invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false, useNormalOffset: false,
    ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true });
  assert.equal(JSON.stringify(material), before);
  assert.equal(skullBaseOpacity('another-atlas', material), undefined);
});
