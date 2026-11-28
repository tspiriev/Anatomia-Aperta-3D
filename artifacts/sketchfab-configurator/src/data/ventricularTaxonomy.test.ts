import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VENTRICULAR_GROUP, classifyVentricularObject, isBrainContextForeground } from './ventricularTaxonomy';
import { advancedNeuroanatomyPathForGroup, advancedNeuroanatomyPathForNode } from './advancedNeuroanatomy';
import { systemForMeshName } from './anatomicalSystems';
import { BRAIN_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isBasalForebrainContext, WHOLE_BRAIN_CONTEXT_NAME } from './basalForebrainTaxonomy';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import { basalWholeBrainDisplay, expandWholeBrainIds } from '../lib/basalWholeBrain';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import { SystemToolbar } from '../components/SystemToolbar';
import { createCollectionContextOpacity } from '../lib/collectionContextOpacity';
import type { SceneNode, SketchfabMaterial } from '../types/sketchfab';

const rows = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8')
  .trim().split(/\r?\n/).map(line => line.split(','));
const names = [...new Set(rows.filter(row => row[0] === 'OBJECT').map(row => row[4]))];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, systemId: systemForMeshName(rawName),
  visible: true, type: 'MatrixTransform',
}));
const root = VENTRICULAR_GROUP.id.split('/');
const foreground = nodes.filter(node => classifyVentricularObject(node.rawName));
const context = nodes.filter(isBasalForebrainContext);
const noop = () => {};

test('ventricular category contains the eight source structures, export aliases and selectable whole-brain context without unrelated meshes', () => {
  assert.equal(foreground.length, 8);
  assert.ok(context.length > 100);
  for (const node of foreground) for (const rawName of [node.rawName, `${node.rawName}.001_123`]) {
    const alias = { ...node, rawName, systemId: systemForMeshName(rawName) };
    assert.equal(alias.systemId, 'nervous');
    assert.ok(isNodeAllowedInAtlasView(alias, BRAIN_VIEW));
    assert.ok(isBrainContextForeground(alias));
    const path = classifyVentricularObject(rawName)!;
    assert.ok(isNodeInRegion(alias, path, () => null));
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.ok(plan.show.includes(node.instanceID));
    assert.ok(context.every(node => plan.show.includes(node.instanceID)));
    assert.ok(context.every(node => isNodeInRegion(node, path, () => null)));
    assert.ok(plan.hide.includes(nodes.find(node => node.rawName === 'Nucleus accumbens.l')!.instanceID));
  }
  const plan = planRegionIsolation(nodes, 'nervous', root, node => advancedNeuroanatomyPathForGroup(node, root))!;
  assert.deepEqual(new Set(plan.show), new Set([...foreground, ...context].map(node => node.instanceID)));
  const contextPath = [...root, 'context'];
  const contextOnly = planRegionIsolation(nodes, 'nervous', contextPath, node => advancedNeuroanatomyPathForGroup(node, contextPath))!;
  assert.deepEqual(new Set(contextOnly.show), new Set(context.map(node => node.instanceID)));
  assert.equal(classifyVentricularObject('Periventricular_nucleus.l'), null);
});

test('whole brain uses the same grouped selection and collective visibility as Basal forebrain, in all collection-menu layouts', () => {
  const grouped = basalWholeBrainDisplay(nodes, true);
  assert.deepEqual(grouped.memberIds, context.map(node => node.instanceID));
  assert.equal(grouped.nodes.filter(node => node.rawName === WHOLE_BRAIN_CONTEXT_NAME).length, 1);
  assert.ok(foreground.every(node => grouped.nodes.includes(node)));
  assert.deepEqual(expandWholeBrainIds([grouped.representativeId!], grouped.memberIds), grouped.memberIds);
  for (const layout of ['stacked', 'columns'] as const) for (const collectionsOnly of [false, true]) {
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
      nodes: grouped.nodes, groups: [VENTRICULAR_GROUP], namespace: 'ventricular', layout, collectionsOnly,
      pathForNode: advancedNeuroanatomyPathForNode, pathForGroup: advancedNeuroanatomyPathForGroup,
      onSetVisibility: noop, onIsolate: noop, onRestore: noop, isolatedPath: null, onSelect: noop,
      toggleVisibility: noop, onToggleFade: noop, fadedNodeIds: new Set<number>(),
      browseState: { expanded: new Set([root.join('/'), [...root, 'ventricles'].join('/')]), showUnassigned: false },
      onBrowseStateChange: noop,
    }));
    for (const label of ['Lateral ventricles', 'Third ventricle', 'Cerebral aqueduct', 'Fourth ventricle',
      'Septum pellucidum', 'Choroid plexuses (plexus choroideus)', WHOLE_BRAIN_CONTEXT_NAME]) {
      for (const action of ['Show', 'Hide', 'Isolate']) assert.ok(html.includes(`${action} ${label}`), `${layout}: ${label}`);
    }
  }
  for (const systemIds of [undefined, ['nervous'] as 'nervous'[]]) {
    const html = renderToStaticMarkup(createElement(SystemToolbar, {
      nodes, systemIds, brainGrossAnatomy: true, showAdvancedCollections: true,
      selectedSystemId: 'nervous', onSelect: noop, onSetVisibility: noop, onSelectCollection: noop,
    }));
    assert.ok(html.includes('Ventricular system'));
  }
});

test('ventricular foreground stays opaque when sharing material and ancestry with 18% whole-brain context, including mixing and Restore', async () => {
  const source: SketchfabMaterial = { id: 'shared', name: 'Brain and CSF', channels: {
    Opacity: { enable: true, factor: 0.5 }, AlbedoPBR: { enable: true, color: [0.3, 0.7, 0.9], factor: 1 },
  } };
  const geometries = foreground.map(node => ({ instanceID: node.instanceID, materialID: 'shared' }));
  const cortex = { instanceID: 99999, materialID: 'shared' };
  const materials = new Map([[source.id, source]]);
  let created = 0;
  const api = {
    createMaterial: (material: SketchfabMaterial, cb: Function) => cb(null, { ...structuredClone(material), id: `clone-${++created}` }),
    setMaterial: (_material: SketchfabMaterial, cb: Function) => cb(),
    assignMaterial: (_geo: unknown, _id: string, cb: Function) => cb(null),
  } as unknown as SketchfabAPI;
  const manager = createCollectionContextOpacity({
    api: () => api, geometry: id => id === 99999 ? [cortex, ...geometries] : geometries.filter(geo => geo.instanceID === id),
    opaqueNodes: () => foreground.filter(isBrainContextForeground).map(node => node.instanceID),
    material: id => materials.get(id), register: material => { materials.set(material.id, material); },
    onError: message => assert.fail(message),
  });
  for (const merge of [false, true]) {
    await manager.setNodes([99999], merge);
    assert.deepEqual(materials.get(cortex.materialID)!.channels.Opacity, { enable: true, factor: 0.18 });
    for (const geometry of geometries) {
      assert.deepEqual(materials.get(geometry.materialID)!.channels.Opacity, { enable: false, factor: 1 });
      assert.deepEqual(materials.get(geometry.materialID)!.channels.AlbedoPBR, source.channels.AlbedoPBR);
    }
  }
  await manager.setNodes([]);
  assert.ok([cortex, ...geometries].every(geo => geo.materialID === 'shared'));
  assert.deepEqual(source.channels.Opacity, { enable: true, factor: 0.5 });
});
