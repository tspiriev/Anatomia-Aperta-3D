import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPINAL_CSV_OBJECTS, SPINAL_REFERENCE_MODELS, SPINAL_TOPOGRAPHIC_PATH, SPINAL_NERVE_PATH,
  spinalCordPathForGroup, spinalCordMenuGroups, spinalCsvObject, spinalCordInitialPath, spinalRootContextIds,
  spinalRootCameraTargets,
} from './spinalCordAtlas';
import { LONG_TRACT_ROOT_PATH, longTractMenuGroups, longTractPathForGroup, longTractContextIds } from './longTractTaxonomy';
import { ATLAS_VIEWS, LONG_TRACTS_VIEW, SPINAL_CORD_VIEW, SPINAL_REFERENCE_VIEWS } from './atlasViews';
import { planRegionIsolation } from '../lib/regionIsolation';
import { superiorViewerCamera, profileViewerCamera } from '../lib/viewerCamera';
import type { SceneNode } from '../types/sketchfab';
const node = (rawName: string, instanceID = 1): SceneNode =>
  ({ rawName, name: rawName, instanceID, visible: true, type: 'MatrixTransform', systemId: 'nervous' });

test('spinal entry has no automatic collection, while explicit menu links and reference models retain their chosen destinations', () => {
  for (const search of ['', '?', '?foo=bar', '?collection=', '?collection=advanced-neuroanatomy%2Flong-tracts%2F',
    '?collection=unrelated%2Flong-tracts%2Fspinal-cord-topography',
    '?collection=advanced-neuroanatomy%2Flong-tracts%2Fmodel-unknown'])
    assert.equal(spinalCordInitialPath(search), null, search);
  for (const path of [SPINAL_TOPOGRAPHIC_PATH, SPINAL_NERVE_PATH, [...SPINAL_NERVE_PATH, 'anterior-roots']])
    assert.deepEqual(spinalCordInitialPath(`?collection=${encodeURIComponent(path.join('/'))}`), path);
  for (const model of SPINAL_REFERENCE_MODELS)
    assert.deepEqual(spinalCordInitialPath('', model.uid), [...LONG_TRACT_ROOT_PATH, `model-${model.uid}`]);
});

