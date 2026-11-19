import test from 'node:test';
import assert from 'node:assert/strict';
import muscularCsv from '@assets/Final_Muscles_fused__1792221386788.csv?raw';
import skeletalCsv from '@assets/Skeletal_system_and_muscle_attachments_1792221386788.csv?raw';
import { csvRows } from './anatomicalSystems';
import {
  MUSCULOSKELETAL_SOURCE_ENTRIES as entries, MUSCULOSKELETAL_REGIONS as regions,
  classifyMusculoskeletalNode as classify, musculoskeletalSide,
  matchedMuscleAttachmentIds, MUSCULOSKELETAL_MODEL_UID,
  MUSCULOSKELETAL_GROUPS, MUSCULOSKELETAL_ROOT_PATH, musculoskeletalPathForGroup, cleanMusculoskeletalPath,
  missingRequestedCervicalMeshes, missingRequestedLowerLimbMeshes, missingRequestedThoracicMeshes,
  previousAttachmentSitesToHide,
  musculoskeletalIsolationPathForGroup,
} from './musculoskeletalTaxonomy';
import { MUSCULOSKELETAL_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import type { SceneNode } from '../types/sketchfab';
import { captureRegionIsolation, planRegionIsolation } from '../lib/regionIsolation';
import { BONES_AND_JOINTS_ID, isBoneOrJoint, skeletalRegion, SKELETAL_REGIONS } from './musculoskeletalSkeleton';
import { UPPER_LIMB_BONE_GROUPS } from './musculoskeletalSkeleton';
import jointsCsv from '@assets/Joints_1792227867661.csv?raw';
import { JOINT_SOURCE_ENTRIES, jointSkeletalRegions, jointMusculoskeletalRegions } from './musculoskeletalJoints';

const node = (rawName: string, instanceID: number): SceneNode => ({
  instanceID, rawName, name: rawName, visible: true, type: 'MatrixTransform',
});
const posteriorNeckNames = new Set([
  'Splenius capitis muscle', 'Splenius colli muscle',
  'Spinalis capitis muscle', 'Spinalis colli muscle',
  'Longissimus capitis muscle', 'Longissimus colli muscle',
  'Semispinalis colli muscle', 'Multifidus colli muscle',
  'Interspinales colli muscles', 'Iliocostalis colli muscle',
  'Rectus posterior major capitis muscle', 'Rectus posterior minor capitis muscle',
  'Rectus lateralis capitis muscle',
  'Obliquus superior capitis muscle', 'Obliquus inferior capitis muscle',
  'Levator scapulae',
]);
const thoracicParaspinalNames = new Set([
  'Levatores longi costarum', 'Levatores breves costarum',
  'Semispinalis thoracis muscle', 'Multifidus thoracis muscle',
  'Spinalis thoracis muscle', 'Interspinales thoracis muscles',
]);

test('all objects from both provided CSVs retain original names and have reviewed regional membership', () => {
  const source = [muscularCsv, skeletalCsv].flatMap(csv => [...csvRows(csv)]
    .filter(row => row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5])).map(row => row[4]));
  assert.equal(source.length, 1666);
  assert.deepEqual(entries.filter(entry => entry.source !== 'joints').map(entry => entry.name), source);
  for (const entry of entries) {
    assert.ok(entry.regions.length, entry.name);
    assert.ok(entry.regions.every(id => regions.some(region => region.id === id)), entry.name);
    assert.ok(classify(entry.name).some(result => result === entry));
    assert.ok(isNodeAllowedInAtlasView(node(entry.name, 1), MUSCULOSKELETAL_VIEW), entry.name);
  }
  assert.equal(MUSCULOSKELETAL_VIEW.modelUid, '956235f4a83f4c8da08ff7c94eb16ea7');
  assert.equal(MUSCULOSKELETAL_MODEL_UID, MUSCULOSKELETAL_VIEW.modelUid);
  assert.deepEqual(regions.map(region => region.label),
    ['Head', 'Neck', 'Upper Limb', 'Thorax', 'Back', 'Abdomen', 'Pelvis and Perineum', 'Lower Limb']);
});

test('muscle regions preserve source collections with only the requested additional regional references', () => {
  const mapping = { 'Head & Face': 'head', Neck: 'neck', 'Upper Limb': 'upper-limb', Thorax: 'thorax',
    Back: 'back', Abdomen: 'abdomen', Pelvis: 'pelvis-perineum', 'Lower Limb': 'lower-limb' };
  const muscles = entries.filter(entry => entry.category === 'muscles');
  assert.equal(muscles.length, 521);
  for (const entry of muscles) {
    const sourceRegion = mapping[entry.sourceCollection as keyof typeof mapping];
    const family = entry.name.replace(/\.[lr]$/, '');
    const expected = [...new Set([
      sourceRegion,
      ...(posteriorNeckNames.has(family) ? ['neck'] : []),
      ...(/^(Descending|Transverse) part of trapezius muscle$/.test(family) ? ['neck'] : []),
      ...(['Iliacus muscle', 'Psoas major', 'Psoas minor'].includes(family) ? ['lower-limb'] : []),
      ...(/^Gluteus (maximus|medius|minimus) muscle$/.test(family) ? ['pelvis-perineum'] : []),
      ...(thoracicParaspinalNames.has(family) ? ['thorax'] : []),
      ...(family === 'Diaphragm' ? ['abdomen'] : []),
      ...(/^Obliquus (superior|inferior) capitis muscle$/.test(family) ? ['back'] : []),
    ])];
    assert.deepEqual(entry.regions, expected, entry.name);
  }
});

test('Neck and Neck Muscles show all available posterior neck muscles without removing their original memberships', () => {
  const posterior = entries.filter(entry => entry.category === 'muscles'
    && posteriorNeckNames.has(entry.name.replace(/\.[lr]$/, '')));
  assert.equal(posterior.length, 32);
  assert.equal(new Set(posterior.map(entry => entry.name.replace(/\.[lr]$/, ''))).size, 16);
  for (const entry of posterior) {
    assert.ok(entry.regions.includes('neck'), entry.name);
    assert.ok(entry.regions.includes(entry.sourceCollection === 'Back' ? 'back' : 'head'), entry.name);
  }
  const scene = [
    ...posterior.map((entry, i) => node(entry.name, i + 1)),
    node('Latissimus dorsi muscle.l', 100),
    node('Semispinalis thoracis muscle.r', 101),
    node('Splenius colli muscle.e1l', 102),
  ];
  for (const category of [[], ['muscles']]) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, 'neck', ...category];
    const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
    assert.deepEqual(new Set(plan.show), new Set(posterior.map((_, i) => i + 1)));
    for (const id of [100, 101, 102]) assert.ok(plan.hide.includes(id));
  }
  for (const side of ['left', 'right']) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'muscles', `@side-${side}`];
    const plan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(path),
      item => musculoskeletalPathForGroup(item, path))!;
    assert.ok(plan.show.length);
    for (const id of plan.show)
      assert.notEqual(musculoskeletalSide(scene.find(item => item.instanceID === id)!.rawName), side === 'left' ? 'right' : 'left');
  }
  const attachments = entries.filter(entry => entry.category === 'attachments' && /^Splenius colli/.test(entry.name));
  assert.ok(attachments.length);
  for (const entry of attachments) {
    assert.ok(entry.regions.includes('neck'), entry.name);
    assert.ok(entry.regions.includes('back'), entry.name);
  }
});

