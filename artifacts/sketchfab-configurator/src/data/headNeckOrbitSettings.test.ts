import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { headNeckPetrosalSettings } from './headNeckPetrosalSettings';
import { SKULL_BASE_ORBIT_PATH } from './headNeckOrbitSettings';
import { skullBaseContextIds, skullBasePathForGroup } from './skullBaseTaxonomy';
import { headNeckTopographyPathForGroup, headNeckTopographyName, HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES } from './headNeckTopography';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation } from '../lib/regionIsolation';

const orbit = ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'orbit'];
const names = ['Frontal bone.l', 'Sphenoid bone', 'Superior rectus muscle.l', 'Pons',
  'Optic nerve (II).l', 'Oculomotor nerve (cisternal and cavernous part).l',
  'Ciliary ganglion.l', 'Cavernous_Sinus_L', 'Cavernous_Sinus_R',
  'Anterior_Intercavernous_Sinus', 'Posterior_Intercavernous_Sinus',
  'Ophthalmic artery.l', 'Accessory nucleus of oculomotor nerve.l',
  'Trigeminal nerve (Gasserian) ganglion.l', 'Deep petrosal nerve.l',
  'Masseter muscle.l', 'Superior sagittal sinus', 'Pulmonary vein.l'];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', systemId: null, visible: false,
}));

test('Head Orbit overview matches source Skull base Orbit anatomy and context exactly', () => {
  const settings = headNeckPetrosalSettings(nodes, [1, 5, 8], orbit);
  assert.deepEqual(settings.supportIds, nodes.filter(n => skullBasePathForGroup(n, SKULL_BASE_ORBIT_PATH)).map(n => n.instanceID));
  assert.deepEqual(settings.contextIds, skullBaseContextIds(nodes, SKULL_BASE_ORBIT_PATH));
  assert.deepEqual(settings.contextIds, [1, 2, 3, 4]);
  for (const id of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) assert.ok(settings.supportIds.includes(id));
  for (const id of [15, 16, 17, 18]) assert.ok(!settings.supportIds.includes(id));
});

test('Orbital nerves use Orbit, not Petrosal, context; muscles fade while nerves and sinuses stay source-colored', () => {
  const settings = headNeckPetrosalSettings(nodes, [6], [...orbit, 'nerves']);
  assert.deepEqual(settings.supportIds, [1, 2, 3, 4]);
  assert.deepEqual(settings.contextIds, [1, 2, 3, 4]);
  assert.deepEqual(headNeckPetrosalSettings(nodes, [3], [...orbit, 'muscles']), { supportIds: [], contextIds: [3] });
  assert.deepEqual(headNeckPetrosalSettings(nodes, [], orbit), { supportIds: [], contextIds: [] });
});

test('Cavernous and intercavernous venous members are available, scoped and independently controllable', () => {
  const path = [...orbit, 'veins'];
  for (const rawName of names.slice(7, 11)) {
    const node = nodes.find(n => n.rawName === rawName)!;
    assert.ok(headNeckTopographyPathForGroup(node, path), rawName);
    assert.ok(isNodeAllowedInAtlasView(node, HEAD_NECK_TOPOGRAPHY_VIEW), rawName);
    assert.ok(!headNeckTopographyPathForGroup(node, [...orbit, 'arteries']));
    assert.ok(HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES.some(n => headNeckTopographyName(n.name) === headNeckTopographyName(rawName)),
      'Read real vascular CSV meshes with canonical bilateral identity');
  }
  const plan = planRegionIsolation(nodes, 'nervous', path, n => headNeckTopographyPathForGroup(n, path))!;
  assert.deepEqual(plan.show, [8, 9, 10, 11]);
  assert.deepEqual(headNeckPetrosalSettings(nodes, plan.show, path), { supportIds: [], contextIds: [] });
  for (const rawName of ['Anterior intercavernous vein.l', 'Posterior intercavernous veins.r'])
    assert.ok(headNeckTopographyPathForGroup({ rawName }, path), rawName);
  for (const id of [17, 18]) assert.ok(!headNeckTopographyPathForGroup(nodes[id - 1], path));
});