test('three original labelled models are first, followed by topography, spinal nerve and unchanged long-tract collections', () => {
  const nodes = ['Rubrospinal tract', 'Midbrain', 'Anterior horn of spinal cord'].map((name, i) => node(name, i));
  const groups = spinalCordMenuGroups(nodes);
  assert.equal(SPINAL_REFERENCE_MODELS.length, 3);
  assert.deepEqual(groups.slice(0, 3).map(group => group.label), SPINAL_REFERENCE_MODELS.map(model => model.label));
  assert.equal(groups[3].id, SPINAL_TOPOGRAPHIC_PATH.join('/'));
  assert.ok(!groups[3].children!.some(group => group.id.endsWith('/central-canal')));
  assert.equal(groups[4].id, SPINAL_NERVE_PATH.join('/'));
  assert.equal(groups[4].label, 'Root anatomy');
  assert.deepEqual(groups.slice(5), longTractMenuGroups(nodes));
  for (const group of longTractMenuGroups(nodes)) for (const item of nodes) {
    assert.deepEqual(spinalCordPathForGroup(item, group.id.split('/')), longTractPathForGroup(item, group.id.split('/')));
  }
  assert.equal(SPINAL_CORD_VIEW.modelUid, LONG_TRACTS_VIEW.modelUid);
  assert.equal(SPINAL_CORD_VIEW.longTracts, LONG_TRACTS_VIEW.longTracts);
  assert.deepEqual(SPINAL_CORD_VIEW.systemIds, LONG_TRACTS_VIEW.systemIds);
});
test('topographic inventory contains only exported cord matter/tracts, not brainstem or sided brainstem segments', () => {
  assert.ok(SPINAL_CSV_OBJECTS.length > 30);
  for (const name of ['White matter of spinal cord', 'Anterior horn of spinal cord',
    'Posterior horn of spinal cord', 'Intermediomedial nucleus', 'Intermediolateral nucleus', 'Rubrospinal tract']) {
    assert.ok(spinalCsvObject(name), name);
    assert.ok(spinalCordPathForGroup(node(name), SPINAL_TOPOGRAPHIC_PATH), name);
  }
  for (const name of ['Midbrain', 'Pons', 'Medulla oblongata', 'Rubrospinal tract.r',
    'Rubrospinal tract.l', 'Corticospinal tract arm.r', 'Corticospinal tract face', 'Guide axis',
    'Central canal', "Central canal'", "Central canal'.001_23"]) {
    assert.equal(spinalCordPathForGroup(node(name), SPINAL_TOPOGRAPHIC_PATH), null, name);
  }
  assert.ok(spinalCordPathForGroup(node('Rubrospinal tract.001_27'), SPINAL_TOPOGRAPHIC_PATH));
  const scene = ['White matter of spinal cord', 'Anterior horn of spinal cord', 'Rubrospinal tract',
    'Rubrospinal tract.r', 'Pons', 'Guide axis', 'Central canal', "Central canal'",
    "Central canal'.001_23"].map((name, i) => node(name, i + 1));
  const plan = planRegionIsolation(scene, 'nervous', SPINAL_TOPOGRAPHIC_PATH,
    item => spinalCordPathForGroup(item, SPINAL_TOPOGRAPHIC_PATH))!;
  assert.deepEqual(plan.show, [1, 2, 3]);
  assert.deepEqual(plan.hide, [4, 5, 6, 7, 8, 9]);
  assert.deepEqual(longTractContextIds(scene, SPINAL_TOPOGRAPHIC_PATH), [],
    'Cord-only topography must not inherit the whole-pathway brainstem context');
});
test('spinal nerve roots and ganglia use original CSV names and requested gray-matter components', () => {
  for (const [expression, section] of [[/anterior root/i, 'anterior-roots'],
    [/posterior root/i, 'posterior-roots'], [/gangli/i, 'ganglia']] as const) {
    const object = SPINAL_CSV_OBJECTS.find(object => expression.test(object.name));
    assert.ok(object, section);
    assert.equal(spinalCordPathForGroup(node(object.name), SPINAL_NERVE_PATH)?.[3], section);
    assert.equal(spinalCordPathForGroup(node(object.name), SPINAL_TOPOGRAPHIC_PATH), null);
  }
  for (const name of ['Anterior horn of spinal cord', 'Posterior horn of spinal cord',
    'Intermediomedial nucleus', 'Intermediolateral nucleus'])
    assert.equal(spinalCordPathForGroup(node(name), SPINAL_NERVE_PATH)?.[3], 'gray-matter');
  assert.equal(spinalCordPathForGroup(node('Invented posterior root ganglion'), SPINAL_NERVE_PATH), null);
});