test('every requested available cervical muscle and anatomical synonym belongs to Neck without duplicates', () => {
  const families = [
    'Semispinalis colli muscle',
    'Splenius capitis muscle', 'Splenius colli muscle',
    'Rectus posterior major capitis muscle', 'Rectus posterior minor capitis muscle',
    'Obliquus superior capitis muscle', 'Obliquus inferior capitis muscle',
    'Rectus lateralis capitis muscle', 'Longissimus capitis muscle', 'Levator scapulae',
    'Scalenus anterior muscle', 'Scalenus medius muscle', 'Scalenus posterior muscle',
    'Multifidus colli muscle', 'Interspinales colli muscles',
  ];
  for (const family of families) for (const side of ['l', 'r']) {
    const name = `${family}.${side}`;
    const matches = classify(name);
    assert.equal(matches.length, 1, name);
    assert.ok(matches[0].regions.includes('neck'), name);
    assert.equal(matches[0].category, 'muscles', name);
    assert.ok(musculoskeletalPathForGroup(node(name, 1), [...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'muscles']));
  }
  for (const [alias, source] of [
    ['Semispinalis cervicis muscle', 'Semispinalis colli muscle'],
    ['Multifidus cervicis muscle', 'Multifidus colli muscle'],
    ['Rectus capitis lateralis muscle', 'Rectus lateralis capitis muscle'],
    ['Rectus capitis posterior minor muscle', 'Rectus posterior minor capitis muscle'],
    ['Obliquus capitis inferior muscle', 'Obliquus inferior capitis muscle'],
  ]) for (const side of ['l', 'r']) {
    assert.deepEqual(classify(`${alias}.${side}.001_123`), classify(`${source}.${side}`));
  }
  for (const entry of entries.filter(entry => /^Rectus lateralis capitis muscle\.[oe]/.test(entry.name)))
    assert.ok(entry.regions.includes('neck'), entry.name);
  const sites = entries.filter(entry => entry.category === 'attachments'
    && /^Rectus lateralis capitis muscle\./.test(entry.name)).map((entry, i) => node(entry.name, i + 2));
  const leftSites = sites.filter(site => musculoskeletalSide(site.rawName) === 'left').map(site => site.instanceID);
  assert.ok(leftSites.length);
  assert.deepEqual(matchedMuscleAttachmentIds(node('Rectus capitis lateralis muscle.l', 1), sites), leftSites);
});

test('new requested cervical meshes are recognized only by specific live-node names, never fabricated or replaced with lumbar/whole-spine muscles', () => {
  const names = [
    'Semispinalis capitis muscle.l', 'Semispinalis capitis muscle.r',
    'Anterior intertransversarii cervicis muscles.l', 'Posterior intertransversarii cervicis muscles.r',
    'Rotatores cervicis muscles.l', 'Rotatores cervicis muscles.r',
  ];
  for (const name of names) {
    assert.ok(!entries.some(entry => entry.name === name));
    const classified = classify(name);
    assert.equal(classified.length, 1, name);
    assert.equal(classified[0].category, 'muscles');
    assert.deepEqual(classified[0].regions, ['neck', 'back']);
    assert.deepEqual(classify(`${name}.001_123`), classified);
  }
  const excluded = [
    'Ventral parts of lateral intertransversarii lumborum muscles.r',
    'Dorsal parts of lateral intertransversarii lumborum muscles.l',
    'Multifidus lumborum muscle.r', 'Multifidus thoracis muscle.l',
    'Semispinalis thoracis muscle.r', 'Rotatores.r',
    'Semispinalis capitis muscle.ol',
  ];
  const scene = [...names, ...excluded].map((name, i) => node(name, i + 1));
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'muscles'];
  const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
  assert.deepEqual(plan.show, names.map((_, i) => i + 1));
  assert.deepEqual(missingRequestedCervicalMeshes(scene), []);
  assert.deepEqual(missingRequestedCervicalMeshes(excluded.map(rawName => ({ rawName }))),
    ['Semispinalis capitis', 'Cervical intertransversarii', 'Cervical rotatores']);
  const sourceMeshes = entries.filter(entry => entry.category === 'muscles').map(entry => ({ rawName: entry.name }));
  assert.deepEqual(missingRequestedCervicalMeshes(sourceMeshes),
    ['Semispinalis capitis', 'Cervical intertransversarii', 'Cervical rotatores']);
});

test('descending and transverse trapezius belong to Neck and Back with optional matching attachment patches', () => {
  const trapezius = entries.filter(entry => /^(Descending|Transverse) part of trapezius muscle/.test(entry.name));
  assert.ok(trapezius.length >= 4);
  for (const entry of trapezius) assert.deepEqual(entry.regions, ['back', 'neck'], entry.name);
  const scene = [
    ...trapezius.map((entry, i) => node(entry.name, i + 1)),
    node('Levator scapulae.l', 100), node('Splenius capitis muscle.r', 101),
  ];
  for (const category of [[], ['muscles'], ['attachments']]) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, 'neck', ...category];
    const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
    for (const [i, entry] of trapezius.entries()) {
      const expected = entry.category === (category[0] === 'attachments' ? 'attachments' : 'muscles');
      assert.equal(plan.show.includes(i + 1), expected, entry.name);
    }
  }
  for (const name of ['Descending part of trapezius muscle.l', 'Descending part of trapezius muscle.r',
    'Transverse part of trapezius muscle.l', 'Transverse part of trapezius muscle.r'])
    assert.ok(musculoskeletalPathForGroup(node(name + '.001_123', 1),
      [...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'muscles', 'posterior', 'scapular']), name);
  assert.equal(musculoskeletalPathForGroup(node('Ascending part of trapezius muscle.l', 1),
    [...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'muscles']), null);
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'back', 'muscles'];
  const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
  for (const [i, entry] of trapezius.entries())
    assert.equal(plan.show.includes(i + 1), entry.category === 'muscles', entry.name);
});

