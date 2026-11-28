import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPINAL_CORD_GROUP, classifySpinalCordObject } from './spinalCordTaxonomy';
import { classifyBrainstemObject } from './brainstemTaxonomy';
import { ADVANCED_NEUROANATOMY_GROUPS, advancedNeuroanatomyPathForGroup, classifyAdvancedNeuroanatomy } from './advancedNeuroanatomy';
import { classifyNervousObject, type NervousGroup } from './nervousTaxonomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

// Selected source rows have no quoted fields or embedded commas.
const collections = new Set([
  'NS_02_SPINAL_CORD', 'NS_02_GRAY_MATTER', 'NS_03_GENERAL_WHITE_MATTER',
  'NS_04_ASCENDING_SENSORY_TRACTS', 'NS_05_DESCENDING_MOTOR_TRACTS', 'NS_06_OTHER_TRACTS',
]);
const sourceNames = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1792051238150.csv', import.meta.url), 'utf8')
  .split(/\r?\n/).map((line) => line.split(','))
  .filter((row) => row[0] === 'OBJECT' && collections.has(row[1])).map((row) => row[4]);
const root = ['advanced-neuroanatomy', 'spinal-cord'];
const white = [...root, 'white-matter'];
const gray = [...root, 'gray-matter'];
function node(instanceID: number, rawName: string, visible = true): SceneNode {
  return { instanceID, rawName, name: rawName, type: 'MatrixTransform', systemId: 'nervous', visible };
}

test('all 29 source meshes and numeric export variants reach a real spinal collection', () => {
  assert.equal(sourceNames.length, 29);
  const ids = new Set<string>();
  const leaves: string[] = [];
  function visit(group: NervousGroup) {
    ids.add(group.id);
    if (!group.children?.length) leaves.push(group.id);
    group.children?.forEach(visit);
  }
  visit(SPINAL_CORD_GROUP);
  const used = new Set<string>();
  for (const name of sourceNames) {
    const path = classifySpinalCordObject(name);
    assert.ok(path, name);
    assert.ok(ids.has(path.join('/')), name);
    used.add(path.join('/'));
    for (const suffix of ['_123', '.001_123']) assert.deepEqual(classifySpinalCordObject(name + suffix), path, name);
  }
  for (const leaf of leaves) assert.ok(used.has(leaf), `Invented empty collection: ${leaf}`);
});

test('spinal cord occupies the fourth card to the right of brainstem', () => {
  assert.deepEqual(ADVANCED_NEUROANATOMY_GROUPS.map((group) => group.label),
    ['White matter fibers', 'Basal ganglia and diencephalon', 'Brainstem', 'Spinal cord']);
  assert.equal(ADVANCED_NEUROANATOMY_GROUPS[3], SPINAL_CORD_GROUP);
  assert.deepEqual(SPINAL_CORD_GROUP.children?.map((group) => group.label), ['White matter tracts', 'Gray matter']);
  assert.deepEqual(SPINAL_CORD_GROUP.children![0].children?.map((group) => group.label),
    ['Descending motor pathways', 'Ascending somatosensory pathways', 'Ascending cerebellar pathways', 'Other spinal cord pathways']);
  assert.deepEqual(SPINAL_CORD_GROUP.children![1].children?.map((group) => group.label),
    ['Anterior horn', 'Posterior horn', 'Intermediate gray matter']);
});

test('requested tract categories and teaching synonyms retain exact source objects', () => {
  assert.deepEqual(classifySpinalCordObject('Lateral corticospinal tract'), [...white, 'descending-motor', 'pyramidal', 'lateral-corticospinal']);
  assert.deepEqual(classifySpinalCordObject('Anterior corticospinal tract'), [...white, 'descending-motor', 'pyramidal', 'anterior-corticospinal']);
  assert.deepEqual(classifySpinalCordObject('Medial vestibulospinal tract'), [...white, 'descending-motor', 'extrapyramidal', 'vestibulospinal', 'medial']);
  assert.deepEqual(classifySpinalCordObject('Lateral reticulospinal tract'), [...white, 'descending-motor', 'extrapyramidal', 'reticulospinal', 'lateral']);
  assert.deepEqual(classifySpinalCordObject('Gracile fasciculus'), [...white, 'ascending-somatosensory', 'dorsal-column', 'gracilis']);
  assert.deepEqual(classifySpinalCordObject('Cuneate fasciculus'), [...white, 'ascending-somatosensory', 'dorsal-column', 'cuneatus']);
  assert.deepEqual(classifySpinalCordObject('Spinotectal tract'), [...white, 'ascending-somatosensory', 'anterolateral', 'other-anterolateral', 'spinotectal']);
  assert.deepEqual(classifySpinalCordObject("Posterolateral (Lissauer's) tract"), [...white, 'other-spinal', 'other-intrinsic', 'lissauer']);
  assert.deepEqual(classifySpinalCordObject('Posterior fasciculus proprius'), [...white, 'other-spinal', 'fasciculus-proprius', 'posterior']);
});