test('Root anatomy retains only the actual white-matter shell as transparent context in every root/gray-matter subdivision', () => {
  const white = SPINAL_CSV_OBJECTS.filter(object => object.collection === 'NS_03_GENERAL_WHITE_MATTER');
  assert.equal(white.length, 1);
  const anterior = SPINAL_CSV_OBJECTS.find(object => /anterior root/i.test(object.name))!;
  const scene = [
    node(white[0].name, 1), node(`${white[0].name}.001_42`, 2),
    node(anterior.name, 3), node('Anterior horn of spinal cord', 4),
    node('Pons', 5), node('Posterior spinocerebellar tract', 6), node('Central canal of spinal cord', 7),
    ...SPINAL_CSV_OBJECTS.filter(object => object.collection !== 'NS_03_GENERAL_WHITE_MATTER'
      && ![anterior.name, 'Anterior horn of spinal cord'].includes(object.name)
      && spinalCordPathForGroup(node(object.name), SPINAL_NERVE_PATH))
      .map((object, i) => node(object.name, 100 + i)),
  ];
  const groups = spinalCordMenuGroups([])[4].children!;
  for (const path of [SPINAL_NERVE_PATH, ...groups.flatMap(group =>
    [group, ...(group.children ?? [])].map(child => child.id.split('/')))]) {
    assert.deepEqual(spinalRootContextIds(scene, path), [1, 2]);
    const plan = planRegionIsolation(scene, 'nervous', path, item => spinalCordPathForGroup(item, path))!;
    assert.ok(plan.show.includes(1));
    assert.ok(plan.show.includes(2));
    for (const id of [5, 6, 7]) assert.ok(plan.hide.includes(id));
    if (path[3] === 'anterior-roots') {
      assert.equal(plan.show.includes(3), spinalCordPathForGroup(scene[2], path) !== null);
      assert.ok(plan.hide.includes(4));
    }
    if (path[3] === 'gray-matter') {
      assert.equal(plan.show.includes(4), !path[4] || path[4] === 'anterior-horn');
      assert.ok(plan.hide.includes(3));
    }
  }
  for (const path of [SPINAL_TOPOGRAPHIC_PATH, LONG_TRACT_ROOT_PATH, ['unrelated']])
    assert.deepEqual(spinalRootContextIds(scene, path), []);
  assert.equal(spinalCordInitialPath(''), null, 'No automatic selection or white-matter fading on initial entry');
  assert.deepEqual(spinalCordPathForGroup(scene[0], SPINAL_NERVE_PATH), [...SPINAL_NERVE_PATH, 'white-matter']);
});

test('Root anatomy includes every exported C1/C2 component on both sides, including ambiguous source names', () => {
  const cervical = SPINAL_CSV_OBJECTS.filter(object => /^C[12]$/.test(object.collection));
  assert.ok(cervical.some(object => object.collection === 'C1'));
  assert.ok(cervical.some(object => object.collection === 'C2'));
  for (const object of cervical) {
    assert.ok(spinalCordPathForGroup(node(object.name), SPINAL_NERVE_PATH), object.name);
    assert.ok(spinalCordPathForGroup(node(`${object.name}_42`), SPINAL_NERVE_PATH), `${object.name}_42`);
    assert.equal(spinalCordPathForGroup(node(object.name), SPINAL_TOPOGRAPHIC_PATH), null, object.name);
  }
  const components = cervical.filter(object => /anterior posterior/.test(object.name));
  assert.equal(components.length, 4);
  const path = [...SPINAL_NERVE_PATH, 'c1-c2-root-components'];
  for (const object of components) {
    assert.deepEqual(spinalCordPathForGroup(node(object.name), path), [...path, 'cervical']);
    assert.equal(spinalCordPathForGroup(node(object.name), [...SPINAL_NERVE_PATH, 'posterior-roots']), null);
  }
  assert.ok(spinalCordPathForGroup(node('C1 spinal nerve.l'), [...SPINAL_NERVE_PATH, 'spinal-nerves']));
  const scene = [...cervical.map((object, i) => node(object.name, i + 1)), node('Pons', 1000)];
  const plan = planRegionIsolation(scene, 'nervous', SPINAL_NERVE_PATH,
    item => spinalCordPathForGroup(item, SPINAL_NERVE_PATH))!;
  assert.deepEqual(plan.show, cervical.map((_, i) => i + 1));
  assert.deepEqual(plan.hide, [1000]);
});

test('Root anatomy subdivides each modeled root type into cervical, thoracic, lumbar and existing sacral roots', () => {
  const groups = spinalCordMenuGroups([])[4].children!;
  for (const section of ['anterior-roots', 'posterior-roots', 'ganglia']) {
    const parent = groups.find(g => g.id.endsWith(`/${section}`))!;
    assert.deepEqual(parent.children!.map(g => g.id.split('/').at(-1)),
      section === 'ganglia' ? ['cervical', 'thoracic', 'lumbar'] : ['cervical', 'thoracic', 'lumbar', 'sacral']);
    for (const region of parent.children!) {
      const path = region.id.split('/');
      const admitted = SPINAL_CSV_OBJECTS.filter(o => spinalCordPathForGroup(node(o.name), path));
      assert.ok(admitted.length > 0, region.label);
      const pattern = path[4] === 'cervical' ? /^C\d+$/ : path[4] === 'thoracic' ? /^Th\d+$/
        : path[4] === 'lumbar' ? /^L\d+$/ : /^S\d+$/;
      assert.ok(admitted.every(o => pattern.test(o.collection)), `${section}: no out-of-region roots`);
      for (const object of admitted) assert.ok(spinalCordPathForGroup(node(`${object.name}_42`), path));
    }
  }
});