test('Lower Limb includes bilateral iliacus and psoas muscles, separate from fascia and optional attachments', () => {
  const sourceNames = ['Iliacus muscle.l', 'Iliacus muscle.r', 'Psoas major.l', 'Psoas major.r'];
  for (const name of sourceNames) {
    assert.equal(classify(name).length, 1);
    assert.equal(classify(name)[0].category, 'muscles');
    assert.deepEqual(classify(name)[0].regions, ['pelvis-perineum', 'lower-limb']);
    assert.ok(entries.some(entry => entry.name === name));
  }
  assert.deepEqual(classify('Psoas major muscle.r.001_123'), classify('Psoas major.r'));
  const liveNames = ['Psoas minor muscle.l', 'Psoas minor muscle.r'];
  for (const name of liveNames) {
    assert.ok(!entries.some(entry => entry.name === name), 'No fabricated source record');
    assert.equal(classify(name)[0].category, 'muscles');
    assert.deepEqual(classify(name)[0].regions, ['pelvis-perineum', 'lower-limb']);
  }
  const scene = [
    ...[...sourceNames, ...liveNames].map((name, i) => node(name, i + 1)),
    node('Iliopsoas fascia.l', 100), node('Iliopsoas fascia.r', 101),
    node('Iliacus muscle.ol', 102), node('Rectus lateralis capitis muscle.l', 103),
  ];
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb', 'muscles'];
  const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
  assert.deepEqual(plan.show, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plan.hide, [100, 101, 102, 103]);
  for (const [side, expected] of [['left', [1, 3, 5]], ['right', [2, 4, 6]]] as const) {
    const sided = [...path, `@side-${side}`];
    const sidePlan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(sided),
      item => musculoskeletalPathForGroup(item, sided))!;
    assert.deepEqual(sidePlan.show, expected);
  }
  assert.ok(classify('Iliacus muscle.ol')[0].regions.includes('lower-limb'));
  assert.deepEqual(missingRequestedLowerLimbMeshes(sourceNames.map(rawName => ({ rawName }))), ['Psoas minor']);
  assert.deepEqual(missingRequestedLowerLimbMeshes(scene), []);
  assert.deepEqual(missingRequestedLowerLimbMeshes([node('Iliopsoas fascia.l', 1), node('Psoas minor.ol', 2)]),
    ['Iliacus', 'Psoas major', 'Psoas minor']);
});

test('Thorax includes bilateral costal levators, thoracic transversospinal muscles, spinalis and interspinales without losing Back membership', () => {
  const muscles = entries.filter(entry => entry.category === 'muscles'
    && thoracicParaspinalNames.has(entry.name.replace(/\.[lr]$/, '')));
  assert.equal(muscles.length, 12);
  for (const entry of muscles) assert.deepEqual(entry.regions, ['back', 'thorax'], entry.name);
  const scene = [
    ...muscles.map((entry, i) => node(entry.name, i + 1)),
    node('Multifidus lumborum muscle.l', 100),
    node('Ventral parts of lateral intertransversarii lumborum muscles.r', 101),
    node('Semispinalis colli muscle.r', 102),
    node('Spinalis capitis muscle.l', 103),
    node('Rotatores.r', 104), node('Levatores longi costarum.e1l', 105),
  ];
  for (const category of [[], ['muscles']]) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, 'thorax', ...category];
    const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
    assert.deepEqual(plan.show, muscles.map((_, i) => i + 1));
    assert.deepEqual(plan.hide, [100, 101, 102, 103, 104, 105]);
  }
  for (const side of ['left', 'right']) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, 'thorax', 'muscles', `@side-${side}`];
    const plan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(path),
      item => musculoskeletalPathForGroup(item, path))!;
    assert.equal(plan.show.length, 6);
    for (const id of plan.show) assert.equal(musculoskeletalSide(scene[id - 1].rawName), side);
  }
  for (const name of ['Levatores longi costarum', 'Levatores breves costarum']) {
    const [_, length] = name.split(' ');
    assert.deepEqual(classify(`Levatores costarum ${length}.l.001_123`), classify(`${name}.l`));
  }
  const sites = entries.filter(entry => entry.category === 'attachments' && /^Levatores longi costarum\./.test(entry.name));
  assert.ok(sites.length);
  for (const entry of sites) assert.deepEqual(entry.regions, ['back', 'thorax']);
});

test('Thorax supports specifically named live thoracic intertransversarii and rotatores without fabricating source records or borrowing lumbar/whole-spine meshes', () => {
  const names = [
    'Intertransversarii thoracis muscles.l', 'Intertransversarii thoracis muscles.r',
    'Rotatores breves thoracis muscles.l', 'Rotatores longi thoracis muscles.r',
  ];
  for (const name of names) {
    assert.ok(!entries.some(entry => entry.name === name));
    assert.equal(classify(name)[0].category, 'muscles');
    assert.deepEqual(classify(name)[0].regions, ['back', 'thorax']);
    assert.deepEqual(classify(`${name}.001_123`), classify(name));
  }
  const excluded = [
    'Rotatores.l', 'Ventral parts of lateral intertransversarii lumborum muscles.l',
    'Multifidus colli muscle.r', 'Intertransversarii thoracis muscles.ol',
  ];
  const scene = [...names, ...excluded].map((name, i) => node(name, i + 1));
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'thorax', 'muscles'];
  const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
  assert.deepEqual(plan.show, [1, 2, 3, 4]);
  assert.deepEqual(missingRequestedThoracicMeshes(scene), []);
  assert.deepEqual(missingRequestedThoracicMeshes(excluded.map(rawName => ({ rawName }))),
    ['Thoracic intertransversarii', 'Thoracic rotatores']);
  assert.deepEqual(missingRequestedThoracicMeshes(entries.filter(entry => entry.category === 'muscles')
    .map(entry => ({ rawName: entry.name }))), ['Thoracic intertransversarii', 'Thoracic rotatores']);
});

test('fasciae and bursae are regional, not copied into every region', () => {
  assert.deepEqual(classify('Deltoid fascia.r')[0].regions, ['upper-limb']);
  assert.deepEqual(classify('Epicranial aponeurosis.l')[0].regions, ['head']);
  assert.deepEqual(classify('Transversalis fascia')[0].regions, ['abdomen']);
  assert.deepEqual(classify('Subacromial bursa.r')[0].regions, ['upper-limb']);
  assert.deepEqual(classify('Subtendinous bursa of trapezius muscle.l')[0].regions, ['back']);
  for (const entry of entries.filter(entry => ['fasciae', 'bursae'].includes(entry.category)))
    assert.ok(entry.regions.length <= 2, entry.name);
});