test('whole horns and canal remain unsplit; unsupported gray nuclei and tracts are not invented', () => {
  assert.deepEqual(classifySpinalCordObject('Anterior horn of spinal cord'), [...gray, 'anterior-horn']);
  assert.deepEqual(classifySpinalCordObject('Posterior horn of spinal cord'), [...gray, 'posterior-horn']);
  assert.deepEqual(classifySpinalCordObject('Nucleus proprius'), [...gray, 'posterior-horn', 'nucleus-proprius']);
  assert.deepEqual(classifySpinalCordObject('Lateral intermediate substance'), [...gray, 'intermediate-gray']);
  assert.deepEqual(classifySpinalCordObject('Intermediolateral nucleus'), [...gray, 'intermediate-gray', 'intermediolateral']);
  assert.deepEqual(classifySpinalCordObject("Dorsal nucleus Clarke's nucleus"), [...gray, 'intermediate-gray', 'clarke']);
  assert.deepEqual(classifySpinalCordObject('Central canal'), root);
  assert.deepEqual(classifySpinalCordObject("Central canal'"), root);
  assert.deepEqual(classifySpinalCordObject('White matter of spinal cord'), white);
  for (const name of [
    'Cuneocerebellar tract', 'Rostral spinocerebellar tract', 'Substantia gelatinosa',
    'Sacral parasympathetic nucleus', 'Gray commissure', 'Gray matter surrounding central canal',
    'Somatic motor nuclei', 'Spinal dura', 'Spinal ganglion C1.l',
  ]) assert.equal(classifySpinalCordObject(name), null, name);
});

test('whole spinal tracts stay distinct from bilateral brainstem segments and old navigation remains available', () => {
  for (const name of ['Posterior spinocerebellar tract', 'Tectospinal tract', 'Rubrospinal tract']) {
    const n = node(1, name);
    assert.equal(classifyBrainstemObject(name), null);
    assert.equal(classifyAdvancedNeuroanatomy(name)?.[1], 'spinal-cord');
    assert.equal(advancedNeuroanatomyPathForGroup(n, root)?.[1], 'spinal-cord');
    assert.equal(advancedNeuroanatomyPathForGroup(n, ['advanced-neuroanatomy', 'white-matter'])?.[1], 'spinal-cord');
    assert.equal(classifySpinalCordObject(name + '.r'), null);
    assert.equal(classifySpinalCordObject(name + '_123.l'), null);
  }
  assert.ok(classifyBrainstemObject('Posterior spinocerebellar tract.l'));
  assert.ok(classifyBrainstemObject('Tectospinal tract.r'));
  assert.ok(classifyBrainstemObject('Rubrospinal tract.r'));
  assert.equal(classifySpinalCordObject('Anterior spinocerebellar tract (Gowers).l'), null);
  assert.deepEqual(classifyNervousObject('Spinothalamic tract.r'), ['spinal', 'ascending-tracts']);
});

test('all spinal groups isolate exact members while preserving full restore snapshots', () => {
  const nodes = sourceNames.map((name, i) => node(i + 1, name, i % 2 === 0));
  nodes.push(node(1000, 'Posterior spinocerebellar tract.l'), node(1001, 'Thalamus.r'), node(1002, 'Unknown'));
  nodes.push({ ...node(1003, 'Artery'), systemId: 'vascular' });
  const snapshot = nodes.map((n) => n.visible);
  for (const [path, count] of [
    [root, 29], [white, 20], [gray, 7],
    [[...white, 'descending-motor'], 8], [[...white, 'descending-motor', 'pyramidal'], 2],
    [[...white, 'descending-motor', 'extrapyramidal'], 6],
    [[...white, 'ascending-somatosensory'], 5], [[...white, 'ascending-somatosensory', 'dorsal-column'], 2],
    [[...white, 'ascending-somatosensory', 'anterolateral'], 3],
    [[...white, 'ascending-cerebellar'], 2], [[...white, 'other-spinal'], 4],
    [[...white, 'other-spinal', 'fasciculus-proprius'], 3],
    [[...gray, 'anterior-horn'], 1], [[...gray, 'posterior-horn'], 2],
    [[...gray, 'intermediate-gray'], 4],
  ] as const) {
    const plan = planRegionIsolation(nodes, 'nervous', path, (n) => advancedNeuroanatomyPathForGroup(n, path))!;
    assert.ok(plan, path.join('/'));
    assert.equal(plan.show.length, count, path.join('/'));
    assert.equal(new Set(plan.show).size, count);
    assert.equal(plan.hide.length, 33 - count);
    assert.ok(plan.hide.includes(1000));
    assert.ok(plan.hide.includes(1001));
    assert.ok(plan.hide.includes(1002));
    assert.ok(plan.hide.includes(1003));
    assert.deepEqual(nodes.map((n) => n.visible), snapshot);
  }
  const wrongSystem = { ...node(2000, 'Nucleus proprius'), systemId: 'vascular' as const };
  assert.equal(advancedNeuroanatomyPathForGroup(wrongSystem, root), null);
});
