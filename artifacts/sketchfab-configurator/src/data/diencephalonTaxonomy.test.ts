import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DIENCEPHALON_GROUP, classifyDiencephalonObject } from './diencephalonTaxonomy';
import { classifyAdvancedNeuroanatomy, advancedNeuroanatomyPathForNode } from './advancedNeuroanatomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

// These selected source rows contain no quoted fields or embedded commas.
const sourceCollections = new Set(['Thalamus', 'NS_04_DIENCEPHALON', 'NS_03_BASAL_GANGLIA']);
const sourceNames = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1792051238150.csv', import.meta.url), 'utf8')
  .split(/\r?\n/).map((line) => line.split(','))
  .filter((row) => row[0] === 'OBJECT' && sourceCollections.has(row[1]))
  .map((row) => row[4]);
const root = ['advanced-neuroanatomy', 'diencephalon'];

test('all 96 CSV structures and duplicate/export spellings reach an actual menu collection', () => {
  const groupIds = new Set<string>();
  const leaves: string[] = [];
  function visit(group: NervousGroup) {
    groupIds.add(group.id);
    if (!group.children?.length) leaves.push(group.id);
    group.children?.forEach(visit);
  }
  visit(DIENCEPHALON_GROUP);
  assert.equal(sourceNames.length, 96);
  const usedPaths = new Set<string>();
  for (const name of sourceNames) {
    const path = classifyDiencephalonObject(name);
    assert.ok(path, name);
    assert.ok(groupIds.has(path.join('/')), name);
    usedPaths.add(path.join('/'));
    assert.deepEqual(classifyAdvancedNeuroanatomy(name), path);
    assert.deepEqual(classifyDiencephalonObject(`${name}_123`), path, name);
    assert.deepEqual(classifyDiencephalonObject(`${name}.001_123`), path, name);
  }
  for (const leaf of leaves) assert.ok(usedPaths.has(leaf), `No source meshes in ${leaf}`);
  assert.deepEqual(DIENCEPHALON_GROUP.children?.slice(0, 3).map((group) => group.label), ['Thalamus', 'Hypothalamus', 'Basal ganglia']);
});

test('nuclear subdivisions remain distinct and gross structures stay at their parent level', () => {
  assert.deepEqual(classifyDiencephalonObject('01_Anterior_ventral_AV.l_123'), [...root, 'thalamus', 'anterior', 'av']);
  assert.deepEqual(classifyDiencephalonObject('13_Ventral_posteromedial_VPM'), [...root, 'thalamus', 'ventral', 'vpm']);
  assert.deepEqual(classifyDiencephalonObject('15_Pulvinar_lateral_PuL.l'), [...root, 'thalamus', 'pulvinar', 'lateral']);
  assert.deepEqual(classifyDiencephalonObject('Lateral_preoptic_nucleus.l.'), [...root, 'hypothalamus', 'preoptic', 'lateral']);
  assert.deepEqual(classifyDiencephalonObject('Arcuate_nucleus.r'), [...root, 'hypothalamus', 'tuberal', 'arcuate']);
  assert.deepEqual(classifyDiencephalonObject('Substantia nigra pars reticularis..r'), [...root, 'basal-ganglia', 'substantia-nigra', 'reticularis']);
  assert.deepEqual(classifyDiencephalonObject('Thalamus.r'), [...root, 'thalamus']);
  assert.deepEqual(classifyDiencephalonObject('00_Thalamic_background_core.l'), [...root, 'thalamus']);
  assert.deepEqual(classifyDiencephalonObject('Hypothalamus'), [...root, 'hypothalamus']);
  assert.equal(classifyDiencephalonObject('Paraventricular_nucleus.l'), null, 'Do not invent missing source nuclei');
  assert.equal(classifyDiencephalonObject('Periaqueductal gray matter'), null);
  assert.equal(classifyDiencephalonObject('Optic radiation.l'), null);
});

test('each subdivision can isolate its own members without mutating visibility needed for restore', () => {
  const nodes: SceneNode[] = sourceNames.map((rawName, index) => ({
    instanceID: index + 1, name: rawName, rawName, systemId: 'nervous',
    type: 'MatrixTransform', visible: index % 2 === 0,
  }));
  nodes.push(
    { instanceID: 1000, name: 'Optic radiation.l', rawName: 'Optic radiation.l', systemId: 'nervous', type: 'MatrixTransform', visible: true },
    { instanceID: 1001, name: 'Unknown', rawName: 'Unknown', systemId: 'nervous', type: 'MatrixTransform', visible: true },
    { instanceID: 1002, name: 'Artery', rawName: 'Artery', systemId: 'vascular', type: 'MatrixTransform', visible: true },
  );
  const originalVisibility = nodes.map((node) => node.visible);
  for (const [group, count] of [
    [[...root], 96],
    [[...root, 'thalamus'], 45],
    [[...root, 'thalamus', 'anterior'], 6],
    [[...root, 'hypothalamus'], 32],
    [[...root, 'hypothalamus', 'preoptic'], 5],
    [[...root, 'basal-ganglia'], 16],
  ] as const) {
    const plan = planRegionIsolation(nodes, 'nervous', group, advancedNeuroanatomyPathForNode)!;
    assert.ok(plan);
    assert.equal(plan.show.length, count, group.join('/'));
    assert.equal(plan.hide.length, 99 - count);
    assert.ok(plan.hide.includes(1000), 'Other fiber collections should hide during isolation');
    assert.ok(plan.hide.includes(1001), 'Unknown anatomy must hide during advanced isolation');
    assert.ok(plan.hide.includes(1002), 'Other systems must hide during advanced isolation');
    assert.deepEqual(nodes.map((node) => node.visible), originalVisibility);
  }
});
