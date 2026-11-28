import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOWER_LIMB_SOURCE_OBJECTS as rows, LOWER_LIMB_TOPOGRAPHY_ROOT as ROOT,
  LOWER_LIMB_TOPOGRAPHY_GROUPS as groups, LOWER_LIMB_TOPOGRAPHY_MODEL_UID as MODEL,
  lowerLimbPathForGroup as pathFor, lowerLimbSettings, lowerLimbSystemForNode,
} from './lowerLimbTopography';
import { lowerLimbLegColorMatches } from './lowerLimbLeg';
import { planRegionIsolation } from '../lib/regionIsolation';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { createCollectionContextOpacity } from '../lib/collectionContextOpacity';
import { refractionContextOpacity } from '../lib/materialTransparency';
import type { SceneNode, SketchfabMaterial } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const p = (...parts: string[]) => [...ROOT, 'leg', ...parts];
const nodes: SceneNode[] = rows.map((row, i) => ({
  rawName: row.rawName, name: row.rawName, instanceID: i + 1, type: 'MatrixTransform',
  systemId: lowerLimbSystemForNode({ rawName: row.rawName, systemId: null }), visible: true,
}));
const n = (rawName: string) => {
  const node = nodes.find(node => node.rawName === rawName);
  assert.ok(node, `Actual source object ${rawName}`);
  return node;
};
const flatten = (items: readonly NervousGroup[]): NervousGroup[] =>
  items.flatMap(item => [item, ...flatten(item.children ?? [])]);
const tree = flatten(groups);
const planFor = (path: string[]) =>
  planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;

test('Perforating veins are excluded from all Leg collections without changing approved thigh veins', () => {
  for (const path of [p(), p('veins'), p('anterior'), p('lateral'), p('posterior')]) {
    const plan = planFor(path);
    for (const side of ['l', 'r']) {
      const node = n(`Perforating veins.${side}`);
      assert.equal(pathFor(node, path), null);
      assert.ok(!plan.show.includes(node.instanceID));
      assert.ok(pathFor(node, [...ROOT, 'thigh', 'veins']));
    }
  }
});

test('Crural fascia is semitransparent in the main Leg model and dedicated fasciae menu only', () => {
  const fasciaPath = p('fasciae');
  const fasciaNodes = nodes.filter(node => pathFor(node, fasciaPath));
  assert.ok(fasciaNodes.length >= 8);
  for (const path of [p(), fasciaPath]) {
    const plan = planFor(path), settings = lowerLimbSettings(nodes, plan.show, path);
    for (const side of ['l', 'r']) {
      const node = n(`Crural fascia.${side}`);
      assert.ok(plan.show.includes(node.instanceID));
      assert.ok(settings.contextIds.includes(node.instanceID));
    }
  }
  for (const path of [p('anterior'), p('lateral'), p('posterior'),
    p('posterior', 'superficial'), p('posterior', 'deep'), p('muscles'), p('nerves'),
    p('veins'), p('arteries'), p('bones'), p('joints')]) {
    const plan = planFor(path), settings = lowerLimbSettings(nodes, plan.show, path);
    for (const node of fasciaNodes) {
      assert.equal(pathFor(node, path), null, `${path.join('/')}: ${node.rawName}`);
      assert.ok(!plan.show.includes(node.instanceID));
      assert.ok(!settings.supportIds.includes(node.instanceID));
    }
  }
  assert.equal(groups.find(group => group.id === p().join('/'))?.children?.at(-1)?.id,
    fasciaPath.join('/'));
  for (const section of ['anterior', 'lateral', 'posterior'])
    assert.ok(!tree.some(group => group.id === p(section, 'fasciae').join('/')));
  assert.deepEqual(lowerLimbSettings(nodes, [], fasciaPath).supportIds, []);
});

test('Anterior compartment and its nerve menu show both deep and superficial fibular nerve trunks', () => {
  for (const path of [p('anterior'), p('anterior', 'nerves')]) {
    const plan = planFor(path);
    const group = tree.find(group => group.id === path.join('/'))!;
    const menuIds = menuCollectionNodeIds(nodes, [group], () => null, pathFor);
    for (const side of ['l', 'r']) for (const name of ['Deep fibular nerve', 'Superficial fibular nerve']) {
      const node = n(`${name}.${side}`);
      assert.ok(plan.show.includes(node.instanceID));
      assert.ok(menuIds.includes(node.instanceID));
    }
  }
  for (const side of ['l', 'r']) {
    assert.ok(pathFor(n(`Superficial fibular nerve.${side}`), p('lateral', 'nerves')));
    assert.equal(pathFor(n(`Dorsal digital branches of superficial fibular nerve.${side}`), p('anterior')), null);
  }
});