test('shared skeletal structures reference one source object in several appropriate regions', () => {
  assert.deepEqual(classify('Vertebra T1')[0].regions, ['thorax', 'back', 'abdomen', 'neck']);
  assert.deepEqual(classify('Vertebra L1')[0].regions, ['back', 'abdomen', 'pelvis-perineum', 'lower-limb']);
  assert.deepEqual(classify('Atlas (C1)')[0].regions, ['neck', 'back']);
  assert.deepEqual(classify('Sacrum')[0].regions, ['pelvis-perineum', 'back', 'abdomen', 'lower-limb']);
  assert.deepEqual(classify('Femur.r')[0].regions, ['lower-limb']);
});

test('Lower Limb includes psoas major and T12/L1–L5 in their normal muscle/bone collections and combined regional view', () => {
  const spine = ['Vertebra T12', ...[1, 2, 3, 4, 5].map(level => `Vertebra L${level}`)];
  const scene = [
    ...spine.map((name, i) => node(name, i + 1)),
    node('Psoas major.l', 7), node('Psoas major.r', 8),
    node('Psoas major muscle.001_123', 9),
    node('Femur.l', 10), node('Femur.r', 11),
    node('Vertebra T11', 12), node('Atlas (C1)', 13),
    node('Iliopsoas fascia.l', 14), node('Iliacus muscle.ol', 15),
  ];
  for (const name of ['Psoas major', 'Psoas major muscle', 'Psoas_major_muscle.001_123']) {
    assert.equal(classify(name)[0].category, 'muscles');
    assert.deepEqual(classify(name)[0].regions, ['pelvis-perineum', 'lower-limb']);
    assert.ok(!entries.some(entry => entry.name === name), 'Only recognize actual live names, never add fake CSV geometry');
  }
  for (const name of spine) assert.ok(classify(name)[0].regions.includes('lower-limb'));
  const root = [...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb'];
  for (const [category, required, excluded] of [
    [[], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [12, 13, 15]],
    [['muscles'], [7, 8, 9], [1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15]],
    [['bones'], [1, 2, 3, 4, 5, 6, 10, 11], [7, 8, 9, 12, 13, 14, 15]],
  ] as const) {
    const path = [...root, ...category];
    const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
    for (const id of required) assert.ok(plan.show.includes(id), scene.find(item => item.instanceID === id)!.rawName);
    for (const id of excluded) assert.ok(plan.hide.includes(id));
  }
  for (const side of ['left', 'right']) {
    const path = [...root, `@side-${side}`];
    const plan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(path),
      item => musculoskeletalPathForGroup(item, path))!;
    for (const id of [1, 2, 3, 4, 5, 6, 9]) assert.ok(plan.show.includes(id), 'Keep midline spine and an unsided psoas mesh');
    assert.ok(plan.show.includes(side === 'left' ? 7 : 8));
    assert.ok(plan.hide.includes(side === 'left' ? 8 : 7));
  }
});

test('Abdomen includes the diaphragm as a muscle without removing its Thorax membership or adding diaphragmatic fascia', () => {
  const diaphragm = entries.find(entry => entry.name === 'Diaphragm' && entry.category === 'muscles');
  assert.ok(diaphragm, 'Use the supplied diaphragm mesh');
  assert.ok(diaphragm.regions.includes('abdomen'));
  assert.ok(diaphragm.regions.includes('thorax'));
  const scene = [node('Diaphragm', 1), node('Diaphragmatic fascia', 2), node('Deltoid muscle.l', 3)];
  for (const region of ['abdomen', 'thorax']) {
    for (const parts of [[], ['muscles']]) {
      const scope = [...MUSCULOSKELETAL_ROOT_PATH, region, ...parts];
      const plan = planRegionIsolation(scene, 'muscular', scope, item => musculoskeletalPathForGroup(item, scope))!;
      assert.ok(plan.show.includes(1), `${region}: ${parts.join('/') || 'whole region'}`);
      assert.ok(!plan.show.includes(3));
      if (region === 'abdomen') assert.ok(!plan.show.includes(2));
    }
    for (const suffix of ['', '.001_123']) {
      const alias = node('Diaphragm' + suffix, 1);
      assert.ok(isNodeAllowedInAtlasView(alias, MUSCULOSKELETAL_VIEW));
      assert.ok(musculoskeletalPathForGroup(alias, [...MUSCULOSKELETAL_ROOT_PATH, region, 'muscles']));
    }
  }
});

test('Pelvis shows all six gluteal muscles while retaining Lower Limb membership and optional matching attachments', () => {
  const gluteal = entries.filter(entry => entry.category === 'muscles'
    && /^Gluteus (maximus|medius|minimus) muscle\.[lr]$/.test(entry.name));
  assert.equal(gluteal.length, 6);
  const sites = entries.filter(entry => entry.category === 'attachments'
    && /^Gluteus (maximus|medius|minimus) muscle\.[oe]/.test(entry.name));
  assert.equal(sites.length, 10);
  for (const entry of [...gluteal, ...sites])
    assert.deepEqual(entry.regions, ['lower-limb', 'pelvis-perineum'], entry.name);
  const scene = [
    ...gluteal.map((entry, i) => node(entry.name, i + 1)),
    ...sites.map((entry, i) => node(entry.name, i + 7)),
    node('Hip bone.l', 100), node('Hip bone.r', 101),
    node('Vastus lateralis muscle.r', 102),
    node('Sciatic bursa of gluteus maximus muscle.l', 103),
  ];
  for (const region of ['pelvis-perineum', 'lower-limb']) {
    for (const category of [[], ['muscles']]) {
      const path = [...MUSCULOSKELETAL_ROOT_PATH, region, ...category];
      const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
      for (let id = 1; id <= 6; id++) assert.ok(plan.show.includes(id));
      for (let id = 7; id <= 16; id++) assert.ok(plan.hide.includes(id), 'Sites remain opt-in');
      if (region === 'pelvis-perineum' && category[0] === 'muscles') assert.deepEqual(plan.show, [1, 2, 3, 4, 5, 6]);
    }
  }
  for (const side of ['left', 'right']) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, 'pelvis-perineum', 'muscles', `@side-${side}`];
    const plan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(path),
      item => musculoskeletalPathForGroup(item, path))!;
    assert.equal(plan.show.length, 3);
    for (const id of plan.show) assert.equal(musculoskeletalSide(scene[id - 1].rawName), side);
  }
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'pelvis-perineum', 'attachments'];
  const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
  assert.deepEqual(new Set(plan.show), new Set([...sites.map((_, i) => i + 7), 100, 101]));
  for (const muscle of scene.slice(0, 6)) {
    const matching = matchedMuscleAttachmentIds(muscle, scene);
    assert.ok(matching.length);
    for (const id of matching) {
      const site = scene.find(item => item.instanceID === id)!;
      assert.equal(musculoskeletalSide(site.rawName), musculoskeletalSide(muscle.rawName));
      assert.equal(site.rawName.split('.')[0], muscle.rawName.split('.')[0]);
    }
  }
});

