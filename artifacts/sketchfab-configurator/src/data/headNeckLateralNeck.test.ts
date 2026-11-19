import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { HEAD_NECK_TOPOGRAPHY_GROUPS, HEAD_NECK_TOPOGRAPHY_MODEL_UID,
  headNeckTopographyPathForGroup as member, headNeckTopographyPathsForNode,
  headNeckTopographySystemForNode } from './headNeckTopography';
import { LATERAL_NECK_ROOT as root, LATERAL_FORAMEN_MAGNUM_PATH as referencePath,
  LATERAL_FORAMEN_MAGNUM_GROUP, FORAMEN_MAGNUM_SOURCE_PATH,
  lateralNeckHiddenLayerIds, isLateralSuboccipitalMuscle } from './headNeckLateralNeck';
import { skullBasePathForGroup, skullBaseContextIds } from './skullBaseTaxonomy';
import { headNeckPetrosalSettings, headNeckContextArguments } from './headNeckPetrosalSettings';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isHeadTopographyNode } from './headTopography';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { headNeckBoneContextIds } from '../lib/headNeckBoneContext';

const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, visible: false, systemId: null, type: 'MatrixTransform',
});
const nodes = (names: string[]) => names.map((name, i) => node(name, i + 1));
const path = (...parts: string[]) => [...root, ...parts];

test('Platysma is absent from every lateral-neck menu and Show all, and hidden by additive/mixed openings', () => {
  const group = HEAD_NECK_TOPOGRAPHY_GROUPS.find(g => g.id === root.join('/'))!;
  const coverings = nodes(['Platysma.l', 'Platysma.r', 'Platisma_L']);
  const visit = (groups: readonly NervousGroup[]) => groups.forEach(g => {
    for (const n of coverings) assert.equal(member(n, g.id.split('/')), null, g.id);
    assert.deepEqual(lateralNeckHiddenLayerIds(coverings, g.id.split('/')), [1, 2, 3]);
    if (g.children) visit(g.children);
  });
  visit([group]);
  assert.deepEqual(menuCollectionNodeIds(coverings, [group], n => headNeckTopographyPathsForNode(n)[0] ?? null, member), []);
  for (const n of coverings)
    assert.ok(member(n, ['advanced-neuroanatomy', 'head-neck-topography', 'anterior-triangle', 'superficial-layers', 'platysma']));
});

test('Investing cervical fascia is opt-in only through the dedicated lateral Fasciae menu, never regional menus or default Show all', () => {
  const group = HEAD_NECK_TOPOGRAPHY_GROUPS.find(g => g.id === root.join('/'))!;
  const fasciae = group.children!.find(g => g.id === path('fasciae').join('/'))!;
  const scene = nodes(['Superficial investing cervical fascia.l', 'Superficial investing cervical fascia.r',
    'Superficial_investing_cervical_fascia_L.001', 'Platysma.l']);
  const visit = (g: NervousGroup) => {
    for (const n of scene.slice(0, 3))
      assert.equal(Boolean(member(n, g.id.split('/'))), g.id === fasciae.id, `${n.rawName}/${g.id}`);
    if (g.children) g.children.forEach(visit);
  };
  visit(group);
  assert.deepEqual(menuCollectionNodeIds(scene, [group],
    n => headNeckTopographyPathsForNode(n)[0] ?? null, member), []);
  assert.deepEqual(menuCollectionNodeIds(scene, [fasciae],
    n => headNeckTopographyPathsForNode(n)[0] ?? null, member), [1, 2, 3]);
  assert.deepEqual(lateralNeckHiddenLayerIds(scene, root), [1, 2, 3, 4]);
  assert.deepEqual(lateralNeckHiddenLayerIds(scene, path('sternocleidomastoid', 'fasciae')), [1, 2, 3, 4]);
  assert.deepEqual(lateralNeckHiddenLayerIds(scene, path('fasciae')), [4]);
  const requested = path('fasciae');
  assert.deepEqual(planRegionIsolation(scene, 'nervous', requested, n => member(n, requested))!.show, [1, 2, 3]);
  for (const n of scene.slice(0, 3))
    assert.ok(member(n, ['advanced-neuroanatomy', 'head-neck-topography', 'anterior-triangle', 'superficial-layers', 'investing-fascia']));
  assert.ok(member(scene[0], ['advanced-neuroanatomy', 'head-neck-topography', 'deep-neck', 'prevertebral', 'fasciae']));
});

