import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AUTONOMIC_ROOT_PATH as ROOT, AUTONOMIC_GROUPS, autonomicPathForGroup as pathFor,
  autonomicContextIds, autonomicForegroundIds,
} from './autonomicTaxonomy';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { reviewedCardiovascularPath } from './cardiovascularCorrections';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation } from '../lib/regionIsolation';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const overview = [...ROOT, 'sympathetic'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: rawName, type: 'MatrixTransform', visible: false,
  systemId: systemForMeshName(rawName),
});
const assertVessel = (object: SceneNode) => {
  assert.equal(object.systemId, 'vascular', object.rawName);
  assert.ok(isNodeAllowedInAtlasView(object, AUTONOMIC_NERVOUS_SYSTEM_VIEW), object.rawName);
  assert.ok(pathFor(object, overview), object.rawName);
  assert.deepEqual(autonomicContextIds([object], overview), [object.instanceID], object.rawName);
  assert.deepEqual(autonomicForegroundIds([object], overview), [], object.rawName);
};

test('First Sympathetic menu admits every reviewed source abdominal vessel, not just its aortic trunk', () => {
  const csv = readFileSync(new URL('../../../../attached_assets/Cardiovascular_system_final_1790945714118.csv', import.meta.url), 'utf8');
  const names = [...csvRows(csv)].filter(row => row[0] === 'OBJECT'
    && ['MESH', 'CURVE'].includes(row[5])
    && reviewedCardiovascularPath(row[4], row[1] === '06 Abdominal Vessels' ? ['cardiovascular-06'] : null)?.[0] === 'cardiovascular-06')
    .map(row => row[4]);
  assert.ok(names.length > 40);
  for (const name of names) assertVessel(node(name));
});

test('Live-model renal, mesenteric, coeliac/celiac and iliac artery names support both side-label styles and exported IDs', () => {
  for (const name of ['Superior mesenteric artery', 'Inferior mesenteric artery',
    'Coeliac trunk', 'Celiac trunk', 'Renal artery', 'Common iliac artery',
    'External iliac artery', 'Internal iliac artery']) {
    for (const rawName of [name, `${name}.l`, `${name}.r.001_12345`, `Left ${name}`, `${name} right`,
      `${name.replace(/ /g, '_')}.l_12345`]) assertVessel(node(rawName));
  }
});

test('Drawn abdominal-wall vessels are first-menu context without reclassifying the superior epigastric artery as an aortic branch', () => {
  for (const family of ['Superior epigastric', 'Inferior epigastric', 'Superficial epigastric',
    'Deep circumflex iliac', 'Superficial circumflex iliac'])
    for (const tissue of ['artery', 'vein']) for (const side of ['l', 'r'])
      assertVessel(node(`${family} ${tissue}.${side}_12345`));
  for (const name of ['Renal artery.l', 'Superior epigastric vein.r', 'Common iliac artery.r'])
    for (const region of ['cervical', 'thoracic', 'pelvic'])
      assert.equal(pathFor(node(name), [...overview, region]), null, `${region}: ${name}`);
});

test('First-menu visibility and isolation cover the same vascular nodes, keeping restore state and hiding unrelated vessels', () => {
  const names = ['Abdominal aorta', 'Superior mesenteric artery', 'Inferior mesenteric artery',
    'Celiac trunk', 'Renal artery.l', 'Renal artery.r', 'Common iliac artery.l',
    'Common iliac artery.r', 'Inferior epigastric artery.l', 'Superior epigastric vein.r'];
  const scene = [...names, 'Femoral artery.r'].map((name, i) => node(name, i + 1));
  const ids = menuCollectionNodeIds(scene, [AUTONOMIC_GROUPS[0]], () => null, pathFor);
  const plan = planRegionIsolation(scene, 'nervous', overview, object => pathFor(object, overview))!;
  assert.deepEqual([...ids].sort((a, b) => a - b), names.map((_, i) => i + 1));
  assert.deepEqual(plan.show, names.map((_, i) => i + 1));
  assert.deepEqual(plan.hide, [scene.length]);
  assert.ok(plan.affected.every(object => !object.visible), 'Restore retains initial hidden states');
});

test('Vessel names never capture their separately drawn perivascular nerves or unrelated arteries', () => {
  for (const name of ['Abdominal aorta_Enteric_Plexus_Fine', 'Superior mesenteric artery Nerve Plexus',
    'Left renal artery_Enteric_Plexus_Fine']) {
    const object = node(name);
    assert.equal(object.systemId, 'nervous', name);
    assert.deepEqual(autonomicContextIds([object], overview), []);
    assert.deepEqual(autonomicForegroundIds([object], overview), [object.instanceID]);
  }
  for (const name of ['Femoral artery.r', 'Radial artery.l'])
    assert.equal(pathFor(node(name), overview), null);
});