test('Root anatomy camera fits the selected foreground in every regional and gray-matter collection, not cord context', () => {
  const scene = SPINAL_CSV_OBJECTS.map((o, i) => node(o.name, i + 1));
  const visit = (g: ReturnType<typeof spinalCordMenuGroups>[number]) => {
    const path = g.id.split('/'), ids = spinalRootCameraTargets(scene, path)!;
    const members = scene.filter(n => spinalCordPathForGroup(n, path));
    const foreground = members.filter(n => !spinalRootContextIds(scene, path).includes(n.instanceID));
    assert.deepEqual(ids, (foreground.length ? foreground : members).map(n => n.instanceID));
    assert.ok(ids.length > 0, g.label);
    g.children?.forEach(visit);
  };
  visit(spinalCordMenuGroups([])[4]);
  assert.equal(spinalRootCameraTargets(scene, SPINAL_TOPOGRAPHIC_PATH), null);
});
test('the original annotation exception is limited to the three supplied model routes', () => {
  assert.deepEqual(SPINAL_REFERENCE_VIEWS.map(view => view.modelUid), SPINAL_REFERENCE_MODELS.map(model => model.uid));
  assert.ok(SPINAL_REFERENCE_VIEWS.every(view => view.preserveAnnotations === true && !view.longTracts));
  assert.ok(ATLAS_VIEWS.every(view => !view.preserveAnnotations));
  assert.ok(ATLAS_VIEWS.includes(SPINAL_CORD_VIEW));
});
test('superior camera is purely axial, maintaining the fitted target and viewing distance', () => {
  const original = { position: [7, -6, 15], target: [3, 2, 1] };
  const axial = superiorViewerCamera(original);
  assert.deepEqual(axial.target, original.target);
  assert.equal(axial.position[0], axial.target[0]);
  assert.equal(axial.position[1], axial.target[1]);
  assert.ok(axial.position[2] > axial.target[2]);
  assert.equal(Math.hypot(...axial.position.map((value, i) => value - axial.target[i])),
    Math.hypot(...original.position.map((value, i) => value - original.target[i])));
});

test('root anatomy profile is purely lateral and preserves the fitted target and zoom', () => {
  const original = { position: [7, -6, 15], target: [3, 2, 1] };
  const profile = profileViewerCamera(original);
  assert.deepEqual(profile.target, original.target);
  assert.equal(profile.position[1], profile.target[1]);
  assert.equal(profile.position[2], profile.target[2]);
  assert.ok(profile.position[0] > profile.target[0]);
  assert.equal(Math.hypot(...profile.position.map((value, i) => value - profile.target[i])),
    Math.hypot(...original.position.map((value, i) => value - original.target[i])));
  assert.deepEqual(original, { position: [7, -6, 15], target: [3, 2, 1] });
});

test('topographic close superior view zooms the fresh fit without shifting the section or changing default cameras', () => {
  const fitted = { position: [7, -6, 15], target: [3, 2, 1] };
  const camera = superiorViewerCamera(fitted, 0.65);
  const distance = Math.hypot(...fitted.position.map((n, i) => n - fitted.target[i]));
  assert.deepEqual(camera.target, fitted.target);
  assert.equal(camera.position[0], fitted.target[0]);
  assert.equal(camera.position[1], fitted.target[1]);
  assert.ok(Math.abs(camera.position[2] - fitted.target[2] - distance * 0.65) < 1e-10);
  assert.deepEqual(superiorViewerCamera(fitted, 0.65), camera, 'Fresh fits do not compound zoom');
  assert.deepEqual(fitted, { position: [7, -6, 15], target: [3, 2, 1] });
});
