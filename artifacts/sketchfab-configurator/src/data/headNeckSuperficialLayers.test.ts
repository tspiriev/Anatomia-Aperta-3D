import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { headNeckTopographyPathForGroup, headNeckTopographyPathsForNode,
  headNeckTopographyCataloguePathForGroup, HEAD_NECK_TOPOGRAPHY_GROUPS } from './headNeckTopography';
import { anteriorNeckHiddenLayerIds, anteriorNeckSuperficialLayer, ANTERIOR_NECK_SUPERFICIAL_ID } from './headNeckAnteriorTriangle';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isHeadTopographyNode } from './headTopography';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { searchAnatomy } from './anatomySearch';

const root = ['advanced-neuroanatomy', 'head-neck-topography', 'anterior-triangle'];
const optional = [...root, ANTERIOR_NECK_SUPERFICIAL_ID];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, visible: true, systemId: null, type: 'MatrixTransform',
});
const layers = ['Platysma.l', 'Platysma.r', 'Superficial investing cervical fascia.l', 'Superficial investing cervical fascia.r'];

test('Anterior-neck coverings are absent from normal region/tissue selections but available in their optional submenu', () => {
  const group = HEAD_NECK_TOPOGRAPHY_GROUPS.find(g => g.id === root.join('/'))!;
  const submenu = group.children!.find(g => g.id === optional.join('/'))!;
  assert.equal(submenu.label, 'Superficial layers (optional)');
  assert.deepEqual(submenu.children!.map(g => g.label), ['Platysma', 'Superficial investing cervical fascia']);
  for (const name of [...layers, 'Platysma_L', 'Superficial_investing_cervical_fascia_R.001', 'Platisma.r']) {
    const n = node(name);
    assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n), name);
    for (const suffix of [[], ['muscles'], ['fasciae'], ['submental'], ['submandibular'],
      ['carotid'], ['carotid', 'fasciae'], ['muscular']])
      assert.equal(headNeckTopographyPathForGroup(n, [...root, ...suffix]), null, `${name}/${suffix}`);
    const id = anteriorNeckSuperficialLayer(n)!;
    assert.deepEqual(headNeckTopographyPathForGroup(n, optional), [...optional, id]);
    assert.ok(headNeckTopographyPathsForNode(n).some(path => path.join('/') === [...optional, id].join('/')));
  }
});

test('All ordinary anterior-neck openings hide coverings; opt-in collections isolate each layer and retain the original restore snapshot', () => {
  const nodes = [...layers, 'Sternocleidomastoid muscle.r', 'Common carotid artery.l', 'Unknown mesh',
    'Mylohyoid muscle.l', 'Sternohyoid muscle.r']
    .map((name, i) => node(name, i + 1));
  for (const path of [root, [...root, 'submental'], [...root, 'submandibular'], [...root, 'carotid'],
    [...root, 'muscular'], [...root, 'submental', 'muscles'], [...root, 'carotid', 'fasciae']]) {
    const plan = planRegionIsolation(nodes, 'nervous', path, n => headNeckTopographyPathForGroup(n, path));
    // The fixture's only fascia is now optional, so the normal Fasciae
    // collection is empty/disabled rather than an isolatable category.
    if (path.at(-1) === 'fasciae') assert.equal(plan, null);
    else {
      assert.ok(plan, path.join('/'));
      for (const id of [1, 2, 3, 4]) {
        assert.ok(plan.hide.includes(id), `${path.join('/')}/${id}`);
        assert.ok(!plan.show.includes(id));
      }
    }
    assert.deepEqual(anteriorNeckHiddenLayerIds(nodes, path), [1, 2, 3, 4],
      'Additive Show, Show all and mixed selections must hide previously visible coverings too');
  }
  for (const [path, expected] of [[optional, [1, 2, 3, 4]],
    [[...optional, 'platysma'], [1, 2]], [[...optional, 'investing-fascia'], [3, 4]]] as const) {
    assert.deepEqual(planRegionIsolation(nodes, 'nervous', path, n => headNeckTopographyPathForGroup(n, path))!.show, expected);
    assert.deepEqual(anteriorNeckHiddenLayerIds(nodes, path), []);
    assert.deepEqual([...captureRegionIsolation(nodes, path, null, null).visibility], nodes.map(n => [n.instanceID, true]));
  }
});

test('Anterior optional layers and catalogue discoverability remain intact; lateral neck now excludes platysma entirely', async () => {
  assert.equal(headNeckTopographyPathForGroup(node('Platysma.l'),
    ['advanced-neuroanatomy', 'head-neck-topography', 'lateral-neck', 'sternocleidomastoid', 'muscles']), null);
  assert.ok(headNeckTopographyCataloguePathForGroup(node('Platysma.l'), root));
  assert.deepEqual(anteriorNeckHiddenLayerIds(layers.map((name, i) => node(name, i + 1)),
    ['advanced-neuroanatomy', 'head-neck-topography', 'lateral-neck']), []);
  assert.deepEqual(anteriorNeckHiddenLayerIds(layers.map((name, i) => node(name, i + 1)),
    ['advanced-neuroanatomy', 'skull-base', 'anterior-triangle']), []);
  for (const name of ['Investing cervical artery', 'Deep cervical fascia', 'Sternocleidomastoid muscle'])
    assert.equal(anteriorNeckSuperficialLayer(node(name)), null);
  const { results } = await searchAnatomy('platysma');
  assert.ok(!results.some(result => result.destinations.some(destination =>
    destination.atlasId === 'head-neck-topography')));
});