test('Pelvis includes T12 and L1–L5 for psoas in Bones, whole-region and attachment views without importing the remaining thoracic spine', () => {
  const names = ['Vertebra T12', ...[1, 2, 3, 4, 5].map(level => `Vertebra L${level}`)];
  for (const name of names) {
    assert.ok(classify(name)[0].regions.includes('pelvis-perineum'), name);
    assert.ok(classify(name)[0].regions.includes('back'));
    assert.ok(classify(name)[0].regions.includes('abdomen'));
    assert.equal(skeletalRegion(classify(name)[0]), name === 'Vertebra T12' ? 'thoracic' : 'lumbar');
  }
  const scene = [
    ...names.map((name, i) => node(name, i + 1)),
    node('Hip bone.l', 7), node('Hip bone.r', 8), node('Sacrum', 9),
    node('Coccyx', 10), node('Psoas major.r', 11),
    node('Vertebra T11', 12), node('Humerus.r', 13), node('Iliacus muscle.ol', 14),
  ];
  const root = [...MUSCULOSKELETAL_ROOT_PATH, 'pelvis-perineum'];
  for (const category of [[], ['bones'], ['attachments']]) {
    const path = [...root, ...category];
    const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
    for (let id = 1; id <= 10; id++) assert.ok(plan.show.includes(id));
    assert.ok(plan.hide.includes(12));
    assert.ok(plan.hide.includes(13));
    assert.equal(plan.show.includes(11), category.length === 0);
    assert.equal(plan.show.includes(14), category[0] === 'attachments');
    if (category[0] === 'bones') assert.deepEqual(plan.show, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }
  for (const side of ['left', 'right']) {
    const path = [...root, 'bones', `@side-${side}`];
    const plan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(path),
      item => musculoskeletalPathForGroup(item, path))!;
    for (let id = 1; id <= 6; id++) assert.ok(plan.show.includes(id), 'Midline psoas vertebrae stay on either side');
    assert.ok(plan.show.includes(side === 'left' ? 7 : 8));
    assert.ok(plan.hide.includes(side === 'left' ? 8 : 7));
  }
});

test('Lower Limb includes the sacrum in Bones and the regional view, retaining its other references and midline visibility', () => {
  const sacrum = node('Sacrum', 1);
  assert.deepEqual(classify(sacrum.rawName)[0].regions, ['pelvis-perineum', 'back', 'abdomen', 'lower-limb']);
  for (const category of [[], ['bones']]) for (const side of [[], ['@side-left'], ['@side-right']]) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb', ...category, ...side];
    const plan = planRegionIsolation([sacrum, node('Coccyx', 2)], 'muscular',
      cleanMusculoskeletalPath(path), item => musculoskeletalPathForGroup(item, path))!;
    assert.deepEqual(plan.show, [1]);
    assert.deepEqual(plan.hide, [2]);
  }
});

test('Abdomen includes all ribs, pelvis and thoracolumbar vertebrae in Bones and the whole regional view', () => {
  const bones = entries.filter(entry => entry.category === 'bones'
    && /\brib\b|vertebra [tl]\d|hip bone|sacrum|coccyx/i.test(entry.name));
  assert.equal(bones.length, 45);
  assert.equal(bones.filter(entry => /\brib\b/i.test(entry.name)).length, 24);
  assert.equal(bones.filter(entry => /vertebra t\d/i.test(entry.name)).length, 12);
  assert.equal(bones.filter(entry => /vertebra l\d/i.test(entry.name)).length, 5);
  for (const entry of bones) {
    assert.ok(entry.regions.includes('abdomen'), entry.name);
    if (/\brib\b|vertebra t\d/i.test(entry.name)) assert.ok(entry.regions.includes('thorax'));
    if (/hip bone|sacrum|coccyx/i.test(entry.name)) assert.ok(entry.regions.includes('pelvis-perineum'));
  }
  const scene = [
    ...bones.map((entry, i) => node(entry.name, i + 1)),
    node('Rectus abdominis muscle.l', 100), node('Transversalis fascia.l', 101),
    node('Humerus.r', 102), node('Atlas (C1)', 103),
    node('Iliacus muscle.ol', 104), node('Guide axis', 105),
  ];
  const root = [...MUSCULOSKELETAL_ROOT_PATH, 'abdomen'];
  for (const category of [[], ['bones'], ['attachments']]) {
    const path = [...root, ...category];
    const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
    for (let id = 1; id <= 45; id++) assert.ok(plan.show.includes(id), `${path.join('/')}: ${scene[id - 1].rawName}`);
    for (const id of [102, 103, 104, 105]) assert.ok(plan.hide.includes(id));
    if (category[0] === 'bones') assert.deepEqual(plan.show, bones.map((_, i) => i + 1));
  }
  for (const side of ['left', 'right']) {
    const path = [...root, 'bones', `@side-${side}`];
    const plan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(path),
      item => musculoskeletalPathForGroup(item, path))!;
    assert.equal(plan.show.length, 32, '12 sided ribs + hip bone + 19 midline spine/pelvic bones');
    for (const id of plan.show)
      assert.notEqual(musculoskeletalSide(scene[id - 1].rawName), side === 'left' ? 'right' : 'left');
  }
});

test('Upper Limb exposes all 64 bones in five functional bone collections, with side filtering and no muscles or attachment patches', () => {
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb', 'bones'];
  const bones = entries.filter(entry => entry.category === 'bones' && entry.regions.includes('upper-limb'));
  assert.equal(bones.length, 64);
  const group = MUSCULOSKELETAL_GROUPS.find(group => group.label === 'Upper Limb')!
    .children!.find(group => group.label === 'Bones')!;
  assert.deepEqual(group.children!.map(child => child.label), UPPER_LIMB_BONE_GROUPS.map(child => child.label));
  const scene = [
    ...bones.map((entry, i) => node(entry.name, i + 1)),
    node('Humerus.r.001_123', 100),
    node('Femur.l', 101), node('Deltoid fascia.r', 102),
    node('Long head of biceps brachii.l', 103), node('Thyrohyoid muscle.or', 104),
  ];
  const expectedCounts = [4, 2, 4, 16, 38];
  const grouped = new Set<number>();
  for (const [index, child] of UPPER_LIMB_BONE_GROUPS.entries()) {
    const request = [...path, child.id];
    const plan = planRegionIsolation(scene, 'muscular', request, item => musculoskeletalPathForGroup(item, request))!;
    assert.equal(plan.show.length, expectedCounts[index] + (child.id === 'arm' ? 1 : 0), child.label);
    for (const id of plan.show) {
      assert.ok(!grouped.has(id), 'No duplicate bone membership');
      grouped.add(id);
    }
    for (const side of ['left', 'right']) {
      const sided = [...request, `@side-${side}`];
      const sidePlan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(sided),
        item => musculoskeletalPathForGroup(item, sided))!;
      assert.ok(sidePlan.show.length);
      assert.ok(sidePlan.show.every(id => musculoskeletalSide(scene.find(item => item.instanceID === id)!.rawName) === side));
    }
  }
  assert.deepEqual(grouped, new Set([...bones.map((_, i) => i + 1), 100]));
  const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
  assert.deepEqual(new Set(plan.show), grouped);
  assert.deepEqual(plan.hide, [101, 102, 103, 104]);
  for (const name of ['Scapula.l', 'Scapula.r']) assert.ok(classify(name)[0].regions.includes('back'));
});