test('Sternocleidomastoid region includes the requested nerve overlaps, carotids and jugular drainage', () => {
  for (const [tissue, names] of [
    ['nerves', ['Auriculotemporal nerve.l', 'Auriculo temporal nerve.r', 'Transverse cervical nerve.r',
      'Transversus coli nerve.l', 'Nervus transversus colli.r', 'Supraclavicular nerve.r',
      'Medial supraclavicular nerve.l', 'Great auricular nerve.l', 'Accessory nerve (XI).r']],
    ['arteries', ['Common carotid artery.l', 'Internal carotid artery.r', 'External carotid artery.l', 'Carotid artery.r']],
    ['veins', ['Internal jugular vein.r', 'External jugular vein.l', 'Anterior jugular vein.r', 'Jugular venous arch']],
  ] as const) for (const name of names) {
    const n = node(name);
    assert.ok(member(n, path('sternocleidomastoid', tissue)), name);
    assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n), name);
    assert.equal(headNeckTopographySystemForNode(n), tissue === 'nerves' ? 'nervous' : 'vascular');
  }
});

test('Omoclavicular triangle includes the whole modeled plexus, supraclavicular nerves and subclavian branches/tributaries', () => {
  for (const [tissue, names] of [
    ['nerves', ['Roots of brachial plexus.l', 'Superior trunk of brachial plexus.r', 'Middle trunk.l',
      'Anterior division of upper trunk.r', 'Posterior cord.l', 'Dorsal scapular nerve.l',
      'Long thoracic nerve.r', 'Suprascapular nerve.l', 'Median nerve.r', 'Supraclavicular nerve.l']],
    ['arteries', ['Left subclavian artery', 'Vertebral artery.r', 'Internal thoracic artery.l',
      'Thyrocervical trunk.r', 'Costocervical trunk.l', 'Inferior thyroid artery.r',
      'Ascending cervical artery.l', 'Transverse cervical artery.r', 'Suprascapular artery.l',
      'Dorsal scapular artery.r', 'Deep cervical artery.l', 'Supreme intercostal artery.r',
      '(Deep branch of transverse cervical artery).l', '(Superficial branch of transverse cervical artery).r',
      'Tracheal branches of inferior thyroid artery.l']],
    ['veins', ['Right subclavian vein', 'Left brachiocephalic vein', 'External jugular vein.r',
      'Internal jugular vein.l', 'Anterior jugular vein.l', 'Transverse cervical vein.r',
      'Suprascapular vein.l', 'Dorsal scapular vein.r', 'Deep cervical vein.l',
      'Vertebral vein.r', 'Inferior thyroid vein.l', 'Cephalic vein.r', 'Jugular venous arch']],
  ] as const) for (const name of names) {
    const n = node(name);
    assert.ok(member(n, path('omoclavicular', tissue)), name);
    assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n), name);
  }
  for (const name of ['Pulmonary artery.l', 'Femoral vein.r', 'Superior thyroid artery.l', 'Inferior alveolar nerve.r'])
    assert.equal(member(node(name), path('omoclavicular')), null, name);
});

