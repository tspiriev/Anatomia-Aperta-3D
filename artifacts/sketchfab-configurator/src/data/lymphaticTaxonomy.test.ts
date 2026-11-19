import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyLymphaticObject, LYMPHATIC_GROUPS } from './lymphaticTaxonomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

// This particular export has no quoted fields or embedded commas.
const rows = readFileSync(new URL('../../../../attached_assets/Lymphoid_tissue_1791545390897.csv', import.meta.url), 'utf8')
  .trim().split(/\r?\n/).slice(1).map((line) => line.split(','));
const objects = rows.filter((row) => row[0] === 'OBJECT');

test('every supplied lymphoid object has a confirmed menu assignment', () => {
  assert.equal(objects.length, 164);
  for (const row of objects) {
    assert.ok(classifyLymphaticObject(row[4]), row[4]);
    assert.deepEqual(classifyLymphaticObject(`${row[4]}_1234`), classifyLymphaticObject(row[4]));
  }
  assert.equal(objects.filter((row) => classifyLymphaticObject(row[4])?.[0] === 'lymph-nodes').length, 159);
  assert.equal(objects.filter((row) => classifyLymphaticObject(row[4])?.[0] === 'lymphoid-organs').length, 5);
  assert.equal(LYMPHATIC_GROUPS.length, 2);
});

test('spleen, thymus, and tonsils are separate from similarly named lymph nodes', () => {
  assert.deepEqual(classifyLymphaticObject('Spleen'), ['lymphoid-organs', 'spleen']);
  assert.deepEqual(classifyLymphaticObject('Left lobe of thymus_45'), ['lymphoid-organs', 'thymus']);
  assert.deepEqual(classifyLymphaticObject('Palatine tonsil.r.001_42'), ['lymphoid-organs', 'tonsils']);
  assert.deepEqual(classifyLymphaticObject('Splenic nodes'), ['lymph-nodes']);
  assert.deepEqual(classifyLymphaticObject('Thyroid nodes.l'), ['lymph-nodes']);
  assert.equal(classifyLymphaticObject('Thyroid gland'), null);
});

test('lymphatic isolation does not change other systems or lose previous visibility', () => {
  const nodes: SceneNode[] = objects.map((row, index) => ({
    instanceID: index + 1, rawName: row[4], name: row[4], systemId: 'lymphatic',
    type: 'MatrixTransform', visible: index % 2 === 0,
  }));
  nodes.push({ instanceID: 1000, rawName: 'Liver', name: 'Liver', systemId: 'organs', type: 'MatrixTransform', visible: true });
  const initial = nodes.map((node) => node.visible);
  const plan = planRegionIsolation(nodes, 'lymphatic', ['lymphoid-organs', 'spleen'], (node) => classifyLymphaticObject(node.rawName))!;
  assert.equal(plan.show.length, 1);
  assert.equal(nodes.find((node) => node.instanceID === plan.show[0])?.rawName, 'Spleen');
  assert.equal(plan.hide.length, 163);
  assert.equal(plan.affected.length, 164);
  assert.ok(!plan.hide.includes(1000));
  assert.deepEqual(nodes.map((node) => node.visible), initial);
});
