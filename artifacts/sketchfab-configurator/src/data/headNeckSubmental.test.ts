import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { SUBMENTAL_PATH as root } from './headNeckSubmental';
import { HEAD_NECK_TOPOGRAPHY_GROUPS, HEAD_NECK_TOPOGRAPHY_MODEL_UID,
  headNeckTopographyPathForGroup as member, headNeckTopographyPathsForNode,
  isHeadNeckTemporalExternalCarotid } from './headNeckTopography';
import { SKULL_BASE_EXTERNAL_CAROTID_NAMES } from './skullBaseExternalCarotid';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isHeadTopographyNode } from './headTopography';
import { headNeckPetrosalSettings, headNeckContextArguments } from './headNeckPetrosalSettings';
import { headNeckBoneContextIds } from '../lib/headNeckBoneContext';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { searchAnatomy } from './anatomySearch';

const anterior = root.slice(0, 3);
const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, visible: false, type: 'MatrixTransform', systemId: null,
});

test('Submental arteries retain the complete reviewed ECA tree including live branch variants, not ICA or pulmonary vessels', () => {
  for (const name of [...SKULL_BASE_EXTERNAL_CAROTID_NAMES, 'Superior thyroid artery', 'Lingual artery',
    'Facial artery', 'Submental artery', 'Mylohyoid branch of inferior alveolar artery', 'External carotid artery',
    'Posterior auricular artery', 'Sphenopalatine artery']) {
    assert.ok(isHeadNeckTemporalExternalCarotid(name), name);
    assert.ok(member(node(name + '.l'), [...root, 'arteries', 'carotid']), name);
    assert.equal(isNodeAllowedInAtlasView(node(name + '.r'), HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(node(name + '.r')), name);
  }
  for (const name of ['Internal carotid artery.l', 'Pulmonary artery.r', 'Middle cerebral artery (M1-segment).l'])
    assert.equal(member(node(name), [...root, 'arteries']), null, name);
});

test('Submental V3 pathway has separate controls for its actual origin chain and does not import sibling mandibular branches', () => {
  for (const [name, part] of [
    ['Mandibular nerve.l', 'mandibular'], ['Mandibular nerve (V3).r', 'mandibular'],
    ['Trigeminal nerve mandibular n (V).l', 'mandibular'],
    ['Posterior division of mandibular nerve.r', 'posterior-division'],
    ['Inferior alveolar nerve.l', 'inferior-alveolar'],
    ['Mylohyoid nerve.r', 'mylohyoid'], ['Nerve to mylohyoid muscle.l', 'mylohyoid'],
  ]) {
    const n = node(name);
    assert.deepEqual(member(n, [...root, 'nerves', 'mandibular-pathway']),
      [...root, 'nerves', 'mandibular-pathway', part], name);
    assert.equal(member(n, [...anterior, 'nerves']), null, 'V3 exception must not repopulate the general cranial inventory');
    assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n), name);
  }
  for (const name of ['Lingual nerve.l', 'Auriculotemporal nerve.r', 'Mental nerve.l',
    'Anterior division of mandibular nerve.r', 'Maxillary nerve.l'])
    assert.equal(member(node(name), [...root, 'nerves', 'mandibular-pathway']), null, name);
});

test('Anterior and submental general cranial groups retain IX–XII and exclude I–VIII without changing Head collections', () => {
  for (const name of ['Glossopharyngeal nerve (IX).l', 'Vagus nerve (X).r', 'Accessory nerve (XI).l',
    'Hypoglossal nerve (XII).r', 'Superior laryngeal nerve.l', 'Right recurrent laryngeal nerve.r'])
    for (const p of [[...anterior, 'nerves', 'cranial'], [...root, 'nerves', 'cranial']])
      assert.ok(member(node(name), p), name);
  for (const name of ['Olfactory nerve.l', 'Optic nerve (II).r', 'Oculomotor nerve (III).l',
    'Trochlear nerve (IV).r', 'Trigeminal nerve (Gasserian) ganglion.l', 'Abducens nerve (VI).r',
    'Facial nerve (VII).l', 'Vestibulocochlear nerve (VIII).r', 'Lingual nerve.l', 'Tensor tympani nerve.r'])
    for (const p of [[...anterior, 'nerves'], [...root, 'nerves', 'cranial']])
      assert.equal(member(node(name), p), null, name);
  assert.ok(member(node('Optic nerve (II).r'), ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'orbit', 'nerves']));
  assert.ok(member(node('Lingual nerve.l'), ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'oral', 'nerves']));
});

