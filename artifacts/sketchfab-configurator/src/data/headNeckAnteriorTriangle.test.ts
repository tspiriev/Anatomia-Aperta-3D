import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { headNeckTopographyPathForGroup, headNeckTopographySystemForNode,
  HEAD_NECK_TOPOGRAPHY_GROUPS } from './headNeckTopography';
import { headNeckPetrosalSettings } from './headNeckPetrosalSettings';
import { anteriorTriangleNerve, anteriorNeckHiddenLayerIds } from './headNeckAnteriorTriangle';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isHeadTopographyNode } from './headTopography';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';

const root = ['advanced-neuroanatomy', 'head-neck-topography', 'anterior-triangle'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, type: 'MatrixTransform', visible: false, systemId: null,
});

test('Anterior triangle exposes shared section-wide nerve/bone controls while preserving its four triangles', () => {
  const group = HEAD_NECK_TOPOGRAPHY_GROUPS.find(g => g.id === root.join('/'))!;
  for (const part of ['submental', 'submandibular', 'carotid', 'muscular', 'bones', 'nerves'])
    assert.ok(group.children!.some(g => g.id === [...root, part].join('/')), part);
  for (const rawName of ['Atlas (C1)', 'Axis (C2)', 'Vertebra C3', 'Vertebra C4', 'Vertebra C5',
    'Vertebra C6', 'Vertebra C7', 'Cervical spine', 'Cervical vertebra 3']) {
    const n = node(rawName);
    assert.ok(headNeckTopographyPathForGroup(n, [...root, 'bones']), rawName);
    assert.equal(headNeckTopographySystemForNode(n), 'skeletal');
  }
  assert.ok(!headNeckTopographyPathForGroup(node('Vertebra T1'), [...root, 'bones']));
});

test('All available peripheral nerves, roots, spinal nerves and ganglia have anterior-triangle membership', () => {
  for (const rawName of ['C1 anterior root.l', 'C1 anterior posterior.l', 'C2 anterior posterior.r',
    'C3 posterior root.r', 'C8 anterior root.r',
    'C2 Dorsal root ganglion.l', 'C1 spinal nerve.l.001', 'C3 spinal nerve.r',
    'Vagus nerve (X).r', 'Glossopharyngeal nerve (IX).l', 'Accessory nerve (XI).r',
    'Hypoglossal nerve (XII).l', 'Median nerve.r', 'Dorsal ramus C4.r', 'Superior cervical sympathetic ganglion.l',
    'Internal carotid artery sympathetic plexus.l', 'New modeled communicating nerve.l']) {
    const n = node(rawName);
    assert.ok(headNeckTopographyPathForGroup(n, [...root, 'nerves']), rawName);
    assert.equal(headNeckTopographySystemForNode(n), 'nervous', rawName);
    assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n));
  }
  for (const name of ['Nucleus of hypoglossal nerve', 'Spinal trigeminal tract',
    'Masseter muscle', 'Venous plexus', 'Pterygoid plexus', 'Carotid artery', 'Brainstem'])
    assert.equal(anteriorTriangleNerve(name.toLowerCase()), false, name);
});

test('Whole anterior triangle and individual Show retain transparent brainstem; nerve-only Hide membership stays separate', () => {
  const nodes = ['C3 spinal nerve.l', 'Vertebra C3', 'Pons', 'Midbrain', 'Medulla oblongata',
    'Nucleus of oculomotor nerve.l', 'Unknown mesh'].map((name, i) => node(name, i + 1));
  const plan = planRegionIsolation(nodes, 'nervous', root, n => headNeckTopographyPathForGroup(n, root))!;
  assert.deepEqual(plan.show, [1, 2, 3, 4, 5]);
  for (const path of [root, [...root, 'nerves'], [...root, 'carotid', 'nerves']]) {
    assert.deepEqual(headNeckPetrosalSettings(nodes, [1], path), { supportIds: [3, 4, 5], contextIds: [3, 4, 5] });
    assert.deepEqual(headNeckPetrosalSettings(nodes, [], path), { supportIds: [], contextIds: [] });
  }
  for (const n of nodes.slice(2))
    assert.ok(!headNeckTopographyPathForGroup(n, [...root, 'nerves']), n.rawName);
  const snapshot = captureRegionIsolation(nodes, root, null, null);
  assert.deepEqual([...snapshot.visibility], nodes.map(n => [n.instanceID, false]));
  assert.deepEqual(headNeckPetrosalSettings(nodes, [1], ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'ear', 'bones']),
    { supportIds: [], contextIds: [] });
});

test('Muscular triangle and visceral compartment never add or retain gross brainstem, including nested and mixed Show selections', () => {
  const nodes = ['Sternohyoid muscle.l', 'Vertebra C3', 'Pons', 'Midbrain', 'Medulla oblongata',
    'Brainstem', 'Platysma.l', 'Superficial investing cervical fascia.r'].map((name, i) => node(name, i + 1));
  for (const path of [[...root, 'muscular'], [...root, 'muscular', 'muscles'],
    [...root, 'muscular', 'nerves'], [...root, 'muscular', 'arteries']]) {
    const settings = headNeckPetrosalSettings(nodes, [1, 2], path);
    assert.deepEqual(settings, { supportIds: [], contextIds: [2] }, 'Preserve selected bone transparency, not brainstem support');
    assert.deepEqual(anteriorNeckHiddenLayerIds(nodes, path), [3, 4, 5, 6, 7, 8],
      'Existing additive/mixed Show controls must hide brainstem left over from another region');
    for (const brainstem of nodes.slice(2, 6))
      assert.equal(headNeckTopographyPathForGroup(brainstem, path), null);
  }
  const path = [...root, 'muscular'];
  const plan = planRegionIsolation(nodes, 'nervous', path, n => headNeckTopographyPathForGroup(n, path))!;
  assert.deepEqual(plan.show, [1]);
  for (const id of [3, 4, 5, 6]) assert.ok(plan.hide.includes(id));
  assert.deepEqual(headNeckPetrosalSettings(nodes, [1], [...root, 'submental']).supportIds, [3, 4, 5, 6]);
  assert.deepEqual(anteriorNeckHiddenLayerIds(nodes, [...root, 'submental']), [7, 8]);
});
