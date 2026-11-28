import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { isOralTrigeminalBranch } from './headNeckOralTrigeminal';
import { headNeckTopographyName, headNeckTopographyPathForGroup, headNeckTopographySystemForNode,
  HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES } from './headNeckTopography';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { searchAnatomy } from './anatomySearch';

const root = ['advanced-neuroanatomy', 'head-neck-topography', 'head'];
const oral = [...root, 'oral', 'nerves'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: rawName, type: 'MatrixTransform', systemId: null, visible: true,
});
const names = [
  'Maxillary nerve', 'Trigeminal nerve maxillary n (V)', 'Ganglionic branch of maxillary nerve',
  'Zygomatic nerve', 'Zygomaticofacial nerve', 'Zygomaticotemporal nerve', 'Infraorbital nerve',
  'Posterior superior alveolar nerve', 'Middle superior alveolar nerve', 'Anterior superior alveolar nerve',
  'Greater palatine nerve', 'Lesser palatine nerve', 'Nasopalatine nerve',
  'Lateral posterior superior nasal nerve', 'Lateral posterior inferior nasal nerve', 'Pharyngeal nerve',
  'Mandibular nerve', 'Anterior division of mandibular nerve', 'Posterior division of mandibular nerve',
  'Auriculotemporal nerve', 'Lingual nerve', 'Buccal nerve', 'Inferior alveolar nerve',
  'Trunk of right inferior alveolar nerve', 'Right mental nerve', 'Right masseteric nerve',
  'Medial pterygoid nerve', 'Lateral pterygoid nerve', 'Nerve to mylohyoid muscle',
  'Tensor tympani nerve', 'Deep temporal nerve', 'Nerve to tensor veli palatini',
];

test('Bilateral V2/V3 trunks, main branches and modeled terminal routes are oral nerve members', () => {
  for (const name of names) for (const side of ['.l', '.r']) {
    const n = node(name + side);
    assert.ok(isOralTrigeminalBranch(headNeckTopographyName(n.rawName)), n.rawName);
    assert.ok(headNeckTopographyPathForGroup(n, oral), n.rawName);
    assert.equal(headNeckTopographySystemForNode(n), 'nervous', n.rawName);
    assert.ok(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), n.rawName);
    assert.ok(!headNeckTopographyPathForGroup(n, [...root, 'oral', 'muscles']));
  }
  const imported = HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES.filter(n => isOralTrigeminalBranch(headNeckTopographyName(n.name)));
  assert.ok(imported.length > 15);
  for (const n of imported) assert.ok(n.memberships.some(m => m.region === 'head/oral' && m.tissue === 'nerves'), n.name);
});

test('Other regional memberships are preserved; V1, nuclei, unrelated nerves and muscles are not newly imported', () => {
  assert.ok(headNeckTopographyPathForGroup(node('Zygomaticofacial nerve.l'), [...root, 'scalp-face', 'nerves']));
  assert.ok(headNeckTopographyPathForGroup(node('Auriculotemporal nerve.r'), [...root, 'temporal-infratemporal', 'nerves']));
  assert.ok(headNeckTopographyPathForGroup(node('Maxillary nerve.l'), [...root, 'nasal-pterygopalatine', 'nerves']));
  for (const name of ['Ophthalmic nerve', 'Supraorbital nerve', 'Lacrimal nerve', 'Chorda tympani',
    'Oculomotor nerve (III)', 'Trigeminal nerve root', 'Trigeminal nerve (Gasserian) ganglion',
    'Principal sensory nucleus of trigeminal nerve', 'Masseter muscle', 'Tensor typmani muscle'])
    assert.equal(isOralTrigeminalBranch(headNeckTopographyName(name + '.l')), false, name);
});

test('Oral nerve isolation includes V2/V3 additions, hides nonmembers and snapshots the previous composition', () => {
  const nodes = [...names.map((name, i) => node(name + '.l', i + 1)),
    node('Ophthalmic nerve.l', 101), node('Masseter muscle.l', 102), node('Unknown mesh', 103)];
  nodes[0].visible = false;
  const plan = planRegionIsolation(nodes, 'nervous', oral, n => headNeckTopographyPathForGroup(n, oral))!;
  assert.deepEqual(plan.show, names.map((_, i) => i + 1));
  assert.deepEqual(plan.hide, [101, 102, 103]);
  const snapshot = captureRegionIsolation(nodes, oral, null, null);
  assert.equal(snapshot.visibility.get(1), false);
  assert.equal(snapshot.visibility.get(103), true);
});

test('Homepage search finds the oral collection for a V2 branch', async () => {
  const { results } = await searchAnatomy('zygomaticofacial nerve');
  assert.ok(results.some(result => result.destinations.some(destination => destination.href === '/atlas/head-neck'
    && destination.collections.some(collection => collection.includes('Oral cavity and floor of mouth')))));
});
