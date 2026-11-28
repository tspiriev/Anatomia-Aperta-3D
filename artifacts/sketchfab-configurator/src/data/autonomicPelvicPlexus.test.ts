import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AUTONOMIC_ROOT_PATH as ROOT, AUTONOMIC_GROUPS, AUTONOMIC_SOURCE_OBJECTS,
  autonomicPathForGroup as pathFor, normalizeAutonomicName,
  autonomicContextIds, autonomicForegroundIds,
} from './autonomicTaxonomy';
import { AUTONOMIC_SPINAL_CORD_NAMES } from './autonomicRequestedNerves';
import { systemForMeshName, csvRows } from './anatomicalSystems';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

const plexuses = [...ROOT, 'plexuses'];
const pelvic = [...plexuses, 'pelvic'];
const object = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, type: 'MatrixTransform', visible: false,
  systemId: systemForMeshName(rawName),
});
const source = AUTONOMIC_SOURCE_OBJECTS.map((row, i) => object(row.object_name.trim(), i + 1));
const sourceObject = (name: string) => {
  const node = source.find(node => node.rawName === name);
  assert.ok(node, `Actual exported source: ${name}`);
  return node;
};
const assertNeural = (node: SceneNode) => {
  assert.equal(node.systemId, 'nervous', node.rawName);
  assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), node.rawName);
  assert.deepEqual(pathFor(node, pelvic), pelvic, node.rawName);
  assert.deepEqual(autonomicContextIds([node], pelvic), [], node.rawName);
  assert.deepEqual(autonomicForegroundIds([node], pelvic), [node.instanceID], node.rawName);
};

test('Common iliac veins and common/internal/external iliac arteries are bilateral pelvic vascular context in the plexus atlas', () => {
  const csv = readFileSync(new URL('../../../../attached_assets/Cardiovascular_system_final_1790945714118.csv', import.meta.url), 'utf8');
  const names = [...csvRows(csv)].filter(row => row[0] === 'OBJECT'
    && /^(?:Common iliac (?:artery|vein)|(?:Internal|External) iliac artery)\.[lr]$/.test(row[4]))
    .map(row => row[4]);
  assert.equal(names.length, 8);
  for (const name of names) for (const suffix of ['', '.001_12345']) {
    const node = object(name + suffix);
    assert.equal(node.systemId, 'vascular', node.rawName);
    assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW));
    for (const scope of [plexuses, pelvic]) {
      assert.deepEqual(pathFor(node, scope), pelvic);
      assert.deepEqual(autonomicContextIds([node], scope), [node.instanceID]);
      assert.deepEqual(autonomicForegroundIds([node], scope), []);
    }
    for (const section of ['cardiac', 'pulmonary-esophageal', 'abdominal'])
      assert.equal(pathFor(node, [...plexuses, section]), null);
  }
  for (const name of ['Left common iliac vein', 'Common iliac artery right', 'External_iliac_artery.l_12345'])
    assert.deepEqual(pathFor(object(name), pelvic), pelvic, name);
});

test('Sacral sympathetic ganglia remain paravertebral ganglia while also belonging to pelvic hypogastric plexuses', () => {
  for (const side of ['l', 'r']) {
    const node = sourceObject(`Sympathetic ganglia sacral region.${side}`);
    assertNeural(node);
    assert.ok(pathFor(node, [...plexuses, 'paravertebral', 'ganglia']));
    assert.ok(pathFor(node, [...ROOT, 'sympathetic', 'pelvic']));
    assertNeural(object(node.rawName + '.001_12345'));
  }
  for (const name of ['Sympathetic ganglia Thoracic region.l', 'Superior cervical sympathetic ganglion.r'])
    assert.equal(pathFor(sourceObject(name), pelvic), null, 'Do not add other regional ganglia');
});

test('Available lumbar/sacral roots and ganglia enter the pelvic view without relabelling them as sympathetic ganglia', () => {
  const roots = source.filter(node => /^[ls][1-5] .*root\b/.test(normalizeAutonomicName(node.rawName)));
  assert.ok(roots.length >= 36);
  for (const node of roots) {
    assertNeural(node);
    assert.equal(pathFor(node, [...plexuses, 'paravertebral', 'ganglia']), null);
  }
  for (const level of ['L1', 'L5', 'S1', 'S4', 'S5']) for (const side of ['l', 'r'])
    assertNeural(object(`${level}_spinal_nerve.${side}_12345`));
  for (const name of ['C1 spinal nerve.l.001', 'Th1 posterior root.r'])
    assert.equal(pathFor(object(name), pelvic), null);
});

test('Pelvic cord components and sympathetic trunks remain opaque; whole cord and conus names are used only if loaded', () => {
  for (const name of AUTONOMIC_SPINAL_CORD_NAMES) assertNeural(sourceObject(name));
  for (const side of ['l', 'r']) assertNeural(sourceObject(`Sympathetic trunk.${side}`));
  for (const name of ['Spinal cord', 'Conus medullaris', 'Conus_medullaris_12345'])
    assertNeural(object(name));
  assert.equal(pathFor(object('Spinal dura'), pelvic), null);
  for (const name of ['Common iliac artery.r_Enteric_Plexus_Fine',
    'Common iliac artery.l_Enteric_Plexus_Fine'])
    assertNeural(sourceObject(name));
});

test('Pelvic menu, isolation and restoration include the same neural and vascular structures without forcing original visibility', () => {
  const scene = [
    sourceObject('Sympathetic ganglia sacral region.r'),
    sourceObject('L1 anterior root.l'), sourceObject('S4 posterior root.r'),
    sourceObject('White matter of spinal cord'), sourceObject('Sympathetic trunk.l'),
    object('Conus medullaris', 10001), object('Common iliac vein.l', 10002),
    object('Common iliac artery.r', 10003), object('External iliac artery.l', 10004),
    object('Internal iliac artery.r', 10005), object('Radial artery.r', 10006),
  ];
  const group = AUTONOMIC_GROUPS[3].children!.find(group => group.id === pelvic.join('/'))!;
  const ids = menuCollectionNodeIds(scene, [group], () => null, pathFor);
  const plan = planRegionIsolation(scene, 'nervous', pelvic, node => pathFor(node, pelvic))!;
  assert.equal(ids.length, scene.length - 1);
  assert.deepEqual([...ids].sort((a, b) => a - b), [...plan.show].sort((a, b) => a - b));
  assert.deepEqual(plan.hide, [10006]);
  assert.ok(plan.affected.every(node => !node.visible));
  assert.deepEqual(autonomicContextIds(scene, pelvic), [10002, 10003, 10004, 10005]);
});
