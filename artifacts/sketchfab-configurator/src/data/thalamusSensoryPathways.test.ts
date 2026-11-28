import test from 'node:test';
import assert from 'node:assert/strict';
import inventory from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { THALAMUS_CAPSULE_ROOT_PATH as root, thalamusCapsulePathForGroup,
  thalamusCapsuleContextIds, thalamusCapsuleMissingComponents } from './thalamusCapsuleTaxonomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

// CURVE source objects qualify only if the live viewer exposes their named geometry.
const sourceNames = [...new Set(csvRows(inventory)
  .filter(row => row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5])).map(row => row[4]))];
const node = (rawName: string, instanceID: number): SceneNode => ({
  instanceID, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: systemForMeshName(rawName),
});
const nodes = sourceNames.map((name, i) => node(name, i + 1));
const get = (name: string) => { const n = nodes.find(n => n.rawName === name); assert.ok(n, name); return n; };
const path = (id?: string) => [...root, 'thalamic-nuclei', 'ventral-posterior', ...id ? [id] : []];
const bilateral = (...names: string[]) => names.flatMap(name => [`${name}.l`, `${name}.r`]);
const body = ['Gracile fasciculus', 'Cuneate fasciculus', 'Lateral spinothalamic tract', 'Anterior spinothalamic tract',
  'Cuneate nucleus.l.', 'Cuneate nucleus.r',
  ...bilateral('Gracile nucleus', 'Medial lemmniscus arms', 'Medial lemniscus legs', 'Spinothalamic tract',
    'Somatosensory tract arm', 'Somatosensory tract trunk', 'Somatosensory tract legs'),
  '12_Ventral_posterolateral_VPL'];
const face = [...bilateral('Principal (pontine) neucleus of trigeminal nerve', 'Spinal nucleus of trigeminal nerve',
  'Spinal trigeminal tract', 'Trigeminal lemniscus pain', 'Trigeminal lemniscus proprioception', 'Somatosensory tract face'),
  'Dorsal trigeminal tract.l', '13_Ventral_posteromedial_VPM'];
const outlines = bilateral('Midbrain', 'Pons', 'Medulla oblongata', 'Thalamus', 'Postcentral gyrus');
const somatosensory = [...root, 'thalamocortical-pathways', 'somatosensory'];

test('Somatosensory copies the exact combined VPL/VPM scene, transparency and availability settings', () => {
  const sourcePaths = [path('vpl'), path('vpm')];
  const expected = nodes.filter(n => sourcePaths.some(p => thalamusCapsulePathForGroup(n, p)));
  const result = planRegionIsolation(nodes, 'nervous', somatosensory,
    n => advancedNeuroanatomyPathForGroup(n, somatosensory))!;
  assert.deepEqual([...result.show].sort((a, b) => a - b), expected.map(n => n.instanceID).sort((a, b) => a - b));
  const context = thalamusCapsuleContextIds(nodes, somatosensory);
  assert.deepEqual(context, nodes.filter(n => sourcePaths
    .some(p => thalamusCapsuleContextIds([n], p).length)).map(n => n.instanceID));
  for (const name of [...body, ...face]) {
    assert.ok(result.show.includes(get(name).instanceID), name);
    assert.ok(!context.includes(get(name).instanceID), `preserve ${name}`);
    const alias = node(`${name}.001_123`, 99999);
    assert.ok(thalamusCapsulePathForGroup(alias, somatosensory), alias.rawName);
  }
  assert.deepEqual(new Set(thalamusCapsuleMissingComponents(nodes, somatosensory)),
    new Set(sourcePaths.flatMap(p => thalamusCapsuleMissingComponents(nodes, p))));
  const optional = node('Internal arcuate fibers.l', 99999);
  assert.ok(thalamusCapsulePathForGroup(optional, somatosensory));
  for (const name of ['10_Ventral_anterior_VA', '11_Ventral_lateral_VL',
    'Thalamocortical fibers to VL and VA.l', 'Putamen.l', 'Pontocerebellar fibers.l'])
    assert.ok(result.hide.includes(get(name).instanceID), name);
});

test('VPL and VPM each isolate their complete source sensory pathway, without mixing body and face systems', () => {
  for (const [id, wanted, excluded] of [['vpl', body, face], ['vpm', face, body]] as const) {
    const p = path(id);
    const result = planRegionIsolation(nodes, 'nervous', p, n => advancedNeuroanatomyPathForGroup(n, p))!;
    const context = thalamusCapsuleContextIds(nodes, p);
    for (const name of wanted) {
      const n = get(name);
      assert.equal(n.systemId, 'nervous', name);
      assert.ok(result.show.includes(n.instanceID), `${id}: ${name}`);
      assert.ok(!context.includes(n.instanceID), `${id}: preserve ${name}`);
      const alias = node(`${name}.001_123`, 99999);
      assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
      assert.deepEqual(thalamusCapsuleContextIds([alias], p), []);
    }
    for (const name of outlines) {
      const n = get(name);
      assert.ok(result.show.includes(n.instanceID), `${id}: ${name}`);
      assert.ok(context.includes(n.instanceID), `${id}: translucent ${name}`);
      const alias = node(`${name}.001_123`, 99999);
      assert.deepEqual(thalamusCapsuleContextIds([alias], p), [alias.instanceID]);
    }
    for (const name of [...excluded, 'Accessory Cuneate nucleus.r', 'Motor root of trigeminal nerve.l',
      'Mesencephalic nucleus of trigeminal nerve.r', 'Thalamocortical fibers to VL and VA.l', 'Pontocerebellar fibers.l'])
      assert.ok(result.hide.includes(get(name).instanceID), `${id}: exclude ${name}`);
  }
  const p = path();
  const parent = planRegionIsolation(nodes, 'nervous', p, n => advancedNeuroanatomyPathForGroup(n, p))!;
  for (const name of [...body, ...face, ...outlines])
    assert.ok(parent.show.includes(get(name).instanceID), `Ventral posterior: ${name}`);
});

test('modeled medullary connections qualify without substituting unrelated arcuate structures or inventing dorsal laterality', () => {
  const p = path('vpl');
  assert.ok(thalamusCapsuleMissingComponents(nodes, p).includes('Internal arcuate fibers / medullary sensory decussation'));
  for (const rawName of ['Internal arcuate fibers.l', 'Internal arcuate fibers.r.001_123', 'Sensory decussation']) {
    const connection = node(rawName, 99999);
    assert.ok(thalamusCapsulePathForGroup(connection, p), rawName);
    assert.equal(thalamusCapsulePathForGroup(connection, path('vpm')), null);
    assert.ok(!thalamusCapsuleMissingComponents([...nodes, connection], p)
      .includes('Internal arcuate fibers / medullary sensory decussation'));
    assert.deepEqual(thalamusCapsuleContextIds([connection], p), []);
  }
  for (const rawName of ['Arcuate fascicle.l', 'Arcuate_nucleus.l'])
    assert.equal(thalamusCapsulePathForGroup(get(rawName), p), null, rawName);
  assert.ok(!sourceNames.includes('Dorsal trigeminal tract.r'));
  const withoutDorsal = nodes.filter(n => !n.rawName.startsWith('Dorsal trigeminal tract'));
  assert.ok(thalamusCapsuleMissingComponents(withoutDorsal, path('vpm'))
    .includes('Dorsal trigeminal tract (where separately available)'));
  assert.ok(!thalamusCapsuleMissingComponents(nodes, path('vpm'))
    .includes('Dorsal trigeminal tract (where separately available)'));
});