test('Occipital triangle reuses every reference submenu and its source memberships, not a separately maintained approximation', () => {
  const scene = nodes(['Obliquus superior capitis muscle.l', 'Obliquus inferior capitis muscle.r',
    'Rectus posterior major capitis muscle.l', 'Rectus posterior minor capitis muscle.r',
    'Cervical vertebral venous pleus', 'Sigmoid sinus.r', 'Jugular bulb.l', 'Vertebral artery.r',
    'Glossopharyngeal nerve (IX).l', 'Vagus nerve (X).r', 'Accessory nerve (XI).l',
    'Hypoglossal nerve (XII).r', 'C1 nerve.l', 'Trunk of C2 nerve root.r', 'Occipital bone',
    'Atlas (C1)', 'Axis (C2)', 'Pons', 'Midbrain', 'Medulla oblongata',
    'Superior oblique muscle.r', 'Lumbar vertebral venous plexus', 'Unknown mesh']);
  let found = 0;
  const visit = (g: NervousGroup) => {
    const localPath = g.id.split('/');
    const sourcePath = [...FORAMEN_MAGNUM_SOURCE_PATH, ...localPath.slice(referencePath.length)];
    for (const n of scene) {
      const expected = skullBasePathForGroup(n, sourcePath);
      assert.equal(Boolean(member(n, localPath)), Boolean(expected), `${n.rawName}/${g.label}`);
      if (expected) { found++; assert.ok(member(n, path('occipital-triangle')), n.rawName); }
    }
    if (g.children) g.children.forEach(visit);
  };
  visit(LATERAL_FORAMEN_MAGNUM_GROUP);
  assert.ok(found > 35, String(found));
  const chosen = scene.filter(n => skullBasePathForGroup(n, FORAMEN_MAGNUM_SOURCE_PATH));
  const settings = headNeckPetrosalSettings(scene, chosen.map(n => n.instanceID), referencePath);
  const opaqueMuscleIds = new Set(scene.filter(isLateralSuboccipitalMuscle).map(n => n.instanceID));
  assert.deepEqual(settings.contextIds, skullBaseContextIds(scene, FORAMEN_MAGNUM_SOURCE_PATH).filter(id => !opaqueMuscleIds.has(id)));
  const args = headNeckContextArguments(settings, chosen.map(n => n.instanceID), false);
  assert.equal(args[2], true, 'Keep reference foreground anatomy opaque');
  assert.equal(args[6], true, 'Apply copied transparency despite protected Head/neck source materials');
  assert.deepEqual(args[7], [], 'Use source Skull base context opacity; only bones use atlas-wide refraction');
  assert.ok(settings.skullBaseStyle);
});

test('Four suboccipital muscles are opaque in all lateral-neck selections while bone/brainstem context and original Skull base settings remain unchanged', () => {
  const scene = nodes(['Obliquus superior capitis muscle.l', 'Obliquus superior capitis muscle.r',
    'Obliquus inferior capitis muscle.l', 'Obliquus inferior capitis muscle.r',
    'Rectus posterior major capitis muscle.l', 'Rectus posterior major capitis muscle.r',
    'Rectus posterior minor capitis muscle.l', 'Rectus posterior minor capitis muscle.r',
    'Pons', 'Atlas (C1)', 'Vagus nerve (X).l']);
  assert.deepEqual(scene.filter(isLateralSuboccipitalMuscle).map(n => n.instanceID), [1, 2, 3, 4, 5, 6, 7, 8]);
  for (const p of [root, path('occipital-triangle'), path('occipital-triangle', 'muscles'),
    referencePath, [...referencePath, 'suboccipitalSuperiorOblique'],
    [...referencePath, 'suboccipitalInferiorOblique'], [...referencePath, 'rectusCapitisMajor'],
    [...referencePath, 'rectusCapitisMinor']]) {
    const shownIds = scene.filter(n => member(n, p)).map(n => n.instanceID);
    const muscles = shownIds.filter(id => id <= 8);
    assert.ok(muscles.length, p.join('/'));
    const settings = headNeckPetrosalSettings(scene, shownIds, p);
    for (const merge of [false, true]) {
      const args = headNeckContextArguments(settings, shownIds, merge);
      assert.equal(args[2], true, 'Foreground protection applies to isolation and additive/mixed Show');
      for (const id of muscles) {
        assert.ok(!settings.contextIds.includes(id));
        assert.ok(args[3]?.includes(id), 'Explicitly restore muscle foreground opacity');
        assert.ok(!args[4].includes(id), 'Muscle must not receive transparent priority');
      }
    }
  }
  const context = headNeckPetrosalSettings(scene, scene.map(n => n.instanceID), referencePath).contextIds;
  assert.deepEqual(context, [9, 10], 'Brainstem and upper cervical bones stay transparent');
  const originalContext = skullBaseContextIds(scene, FORAMEN_MAGNUM_SOURCE_PATH);
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) assert.ok(originalContext.includes(id), 'Do not change the separate Skull base atlas');
});

