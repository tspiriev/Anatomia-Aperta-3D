import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AUTONOMIC_ROOT_PATH as ROOT, AUTONOMIC_GROUPS, AUTONOMIC_SOURCE_OBJECTS,
  autonomicPathForGroup as pathFor, autonomicContextIds, autonomicForegroundIds,
} from './autonomicTaxonomy';
import { systemForMeshName, csvRows } from './anatomicalSystems';
import { classifyCardiovascularObject } from './cardiovascularTaxonomy';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation } from '../lib/regionIsolation';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const abdominal = [...ROOT, 'sympathetic', 'abdominal'];
const plexuses = [...ROOT, 'plexuses', 'abdominal'];
const object = (rawName: string, instanceID = 1, systemId = systemForMeshName(rawName)): SceneNode => ({
  rawName, name: rawName, instanceID, systemId, type: 'MatrixTransform', visible: false,
});
const source = AUTONOMIC_SOURCE_OBJECTS.map((row, i) => object(row.object_name.trim(), i + 1));
const sourceObject = (name: string) => {
  const node = source.find(node => node.rawName === name);
  assert.ok(node, `Actual nervous-system source object: ${name}`);
  return node;
};

test('Both greater, lesser and least splanchnic nerves are abdominal targets, retaining existing thoracic and plexus pathways', () => {
  for (const stem of ['Greater splanchnic nerves', 'Lesser splanchinc nerves', 'Least splanchnic nerve'])
    for (const side of ['l', 'r']) {
      const node = sourceObject(`${stem}.${side}`);
      for (const suffix of ['', '.001_12345']) {
        const live = { ...node, rawName: node.rawName + suffix };
        assert.deepEqual(pathFor(live, abdominal), abdominal, live.rawName);
        assert.ok(pathFor(live, plexuses), 'Keep the independent plexus collection');
        assert.ok(isNodeAllowedInAtlasView(live, AUTONOMIC_NERVOUS_SYSTEM_VIEW));
        assert.deepEqual(autonomicForegroundIds([live], abdominal), [live.instanceID]);
        assert.deepEqual(autonomicContextIds([live], abdominal), []);
      }
      if (stem !== 'Least splanchnic nerve' || side === 'r')
        assert.ok(pathFor(node, [...ROOT, 'sympathetic', 'thoracic']));
    }
  for (const side of ['l', 'r']) for (const stem of ['Greater', 'Lesser', 'Least'])
    assert.ok(pathFor(object(`${stem}_splanchnic_nerve.${side}_12345`), abdominal));
});

test('Every source-backed abdominal prevertebral/perivascular neural object is also discoverable in abdominal sympathetic', () => {
  const targets = source.filter(node => pathFor(node, plexuses));
  assert.ok(targets.length > 20);
  for (const node of targets) assert.ok(pathFor(node, abdominal), node.rawName);
  for (const name of [
    'Abdominal aorta_Enteric_Plexus_Fine', 'Superior mesenteric artery Nerve Plexus',
    'Left renal artery_Enteric_Plexus_Fine', 'Splenic artery Nerve Plexus',
    'Proper hepatic artery Nerve Plexus', 'Superior hypogastric plexus',
  ]) {
    const node = sourceObject(name);
    assert.equal(node.systemId, 'nervous', 'Never classify nerve sheaths as vessels');
    assert.deepEqual(autonomicForegroundIds([node], abdominal), [node.instanceID]);
    assert.deepEqual(autonomicContextIds([node], abdominal), []);
  }
  for (const name of ['Aortic plexus', 'Stomach_Enteric_Plexus_Fine',
    'Urinary bladder Nerve Plexus', 'Cardiac plexus nerves', 'Internal carotid artery sympathetic plexus.l'])
    assert.equal(pathFor(sourceObject(name), abdominal), null, `Do not import unrelated ${name}`);
});

