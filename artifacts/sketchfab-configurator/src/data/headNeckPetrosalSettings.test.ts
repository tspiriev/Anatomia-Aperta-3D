import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { headNeckPetrosalSettings } from './headNeckPetrosalSettings';
import { petrosalAutonomicShowSupportIds, petrosalAutonomicShowContextIds } from './skullBasePetrosalAutonomic';
import { HEAD_NECK_TOPOGRAPHY_GROUPS } from './headNeckTopographyRegions';

const names = ['Temporal bone.l', 'Sphenoid bone', 'Pons', 'Midbrain', 'Medulla oblongata',
  'Trigeminal nerve (V).l', 'Trigeminal ganglion.l', 'Facial nerve (VII).r',
  'Glossopharyngeal nerve (IX).r', 'Oculomotor nerve (III).l', 'Ciliary ganglion.l',
  'Greater petrosal nerve.r', 'Deep petrosal nerve.r', 'Vidian nerve.r',
  'Pterygopalatine ganglion.r', 'Lacrimal nerve.l', 'Masseter muscle.l', 'Iris.l', 'Hip bone.l'];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, name: rawName, rawName, visible: false, type: 'MatrixTransform', systemId: null,
}));
const head = ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'scalp-face', 'nerves'];
const petrosal = ['advanced-neuroanatomy', 'skull-base', 'petrosal-autonomic'];

test('Existing Head nerves reuse exact Petrosal support and transparent context', () => {
  for (const id of [6, 8, 9, 10, 11, 12]) {
    const sourcePath = id === 6 ? [...petrosal, 'v-connections'] : petrosal;
    const settings = headNeckPetrosalSettings(nodes, [id], head);
    assert.deepEqual(settings.supportIds, petrosalAutonomicShowSupportIds(nodes, [id], sourcePath));
    assert.deepEqual(settings.contextIds, petrosalAutonomicShowContextIds(nodes, [id], sourcePath));
    for (const excluded of [17, 18, 19]) assert.ok(!settings.supportIds.includes(excluded));
    assert.deepEqual(nodes.filter(n => n.visible), [], 'Planning does not mutate the previous view');
  }
});

test('V carriers retain transparent V/Gasserian orientation, not opaque autonomic relays', () => {
  const settings = headNeckPetrosalSettings(nodes, [16], head);
  assert.ok(settings.contextIds.includes(6));
  assert.ok(settings.contextIds.includes(7));
  assert.ok(settings.contextIds.includes(3));
  assert.ok(!settings.contextIds.includes(11));
  assert.ok(!settings.contextIds.includes(15));
});

test('Temporal/infratemporal nerves and the whole regional collection reuse Petrosal settings', () => {
  const region = [...head.slice(0, 3), 'temporal-infratemporal'];
  const regionalNodes: SceneNode[] = ['Posterior division of mandibular nerve.l', 'Auriculotemporal nerve.r',
    'Temporal bone.l', 'Sphenoid bone', 'Pons', 'Trigeminal ganglion.l',
    'Maxillary veins.r', 'Masseter muscle.r'].map((rawName, i) => ({
      instanceID: i + 101, rawName, name: rawName, visible: false, type: 'MatrixTransform', systemId: null,
    }));
  const ids = regionalNodes.map(n => n.instanceID);
  const nerveSettings = headNeckPetrosalSettings(regionalNodes, [101, 102], [...region, 'nerves']);
  assert.ok(nerveSettings.contextIds.includes(105), 'Gross brainstem context is retained');
  assert.ok(nerveSettings.contextIds.includes(106), 'V/Gasserian reference is transparent');
  assert.deepEqual(headNeckPetrosalSettings(regionalNodes, ids, region), nerveSettings);
  assert.ok(!nerveSettings.supportIds.includes(107), 'Veins are regional members, not nerve companions');
  assert.ok(!nerveSettings.supportIds.includes(108), 'No muscle targets added');
});

test('Hide, other tissues, neck regions and other atlases do not gain support or new subgroups', () => {
  for (const path of [[...head.slice(0, 4), 'bones'], [...head.slice(0, 2), 'deep-neck', 'prevertebral', 'nerves'], petrosal])
    assert.deepEqual(headNeckPetrosalSettings(nodes, [8], path), { supportIds: [], contextIds: [] });
  assert.deepEqual(headNeckPetrosalSettings(nodes, [], head), { supportIds: [], contextIds: [] });
  assert.ok(!JSON.stringify(HEAD_NECK_TOPOGRAPHY_GROUPS).includes('petrosal-autonomic'));
});