test('Septum colour uses the same-side live crural fascia only in the dedicated Lower limb model', () => {
  const expected = ['l', 'r'].map(side => ({
    instanceID: n(`Transverse intermuscular septum of leg.${side}`).instanceID,
    referenceID: n(`Crural fascia.${side}`).instanceID,
  }));
  const matches = lowerLimbLegColorMatches(MODEL, nodes);
  assert.deepEqual([...matches].sort((a, b) => a.instanceID - b.instanceID),
    expected.sort((a, b) => a.instanceID - b.instanceID));
  assert.deepEqual(lowerLimbLegColorMatches('another-anatomy-model', nodes), []);
  const runtime = nodes.map(node => ({ ...node, rawName: node.rawName.replace(/ /g, '_') + '_12345' }));
  assert.deepEqual(lowerLimbLegColorMatches(MODEL, runtime), matches);
  assert.deepEqual(lowerLimbLegColorMatches(MODEL,
    nodes.filter(node => !/^Crural fascia/.test(node.rawName))), []);
});

test('Septum material matches actual fascia through transparency and Restore, without recolouring shared red muscle', async () => {
  const source: SketchfabMaterial = { id: 'fascia', name: 'Live fascia', channels: {
    AlbedoPBR: { enable: true, color: [0.83, 0.81, 0.76], factor: 0.9 },
    DiffuseColor: { enable: true, color: [0.8, 0.8, 0.75], factor: 0.9 },
  } };
  const red: SketchfabMaterial = { id: 'red', name: 'Shared red septum and muscle', channels: {
    AlbedoPBR: { enable: true, color: [0.8, 0.1, 0.1], factor: 1 },
    EmitColor: { enable: true, color: [0.4, 0, 0], factor: 1 },
    Opacity: { enable: false, factor: 1 },
  } };
  const original = structuredClone(red);
  const materials = new Map([source, red].map(material => [material.id, material]));
  const fascia = { instanceID: 1, materialID: 'fascia' };
  const septum = { instanceID: 2, materialID: 'red' };
  const muscle = { instanceID: 3, materialID: 'red' };
  let created = 0;
  const api = {
    createMaterial: (material: SketchfabMaterial, callback: Function) =>
      callback(null, { ...structuredClone(material), id: `clone-${++created}` }),
    setMaterial: (_material: SketchfabMaterial, callback: Function) => callback(),
    assignMaterial: (_geometry: unknown, _material: string, callback: Function) => callback(null),
  } as unknown as SketchfabAPI;
  const fixtureNodes = [
    { ...n('Crural fascia.l'), instanceID: 1 },
    { ...n('Transverse intermuscular septum of leg.l'), instanceID: 2 },
  ];
  const manager = createCollectionContextOpacity({
    api: () => api,
    geometry: id => [fascia, septum, muscle].filter(geo => geo.instanceID === id),
    opaqueNodes: () => [],
    matchedColorNodes: () => lowerLimbLegColorMatches(MODEL, fixtureNodes),
    material: id => materials.get(id),
    contextOpacity: refractionContextOpacity,
    register: material => { materials.set(material.id, material); },
    onError: message => assert.fail(message),
  });
  for (const ids of [[], [2], []]) {
    await manager.setNodes(ids);
    const rendered = materials.get(septum.materialID)!;
    assert.deepEqual(rendered.channels.AlbedoPBR, source.channels.AlbedoPBR);
    assert.deepEqual(rendered.channels.DiffuseColor, source.channels.DiffuseColor);
    assert.equal(rendered.channels.EmitColor, undefined);
    assert.notEqual(septum.materialID, 'red');
    assert.equal(muscle.materialID, 'red');
    assert.deepEqual(red, original);
  }
});

test('Approved leg arteries, saphenous veins and interosseous joint remain in their own collections', () => {
  for (const side of ['l', 'r']) {
    for (const name of ['Anterior tibial artery', 'Posterior tibial artery', 'Fibular artery'])
      assert.ok(pathFor(n(`${name}.${side}`), p('arteries')));
    for (const name of ['Great saphenous vein', 'Small saphenous vein'])
      assert.ok(pathFor(n(`${name}.${side}`), p('veins')));
  }
  const joints = nodes.filter(node => /Interosseous membrane of leg/i.test(node.rawName));
  assert.ok(joints.length);
  for (const node of joints) assert.ok(pathFor(node, p('joints')));
});
