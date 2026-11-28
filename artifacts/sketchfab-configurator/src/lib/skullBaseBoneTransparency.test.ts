import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode, SketchfabMaterial } from '../types/sketchfab';
import { skullBaseBoneTransparencyPlan } from '../data/skullBaseTaxonomy';
import { createCollectionContextOpacity } from './collectionContextOpacity';
import { refractionContextOpacity } from './materialTransparency';

const nodes = ['Temporal bone.r', 'Pons', 'Facial nerve (VII).l', 'Superior rectus muscle.l']
  .map((rawName, i) => ({ rawName, name: rawName, instanceID: i + 1, type: 'MatrixTransform',
    visible: i !== 0, systemId: null })) as SceneNode[];

test('bone-only opacity plans preserve non-bone transparency, hidden state and mesh scope', () => {
  const before = JSON.stringify(nodes);
  assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, [1, 2, 4], false),
    { contextIds: [2, 4], opaqueBoneIds: [1] });
  assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, [2, 4], true),
    { contextIds: [2, 4, 1], opaqueBoneIds: [] });
  assert.equal(JSON.stringify(nodes), before);
});

test('off and on use private bone materials without changing nerves, muscles or brainstem sharing their source material', async () => {
  const source = { id: 'source', name: 'source', channels: { Opacity: { enable: false, factor: 1 } } } as SketchfabMaterial;
  const original = JSON.stringify(source);
  const materials = new Map([[source.id, source]]);
  const geometry = nodes.map(n => ({ instanceID: n.instanceID, materialID: source.id }));
  let enabled = true, cloneId = 0;
  const manager = createCollectionContextOpacity({
    api: () => ({
      createMaterial(material: SketchfabMaterial, cb: (error: null, material: SketchfabMaterial) => void) {
        cb(null, { ...material, id: `clone-${++cloneId}` });
      },
      setMaterial(material: SketchfabMaterial, cb: (error: null) => void) { materials.set(material.id, material); cb(null); },
      assignMaterial(_geo: unknown, _id: string, cb: (error: null) => void) { cb(null); },
    }) as never,
    geometry: id => geometry.filter(g => g.instanceID === id),
    material: id => materials.get(id),
    register: material => { materials.set(material.id, material); },
    contextOpacity: refractionContextOpacity,
    alwaysOpaqueNodes: () => skullBaseBoneTransparencyPlan(nodes, [], enabled).opaqueBoneIds,
    onError: error => { throw new Error(error); },
  });
  const opacity = (id: number) => materials.get(geometry[id - 1].materialID)!.channels.Opacity;
  await manager.setNodes([1, 2, 4], false, true, [3], [1, 2, 4]);
  assert.equal(opacity(1)?.factor, 0.133);
  enabled = false;
  const off = skullBaseBoneTransparencyPlan(nodes, [...manager.nodeIds], enabled);
  await manager.setNodes(off.contextIds, false, true, undefined, off.contextIds);
  assert.deepEqual(opacity(1), { enable: false, factor: 1 });
  assert.equal(manager.alwaysOpaqueMaterial(1), geometry[0].materialID);
  assert.equal(opacity(2)?.factor, 0.133);
  assert.equal(opacity(4)?.factor, 0.133);
  assert.equal(opacity(3)?.enable, false);
  // A subsequent collection must not re-enable bone transparency.
  await manager.setNodes([2], false, true, [3], [2]);
  assert.deepEqual(opacity(1), { enable: false, factor: 1 });
  enabled = true;
  const on = skullBaseBoneTransparencyPlan(nodes, [...manager.nodeIds], enabled);
  await manager.setNodes(on.contextIds, false, true, undefined, on.contextIds);
  assert.equal(opacity(1)?.factor, 0.133);
  assert.equal(manager.alwaysOpaqueMaterial(1), undefined,
    'Re-enabling transparency must release the old opaque material used by selection restoration');
  // The viewer uses this fallback when a highlighted bone is deselected.
  const transparentBoneMaterial = geometry[0].materialID;
  geometry[0].materialID = manager.alwaysOpaqueMaterial(1) ?? transparentBoneMaterial;
  assert.equal(opacity(1)?.factor, 0.133, 'Deselecting a bone must not make it opaque again');
  assert.equal(opacity(2)?.factor, 0.133);
  assert.equal(opacity(3)?.enable, false);
  const muscleOpacityBeforeToggles = structuredClone(opacity(4));
  for (const enabledAgain of [false, true, false, true]) {
    enabled = enabledAgain;
    const next = skullBaseBoneTransparencyPlan(nodes, [...manager.nodeIds], enabled);
    await manager.setNodes(next.contextIds, false, true, undefined, next.contextIds);
    const boneMaterialBeforeSelection = geometry[0].materialID;
    geometry[0].materialID = manager.alwaysOpaqueMaterial(1) ?? boneMaterialBeforeSelection;
    assert.equal(opacity(1)?.factor, enabled ? 0.133 : 1);
    assert.equal(opacity(1)?.enable, enabled);
    assert.equal(opacity(2)?.factor, 0.133, 'Brainstem opacity is unaffected by repeated toggles');
    assert.deepEqual(opacity(4), muscleOpacityBeforeToggles, 'Muscle opacity is unaffected by repeated toggles');
    assert.equal(opacity(3)?.enable, false, 'Nerve remains opaque');
    assert.equal(nodes[0].visible, false, 'Hidden bones stay hidden');
  }
  assert.equal(JSON.stringify(source), original);
});
