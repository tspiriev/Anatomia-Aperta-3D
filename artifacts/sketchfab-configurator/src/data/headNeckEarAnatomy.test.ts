import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { headNeckTopographyName, headNeckTopographyPathForGroup, headNeckTopographySystemForNode,
  HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES } from './headNeckTopography';
import { headNeckEarTissue } from './headNeckEarAnatomy';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { headNeckBoneContextIds } from '../lib/headNeckBoneContext';
import { HEAD_NECK_TOPOGRAPHY_MODEL_UID } from './headNeckTopographyRegions';
import { searchAnatomy } from './anatomySearch';

const ear = ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'ear'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: rawName, type: 'MatrixTransform', visible: false, systemId: null,
});
const groups = {
  organs: ['Cochlea', 'Vestibule', 'Labyrinth', 'Vestibular labyrinth', 'Bony labyrinth',
    'Membranous labyrinth', 'Semicircular canals', 'Semicircular ducts', 'Anterior semicircular canal',
    'Posterior semicircular canal', 'Lateral semicircular canal', 'Anterior semicircular duct',
    'Posterior semicircular duct', 'Lateral semicircular duct'],
  bones: ['Malleus', 'Incus', 'Stapes'],
  muscles: ['Tensor tympani muscle', 'Tensor tympani', 'Tensor typmani muscle'],
} as const;

test('Ear additions use shared organ, bone and muscle controls with both sides and revised live identities', () => {
  for (const [tissue, names] of Object.entries(groups)) for (const name of names) for (const side of ['.l', '.r', '_L', '_R']) {
    const n = node(name + side);
    assert.equal(headNeckEarTissue(headNeckTopographyName(n.rawName)), tissue, n.rawName);
    assert.ok(headNeckTopographyPathForGroup(n, [...ear, tissue]), n.rawName);
    assert.ok(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), n.rawName);
    assert.equal(headNeckTopographySystemForNode(n),
      tissue === 'bones' ? 'skeletal' : tissue === 'muscles' ? 'muscular' : 'organs', n.rawName);
    assert.ok(!headNeckTopographyPathForGroup(n, [...ear, 'nerves']), n.rawName);
  }
});

test('Existing source cochleae, vestibules, ossicles and misspelled tensor tympani are registered', () => {
  for (const name of ['Cochlea', 'Vestibule', 'Malleus', 'Incus', 'Stapes', 'Tensor typmani muscle']) {
    const entry = HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES.find(n => headNeckTopographyName(n.name) === name.toLowerCase());
    assert.ok(entry, name);
    assert.ok(entry.memberships.some(m => m.region === 'head/ear' && m.tissue === headNeckEarTissue(headNeckTopographyName(name))), name);
  }
  for (const name of ['Tensor tympani nerve', 'Cochlear nerve', 'Vestibulocochlear nerve (VIII)',
    'Anterior cochlear nucleus', 'Auditory radiation', 'Masseter muscle', 'Unknown labyrinth mesh'])
    assert.equal(headNeckEarTissue(headNeckTopographyName(name)), null, name);
  assert.ok(headNeckTopographyPathForGroup(node('Tensor tympani nerve.l'), [...ear, 'nerves']));
});

test('Whole ear and tissue-only isolation include additions without losing previous visibility; only ossicles get bone refraction', () => {
  const nodes = ['Cochlea.l', 'Labyrinth.r', 'Malleus.l', 'Incus.r', 'Stapes.l',
    'Tensor tympani muscle.r', 'Unknown mesh', 'Hip bone.l'].map((name, i) => node(name, i + 1));
  for (const [path, expected] of [
    [ear, [1, 2, 3, 4, 5, 6]], [[...ear, 'organs'], [1, 2]],
    [[...ear, 'bones'], [3, 4, 5]], [[...ear, 'muscles'], [6]],
  ] as const) {
    const plan = planRegionIsolation(nodes, 'nervous', path, n => headNeckTopographyPathForGroup(n, path))!;
    assert.deepEqual(plan.show, expected);
    assert.deepEqual(plan.hide, nodes.filter(n => !expected.includes(n.instanceID as never)).map(n => n.instanceID));
    assert.deepEqual([...captureRegionIsolation(nodes, path, null, null).visibility], nodes.map(n => [n.instanceID, false]));
  }
  assert.deepEqual(headNeckBoneContextIds(HEAD_NECK_TOPOGRAPHY_MODEL_UID, nodes), [3, 4, 5]);
});

test('Homepage search discovers cochlea and tensor tympani in the ear region', async () => {
  for (const query of ['cochlea', 'tensor typmani']) {
    const { results } = await searchAnatomy(query);
    assert.ok(results.some(result => result.destinations.some(destination => destination.href === '/atlas/head-neck'
      && destination.collections.some(collection => collection.includes('Auricular and middle-ear region')))), query);
  }
});
