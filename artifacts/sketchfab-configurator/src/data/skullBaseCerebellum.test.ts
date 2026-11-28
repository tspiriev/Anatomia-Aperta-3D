import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode, SketchfabMaterial } from '../types/sketchfab';
import {
  SKULL_BASE_GROUPS, SKULL_BASE_ROOT_PATH, skullBasePathForGroup,
  skullBaseContextIds, skullBaseSystemForNode, skullBaseBoneTransparencyPlan,
} from './skullBaseTaxonomy';
import {
  SKULL_BASE_CEREBELLAR_SECTIONS, CEREBELLAR_ARTERIES,
  SKULL_BASE_WHOLE_CEREBELLUM_PATH as whole, SKULL_BASE_CEREBELLUM_DETAIL_PATH as detail,
} from './skullBaseCerebellum';
import { skullBaseNervousSource, skullBaseVascularSource, skullBaseName } from './skullBaseSources';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import { createCollectionContextOpacity } from '../lib/collectionContextOpacity';
import { refractionContextOpacity } from '../lib/materialTransparency';

const posterior = [...SKULL_BASE_ROOT_PATH, 'posterior-fossa'];
const node = (rawName: string, instanceID = 1): SceneNode =>
  ({ rawName, name: rawName, instanceID, systemId: 'nervous', visible: true, type: 'MatrixTransform' });