test('Cervical roots, spinal nerves and cervical plexus are selectable in the submental region while brainstem remains a separate context group', () => {
  for (const name of ['C1 anterior posterior.l', 'C3 posterior root.r', 'C8 ventral root.l',
    'C2 Dorsal root ganglion.r', 'C4 spinal nerve.l', 'Dorsal ramus C3.r',
    'C1 nerve.l', 'FJ4261_BP29310_FMA7003_Trunk of C2 nerve root.r', 'Cervical plexus roots.l',
    'Great auricular nerve.r', 'Phrenic nerve.l'])
    assert.ok(member(node(name), [...root, 'nerves']), name);
  for (const name of ['Midbrain', 'Pons', 'Medulla oblongata', 'Brainstem']) {
    assert.ok(member(node(name), [...root, 'brainstem-context']), name);
    assert.equal(member(node(name), [...root, 'nerves']), null, name);
  }
});

test('C1–C7 and brainstem are semitransparent, other anatomy stays foreground, and superficial coverings stay optional', () => {
  const scene = ['Mandibular nerve.l', 'Inferior alveolar nerve.l', 'Nerve to mylohyoid muscle.l',
    'Submental artery.l', 'C3 spinal nerve.l', 'Atlas (C1)', 'Axis (C2)', 'Vertebra C3', 'Vertebra C4',
    'Vertebra C5', 'Vertebra C6', 'Vertebra C7', 'Midbrain', 'Pons', 'Medulla oblongata',
    'Platysma.l', 'Superficial investing cervical fascia.r', 'Optic nerve (II).l', 'Unknown mesh']
    .map((name, i) => node(name, i + 1));
  const plan = planRegionIsolation(scene, 'nervous', root, n => member(n, root))!;
  assert.deepEqual(plan.show, Array.from({ length: 15 }, (_, i) => i + 1));
  assert.deepEqual(plan.hide, [16, 17, 18, 19]);
  const settings = headNeckPetrosalSettings(scene, plan.show, root);
  assert.deepEqual(settings.supportIds, [13, 14, 15]);
  assert.deepEqual(new Set(settings.contextIds), new Set([6, 7, 8, 9, 10, 11, 12, 13, 14, 15]));
  assert.deepEqual(headNeckBoneContextIds(HEAD_NECK_TOPOGRAPHY_MODEL_UID, scene), []);
  const args = headNeckContextArguments(settings, plan.show, false);
  assert.equal(args[6], true, 'Override protected source materials for the requested transparent context');
  assert.deepEqual(args[7], settings.contextIds);
  assert.deepEqual([...captureRegionIsolation(scene, root, null, null).visibility], scene.map(n => [n.instanceID, false]));
  const nerveSettings = headNeckPetrosalSettings(scene, [5], [...root, 'nerves']);
  assert.deepEqual(nerveSettings.contextIds, [13, 14, 15]);
});

test('Registered submental menus, Show all and catalogue search expose the new anatomy through the actual submental collections', async () => {
  const anteriorGroup = HEAD_NECK_TOPOGRAPHY_GROUPS.find(g => g.id === anterior.join('/'))!;
  const group = anteriorGroup.children!.find(g => g.id === root.join('/'))!;
  const scene = ['Mandibular nerve.l', 'Inferior alveolar nerve.l', 'Mylohyoid nerve.l',
    'External carotid artery.l', 'Vertebra C3', 'Pons', 'Optic nerve (II).l', 'Platysma.l']
    .map((name, i) => node(name, i + 1));
  assert.deepEqual(menuCollectionNodeIds(scene, group.children!, n => headNeckTopographyPathsForNode(n)[0] ?? null, member), [1, 2, 3, 4, 5, 6]);
  const { results } = await searchAnatomy('inferior alveolar nerve');
  assert.ok(results.some(result => result.destinations.some(destination =>
    destination.atlasId === 'head-neck-topography' && destination.collections.some(label =>
      label.includes('Temporal and infratemporal regions')))));
});
