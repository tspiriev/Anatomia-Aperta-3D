import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeshPanel } from './MeshPanel';
import { SystemToolbar } from './SystemToolbar';
import { ADVANCED_ATLAS_COLLECTIONS } from '../data/advancedAtlasCollections';
import { ADVANCED_NEUROANATOMY_ROOT, ADVANCED_NEUROANATOMY_GROUPS, advancedNeuroanatomyPathForGroup } from '../data/advancedNeuroanatomy';
import { captureViewerCamera, waitForViewerVisibility } from '../lib/viewerCamera';
import { isBasalForebrainContext } from '../data/basalForebrainTaxonomy';
import { BASAL_FOREBRAIN_ATLAS_COLLECTION } from '../data/advancedAtlasCollections';

// Exercise the actual callback bodies without relying on Sketchfab's external
// iframe/API, which is unavailable in automated preview browsers.
const appSource = ts.createSourceFile('App.tsx',
  readFileSync(new URL('../App.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const hookSource = ts.createSourceFile('useSketchfabViewer.ts',
  readFileSync(new URL('../hooks/useSketchfabViewer.ts', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true);

function callback(source: ts.SourceFile, name: string, bindings: Record<string, unknown>) {
  bindings = { isTopographicAtlas: false, limbTopography: false, view: {}, isolatedRegionPath: null, subsetFocusQueueRef: { current: Promise.resolve() },
    activeNerveId: null, modelNodes: bindings.nodes ?? [], whiteMatterActive: false, headPetrosalSupportRef: { current: new Set<number>() },
    topographicSettings: () => ({ supportIds: [] }), topographicPathForGroup: () => null, setAnatomicalView: () => {}, ADVANCED_NEUROANATOMY_ROOT, advancedNeuroanatomyPathForGroup, wholeBrainMemberIds: [], setCollectionContext: () => {}, isBasalForebrainContext, advancedCollectionRequest: null, BASAL_FOREBRAIN_ATLAS_COLLECTION, ...bindings };
  let body: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name
      && node.initializer && ts.isCallExpression(node.initializer)) {
      body = node.initializer.arguments[0];
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(body, `Missing callback ${name}`);
  const output = ts.transpileModule(`const callback = ${body.getText(source)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), `${output}\nreturn callback;`)(...Object.values(bindings));
}

// The hook chains several awaits (camera, subset-focus queue) before it acts.
const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));

const unexpectedRestore = () => assert.fail('Visibility editing must not restore isolation');

test('sidebar and fullscreen visibility controls use direct, non-restoring viewer actions', () => {
  const found: Record<string, string[]> = {};
  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(appSource);
      if (['toggleVisibility', 'onSetRegionVisibility', 'onToggleFade'].includes(name)) {
        assert.ok(node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression);
        (found[name] ??= []).push(node.initializer.expression.getText(appSource));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(appSource);
  assert.deepEqual(found, {
    onSetRegionVisibility: Array(6).fill('handleRegionVisibility'),
    // The thalamus/capsule atlas toggles raw meshes; both toggles are direct.
    toggleVisibility: ['view.thalamusCapsule ? toggleRawNodeVisibility : toggleNodeVisibility', 'toggleNodeVisibility'],
    onToggleFade: Array(2).fill('toggleNodeFade'),
  });
});

test('hide/show preserves isolated selection, other hidden structures, and the restore snapshot', () => {
  const snapshot = new Map([[1, true], [2, true], [3, false]]);
  const isolationRef = { current: { visibility: snapshot } as object | null };
  const selectionRef = { current: { instanceID: 1 } as { instanceID: number } | null };
  const nodesRef = { current: [
    { instanceID: 1, visible: true },
    { instanceID: 2, visible: false },
    { instanceID: 3, visible: false },
  ] };
  const pendingVisibilityRef = { current: new Map() };
  const history: number[][] = [];
  const setVisibility = callback(hookSource, 'setNodesVisibility', {
    apiRef: { current: {} }, isolationRef, selectionRef, nodesRef,
    hiddenHistoryRef: { current: history },
    pendingVisibilityRef,
    visibilityFrameRef: { current: 1 },
    setNodes: () => {},
    clearSelection: () => { selectionRef.current = null; },
    flushVisibility: () => {},
  });
  for (const visible of [false, true, false, true]) {
    setVisibility([1], visible);
    assert.equal(nodesRef.current[0].visible, visible);
    assert.equal(nodesRef.current[1].visible, false);
    assert.equal(nodesRef.current[2].visible, false);
    assert.equal(selectionRef.current?.instanceID, 1);
    assert.ok(isolationRef.current);
    assert.deepEqual([...snapshot], [[1, true], [2, true], [3, false]]);
  }
  assert.deepEqual(history, [[1], [1]]);
  // Outside isolation, hiding a selected structure still clears selection.
  isolationRef.current = null;
  setVisibility([1], false);
  assert.equal(selectionRef.current, null);
});

test('focused structure details retain Hide/Show and Restore controls, including when hidden', () => {
  const ignore = () => {};
  for (const visible of [true, false]) {
    const markup = renderToStaticMarkup(createElement(MeshPanel, {
      nodes: [{ instanceID: 1, name: 'Example tract', rawName: 'Example tract',
        type: 'MatrixTransform', systemId: 'nervous', visible }],
      selectedSystemId: 'nervous', neuroanatomyMode: 'standard',
      selectedNodeId: 1, isolatedNodeId: 1, isolatedRegionPath: null,
      fadedNodeIds: new Set(), isFocusing: false, focusError: null,
      onNeuroanatomyModeChange: ignore, toggleVisibility: ignore,
      onSetRegionVisibility: ignore, onIsolateRegion: ignore,
      onRestoreRegion: ignore, regionPathForNode: () => null,
      onSelect: ignore, onClearSelection: ignore, onToggleFade: ignore,
      onFocusWithContext: ignore, onExitIsolation: ignore,
    }));
    assert.ok(markup.includes('Restore previous view'));
    assert.ok(markup.includes(visible ? 'Hide</button>' : 'Show</button>'));
  }
});

test('the CNS toolbar adds four pictured Advanced collections without changing the full atlas toolbar', () => {
  const ignore = () => {};
  const props = { nodes: [], selectedSystemId: 'nervous' as const,
    onSelect: ignore, onSetVisibility: ignore, onSelectCollection: ignore };
  const cns = renderToStaticMarkup(createElement(SystemToolbar, {
    ...props, systemIds: ['skeletal', 'nervous'], showAdvancedCollections: true,
  }));
  const full = renderToStaticMarkup(createElement(SystemToolbar, props));
  assert.deepEqual(ADVANCED_ATLAS_COLLECTIONS.map((group) => group.label),
    ['White matter fibers', 'Basal ganglia and diencephalon', 'Brainstem', 'Spinal cord']);
  for (const collection of ADVANCED_ATLAS_COLLECTIONS) {
    assert.ok(cns.includes(`button-select-collection-${collection.path.at(-1)}`));
    assert.ok(cns.includes(collection.image));
    assert.ok(!full.includes(`button-select-collection-${collection.path.at(-1)}`));
  }
});

test('clicking a toolbar collection clears details, opens Advanced anatomy, and isolates its path', () => {
  const calls: unknown[] = [];
  const id = ADVANCED_ATLAS_COLLECTIONS[2].id;
  const select = callback(appSource, 'handleAdvancedCollectionSelect', {
    mixCategories: false,
    ADVANCED_ATLAS_COLLECTIONS,
    clearSelection: () => calls.push('clear'),
    setSelectedSystemId: (value: string) => calls.push(value),
    setNeuroanatomyMode: (value: string) => calls.push(value),
    setAdvancedCollectionRequest: (update: Function) => calls.push(update(null)),
    isolateRegion: (path: string[]) => calls.push(path),
  });
  select(id);
  assert.deepEqual(calls, ['clear', 'nervous', 'advanced', { id, revision: 1 },
    ['advanced-neuroanatomy', 'brainstem']]);
});

test('an Advanced card always plans nervous anatomy even when the skeletal system was selected', () => {
  let plannedSystem = '';
  const isolate = callback(appSource, 'isolateRegion', {
    ADVANCED_NEUROANATOMY_ROOT: 'advanced-neuroanatomy',
    nodes: [], selectedSystemId: 'skeletal', selectedNodeId: null,
    planRegionIsolation: (_nodes: unknown, system: string) => { plannedSystem = system; return null; },
  });
  isolate(['advanced-neuroanatomy', 'white-matter']);
  assert.equal(plannedSystem, 'nervous');
});

test('hiding spinal structures cannot restore isolation through visibility or deselection effects', () => {
  const path = ['advanced-neuroanatomy', 'spinal-cord'];
  const previousSelectedId = { current: 1 as number | null };
  const snapshot = new Map([[1, true], [2, true], [3, true]]);
  const regionIsolationRef = { current: { path, visibility: snapshot } };
  const bindings = {
    previousSelectedId, regionIsolationRef,
    mixCategories: false,
    isolatedNodeId: 1,
    exitIsolation: unexpectedRestore,
    restoreRegionIsolation: unexpectedRestore,
    setSelectedSystemId: () => {},
    // Same ID but changed visibility must not re-evaluate collection navigation.
    isNodeInRegion: () => assert.fail('Visibility changes are not new selections'),
    regionPathForNode: () => null,
  };
  for (const visible of [false, true, false]) {
    callback(appSource, 'synchronizeSelection', {
      ...bindings, selectedNodeId: 1,
      nodes: [{ instanceID: 1, rawName: 'Anterior horn of spinal cord', systemId: 'nervous', visible }],
    })();
    assert.equal(previousSelectedId.current, 1);
    assert.deepEqual([...snapshot], [[1, true], [2, true], [3, true]]);
  }
  callback(appSource, 'synchronizeSelection', {
    ...bindings, selectedNodeId: null, nodes: [],
  })();
  assert.equal(previousSelectedId.current, null);
  assert.ok(regionIsolationRef.current, 'Hiding the selected spinal structure must retain the collection snapshot');
});

test('selecting a different nucleus inside or outside its isolated subgroup never restores either isolation level', () => {
  const calls: string[] = [];
  for (const path of [
    ['advanced-neuroanatomy', 'brainstem'],
    ['advanced-neuroanatomy', 'brainstem', 'nuclei', 'gse'],
    ['advanced-neuroanatomy', 'brainstem', 'nuclei', 'gse', 'oculomotor'],
  ]) for (const visible of [true, false]) callback(appSource, 'synchronizeSelection', {
    previousSelectedId: { current: 1 }, selectedNodeId: 2,
    mixCategories: false,
    nodes: [{ instanceID: 2, rawName: 'Motor nucleus of facial nerve.r', systemId: 'nervous', visible }],
    isolatedNodeId: 1,
    regionIsolationRef: { current: { path } },
    isNodeInRegion: () => false, regionPathForNode: () => null,
    exitIsolation: () => calls.push('structure'),
    restoreRegionIsolation: () => calls.push('collection'),
    setSelectedSystemId: () => {},
  })();
  assert.deepEqual(calls, []);
});

test('returning from nucleus details clears highlighting but keeps the isolated composition', () => {
  let cleared = 0;
  callback(appSource, 'handleClearSelection', {
    clearSelection: () => cleared++,
    exitIsolation: unexpectedRestore, restoreRegionIsolation: unexpectedRestore,
    mixCategories: false,
  })();
  assert.equal(cleared, 1);
});

test('the actual Spinal cord Hide and Show buttons keep the full scene hidden, even when Hide clears selection', () => {
  const source = ts.createSourceFile('NervousSystemMenu.tsx',
    readFileSync(new URL('./NervousSystemMenu.tsx', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['pathOf', 'canonicalPath', 'samePath', 'isWithin', 'GroupRow'];
  const functions = source.statements.filter((node) =>
    ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text));
  const output = ts.transpileModule(functions.map((node) => node.getText(source)).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const icons = ['ChevronDown', 'ChevronRight', 'Eye', 'EyeOff', 'Focus', 'RotateCcw', 'MeshRow'];
  const GroupRow = new Function('React', ...icons, `${output}\nreturn GroupRow;`)(
    { createElement }, ...icons);
  const path = ['advanced-neuroanatomy', 'spinal-cord'];
  const nodesRef = { current: [
    { instanceID: 1, rawName: 'Anterior horn of spinal cord', systemId: 'nervous' as const, visible: true },
    { instanceID: 2, rawName: 'Gracile fasciculus', systemId: 'nervous' as const, visible: true },
    { instanceID: 3, rawName: 'Arcuate fascicle.l', systemId: 'nervous' as const, visible: false },
    { instanceID: 4, rawName: 'Skull', systemId: 'skeletal' as const, visible: false },
  ] };
  const selectionRef = { current: { instanceID: 1 } as { instanceID: number } | null };
  const visibilityFrameRef = { current: 1 as number | null };
  const pendingVisibilityRef = { current: new Map<number, boolean>() };
  const apiCalls: unknown[][] = [];
  const apiRef = { current: {
    show: (id: number) => apiCalls.push(['show', id]),
    hide: (id: number) => apiCalls.push(['hide', id]),
  } };
  const flushVisibility = callback(hookSource, 'flushVisibility', {
    apiRef, pendingVisibilityRef, visibilityFrameRef,
  });
  const setVisibility = callback(hookSource, 'setNodesVisibility', {
    apiRef, isolationRef: { current: null }, selectionRef, nodesRef,
    hiddenHistoryRef: { current: [] }, pendingVisibilityRef, visibilityFrameRef,
    setNodes: () => {}, clearSelection: () => { selectionRef.current = null; }, flushVisibility,
  });
  const tree = GroupRow({
    group: ADVANCED_NEUROANATOMY_GROUPS.find((group) => group.id === path.join('/')),
    namespace: 'advanced-neuroanatomy', parentPath: [], depth: 0,
    classified: nodesRef.current.map((node) => ({ node, path: null })),
    pathForGroup: advancedNeuroanatomyPathForGroup, expanded: new Set(),
    isolatedPath: path, collectionsOnly: false, compact: false, disabled: false,
    onSetVisibility: setVisibility, onRestore: unexpectedRestore, onIsolate: unexpectedRestore,
  });
  function find(node: any, testId: string): any {
    if (!node || typeof node !== 'object') return undefined;
    if (node.props?.['data-testid'] === testId) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const match = find(child, testId);
      if (match) return match;
    }
  }
  const snapshot = new Map(nodesRef.current.map((node) => [node.instanceID, true]));
  const regionIsolationRef = { current: { path, visibility: snapshot } };
  const previousSelectedId = { current: 1 as number | null };
  for (const action of ['hide', 'show']) {
    visibilityFrameRef.current = 1;
    const button = find(tree, `button-${action}-advanced-neuroanatomy-spinal-cord`);
    assert.ok(button);
    button.props.onClick();
    callback(appSource, 'synchronizeSelection', {
      previousSelectedId, regionIsolationRef, nodes: nodesRef.current,
      mixCategories: false,
      selectedNodeId: selectionRef.current?.instanceID ?? null, isolatedNodeId: null,
      exitIsolation: unexpectedRestore, restoreRegionIsolation: unexpectedRestore,
    })();
    flushVisibility();
    assert.deepEqual(nodesRef.current.map((node) => node.visible),
      action === 'hide' ? [false, false, false, false] : [true, true, false, false]);
    assert.ok(regionIsolationRef.current);
    assert.ok([...snapshot.values()].every(Boolean));
  }
  assert.deepEqual(apiCalls, [['hide', 1], ['hide', 2], ['show', 1], ['show', 2]]);
});

test('each image-card collection starts collapsed so structures are revealed only by manual expansion', () => {
  const ignore = () => {};
  for (const collection of ADVANCED_ATLAS_COLLECTIONS) {
    const group = ADVANCED_NEUROANATOMY_GROUPS.find((entry) => entry.id === collection.id)!;
    const markup = renderToStaticMarkup(createElement(MeshPanel, {
      nodes: [], selectedSystemId: 'nervous', neuroanatomyMode: 'advanced',
      advancedCollectionRequest: { id: collection.id, revision: 1 },
      selectedNodeId: null, isolatedNodeId: null, isolatedRegionPath: collection.path,
      fadedNodeIds: new Set(), isFocusing: false, focusError: null,
      onNeuroanatomyModeChange: ignore, toggleVisibility: ignore,
      onSetRegionVisibility: ignore, onIsolateRegion: ignore,
      onRestoreRegion: ignore, regionPathForNode: () => null,
      onSelect: ignore, onClearSelection: ignore, onToggleFade: ignore,
      onFocusWithContext: ignore, onExitIsolation: ignore,
    }));
    assert.ok(markup.includes(`aria-label="Expand ${collection.label}"`));
    assert.ok(!markup.includes(`aria-label="Collapse ${collection.label}"`));
    for (const child of group.children ?? []) {
      assert.ok(!markup.includes(`aria-label="Collapse ${child.label}"`));
      assert.ok(!markup.includes(`aria-label="Expand ${child.label}"`));
    }
    for (const other of ADVANCED_ATLAS_COLLECTIONS.filter((entry) => entry.id !== collection.id)) {
      assert.ok(!markup.includes(`aria-label="Expand ${other.label}"`));
    }
  }
});

test('camera fitting waits for visibility batches and renderer frames, without changing the isolated set', async () => {
  for (const action of ['fit', 'hide', 'restore']) {
    const frames: (() => void)[] = [];
    const pendingVisibilityRef = { current: new Map([[2, false]]) };
    const visibilityFrameRef = { current: 1 as number | null };
    const focusRequestRef = { current: 0 };
    const nodesRef = { current: [{ instanceID: 1, visible: true }, { instanceID: 2, visible: false }] };
    let fitCount = 0;
    const apiRef = { current: {
      focusOnVisibleGeometries: (done: (error: null) => void) => { fitCount++; done(null); },
    } };
    const focus = callback(hookSource, 'focusVisibleNodes', {
      apiRef, focusRequestRef, pendingVisibilityRef, visibilityFrameRef, nodesRef,
      setFocusError: (error: unknown) => assert.equal(error, null),
      setIsFocusing: () => {},
      waitForViewerVisibility: (current: () => boolean, remaining: () => number, flushing: () => boolean) =>
        waitForViewerVisibility(current, remaining, flushing, (next) => frames.push(next)),
    });
    const result = focus([1], Promise.resolve(null));
    await flushMicrotasks();
    assert.equal(fitCount, 0, 'Do not fit while the full model is still being hidden');
    pendingVisibilityRef.current.clear();
    visibilityFrameRef.current = null;
    if (action === 'hide') nodesRef.current[0].visible = false;
    if (action === 'restore') focusRequestRef.current++;
    while (frames.length) frames.shift()!();
    await result;
    assert.equal(fitCount, action === 'fit' ? 1 : 0);
    assert.equal(nodesRef.current[1].visible, false, 'Camera fitting must never show other models');
  }
});

test('camera snapshots are copied safely and Restore ignores a superseded camera request', async () => {
  const original = { position: [10, 20, 30], target: [0, 1, 2] };
  const snapshot = await captureViewerCamera({ getCameraLookAt: (done) => done(null, original) });
  original.position[0] = 999;
  assert.deepEqual(snapshot?.position, [10, 20, 30]);
  const cameraCalls: unknown[] = [];
  const focusRequestRef = { current: 0 };
  const restore = callback(hookSource, 'restoreCamera', {
    apiRef: { current: { setCameraLookAt: (...args: unknown[]) => cameraCalls.push(args) } },
    focusRequestRef, setIsFocusing: () => {},
  });
  restore(Promise.resolve(snapshot));
  await flushMicrotasks();
  assert.deepEqual(cameraCalls, [[[10, 20, 30], [0, 1, 2], 0.7]]);
  restore(Promise.resolve(snapshot));
  focusRequestRef.current++;
  await flushMicrotasks();
  assert.equal(cameraCalls.length, 1, 'A new collection must cancel delayed camera restoration');
});
