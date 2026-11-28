import test from 'node:test';
import assert from 'node:assert/strict';
import { lateralVentricleColorMatches, applyReferenceColor } from './materialTransparency';
import { createCollectionContextOpacity } from './collectionContextOpacity';
import type { SceneNode, SketchfabMaterial } from '../types/sketchfab';

test('only right lateral ventricle meshes use the live left reference, including Sketchfab export suffixes', () => {
  const names = ['Lateral ventricle.l.001_123', 'Lateral_ventricle.r_456',
    'Third ventricle', 'Fourth ventricle', 'Choroid plexus.r'];
  const nodes: SceneNode[] = names.map((rawName, index) => ({
    instanceID: index + 1, rawName, name: rawName, type: 'MatrixTransform', systemId: 'nervous', visible: true,
  }));
  nodes.push({ ...nodes[1], instanceID: 10, systemId: 'vascular' });
  assert.deepEqual(lateralVentricleColorMatches(nodes), [{ instanceID: 2, referenceID: 1 }]);
  assert.deepEqual(lateralVentricleColorMatches(nodes.slice(1)), []);
});

function fixture(delayed = false) {
  const leftMaterial: SketchfabMaterial = { id: 'left', name: 'Original left ventricle', channels: {
    AlbedoPBR: { enable: true, color: [0.2, 0.7, 0.9], factor: 0.85 },
    DiffuseColor: { enable: true, color: [0.2, 0.7, 0.9], factor: 0.9 },
    EmitColor: { enable: false, factor: 0 },
    Opacity: { enable: true, factor: 0.7 },
  } };
  const rightMaterial: SketchfabMaterial = { id: 'right', name: 'Green right and other anatomy', channels: {
    AlbedoPBR: { enable: true, color: [0.4, 0.8, 0.5], factor: 1 },
    Opacity: { enable: true, factor: 0.8 },
  } };
  const materials = new Map([leftMaterial, rightMaterial].map(material => [material.id, material]));
  const left = { instanceID: 1, materialID: 'left' };
  const right = { instanceID: 2, materialID: 'right' };
  const other = { instanceID: 3, materialID: 'right' };
  const pending: (() => void)[] = [];
  let created = 0;
  const api = {
    createMaterial: (material: SketchfabMaterial, callback: Function) => {
      const finish = () => callback(null, { ...structuredClone(material), id: `clone-${++created}` });
      if (delayed) pending.push(finish); else finish();
    },
    setMaterial: (_material: SketchfabMaterial, callback: Function) => callback(),
    assignMaterial: (_geometry: unknown, _material: string, callback: Function) => callback(null),
  } as unknown as SketchfabAPI;
  const manager = createCollectionContextOpacity({
    api: () => api, geometry: id => id === 4 ? [other, left, right] : [left, right, other].filter(geo => geo.instanceID === id),
    opaqueNodes: () => [1, 2],
    matchedColorNodes: () => [{ instanceID: 2, referenceID: 1 }],
    material: id => materials.get(id), register: material => { materials.set(material.id, material); },
    onError: message => assert.fail(message),
  });
  return { manager, materials, leftMaterial, rightMaterial, left, right, other, pending };
}

function checkColor(f: ReturnType<typeof fixture>) {
  const right = f.materials.get(f.right.materialID)!;
  for (const channel of ['AlbedoPBR', 'DiffuseColor', 'EmitColor']) {
    assert.deepEqual(right.channels[channel], f.leftMaterial.channels[channel], channel);
    if (right.channels[channel]) assert.notEqual(right.channels[channel], f.leftMaterial.channels[channel]);
  }
  assert.deepEqual(f.rightMaterial.channels.AlbedoPBR?.color, [0.4, 0.8, 0.5]);
  assert.deepEqual(f.leftMaterial.channels.Opacity, { enable: true, factor: 0.7 });
}

test('right matches left on initial load, through nested whole-brain context, mixing and Restore without recoloring shared anatomy', async () => {
  const f = fixture();
  await f.manager.setNodes([]);
  checkColor(f);
  assert.equal(f.left.materialID, 'left');
  assert.equal(f.other.materialID, 'right');
  assert.deepEqual(f.materials.get(f.right.materialID)!.channels.Opacity, f.rightMaterial.channels.Opacity);
  for (const merge of [false, true]) {
    await f.manager.setNodes([4], merge);
    checkColor(f);
    assert.deepEqual(f.materials.get(f.right.materialID)!.channels.Opacity, { enable: false, factor: 1 });
    assert.deepEqual(f.materials.get(f.other.materialID)!.channels.Opacity, { enable: true, factor: 0.18 });
  }
  await f.manager.setNodes([]);
  checkColor(f);
  assert.equal(f.left.materialID, 'left');
  assert.equal(f.other.materialID, 'right');
  assert.notEqual(f.right.materialID, 'right', 'Restore must not bring the original green color back');
  assert.deepEqual(f.materials.get(f.right.materialID)!.channels.Opacity, f.rightMaterial.channels.Opacity);
});

test('late context creation cannot replace the restored matched color or opacity', async () => {
  const f = fixture(true);
  const context = f.manager.setNodes([4]);
  const restore = f.manager.setNodes([]);
  while (f.pending.length) f.pending.shift()!();
  await Promise.all([context, restore]);
  checkColor(f);
  assert.equal(f.left.materialID, 'left');
  assert.equal(f.other.materialID, 'right');
  assert.deepEqual(f.materials.get(f.right.materialID)!.channels.Opacity, f.rightMaterial.channels.Opacity);
});

test('copy reference channels exactly, including texture settings and removal of stale alternate-workflow colors', () => {
  const source: SketchfabMaterial = { id: 'texture', name: 'Left', channels: {
    DiffuseColor: { enable: true, factor: 0.7, color: [0.2, 0.5, 1], texture: { uid: 'left-texture' } },
  } };
  const target = structuredClone(fixture().rightMaterial);
  applyReferenceColor(target, source);
  assert.deepEqual(target.channels.DiffuseColor, source.channels.DiffuseColor);
  assert.equal(target.channels.AlbedoPBR, undefined);
  assert.equal(target.channels.EmitColor, undefined);
  assert.deepEqual(target.channels.Opacity, { enable: true, factor: 0.8 });
});