test('only supplied articular structures are joints/ligaments; muscle attachment patches are never joints', () => {
  for (const entry of entries.filter(entry => entry.sourceCollection === 'MUSCLE_ATTACHMENTS'))
    assert.equal(entry.category, 'attachments', entry.name);
  for (const name of ['Depressor septi nasi.ol', 'Sternocostal head of pectoralis major muscle.e1l'])
    assert.ok(classify(name).every(entry => entry.category === 'attachments'), name);
  for (const name of ['Costal cartilage of first rib.l', 'Common extensor tendon.ol', 'Long plantar ligament.o1r'])
    assert.ok(classify(name).every(entry => entry.category === 'joints-ligaments'), name);
  assert.ok(classify('Second rib.l').every(entry => entry.category === 'bones'));
  assert.deepEqual(classify('Invented knee joint'), []);
  assert.equal(isNodeAllowedInAtlasView(node('Guide axis', 1), MUSCULOSKELETAL_VIEW), false);
});

test('runtime duplicate suffixes and exact attachment side/site suffixes match without merging identities', () => {
  assert.equal(classify('Thyrohyoid muscle.r.001_123')[0].name, 'Thyrohyoid muscle.r');
  assert.equal(musculoskeletalSide('Thyrohyoid muscle.e2l_123'), 'left');
  assert.equal(musculoskeletalSide('Thyrohyoid muscle.or.001'), 'right');
  assert.equal(musculoskeletalSide('Sacrum'), 'bilateral');
  assert.ok(classify('Articular capsules of metacarpophalangeal joints.r.001')
    .some(entry => entry.name.endsWith('.r.001')));
});

test('optional attachments match the actual muscle identity and side, never suffix alone or an unrelated muscle', () => {
  const rightMuscle = node('Thyrohyoid muscle.r', 1);
  const sites = entries.filter(entry => entry.category === 'attachments'
    && entry.name.startsWith('Thyrohyoid muscle.')).map((entry, i) => node(entry.name, i + 2));
  assert.ok(sites.length >= 2);
  const expected = sites.filter(site => musculoskeletalSide(site.rawName) === 'right').map(site => site.instanceID);
  assert.ok(expected.length);
  assert.deepEqual(matchedMuscleAttachmentIds(rightMuscle,
    [...sites, node('Sartorius muscle.or', 100), node('Femur.r', 101)]), expected);
  assert.deepEqual(matchedMuscleAttachmentIds(node('Femur.r', 101), sites), []);
  assert.deepEqual(matchedMuscleAttachmentIds(node('Unknown muscle.r', 102), sites), []);
  assert.deepEqual(matchedMuscleAttachmentIds(node('Thyrohyoid muscle.l', 103),
    [node('Sartorius muscle.ol', 104)]), []);
});

test('regional data adapts to the same category-strip and nested collection-tree contract as the existing atlases', () => {
  assert.equal(MUSCULOSKELETAL_GROUPS[0].label, 'Bones and joints');
  assert.deepEqual(MUSCULOSKELETAL_GROUPS.slice(1).map(group => group.label), regions.map(region => region.label));
  for (const region of MUSCULOSKELETAL_GROUPS.slice(1)) {
    assert.equal(region.id.split('/').length, 3);
    assert.ok(region.children!.every(child => child.id.startsWith(`${region.id}/`)));
    assert.ok(region.children!.some(child => child.label === 'Muscles'));
    assert.equal(new Set(region.children!.map(child => child.id)).size, region.children!.length);
  }
  const scene = [
    { ...node('Humerus.l', 1), systemId: 'skeletal' as const },
    { ...node('Humerus.r', 2), systemId: 'skeletal' as const },
    { ...node('Long head of biceps brachii.l', 3), systemId: 'muscular' as const },
    { ...node('Long head of biceps brachii.r', 4), systemId: 'muscular' as const },
    { ...node('Long head of biceps brachii.ol', 5), systemId: 'attachments' as const },
    node('Femur.l', 6), node('Guide axis', 7),
  ];
  for (const [suffix, expected] of [
    [[], [1, 2, 3, 4]],
    [['bones'], [1, 2]],
    [['muscles'], [3, 4]],
    [['attachments'], [1, 2, 5]],
    [['attachments', 'sites'], [5]],
    [['attachments', 'bones'], [1, 2]],
    [['@side-left'], [1, 3]],
    [['muscles', '@side-right'], [4]],
  ] as const) {
    const requested = [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb', ...suffix];
    const plan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(requested),
      item => musculoskeletalPathForGroup(item, requested))!;
    assert.ok(plan);
    assert.deepEqual(new Set(plan.show), new Set(expected), requested.join('/'));
    assert.ok(plan.hide.includes(7), 'Unknown geometry is hidden by regional isolation');
  }
});

test('all regional whole-category attachment views include supporting bones and sites, but no muscles, joints or fascia', () => {
  const scene = entries.map((entry, i) => node(entry.name, i + 1));
  for (const region of regions) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, region.id, 'attachments'];
    const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
    assert.ok(plan, region.label);
    const shown = plan.show.map(id => entries[id - 1]);
    assert.ok(shown.some(entry => entry.category === 'bones'), region.label);
    assert.ok(shown.some(entry => entry.category === 'attachments'), region.label);
    assert.ok(shown.every(entry => ['bones', 'attachments'].includes(entry.category)), region.label);
    const group = MUSCULOSKELETAL_GROUPS.find(group => group.id.endsWith(`/${region.id}`))!
      .children!.find(group => group.id.endsWith('/attachments'))!;
    assert.deepEqual(group.children!.map(child => child.label), ['Attachment sites', 'Supporting bones']);
    for (const subdivision of ['sites', 'bones']) {
      const request = [...path, subdivision];
      const subPlan = planRegionIsolation(scene, 'muscular', request, item => musculoskeletalPathForGroup(item, request))!;
      assert.ok(subPlan.show.length);
      assert.ok(subPlan.show.every(id => entries[id - 1].category === (subdivision === 'sites' ? 'attachments' : 'bones')));
    }
    for (const side of ['left', 'right']) {
      const request = [...path, `@side-${side}`];
      const sidePlan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(request),
        item => musculoskeletalPathForGroup(item, request))!;
      assert.ok(sidePlan.show.length);
      for (const id of sidePlan.show)
        assert.notEqual(musculoskeletalSide(scene[id - 1].rawName), side === 'left' ? 'right' : 'left');
    }
  }
});

