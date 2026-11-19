import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MusculoskeletalMenu, MUSCULOSKELETAL_MENU_GROUPS, musculoskeletalMenuRequest } from '../components/MusculoskeletalMenu';
import {
  MUSCULOSKELETAL_SOURCE_ENTRIES as entries, MUSCULOSKELETAL_ROOT_PATH as root,
  MUSCULOSKELETAL_GROUPS, musculoskeletalPathForGroup as pathFor, musculoskeletalIsolationPathForGroup, cleanMusculoskeletalPath,
  classifyMusculoskeletalNode as classify, musculoskeletalSide, previousAttachmentSitesToHide,
} from './musculoskeletalTaxonomy';
import { BACK_ATTACHMENT_VIEW, BACK_MUSCLE_OVERVIEW, backMuscleSubdivision, isBackMuscleOverviewEntry } from './musculoskeletalBack';
import { captureRegionIsolation, planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';
const node = (rawName: string, instanceID: number): SceneNode => ({
  rawName, name: rawName, instanceID, visible: true, type: 'MatrixTransform',
});
const scene = entries.map((entry, i) => node(entry.name, i + 1));
const muscleRoot = [...root, 'back', 'muscles'];
const plan = (path: readonly string[], nodes = scene) =>
  planRegionIsolation(nodes, 'muscular', cleanMusculoskeletalPath(path), item => pathFor(item, path))!;

test('Back Muscles opens with muscles, associated bones and source Back ligaments, without enabling patches or covering fascia', () => {
  const opening = plan(muscleRoot);
  const overview = plan([...muscleRoot, BACK_MUSCLE_OVERVIEW]);
  assert.deepEqual(opening.show, overview.show);
  assert.equal(opening.show.filter(id => entries[id - 1].category === 'muscles').length, 74);
  for (const item of scene) assert.equal(opening.show.includes(item.instanceID),
    isBackMuscleOverviewEntry(entries[item.instanceID - 1]), item.rawName);
  for (const name of ['Hip bone.l', 'Hip bone.r', 'Sacrum', 'Coccyx', 'Atlas (C1)', 'Axis (C2)',
    'Vertebra C7', 'Vertebra T1', 'Vertebra T12', 'Vertebra L1', 'Vertebra L5',
    'First rib.l', 'Twelfth rib.r', 'Occipital bone', 'Temporal bone.l', 'Scapula.r', 'Humerus.l',
    'Anterior longitudinal ligament', 'Nuchal ligament', 'Intervertebral disc C7-T1']) {
    assert.ok(pathFor(node(name, 1), muscleRoot), name);
  }
  for (const entry of entries.filter(entry => ['attachments', 'fasciae', 'bursae'].includes(entry.category))) {
    assert.equal(pathFor(node(entry.name, 1), muscleRoot), null, entry.name);
  }
  for (const name of ['Femur.l', 'Mandible', 'Manubrium of sternum', 'Thyrohyoid muscle.l',
    'Median cricothyroid ligament', 'Articular capsule of elbow joint.l'])
    assert.equal(pathFor(node(name, 1), muscleRoot), null, name);
  assert.equal(pathFor(node('Vertebra T6.001_42', 1), muscleRoot)?.at(-1), 'bones');
});

test('overview tissue controls, laterality and restore keep the opening context independently controllable', () => {
  for (const category of ['muscles', 'bones', 'joints-ligaments']) {
    const subset = plan([...muscleRoot, BACK_MUSCLE_OVERVIEW, category]);
    assert.ok(subset.show.length);
    assert.ok(subset.show.every(id => entries[id - 1].category === category));
  }
  for (const side of ['left', 'right']) {
    const path = [...muscleRoot, `@side-${side}`];
    const opening = plan(path);
    assert.ok(opening.show.length);
    assert.ok(opening.show.every(id => musculoskeletalSide(scene[id - 1].rawName) !== (side === 'left' ? 'right' : 'left')));
    for (const name of ['Sacrum', 'Vertebra L5', 'Vertebra T1', 'Anterior longitudinal ligament'])
      assert.ok(pathFor(node(name, 1), path), name);
  }
  const combined = new Set(plan(muscleRoot).show);
  const initial = scene.map(item => ({ ...item, visible: combined.has(item.instanceID) }));
  const snapshot = captureRegionIsolation(initial, [...muscleRoot, 'deep'], 'overview-camera');
  assert.deepEqual([...snapshot.visibility].filter(([, visible]) => visible).map(([id]) => id), [...combined]);
  for (const id of plan([...muscleRoot, 'deep']).show) assert.equal(entries[id - 1].category, 'muscles');
});

test('all Back muscles are classified as superficial/intermediate extrinsic or deep autochthonous, without losing original memberships', () => {
  const back = entries.filter(entry => entry.category === 'muscles' && entry.regions.includes('back'));
  assert.equal(back.length, 74);
  for (const entry of back) assert.ok(backMuscleSubdivision(entry.name), entry.name);
  const superficial = plan([...muscleRoot, 'superficial']);
  const intermediate = plan([...muscleRoot, 'intermediate']);
  const deep = plan([...muscleRoot, 'deep']);
  assert.equal(superficial.show.length, 14);
  assert.equal(intermediate.show.length, 4);
  assert.equal(deep.show.length, 56);
  assert.ok(superficial.show.every(id => !deep.show.includes(id)));
  assert.equal(new Set([...superficial.show, ...intermediate.show, ...deep.show]).size, back.length);
  for (const id of [...superficial.show, ...intermediate.show, ...deep.show]) assert.equal(entries[id - 1].category, 'muscles');
  for (const id of intermediate.show) assert.match(scene[id - 1].rawName, /^Serratus posterior/);
  for (const id of superficial.show) assert.ok(deep.hide.includes(id), 'All covering extrinsic muscles are hidden');
  for (const entry of entries.filter(entry => entry.category === 'fasciae')) {
    const id = scene.find(item => item.rawName === entry.name)!.instanceID;
    assert.ok(deep.hide.includes(id), 'Fascia cannot cover a deep-only view');
  }
  for (const name of ['Obliquus superior capitis muscle.l', 'Obliquus inferior capitis muscle.r'])
    assert.deepEqual(classify(name)[0].regions, ['head', 'neck', 'back']);
});

test('Spinalis and deepest transversospinal systems isolate independently with all cervical, thoracic and lumbar source portions', () => {
  for (const [parts, count, pattern] of [
    [['deep', 'erector-spinae'], 18, /^(Spinalis|Longissimus|Iliocostalis) /],
    [['deep', 'erector-spinae', 'spinalis'], 6, /^Spinalis /],
    [['deep', 'transversospinal'], 12, /^(Semispinalis|Multifidus|Rotatores)/],
    [['deep', 'transversospinal', 'multifidus'], 6, /^Multifidus /],
    [['deep', 'transversospinal', 'rotatores'], 2, /^Rotatores/],
    [['deep', 'segmental'], 14, /Interspinales|intertransversarii|Levatores/],
    [['deep', 'suboccipital'], 8, /^(Rectus posterior|Obliquus)/],
  ] as const) {
    const isolated = plan([...muscleRoot, ...parts]);
    assert.equal(isolated.show.length, count, parts.join('/'));
    assert.ok(isolated.show.every(id => pattern.test(scene[id - 1].rawName)));
    for (const side of ['left', 'right']) {
      const sided = plan([...muscleRoot, ...parts, `@side-${side}`]);
      assert.ok(sided.show.length);
      for (const id of sided.show)
        assert.notEqual(musculoskeletalSide(scene[id - 1].rawName), side === 'left' ? 'right' : 'left');
    }
  }
});

test('matching group attachments and bones are opt-in views, never unrelated superficial attachments or generic spinalis substitutes', () => {
  const deepPath = [...muscleRoot, 'deep', BACK_ATTACHMENT_VIEW];
  const deep = plan(deepPath);
  const selected = deep.show.map(id => entries[id - 1]);
  assert.ok(selected.some(entry => entry.category === 'attachments'));
  assert.ok(selected.some(entry => entry.category === 'bones'));
  assert.ok(selected.some(entry => entry.category === 'muscles'));
  for (const entry of selected.filter(entry => entry.category !== 'bones'))
    assert.equal(backMuscleSubdivision(entry.name)?.[0], 'deep', entry.name);
  assert.ok(selected.every(entry => !['fasciae', 'bursae', 'joints-ligaments'].includes(entry.category)));
  assert.ok(selected.every(entry => !/Humerus|Clavicle|Scapula/.test(entry.name)));
  const spinalisPath = [...muscleRoot, 'deep', 'erector-spinae', 'spinalis', BACK_ATTACHMENT_VIEW];
  const spinalis = plan(spinalisPath);
  const sites = spinalis.show.map(id => entries[id - 1]).filter(entry => entry.category === 'attachments');
  assert.ok(sites.length);
  for (const entry of sites) assert.match(entry.name, /^Spinalis /);
  const genericErector = scene.filter(item => /^Erector spinae\.[oe]/.test(item.rawName)).map(item => item.instanceID);
  assert.ok(genericErector.length);
  for (const id of genericErector) assert.ok(!spinalis.show.includes(id), 'Shared erector patches are not spinalis-specific');
  const erector = plan([...muscleRoot, 'deep', 'erector-spinae', BACK_ATTACHMENT_VIEW]);
  for (const id of genericErector) assert.ok(erector.show.includes(id));
  const side = plan([...deepPath, '@side-right']);
  for (const id of side.show) assert.notEqual(musculoskeletalSide(scene[id - 1].rawName), 'left');
  const siteIds = deep.show.filter(id => entries[id - 1].category === 'attachments');
  assert.deepEqual(previousAttachmentSitesToHide(siteIds, scene, deepPath), []);
  assert.deepEqual(previousAttachmentSitesToHide(siteIds, scene, [...muscleRoot, 'deep']), siteIds);
});

test('Back attachment tree mirrors muscle layers and restore recovers the exact earlier composition', () => {
  const back = MUSCULOSKELETAL_GROUPS.find(group => group.id === [...root, 'back'].join('/'))!;
  const muscles = back.children!.find(group => group.id.endsWith('/muscles'))!;
  assert.deepEqual(muscles.children!.map(group => group.label),
    ['Superficial (extrinsic)', 'Intermediate (extrinsic)', 'Deep (autochthonous)']);
  const sites = back.children!.find(group => group.id.endsWith('/attachments'))!.children!.find(group => group.id.endsWith('/sites'))!;
  assert.deepEqual(sites.children!.map(group => group.label),
    muscles.children!.filter(group => !group.id.endsWith(`/${BACK_MUSCLE_OVERVIEW}`)).map(group => group.label));
  const allSites = plan([...root, 'back', 'attachments', 'sites']);
  const split = ['superficial', 'intermediate', 'deep'].flatMap(layer => plan([...root, 'back', 'attachments', 'sites', layer]).show);
  assert.deepEqual(new Set(split), new Set(allSites.show), 'No attachment sites dropped by the hierarchy');
  const initial = scene.map(item => ({ ...item, visible: item.instanceID % 3 === 0 }));
  const outer = captureRegionIsolation(initial, [...root, 'back'], 'outer-camera', null);
  const shown = new Set(plan([...muscleRoot, 'deep']).show);
  const deep = scene.map(item => ({ ...item, visible: shown.has(item.instanceID) }));
  const inner = captureRegionIsolation(deep, [...muscleRoot, 'deep'], 'deep-camera', outer);
  assert.equal(inner.parent, outer);
  assert.deepEqual([...inner.visibility].filter(([, visible]) => visible).map(([id]) => id), [...shown]);
  assert.deepEqual([...outer.visibility], initial.map(item => [item.instanceID, item.visible]));
});

test('every Back muscle subgroup retains the exact reference bones/joints while Show/Hide membership remains muscle-only', () => {
  const muscles = MUSCULOSKELETAL_GROUPS.find(group => group.id === [...root, 'back'].join('/'))!
    .children!.find(group => group.id.endsWith('/muscles'))!;
  const context = plan(muscleRoot).show.filter(id => ['bones', 'joints-ligaments'].includes(entries[id - 1].category));
  function check(group: typeof muscles) {
    const path = group.id.split('/');
    for (const side of ['bilateral', 'left', 'right']) {
      const requested = side === 'bilateral' ? path : [...path, `@side-${side}`];
      const isolated = planRegionIsolation(scene, 'muscular', path,
        item => musculoskeletalIsolationPathForGroup(item, requested))!;
      const expectedContext = context.filter(id => side === 'bilateral'
        || musculoskeletalSide(scene[id - 1].rawName) === 'bilateral' || musculoskeletalSide(scene[id - 1].rawName) === side);
      assert.deepEqual(isolated.show.filter(id => entries[id - 1].category !== 'muscles'), expectedContext, group.label);
      assert.deepEqual(isolated.show.filter(id => entries[id - 1].category === 'muscles'), plan(requested).show);
      assert.ok(isolated.show.every(id => !['fasciae', 'bursae', 'attachments'].includes(entries[id - 1].category)));
    }
    for (const child of group.children ?? []) check(child);
  }
  for (const group of muscles.children!) check(group);
});

test('Back sidebar and fullscreen show muscle groups directly, with unchanged optional attachment controls and no duplicate tissue menus', () => {
  const back = MUSCULOSKELETAL_MENU_GROUPS.find(group => group.id === [...root, 'back'].join('/'))!;
  assert.deepEqual(back.children!.map(group => group.label), [
    'Superficial (extrinsic)', 'Intermediate (extrinsic)', 'Deep (autochthonous)', 'Fasciae', 'Muscle Attachments (optional)',
  ]);
  const original = MUSCULOSKELETAL_GROUPS.find(group => group.id === back.id)!;
  assert.equal(back.children!.find(group => group.id.endsWith('/fasciae')),
    original.children!.find(group => group.id.endsWith('/fasciae')));
  assert.deepEqual(musculoskeletalMenuRequest([...root, 'back']), muscleRoot);
  assert.deepEqual(musculoskeletalMenuRequest([...root, 'back'], 'left'), [...muscleRoot, '@side-left']);
  assert.deepEqual(musculoskeletalMenuRequest([...root, 'back', 'attachments']), [...root, 'back', 'attachments']);
  assert.deepEqual(musculoskeletalMenuRequest([...root, 'neck']), [...root, 'neck']);
  assert.equal(back.children!.at(-1), original.children!.find(group => group.id.endsWith('/attachments')));
  for (const group of MUSCULOSKELETAL_MENU_GROUPS.filter(group => group.id !== back.id))
    assert.equal(group, MUSCULOSKELETAL_GROUPS.find(original => original.id === group.id));
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
      variant, nodes: scene.filter(item => entries[item.instanceID - 1].regions.includes('back')),
      activeNerveId: back.id, isolatedRegionPath: muscleRoot, selectedNodeId: null,
      onActivateNerve: () => {}, onIsolateRegion: () => {}, onRestoreRegion: () => {},
      onSetRegionVisibility: () => {},
    }));
    if (variant === 'sidebar') {
      assert.ok(!html.includes('aria-expanded="true"'), 'Sidebar collections remain collapsed');
      for (const label of ['Selected muscle attachments', 'Restore previous view', 'Show all'])
        assert.ok(html.includes(label), label);
      continue;
    }
    for (const label of ['Superficial (extrinsic)', 'Intermediate (extrinsic)', 'Deep (autochthonous)',
      'Transversospinal system', 'Erector spinae', 'Spinalis system', 'Fasciae', 'Selected muscle attachments', 'Restore previous view', 'Show all'])
      assert.ok(html.includes(label), `${variant}: ${label}`);
    for (const label of ['Muscles only', 'Overview —', 'Supporting bones', 'Muscles with attachments and bones'])
      assert.ok(!html.includes(label), `${variant}: remove ${label}`);
  }
});

test('Back fasciae are accessible independently with all original source memberships and muscle reference composition unchanged', () => {
  const fasciae = entries.filter(entry => entry.category === 'fasciae' && entry.regions.includes('back'));
  assert.ok(fasciae.length, 'The source contains Back fasciae');
  const path = [...root, 'back', 'fasciae'];
  const isolated = plan(path);
  assert.deepEqual(new Set(isolated.show), new Set(fasciae.map(entry => scene.find(item => item.rawName === entry.name)!.instanceID)));
  for (const id of isolated.show) {
    assert.equal(entries[id - 1].category, 'fasciae');
    assert.ok(!plan(muscleRoot).show.includes(id), 'Fasciae do not automatically cover the approved muscle reference');
  }
  for (const side of ['left', 'right']) {
    const sided = plan([...path, `@side-${side}`]);
    for (const id of sided.show) assert.notEqual(musculoskeletalSide(scene[id - 1].rawName), side === 'left' ? 'right' : 'left');
  }
});
