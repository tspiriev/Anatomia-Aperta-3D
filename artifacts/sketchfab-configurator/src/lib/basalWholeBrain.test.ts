import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import gross from '../data/brainGrossAnatomyMemberships.json';
import { WHOLE_BRAIN_CONTEXT_NAME, isBasalForebrainOpaqueStructure } from '../data/basalForebrainTaxonomy';
import { basalWholeBrainDisplay, expandWholeBrainIds } from './basalWholeBrain';
import type { SceneNode } from '../types/sketchfab';
import { ADVANCED_NEUROANATOMY_ROOT, advancedNeuroanatomyPathForGroup } from '../data/advancedNeuroanatomy';
import { isNodeInRegion } from './regionIsolation';
import { isAlwaysOpaqueStructure, structureColorOverride, applyStructureColor, ACCUMBENS_LIGHT_BLUE } from './materialTransparency';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeshRow } from '../components/MeshRow';

const nodes: SceneNode[] = [
  gross.frontal[0], gross.pons[0], gross['cerebellar-hemispheres'][0], gross.vermis[0], 'Hypothalamus',
  'Nucleus accumbens.l', 'Medial forebrain bundle dopamine.l',
].map((rawName, i) => ({ instanceID: i + 1, name: rawName, rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous' }));
const members = [1, 2, 3, 4, 5];

function callback(file: string, name: string, bindings: Record<string, unknown>) {
  bindings = { structureColorOverride, applyStructureColor, preserveSourceMaterials: false, ...bindings };
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let body: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name && node.initializer
      && ts.isCallExpression(node.initializer)) body = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(body, name);
  const js = ts.transpileModule(`const result = ${body.getText(source)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), `${js}\nreturn result;`)(...Object.values(bindings));
}
const hook = '../hooks/useSketchfabViewer.ts';

test('basal context is one whole-brain entry including cerebellum and capsules, but not nuclei or bundles', () => {
  const grouped = basalWholeBrainDisplay(nodes, true);
  assert.deepEqual(grouped.memberIds, members);
  assert.equal(grouped.nodes.length, 3);
  assert.equal(grouped.nodes.at(-1)!.name, WHOLE_BRAIN_CONTEXT_NAME);
  assert.deepEqual(expandWholeBrainIds([3, 6], members), [...members, 6]);
  assert.deepEqual(basalWholeBrainDisplay(nodes, false).nodes, nodes, 'Other collections keep individual meshes');
  const hidden = basalWholeBrainDisplay(nodes.map(n => ({ ...n, visible: !members.includes(n.instanceID) })), true);
  assert.equal(hidden.nodes.at(-1)!.visible, false);
});

test('clicking any whole-brain part picks the same structure and highlights context only', () => {
  for (const clicked of members) {
    const selectionRef = { current: null as any };
    const assigned: number[] = [];
    let selected: number | null = null;
    const geometry = (id: number) => [{ instanceID: id + 100, materialID: 'gray' }];
    const select = callback(hook, 'selectNode', {
      apiRef: { current: {
        createMaterial: (mat: any, cb: Function) => cb(null, { ...mat, id: 'highlight' }),
        assignMaterial: (geo: any) => assigned.push(geo.instanceID),
      } },
      selectionGroupRef: { current: members }, selectionRef, nodesRef: { current: nodes },
      materialsRef: { current: [{ id: 'gray', channels: { Opacity: { enable: true, factor: 0.18 } } }] },
      getGeometryDescendants: (id: number) => id === 1 ? [...geometry(1), ...geometry(6)] : geometry(id),
      getRawNode: (instanceID: number) => ({ instanceID }),
      setSelectedNodeId: (id: number | null) => { selected = id; },
      clearSelection: () => { selectionRef.current = null; selected = null; },
      WHOLE_BRAIN_CONTEXT_NAME, isBasalForebrainOpaqueStructure, isAlwaysOpaqueStructure,
      HIGHLIGHT_COLOR: [0, 0, 1], HIGHLIGHT_FACTOR: 0.65,
    });
    select(clicked);
    assert.equal(selected, 1);
    assert.equal(selectionRef.current.name, WHOLE_BRAIN_CONTEXT_NAME);
    assert.deepEqual(assigned, members.map(id => id + 100), 'Nuclear geometry nested under cortex must not be highlighted');
    select(clicked === 1 ? 2 : 1);
    assert.equal(selected, null, 'Clicking another part toggles the same selection');
  }
});

test('whole-brain Hide/Show and one-step undo change all context without changing nuclei or bundles', () => {
  const nodesRef = { current: nodes.map(n => ({ ...n })) };
  const history = { current: [] as number[][] };
  const bindings = {
    apiRef: { current: {} }, nodesRef, hiddenHistoryRef: history,
    isolationRef: { current: null }, selectionRef: { current: null },
    pendingVisibilityRef: { current: new Map() }, visibilityFrameRef: { current: 1 },
    clearSelection: () => {}, setNodes: () => {}, flushVisibility: () => {},
  };
  const setNodesVisibility = callback(hook, 'setNodesVisibility', bindings);
  const toggle = callback('../App.tsx', 'toggleNodeVisibility', {
    wholeBrainMemberIds: members, setNodesVisibility,
    toggleRawNodeVisibility: (id: number, visible: boolean) => setNodesVisibility([id], visible),
  });
  toggle(1, false);
  assert.ok(nodesRef.current.filter(n => members.includes(n.instanceID)).every(n => !n.visible));
  assert.ok(nodesRef.current.filter(n => !members.includes(n.instanceID)).every(n => n.visible));
  assert.deepEqual(history.current, [members]);
  const undo = callback(hook, 'undoLastHide', { nodesRef, hiddenHistoryRef: history, setNodesVisibility });
  assert.equal(undo('nervous'), true);
  assert.ok(nodesRef.current.every(n => n.visible));
  toggle(1, false);
  callback('../App.tsx', 'handleRegionVisibility', {
    handleSystemVisibility: setNodesVisibility, expandWholeBrainIds, wholeBrainMemberIds: members,
  })([1], true);
  assert.ok(nodesRef.current.every(n => n.visible));
});

test('picking the whole brain in an isolated context view does not restore other meshes', () => {
  const unexpected = () => { throw new Error('Selection must not restore unrelated anatomy'); };
  callback('../App.tsx', 'synchronizeSelection', {
    selectedNodeId: 1, previousSelectedId: { current: null }, nodes, mixCategories: false,
    isolatedNodeId: null, exitIsolation: unexpected, restoreRegionIsolation: unexpected,
    regionIsolationRef: { current: { path: [ADVANCED_NEUROANATOMY_ROOT, 'basal-forebrain', 'context'] } },
    regionPathForNode: () => null, isNodeInRegion, ADVANCED_NEUROANATOMY_ROOT,
    advancedNeuroanatomyPathForGroup, setSelectedSystemId: () => {},
  })();
});

test('anterior commissure aliases stay opaque and have Hide/Show but no Fade control', () => {
  for (const rawName of ['Anterior commissure', 'Anterior commissure.l', 'Anterior commissure.r.001_123']) {
    const node = { ...nodes[0], rawName, name: rawName };
    assert.equal(isAlwaysOpaqueStructure(node), true);
    const html = renderToStaticMarkup(createElement(MeshRow, {
      node, isSelected: false, isFaded: false, selectedRowRef: null,
      onSelect: () => {}, onToggleFade: () => {}, toggleVisibility: () => {},
    }));
    assert.ok(!html.includes('button-fade-mesh'));
    assert.ok(html.includes('button-visibility-mesh'));
  }
  const fade = callback(hook, 'toggleNodeFade', {
    apiRef: { current: {} }, nodesRef: { current: [{ ...nodes[0], rawName: 'Anterior commissure' }] },
    isAlwaysOpaqueStructure,
  });
  assert.doesNotThrow(() => fade(1), 'Even direct Fade requests must stop before changing materials');
});

test('anterior commissure selection and deselection cannot reintroduce source transparency', () => {
  const selectionRef = { current: null as any };
  const geo = { instanceID: 101, materialID: 'transparent-source' };
  const assigned: string[] = [];
  const api = {
    createMaterial: (mat: any, cb: Function) => {
      assert.deepEqual(mat.channels.Opacity, { enable: false, factor: 1 });
      cb(null, { ...mat, id: 'highlight' });
    },
    assignMaterial: (_geo: any, id: string) => assigned.push(id),
  };
  const bindings = {
    apiRef: { current: api }, selectionRef, getRawNode: () => geo, setSelectedNodeId: () => {},
    collectionContextRef: { current: { alwaysOpaqueMaterial: () => 'permanent-opaque' } },
  };
  const clear = callback(hook, 'clearSelection', bindings);
  callback(hook, 'selectNode', {
    ...bindings, clearSelection: clear, selectionGroupRef: { current: [] },
    nodesRef: { current: [{ ...nodes[0], rawName: 'Anterior commissure' }] },
    materialsRef: { current: [{ id: 'transparent-source', channels: { Opacity: { enable: true, factor: 0.18 } } }] },
    getGeometryDescendants: () => [geo], WHOLE_BRAIN_CONTEXT_NAME, isBasalForebrainOpaqueStructure,
    isAlwaysOpaqueStructure, HIGHLIGHT_COLOR: [0, 0, 1], HIGHLIGHT_FACTOR: 0.65,
  })(1);
  clear();
  assert.deepEqual(assigned, ['highlight', 'permanent-opaque']);
});

test('light-blue accumbens overrides apply to both sides and exported aliases, not adjacent nuclei', () => {
  for (const rawName of ['Nucleus accumbens.l', 'Nucleus accumbens.r', 'Nucleus accumbens.r.001_123']) {
    const node = { ...nodes[0], rawName };
    assert.deepEqual(structureColorOverride(node), ACCUMBENS_LIGHT_BLUE);
    assert.equal(isAlwaysOpaqueStructure(node), true);
  }
  assert.equal(structureColorOverride({ ...nodes[0], rawName: 'Septal nucleus.l' }), null);
  assert.equal(structureColorOverride({ ...nodes[0], rawName: 'Anterior commissure' }), null);
});
