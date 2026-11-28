import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEAD_NECK_TOPOGRAPHY_GROUPS, HEAD_NECK_TOPOGRAPHY_ROOT as root,
  HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES as sources, HEAD_NECK_TOPOGRAPHY_MODEL_UID,
  headNeckTopographyPathsForNode, headNeckTopographyPathForGroup as pathForGroup,
  headNeckTopographyName,
  isHeadNeckTopographyNode, headNeckTopographySystemForNode,
} from './headNeckTopography';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { captureRegionIsolation, planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { headNeckBoneContextIds } from '../lib/headNeckBoneContext';
import { refractionContextOpacity } from '../lib/materialTransparency';

const node = (rawName: string, instanceID = 1, visible = true): SceneNode => ({
  rawName, name: rawName, instanceID, visible, type: 'MatrixTransform',
  systemId: headNeckTopographySystemForNode({ rawName }),
});
const path = (...parts: string[]) => [...root, ...parts];
const member = (name: string, ...parts: string[]) => pathForGroup(node(name), path(...parts)) !== null;

test('Temporal/infratemporal venous collection includes source veins and explicit live tributaries only', () => {
  const region = ['head', 'temporal-infratemporal', 'veins'];
  const names = ['Superficial temporal veins', 'Maxillary veins', 'Retromandibular vein',
    'Anterior division of retromandibular vein', 'Posterior division of retromandibular vein',
    'Pterygoid venous plexus', 'Pterygoid plexus', 'Deep temporal vein',
    'Anterior deep temporal vein', 'Posterior deep temporal vein', 'Middle temporal vein',
    'Deep facial vein', 'Masseteric vein'];
  for (const name of names) for (const side of ['.l', '.r']) {
    const rawName = name + side;
    assert.ok(member(rawName, ...region), rawName);
    assert.equal(headNeckTopographySystemForNode(node(rawName)), 'vascular');
    assert.ok(isNodeAllowedInAtlasView(node(rawName), HEAD_NECK_TOPOGRAPHY_VIEW));
    assert.ok(!member(rawName, 'head', 'temporal-infratemporal', 'arteries'));
  }
  for (const name of ['Superficial temporal veins.l', 'Maxillary veins.r'])
    assert.ok(sources.some(source => headNeckTopographyName(source.name) === headNeckTopographyName(name)),
      'Existing CSV meshes must be registered');
  assert.ok(member('Superficial temporal veins.l', 'head', 'scalp-face', 'veins'));
  assert.ok(member('Retromandibular vein.r', 'head', 'parotid', 'veins'));
  for (const rawName of ['Pulmonary vein.l', 'Internal jugular vein.l', 'Cavernous sinus.l', 'Maxillary artery.l'])
    assert.ok(!member(rawName, ...region), rawName);
  const nodes = [...names.map((name, i) => node(name + '.l', i + 1)),
    node('Maxillary artery.l', 100), node('Mandibular nerve.l', 101), node('Temporal bone.l', 102)];
  const requested = path(...region);
  const plan = planRegionIsolation(nodes, 'nervous', requested, n => pathForGroup(n, requested))!;
  assert.deepEqual(plan.show, names.map((_, i) => i + 1));
  assert.deepEqual(plan.hide, [100, 101, 102]);
});

test('scalp and superficial face includes temporal and occipital bones with the approved bone refraction', () => {
  const bones = ['Temporal bone.l', 'Temporal bone.r', 'Occipital bone'].map((name, i) => node(name, i + 1));
  const requested = path('head', 'scalp-face', 'bones');
  for (const item of bones) assert.ok(pathForGroup(item, requested), item.rawName);
  assert.ok(member('Temporal bone.l', 'head', 'temporal-infratemporal', 'bones'));
  assert.ok(member('Temporal bone.r', 'head', 'ear', 'bones'));
  assert.ok(member('Occipital bone', 'posterior-neck', 'suboccipital', 'bones'));
  const scene = [...bones, node('Parotid gland.l', 4)];
  assert.deepEqual(planRegionIsolation(scene, 'nervous', requested, item => pathForGroup(item, requested))?.show, [1, 2, 3]);
  assert.deepEqual(headNeckBoneContextIds(HEAD_NECK_TOPOGRAPHY_MODEL_UID, scene), [1, 2, 3]);
  assert.deepEqual(refractionContextOpacity({ id: 'bone', name: 'Bone', channels: {} }), {
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false, useNormalOffset: false,
    ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  });
});

test('dedicated model and all eight shared collection categories are registered', () => {
  assert.equal(HEAD_NECK_TOPOGRAPHY_MODEL_UID, '29052deaffee44c0997dfbcfea4eb219');
  assert.equal(HEAD_NECK_TOPOGRAPHY_VIEW.modelUid, HEAD_NECK_TOPOGRAPHY_MODEL_UID);
  assert.equal(HEAD_NECK_TOPOGRAPHY_VIEW.href, '/atlas/head-neck');
  assert.deepEqual(HEAD_NECK_TOPOGRAPHY_GROUPS.map(group => group.label), [
    'Head', 'Anterior triangle of neck', 'Lateral neck and posterior triangle', 'Deep neck and root of neck',
    'Posterior neck and suboccipital region', 'Glands and salivary ducts', 'Cervical plexus', 'Ansa cervicalis',
  ]);
});

test('all named glands and salivary ducts are discoverable in their dedicated and regional collections', () => {
  const names = [
    ['Parotid gland.l', 'parotid', 'head', 'parotid'],
    ['(Accessory parotid gland).r', 'parotid', 'head', 'parotid'],
    ['Parotid duct.r', 'parotid', 'head', 'oral'],
    ['Submandibular gland.l', 'submandibular', 'anterior-triangle', 'submandibular'],
    ['Submandibular duct.r', 'submandibular', 'head', 'oral'],
    ['Sublingual gland.r', 'sublingual', 'head', 'oral'],
    ['Lacrimal gland.l', 'lacrimal', 'head', 'orbit'],
    ['Thyroid gland', 'thyroid', 'anterior-triangle', 'muscular'],
    ['Superior parathyroid gland.l', 'parathyroid', 'anterior-triangle', 'muscular'],
    ['Inferior parathyroid gland.r', 'parathyroid', 'deep-neck', 'root-of-neck'],
  ];
  for (const [name, gland, region, subdivision] of names) {
    assert.ok(member(name, 'glands', gland, 'organs'), name);
    assert.ok(member(name, region, subdivision, 'organs'), name);
    assert.equal(headNeckTopographySystemForNode({ rawName: name, systemId: 'nervous' }), 'organs');
  }
  assert.ok(!member('Superior parathyroid gland.l', 'glands', 'thyroid', 'organs'));
});

test('updated live gland exports and modeled parotid lobes are retained without admitting unrelated organs or nerves', () => {
  for (const name of ['Parotid_gland_L', 'Parotid gland R.001', 'Parotid gland (superficial lobe).r',
    'Deep lobe of parotid gland.l', 'Submandibular_gland_R.001', 'Lacrimal_gland_L',
    'Superior_parathyroid_gland_R']) {
    const item = node(name);
    assert.ok(isHeadNeckTopographyNode(item), name);
    assert.equal(isNodeAllowedInAtlasView(item, HEAD_NECK_TOPOGRAPHY_VIEW), !/parathyroid/i.test(name), name);
    assert.equal(item.systemId, 'organs', name);
    assert.ok(pathForGroup(item, path('glands')), name);
  }
  for (const name of ['Suprarenal gland.l', 'Seminal gland.r', 'Pituitary gland',
    'Nerve to parotid gland', 'Parotid gland tumor', 'Parotid artery']) {
    assert.ok(!member(name, 'glands', 'parotid', 'organs'), name);
    if (/Suprarenal|Seminal/.test(name)) assert.ok(!isHeadNeckTopographyNode(node(name)), name);
  }
});

test('gland-only isolation shows the new glands while hiding bones, vessels and other regions', () => {
  const scene = [node('Parotid_gland_L', 1), node('Submandibular gland.r', 2),
    node('Facial nerve (VII).l', 3), node('Thyroid gland', 4), node('Frontal bone', 5)];
  const glands = path('glands');
  const all = planRegionIsolation(scene, 'nervous', glands, item => pathForGroup(item, glands));
  assert.deepEqual(all?.show, [1, 2, 4]);
  assert.deepEqual(all?.hide, [3, 5]);
  const parotid = path('glands', 'parotid', 'organs');
  assert.deepEqual(planRegionIsolation(scene, 'nervous', parotid, item => pathForGroup(item, parotid))?.show, [1]);
});

test('every source-backed membership has a real collection path with tissue controls', () => {
  const groups = new Set<string>();
  function visit(items: readonly NervousGroup[]) {
    for (const group of items) { groups.add(group.id); if (group.children) visit(group.children); }
  }
  visit(HEAD_NECK_TOPOGRAPHY_GROUPS);
  assert.ok(sources.length > 300);
  for (const source of sources) {
    const item = node(source.name);
    assert.ok(isHeadNeckTopographyNode(item), source.name);
    for (const p of headNeckTopographyPathsForNode(item)) {
      assert.ok(groups.has(p.join('/')), `${source.name}: ${p.join('/')}`);
      assert.ok(pathForGroup(item, p));
    }
  }
  assert.equal(pathForGroup(node('Facial artery.l'), ['another-atlas']), null);
});

test('anterior neck combines appropriate nerves, arteries, veins and muscular boundaries', () => {
  for (const name of ['Vagus nerve (X).l', 'Hypoglossal nerve (XII).r',
    'Superior laryngeal nerve.l', 'Internal carotid artery.l', 'Internal jugular vein.r',
    'Sternocleidomastoid muscle.l', 'Omohyoid muscle.r']) {
    assert.ok(member(name, 'anterior-triangle', 'carotid'), name);
  }
  assert.ok(member('Submandibular gland.l', 'anterior-triangle', 'submandibular', 'organs'));
  assert.ok(member('Facial artery.r', 'anterior-triangle', 'submandibular', 'arteries'));
  assert.ok(member('Submental vein.l', 'anterior-triangle', 'submental', 'veins'));
  assert.ok(member('Thyroid gland', 'anterior-triangle', 'muscular', 'organs'));
  assert.ok(member('Right recurrent laryngeal nerve.r', 'anterior-triangle', 'muscular', 'nerves'));
});

test('head regional views combine modeled neural and vascular relationships without central nuclei', () => {
  for (const name of ['Optic nerve (II).r', 'Ophthalmic artery.l', 'Superior ophthalmic vein.r',
    'Superior rectus muscle.l', 'Lacrimal gland.r',
    'Oculomotr nerve - branch to superior rectus muscle.l', 'Ciliary ganglion.l']) {
    assert.ok(member(name, 'head', 'orbit'), name);
  }
  for (const name of ['Auriculotemporal nerve.r', 'Inferior alveolar artery.l',
    'Retromandibular vein.r', 'Medial pterygoid muscle.r']) {
    assert.ok(member(name, 'head', 'temporal-infratemporal'), name);
  }
  assert.ok(member('Pterygopalatine ganglion.l', 'head', 'nasal-pterygopalatine', 'nerves'));
  assert.ok(member('Parotid gland.l', 'head', 'parotid', 'organs'));
  assert.ok(member('Lingual nerve.r', 'head', 'oral', 'nerves'));
});

test('cervical plexus has C1–C4 anterior rami, four cutaneous branches and phrenic nerves', () => {
  for (const name of ['C1 nerve.l', 'FJ4261_BP29310_FMA7003_Trunk of C2 nerve root.r',
    'FJ4262_BP29408_FMA7005_Trunk of C3 nerve root.l', 'FJ4263_BP29309_FMA7007_Trunk of C4 nerve.l.001']) {
    assert.ok(member(name, 'cervical-plexus', 'roots', 'nerves'), name);
    assert.ok(member(`${name}_1234`, 'cervical-plexus', 'roots', 'nerves'));
  }
  for (const name of ['FJ4244_BP29533_FMA65416_Supraclavicular nerve.l',
    'FJ4257_BP29547_FMA55173_transverse cervical nerve.r.001',
    'FJ4173_BP29081_FMA65396_Trunk of left great auricular nerve.r',
    'FJ4221_BP28988_FMA65389_Left lesser occipital nerve.l']) {
    assert.ok(member(name, 'cervical-plexus', 'cutaneous', 'nerves'), name);
    assert.ok(member(name, 'lateral-neck'), name);
  }
  assert.ok(member('FJ4157_BP29423_FMA65387_Trunk of left phrenic nerve.r', 'cervical-plexus', 'phrenic'));
  assert.ok(!member('C2 Dorsal root ganglion.r', 'cervical-plexus', 'roots'));
  assert.ok(!member('Dorsal ramus C4.r', 'cervical-plexus', 'roots'));
});

test('ansa cervicalis roots remain distinct, overlap the carotid region and do not mislabel direct C1 targets', () => {
  for (const [name, branch] of [
    ['Superior root ansa cervicali.l', 'superior-root'],
    ['Superior root ansa cervicalis.r', 'superior-root'],
    ['FJ4272_BP29116_FMA55150_Inferior root of ansa cervicalis.l', 'inferior-root'],
  ]) {
    assert.ok(member(name, 'ansa-cervicalis', branch, 'nerves'), name);
    assert.ok(member(name, 'anterior-triangle', 'carotid', 'nerves'), name);
  }
  for (const name of ['Omohyoid muscle.l', 'Sternohyoid muscle.r', 'Sternothyroid muscle.l'])
    assert.ok(member(name, 'ansa-cervicalis', 'targets', 'muscles'), name);
  assert.ok(!member('Thyrohyoid muscle.l', 'ansa-cervicalis', 'targets'));
  assert.ok(!member('Geniohyoid muscle.l', 'ansa-cervicalis', 'targets'));
  assert.ok(member('Hypoglossal nerve (XII).l', 'ansa-cervicalis', 'relations'));
  assert.ok(!member('Hypoglossal nerve (XII).l', 'ansa-cervicalis', 'superior-root'));
  assert.ok(member('Internal jugular vein.l', 'ansa-cervicalis', 'relations'));
});

test('source muscles and vessels may overlap but unrelated whole-body and intracranial objects are excluded', () => {
  assert.ok(member('Sternocleidomastoid muscle.r', 'anterior-triangle'));
  assert.ok(member('Sternocleidomastoid muscle.r', 'lateral-neck'));
  assert.ok(member('Obliquus superior capitis muscle.r', 'posterior-neck', 'suboccipital'));
  assert.ok(!member('Superior oblique muscle.r', 'posterior-neck', 'suboccipital'));
  assert.ok(member('Superior oblique muscle.r', 'head', 'orbit'));
  // All peripheral nerves now belong to the creator's expanded anterior-triangle
  // overview; do not keep the previous whole-atlas median-nerve exclusion.
  assert.ok(member('Median nerve.r', 'anterior-triangle', 'nerves'));
  assert.ok(!member('Median nerve.r', 'head'));
  for (const name of ['Anterior basal segmental artery of left lung.l', 'Lateral occipital artery.l',
    'Middle cerebral artery (M1-segment).r']) {
    assert.ok(member(name, 'deep-neck', 'arteries'), 'Complete live-file inventories must not silently omit named vessels');
    assert.ok(!member(name, 'head'), 'Broad neck-file inventory must not expand specific head regions');
  }
  for (const name of ['Femur.r', 'Rectus femoris muscle.l', 'Thoracic duct',
    'Nucleus of hypoglossal nerve.l', 'Lingual gyrus.l',
    'Spinal trigeminal tract.l', 'Extra-ocular muscles.g', 'Internal axis of eyeball.l',
    'Unidentified mesh', 'Ansa peduncularis Amygdaloseptal fibers.r']) {
    assert.equal(isHeadNeckTopographyNode(node(name)), false, name);
    assert.equal(isNodeAllowedInAtlasView(node(name), HEAD_NECK_TOPOGRAPHY_VIEW), false, name);
  }
});

test('region isolation includes every tissue, strictly hides unknown/out-of-region meshes and snapshots the complete view', () => {
  const scene = [
    node('Hypoglossal nerve (XII).l', 1),
    node('Internal carotid artery.l', 2),
    node('Internal jugular vein.l', 3, false),
    node('Sternocleidomastoid muscle.l', 4),
    node('Femur.r', 5), node('Unidentified mesh', 6),
    node('Inferior rectus muscle.r', 7), node('Superior root ansa cervicalis.r', 8),
  ];
  const requested = path('anterior-triangle', 'carotid');
  const plan = planRegionIsolation(scene, 'nervous', requested, n => pathForGroup(n, requested))!;
  assert.ok(plan);
  assert.deepEqual(plan.show, [1, 2, 3, 4, 8]);
  assert.deepEqual(plan.hide, [5, 6, 7]);
  const snapshot = captureRegionIsolation(plan.affected, requested, null, null);
  assert.equal(snapshot.visibility.size, scene.length);
  assert.equal(snapshot.visibility.get(3), false);
  const onlyArteries = [...requested, 'arteries'];
  assert.deepEqual(planRegionIsolation(scene, 'nervous', onlyArteries, n => pathForGroup(n, onlyArteries))?.show, [2]);
});