test('All reviewed abdominal arteries and aortic terminal branches remain vascular, selectable and semitransparent', () => {
  const csv = readFileSync(new URL('../../../../attached_assets/Cardiovascular_system_final_1790945714118.csv', import.meta.url), 'utf8');
  const names = [...csvRows(csv)].filter(row => row[0] === 'OBJECT'
    && classifyCardiovascularObject(row[4])?.[0] === 'cardiovascular-06'
    && /\b(?:artery|arteries|aorta|coeliac trunk)\b/i.test(row[4])).map(row => row[4]);
  assert.ok(names.length > 20);
  for (const name of [...names, 'Common iliac artery.l', 'Common iliac artery.r', 'Median sacral artery']) {
    const node = object(name + '_12345');
    assert.equal(node.systemId, 'vascular', name);
    assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), name);
    assert.deepEqual(pathFor(node, abdominal), abdominal, name);
    assert.deepEqual(autonomicContextIds([node], abdominal), [node.instanceID], name);
    assert.deepEqual(autonomicForegroundIds([node], abdominal), [], name);
    for (const region of ['cervical', 'thoracic', 'pelvic'])
      assert.equal(pathFor(node, [...ROOT, 'sympathetic', region]), null);
  }
  for (const name of ['Thoracic aorta', 'Internal carotid artery.l', 'Femoral artery.r',
    'Inferior vena cava', 'Left renal vein'])
    assert.equal(pathFor(object(name), abdominal), null, name);
});

test('Abdominal view includes the whole vertebral column and sacrum as context, and cord components/roots as opaque targets', () => {
  const bones = [
    ...Array.from({ length: 7 }, (_, i) => `Vertebra C${i + 1}`),
    ...Array.from({ length: 12 }, (_, i) => `Vertebra T${i + 1}`),
    ...Array.from({ length: 5 }, (_, i) => `Vertebra L${i + 1}`), 'Sacrum', 'Atlas (C1)', 'Axis (C2)',
  ].map((name, i) => object(name, i + 1, 'skeletal'));
  const cord = ['White matter of spinal cord', 'Anterior horn of spinal cord',
    'Posterior horn of spinal cord', 'Lateral intermediate substance',
    'Intermediolateral nucleus', 'Intermediomedial nucleus'].map(sourceObject)
    .map((node, i) => ({ ...node, instanceID: 100 + i }));
  const roots = ['Th5 anterior root.l', 'Th12 posterior root.r', 'L1 anterior root.r', 'L5 posterior root.l']
    .map((name, i) => object(name, 200 + i, 'nervous'));
  const scene = [...bones, ...cord, ...roots, object('Internal carotid artery.l', 300)];
  const plan = planRegionIsolation(scene, 'nervous', abdominal, node => pathFor(node, abdominal))!;
  assert.deepEqual(plan.show, [...bones, ...cord, ...roots].map(node => node.instanceID));
  assert.deepEqual(plan.hide, [300]);
  assert.deepEqual(autonomicContextIds(scene, abdominal), bones.map(node => node.instanceID));
  assert.deepEqual(autonomicForegroundIds(scene, abdominal), [...cord, ...roots].map(node => node.instanceID));
  assert.ok(plan.affected.every(node => node.visible === false), 'Restore retains previous hidden states');
  assert.ok(pathFor(object('Spinal_cord_12345', 400, 'nervous'), abdominal),
    'A whole cord is admitted only if present in the live node map');
  assert.equal(pathFor(object('Spinal dura', 401, 'nervous'), abdominal), null);
});

test('Abdominal menu and isolation include the same nerves, cord, vessels and vertebral landmarks', () => {
  const scene = [
    sourceObject('Greater splanchnic nerves.l'), sourceObject('Least splanchnic nerve.r'),
    sourceObject('White matter of spinal cord'), sourceObject('Sympathetic trunk.r'),
    sourceObject('Sympathetic ganglia Thoracic region.l'),
    sourceObject('Sympathetic gangion lumbar region.r'),
    sourceObject('Superior mesenteric artery Nerve Plexus'),
    object('Superior mesenteric artery', 10000), object('Sacrum', 10001, 'skeletal'),
    object('Vertebra T8', 10002, 'skeletal'), object('Internal carotid artery.l', 10003),
  ];
  const group = AUTONOMIC_GROUPS[0].children!.find(group => group.id === abdominal.join('/'))!;
  const ids = menuCollectionNodeIds(scene, [group], () => null, pathFor);
  const plan = planRegionIsolation(scene, 'nervous', abdominal, node => pathFor(node, abdominal))!;
  assert.deepEqual([...ids].sort((a, b) => a - b), [...plan.show].sort((a, b) => a - b));
  assert.equal(ids.length, scene.length - 1);
});