test('Cervical vertebrae have regional bone controls and retain the atlas bone-transparency treatment', () => {
  const scene = nodes(['Atlas (C1)', 'Axis (C2)', 'Vertebra C3', 'Vertebra C4', 'Vertebra C5',
    'Vertebra C6', 'Vertebra C7', 'Vertebra T1']);
  for (const subregion of ['sternocleidomastoid', 'occipital-triangle', 'omoclavicular']) {
    const p = path(subregion, 'bones');
    assert.deepEqual(planRegionIsolation(scene, 'nervous', p, n => member(n, p))!.show, [1, 2, 3, 4, 5, 6, 7]);
    for (const n of scene.slice(0, 7)) assert.equal(headNeckTopographySystemForNode(n), 'skeletal');
    assert.deepEqual(headNeckPetrosalSettings(scene, [1, 2, 3, 4, 5, 6, 7], p).contextIds, [1, 2, 3, 4, 5, 6, 7]);
  }
  assert.deepEqual(headNeckBoneContextIds(HEAD_NECK_TOPOGRAPHY_MODEL_UID, scene), []);
});

test('Lateral Nerves and ganglia includes complete cervical components but excludes lumbar/sacral levels and unrelated cranial nerves', () => {
  for (const name of ['C1 anterior posterior.l', 'C2 anterior root.r', 'C3 posterior root.l',
    'C8 ventral root.r', 'C5 Dorsal root ganglion.l', 'C4 spinal nerve.r', 'Dorsal ramus C3.l',
    'Ventral ramus C5.r', 'Cervical plexus roots.l', 'C1 nerve.r',
    'FJ4263_BP29309_FMA7007_Trunk of C4 nerve.r', 'Phrenic nerve.l',
    'Roots of brachial plexus.r', 'Superior trunk.l', 'Posterior cord.r', 'Accessory nerve (XI).l'])
    assert.ok(member(node(name), path('nerves')), name);
  for (const name of ['L3 anterior root.l', 'S1 spinal nerve.r', 'Sciatic nerve.l', 'Optic nerve (II).r',
    'Nucleus of hypoglossal nerve.l', 'Pons', 'Platysma.l'])
    assert.equal(member(node(name), path('nerves')), null, name);
});

test('Regional isolation, mixed-visibility membership and restoration retain exact region scope', () => {
  const scene = nodes(['Roots of brachial plexus.l', 'Right subclavian artery', 'Left subclavian vein',
    'Supraclavicular nerve.l', 'Vertebra C3', 'Platysma.l', 'Optic nerve (II).r', 'Unknown mesh']);
  const requested = path('omoclavicular');
  const plan = planRegionIsolation(scene, 'nervous', requested, n => member(n, requested))!;
  assert.deepEqual(plan.show, [1, 2, 3, 4, 5]);
  assert.deepEqual(plan.hide, [6, 7, 8]);
  assert.deepEqual(lateralNeckHiddenLayerIds(scene, requested), [6]);
  assert.deepEqual([...captureRegionIsolation(scene, requested, null, null).visibility],
    scene.map(n => [n.instanceID, false]));
});