test('Lower Limb attachments include pelvic and lumbar support for iliacus/psoas without changing bone taxonomy or individual selection', () => {
  const scene = [
    node('Iliacus muscle.ol', 1), node('Iliacus muscle.or', 2),
    node('Hip bone.l', 3), node('Hip bone.r', 4),
    node('Femur.l', 5), node('Femur.r', 6),
    node('Vertebra L1', 7), node('Humerus.l', 8),
    node('Iliacus muscle.l', 9), node('Iliopsoas fascia.l', 10),
  ];
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb', 'attachments'];
  const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
  assert.deepEqual(plan.show, [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(plan.hide, [8, 9, 10]);
  assert.deepEqual(classify('Hip bone.l')[0].regions, ['pelvis-perineum', 'abdomen', 'lower-limb']);
  assert.deepEqual(matchedMuscleAttachmentIds(scene[8], scene), [1], 'Individual toggle still returns patches, not bones');
  assert.deepEqual(previousAttachmentSitesToHide([1, 2], scene, path), []);
  assert.deepEqual(previousAttachmentSitesToHide([1, 2], scene, [...path, '@side-left']), [2]);
  assert.deepEqual(previousAttachmentSitesToHide([1, 2], scene, [...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb']), [1, 2]);
  assert.deepEqual(previousAttachmentSitesToHide([1, 2], scene, [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb', 'attachments']), [1, 2]);
});

test('both iliac hip bones are available in Lower Limb Bones and retained throughout every Lower Limb subgroup', () => {
  const hips = [node('Hip bone.l', 1), node('Hip bone.r', 2)];
  for (const hip of hips) {
    assert.ok(entries.some(entry => entry.name === hip.rawName && entry.source === 'skeletal'));
    assert.deepEqual(classify(hip.rawName)[0].regions, ['pelvis-perineum', 'abdomen', 'lower-limb']);
    assert.equal(skeletalRegion(classify(hip.rawName)[0]), 'pelvis', 'Whole-skeleton classification stays pelvic');
    assert.ok(musculoskeletalPathForGroup(hip, [...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb', 'bones']));
  }
  const scene = [...hips, node('Humerus.l', 3), node('Hip bone.l.001_42', 4)];
  const lower = MUSCULOSKELETAL_GROUPS.find(g => g.id.endsWith('/lower-limb'))!;
  const visit = (group: typeof lower) => {
    const path = group.id.split('/');
    for (const side of ['both', 'left', 'right']) {
      const requested = [...path, ...(side === 'both' ? [] : [`@side-${side}`])];
      const plan = planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(requested),
        n => musculoskeletalIsolationPathForGroup(n, requested))!;
      assert.ok(plan);
      assert.equal(plan.show.includes(1), side !== 'right', `${group.id}: left hip`);
      assert.equal(plan.show.includes(2), side !== 'left', `${group.id}: right hip`);
      assert.equal(plan.show.includes(4), side !== 'right', 'Runtime aliases keep laterality');
      assert.ok(plan.hide.includes(3), 'No unrelated upper-limb bones');
    }
    group.children?.forEach(visit);
  };
  visit(lower);
  assert.equal(musculoskeletalPathForGroup(hips[0], [...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb', 'muscles']), null,
    'Hip bones stay independently controlled in Bones, not mixed into muscle controls');
});

test('whole-body Bones and joints precedes Head and includes every available skeletal/articular source object only', () => {
  const path = [...MUSCULOSKELETAL_ROOT_PATH, BONES_AND_JOINTS_ID];
  const group = MUSCULOSKELETAL_GROUPS[0];
  assert.equal(group.id, path.join('/'));
  assert.equal(MUSCULOSKELETAL_GROUPS[1].label, 'Head');
  assert.deepEqual(group.children!.map(child => child.label), SKELETAL_REGIONS.map(region => region.label));
  const allNodes = entries.map((entry, i) => node(entry.name, i + 1));
  const plan = planRegionIsolation(allNodes, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
  const shown = new Set(plan.show);
  for (const [i, entry] of entries.entries()) {
    assert.equal(shown.has(i + 1), isBoneOrJoint(entry), entry.name);
    if (isBoneOrJoint(entry)) {
      assert.ok(skeletalRegion(entry), entry.name);
      assert.ok(musculoskeletalPathForGroup(node(entry.name, i), path), entry.name);
    }
  }
  const expected = {
    'Frontal bone': 'skull', 'Atlas (C1)': 'cervical', 'Humerus.l': 'upper-limb',
    'Vertebra T1': 'thoracic', 'Vertebra L1': 'lumbar', Sacrum: 'pelvis', 'Femur.r': 'lower-limb',
  };
  for (const [name, region] of Object.entries(expected)) {
    assert.equal(musculoskeletalPathForGroup(node(name, 1), path)?.[3], region, name);
  }
  for (const child of group.children!) for (const category of child.children!) {
    const childPath = category.id.split('/');
    assert.ok(allNodes.some(item => musculoskeletalPathForGroup(item, childPath)), category.id);
  }
  const left = musculoskeletalPathForGroup(node('Humerus.r', 1), [...path, '@side-left']);
  assert.equal(left, null);
  assert.ok(musculoskeletalPathForGroup(node('Humerus.l', 1), [...path, '@side-left']));
});

test('all 415 joint-export meshes are admitted to Bones and joints, without empty placeholders or duplicate geometry records', () => {
  const rows = [...csvRows(jointsCsv)];
  const meshes = rows.filter(row => row[0] === 'OBJECT' && row[5] === 'MESH');
  const empties = rows.filter(row => row[0] === 'OBJECT' && row[5] === 'EMPTY');
  assert.equal(meshes.length, 415);
  assert.equal(empties.length, 113);
  assert.deepEqual(JOINT_SOURCE_ENTRIES.map(entry => entry.name), meshes.map(row => row[4]));
  const path = [...MUSCULOSKELETAL_ROOT_PATH, BONES_AND_JOINTS_ID];
  const missing = JOINT_SOURCE_ENTRIES.filter(entry => !entry.regions.length || !entry.skeletalRegions?.length);
  assert.deepEqual(missing.map(entry => entry.name), [], 'Every supplied mesh must have reviewed regional membership');
  for (const entry of JOINT_SOURCE_ENTRIES) {
    assert.ok(classify(entry.name).some(result => result.category === 'joints-ligaments'), entry.name);
    assert.ok(isNodeAllowedInAtlasView(node(entry.name, 1), MUSCULOSKELETAL_VIEW), entry.name);
    assert.ok(musculoskeletalPathForGroup(node(entry.name, 1), path), entry.name);
    assert.ok(musculoskeletalPathForGroup(node(`${entry.name}.001_77`, 1), path), entry.name);
    for (const region of entry.skeletalRegions!) {
      assert.ok(musculoskeletalPathForGroup(node(entry.name, 1), [...path, region, 'joints-ligaments']),
        `${entry.name} in ${region}`);
    }
  }
  for (const row of empties) assert.deepEqual(classify(row[4]), [], row[4]);
  assert.equal(entries.filter(entry => entry.name === 'Articular capsules of metacarpophalangeal joints.r').length, 1);
  const scene = [...meshes.map((row, i) => node(row[4], i + 1)),
    node('Humerus.l', 1000), node('Deltoid muscle.l', 1001), node('Deltoid.ol', 1002), node('Guide axis', 1003)];
  const plan = planRegionIsolation(scene, 'muscular', path, item => musculoskeletalPathForGroup(item, path))!;
  assert.deepEqual(plan.show, [...meshes.map((_, i) => i + 1), 1000]);
  assert.deepEqual(plan.hide, [1001, 1002, 1003]);
  assert.equal(musculoskeletalPathForGroup(node('Anterior cruciate ligament.r', 1), [...path, '@side-left']), null);
  assert.ok(musculoskeletalPathForGroup(node('Anterior cruciate ligament.l', 1), [...path, '@side-left']));
});

test('joint regional references respect spinal levels, body regions and continuous source geometry', () => {
  const examples = {
    'Articular disc of temporomandibular joint.l': ['skull'],
    'Median cricothyroid ligament': ['cervical'],
    'Coraco-acromial ligament.r': ['upper-limb'],
    'Radiate ligament of head of rib.l': ['thoracic'],
    'Intervertebral disc C7-T1': ['cervical', 'thoracic'],
    'Nucleus pulposus T12-L1': ['thoracic', 'lumbar'],
    'Intervertebral disc L5-S1': ['lumbar', 'pelvis'],
    'Iliolumbar ligament.l': ['lumbar', 'pelvis'],
    'Interpubic disc': ['pelvis'],
    'Acetabular labrum.l': ['pelvis', 'lower-limb'],
    'Anterior cruciate ligament.l': ['lower-limb'],
    'Palmar interphalangeal ligaments.r': ['upper-limb'],
    'Plantar interphalangeal ligaments.r': ['lower-limb'],
    'Superficial part of tibial collateral ligament.r': ['lower-limb'],
    'Anterior longitudinal ligament': ['cervical', 'thoracic', 'lumbar'],
  };
  for (const [name, expected] of Object.entries(examples)) assert.deepEqual(jointSkeletalRegions(name), expected, name);
  assert.deepEqual(jointSkeletalRegions('Invented ligament'), []);
});

test('every regional collection exposes its relevant CSV joints, merged with bones in Abdomen', () => {
  const jointNodes = JOINT_SOURCE_ENTRIES.map((entry, i) => ({ ...node(entry.name, i + 1), systemId: 'skeletal' as const }));
  for (const region of regions) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, region.id, region.id === 'abdomen' ? 'bones' : 'joints-ligaments'];
    const group = MUSCULOSKELETAL_GROUPS.find(group => group.id === path.slice(0, 3).join('/'))!;
    assert.ok(group.children!.some(child => child.id === path.join('/')), region.label);
    const expected = JOINT_SOURCE_ENTRIES.flatMap((entry, i) => entry.regions.includes(region.id) ? [i + 1] : []);
    assert.ok(expected.length, region.label);
    const plan = planRegionIsolation(jointNodes, 'skeletal', path, item => musculoskeletalPathForGroup(item, path))!;
    assert.deepEqual(plan.show, expected, region.label);
    assert.equal(plan.hide.length + plan.show.length, jointNodes.length, region.label);
    for (const id of expected) assert.ok(
      musculoskeletalPathForGroup(jointNodes[id - 1], path.slice(0, 3)), `${region.label}: ${jointNodes[id - 1].name}`);
  }
});

test('regional joints include shared boundary structures without adding unrelated joints', () => {
  const examples = {
    'Articular disc of temporomandibular joint.l': ['head'],
    'Stylohyoid ligament.l': ['neck', 'head'],
    'Median cricothyroid ligament': ['neck'],
    'Articular capsule of sternoclavicular joint.l': ['upper-limb', 'thorax'],
    'Anterior cruciate ligament.l': ['lower-limb'],
    'Inguinal ligament.r': ['pelvis-perineum', 'abdomen'],
    'Posterior sacro-iliac ligament.r': ['pelvis-perineum', 'back'],
  };
  for (const [name, expected] of Object.entries(examples)) {
    assert.deepEqual(jointMusculoskeletalRegions(name), expected, name);
    for (const region of expected) assert.ok(musculoskeletalPathForGroup(node(name, 1),
      [...MUSCULOSKELETAL_ROOT_PATH, region, 'joints-ligaments']), `${name} in ${region}`);
  }
  assert.equal(musculoskeletalPathForGroup(node('Anterior cruciate ligament.l', 1),
    [...MUSCULOSKELETAL_ROOT_PATH, 'head', 'joints-ligaments']), null);
  assert.equal(musculoskeletalPathForGroup(node('Articular disc of temporomandibular joint.l', 1),
    [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb', 'joints-ligaments']), null);
});

test('restoring a subcategory recovers the preceding regional composition, not the complete model', () => {
  const all = [node('Humerus.l', 1), node('Long head of biceps brachii.l', 2),
    node('Thyrohyoid muscle.l', 3), node('Femur.l', 4), node('Manubrium of sternum', 5)];
  const regionPath = [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb'];
  const region = captureRegionIsolation(all, regionPath, 'overview camera', null);
  const regionalView = all.map(item => ({ ...item, visible: item.instanceID <= 2 }));
  const bones = captureRegionIsolation(regionalView, [...regionPath, 'bones'], 'regional camera', region);
  assert.deepEqual([...bones.visibility].filter(([, visible]) => visible).map(([id]) => id), [1, 2]);
  assert.equal(bones.visibility.get(3), false, 'Neck remains hidden on Restore');
  assert.equal(bones.visibility.get(4), false, 'Lower Limb remains hidden on Restore');
  assert.equal(bones.visibility.get(5), false, 'Thorax remains hidden on Restore');
  assert.equal(bones.parent, region);
  assert.deepEqual(bones.parent!.path, regionPath, 'Active collection returns to the parent region');
  assert.equal(bones.camera, 'regional camera');
});