const isolate = (nodes: SceneNode[], path: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', path, n => advancedNeuroanatomyPathForGroup(n, path))!;
const parts = SKULL_BASE_CEREBELLAR_SECTIONS.flatMap(section =>
  section.parts.map(part => ({ ...part, path: [...detail, section.id, part.id] })));

test('posterior fossa adds one whole-cerebellum control plus shared advanced anatomical collections', () => {
  const menu = SKULL_BASE_GROUPS.find(g => g.id === posterior.join('/'))!;
  const combined = menu.children!.find(g => g.id === whole.join('/'))!;
  assert.equal(combined.label, 'Cerebellum — whole (semitransparent)');
  assert.equal(combined.children, undefined, 'Single Show/Hide collection, not a second custom viewer');
  const advanced = menu.children!.find(g => g.id === detail.join('/'))!;
  assert.deepEqual(advanced.children?.map(g => g.label), SKULL_BASE_CEREBELLAR_SECTIONS.map(s => s.label));
  assert.equal(parts.length, 22);
});

test('all supplied cerebellar surface parts form the whole shell without including nuclei, fibers or vessels', () => {
  const surfaces = parts.filter(p => p.surface).flatMap(p => p.names);
  const names = [...new Set(surfaces)];
  const nodes = [...names, 'Dentate_nucleus.l', 'Superior cerebellar peduncle.r',
    'Central tegmental tract (Guillain-Mollaet Triangle).r', 'Olivocerebellar (Climbing fibers).l',
    'Midbrain', 'Posterior inferior cerebellar artery.r', 'Reticular formation brainstem']
    .map((name, i) => node(name, i + 1));
  for (const n of nodes.slice(0, names.length)) {
    assert.ok(skullBaseNervousSource.has(skullBaseName(n.rawName)), n.rawName);
    for (const selection of [SKULL_BASE_ROOT_PATH, posterior, whole])
      assert.deepEqual(skullBasePathForGroup(n, selection), whole, n.rawName);
    assert.deepEqual(skullBasePathForGroup({ ...n, rawName: `${n.rawName}.l.001` }, whole), whole);
    assert.equal(skullBaseSystemForNode({ ...n, systemId: null }), 'nervous');
  }
  const plan = isolate(nodes, whole);
  const shellIds = nodes.slice(0, names.length).map(n => n.instanceID);
  assert.deepEqual(plan.show, shellIds);
  assert.deepEqual(plan.hide, nodes.slice(names.length).map(n => n.instanceID));
  assert.deepEqual(skullBaseContextIds(nodes, whole), shellIds);
  assert.deepEqual(skullBasePathForGroup(node('Cerebellum.r'), whole), whole,
    'An actual combined mesh is supported if subsequently supplied');
  assert.equal(skullBasePathForGroup(node('Cerebellum.r'), parts[0].path), null,
    'Fused geometry is never substituted for individually modeled lobules');
  for (const region of ['anterior-fossa-orbit', 'middle-fossa', 'petrous-temporal'])
    for (const n of nodes.slice(0, names.length))
      assert.equal(skullBasePathForGroup(n, [...SKULL_BASE_ROOT_PATH, region]), null);
});

test('every individual cerebellar collection shows its source parts, corresponding arteries and transparent brainstem only', () => {
  const references = ['Midbrain', 'Pons', 'Medulla oblongata'];
  for (const part of parts) {
    for (const name of part.names) assert.ok(skullBaseNervousSource.has(skullBaseName(name)), name);
    const targets = part.names.flatMap(name => [`${name}.l`, `${name}.r`]);
    const vessels = part.supply.flatMap(supply =>
      ['l', 'r'].map(side => `${CEREBELLAR_ARTERIES[supply]}.${side}`));
    for (const vessel of vessels) assert.ok(skullBaseVascularSource.has(skullBaseName(vessel)), vessel);
    const unwanted = ['Temporal bone.l', 'Reticular formation brainstem', 'Optic nerve (II).l',
      'Anterior cerebral artery.r', 'Vestibuloolivary fibers.l'];
    const nodes = [...targets, ...vessels, ...references, ...unwanted].map((name, i) => node(name, i + 1));
    const plan = isolate(nodes, part.path);
    const wantedCount = targets.length + vessels.length + references.length;
    assert.deepEqual(plan.show, nodes.slice(0, wantedCount).map(n => n.instanceID), part.label);
    assert.deepEqual(plan.hide, nodes.slice(wantedCount).map(n => n.instanceID), part.label);
    const contextIds = skullBaseContextIds(nodes, part.path);
    assert.deepEqual(contextIds, nodes.slice(0, wantedCount)
      .filter((_, i) => i < targets.length ? part.surface : i >= targets.length + vessels.length)
      .map(n => n.instanceID), part.label);
    assert.deepEqual(skullBaseBoneTransparencyPlan(nodes, contextIds, false).contextIds, contextIds,
      'Bone transparency must not alter cerebellum or brainstem context');
    for (const supply of Object.keys(CEREBELLAR_ARTERIES) as (keyof typeof CEREBELLAR_ARTERIES)[])
      assert.equal(Boolean(skullBasePathForGroup(node(`${CEREBELLAR_ARTERIES[supply]}.r`), part.path)),
        part.supply.includes(supply), `${part.label}: ${supply}`);
  }
});

test('cerebellum selection uses the refraction preset and preserves opaque arteries and deep nuclei on shared materials', async () => {
  const names = ['Flocculus.l', 'Anterior inferior cerebellar artery.l', 'Pons', 'Dentate_nucleus.l',
    'Reticular formation brainstem'];
  const scene = names.map((name, i) => node(name, i + 1));
  const source = { id: 'source', name: 'source', channels: { Opacity: { enable: false, factor: 1 } } } as SketchfabMaterial;
  const materials = new Map([[source.id, source]]);
  const geometry = scene.map(n => ({ instanceID: n.instanceID, materialID: source.id }));
  let serial = 0;
  const manager = createCollectionContextOpacity({
    api: () => ({
      createMaterial(material: SketchfabMaterial, cb: (err: null, m: SketchfabMaterial) => void) {
        cb(null, { ...material, id: `cerebellum-${++serial}` });
      },
      setMaterial(material: SketchfabMaterial, cb: (err: null) => void) { materials.set(material.id, material); cb(null); },
      assignMaterial(_geo: unknown, _id: string, cb: (err: null) => void) { cb(null); },
    }) as never,
    geometry: id => geometry.filter(g => g.instanceID === id),
    material: id => materials.get(id),
    register: material => { materials.set(material.id, material); },
    contextOpacity: refractionContextOpacity,
    onError: message => { throw new Error(message); },
  });
  const selection = [...detail, 'flocculonodular-lobe', 'flocculus'];
  const plan = isolate(scene, selection), context = skullBaseContextIds(scene, selection);
  await manager.setNodes(context, false, true, plan.show.filter(id => !context.includes(id)), context);
  const opacity = (id: number) => materials.get(geometry[id - 1].materialID)!.channels.Opacity;
  assert.equal(opacity(1)?.factor, 0.133);
  assert.equal(opacity(3)?.factor, 0.133);
  assert.equal(opacity(2)?.enable, false);
  assert.equal(opacity(4)?.enable, false);
  assert.ok(plan.hide.includes(5));
  // Hide/Show and Restore do not need a fabricated mesh or source-material mutation.
  const shell = isolate(scene, whole);
  assert.deepEqual(shell.show, [1]);
  await manager.setNodes(skullBaseContextIds(scene, whole), false, true);
  assert.equal(opacity(1)?.factor, 0.133);
  await manager.setNodes([]);
  assert.deepEqual(source.channels.Opacity, { enable: false, factor: 1 });
});
