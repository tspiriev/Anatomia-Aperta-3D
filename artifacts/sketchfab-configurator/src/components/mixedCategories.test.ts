import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ADVANCED_NEUROANATOMY_ROOT, advancedNeuroanatomyPathForGroup } from '../data/advancedNeuroanatomy';
import { ADVANCED_ATLAS_COLLECTIONS, MENINGES_ATLAS_COLLECTION, LIMBIC_ATLAS_COLLECTION, BASAL_FOREBRAIN_ATLAS_COLLECTION } from '../data/advancedAtlasCollections';
import { isBasalForebrainContext } from '../data/basalForebrainTaxonomy';
import { expandWholeBrainIds } from '../lib/basalWholeBrain';
import { BRAIN_GROSS_ANATOMY_PATH } from '../data/brainGrossAnatomy';
import { MixCategoriesToggle } from './MixCategoriesToggle';
import { MeshPanel } from './MeshPanel';
import { FullscreenAnatomyMenu } from './FullscreenAnatomyMenu';

function callback(file: string, name: string, bindings: Record<string, unknown>) {
  bindings = { ADVANCED_NEUROANATOMY_ROOT, advancedNeuroanatomyPathForGroup, wholeBrainMemberIds: [], expandWholeBrainIds, setCollectionContext: () => {}, isBasalForebrainContext, advancedCollectionRequest: null, BASAL_FOREBRAIN_ATLAS_COLLECTION, ...bindings };
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let body: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name &&
      node.initializer && ts.isCallExpression(node.initializer)) body = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(body, `Missing ${name}`);
  const output = ts.transpileModule(`const fn = ${body.getText(source)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), `${output}; return fn`)(...Object.values(bindings));
}

const app = '../App.tsx';
const unexpectedRestore = () => assert.fail('Mixing must not restore the full scene');
const ignore = () => {};

test('Dura and limbic image cards open their collections and only isolate when mixing is off', () => {
  for (const collection of [MENINGES_ATLAS_COLLECTION, LIMBIC_ATLAS_COLLECTION, BASAL_FOREBRAIN_ATLAS_COLLECTION]) for (const mixCategories of [true, false]) {
    const paths: string[][] = [];
    const modes: string[] = [];
    const requests: unknown[] = [];
    const select = callback(app, 'handleAdvancedCollectionSelect', {
      ADVANCED_ATLAS_COLLECTIONS, MENINGES_ATLAS_COLLECTION, LIMBIC_ATLAS_COLLECTION, mixCategories,
      clearSelection: ignore, setSelectedSystemId: ignore,
      setNeuroanatomyMode: (mode: string) => modes.push(mode),
      setAdvancedCollectionRequest: (update: (old: null) => unknown) => requests.push(update(null)),
      isolateRegion: (path: string[]) => paths.push([...path]),
    });
    select(collection.id);
    assert.deepEqual(modes, ['advanced']);
    assert.deepEqual(requests, [{ id: collection.id, revision: 1 }]);
    assert.deepEqual(paths, mixCategories ? [] : [collection.path]);
  }
});

test('Brain gross card opens its Standard submenu without changing a mixed composition, and other atlases retain their original navigation', () => {
  for (const brainGrossAnatomy of [true, false]) for (const mixCategories of [true, false]) {
    const isolated: readonly string[][] = [];
    const calls: string[] = [];
    const select = callback(app, 'handleAtlasSystemSelect', {
      view: { brainGrossAnatomy }, mixCategories, BRAIN_GROSS_ANATOMY_PATH,
      handleSystemSelect: (id: string) => calls.push(`delegate:${id}`),
      clearSelection: () => calls.push('clear'),
      setSelectedSystemId: (id: string) => calls.push(id),
      setAdvancedCollectionRequest: (request: unknown) => assert.equal(request, null),
      setNeuroanatomyMode: (mode: string) => calls.push(mode),
      isolateRegion: (path: string[]) => (isolated as string[][]).push([...path]),
    });
    select('nervous');
    assert.deepEqual(calls, brainGrossAnatomy ? ['clear', 'nervous', 'standard'] : ['delegate:nervous']);
    assert.deepEqual(isolated, brainGrossAnatomy && !mixCategories ? [[...BRAIN_GROSS_ANATOMY_PATH]] : []);
  }
});

test('turning mixing on retains an isolated individual without issuing visibility or camera changes', async () => {
  const visibility = new Map([[1, true], [2, false]]);
  const camera = { position: [1, 2, 3], target: [0, 0, 0] };
  const isolationRef = { current: { visibility, camera, originalMaterials: new Map() } as any };
  const focusRequestRef = { current: 0 };
  const retain = callback('../hooks/useSketchfabViewer.ts', 'retainCurrentIsolation', {
    isolationRef, focusRequestRef, apiRef: { current: {} }, getRawNode: ignore,
    setIsFocusing: ignore, setIsolatedNodeId: ignore, setIsolatedWithContext: ignore,
    setFocusError: ignore, setNodesVisibility: unexpectedRestore, exitIsolation: unexpectedRestore,
  });
  const regionIsolationRef = { current: null as any };
  let enabled = false;
  const toggle = callback(app, 'handleMixCategoriesChange', {
    retainCurrentIsolation: retain, regionIsolationRef, setIsolatedRegionPath: ignore,
    setMixCategories: (value: boolean) => { enabled = value; },
  });
  toggle(true);
  assert.equal(enabled, true);
  assert.equal(isolationRef.current, null);
  assert.equal(regionIsolationRef.current.visibility, visibility);
  assert.equal(await regionIsolationRef.current.camera, camera);
  const saved = regionIsolationRef.current;
  toggle(false);
  assert.equal(enabled, false);
  assert.equal(regionIsolationRef.current, saved, 'Switching off does not clear the composition');
});

test('switching systems in mixing mode only browses their menus', () => {
  const select = callback(app, 'handleSystemSelect', {
    mixCategories: true, selectedSystemId: 'nervous', advancedCollectionRequest: { id: 'diencephalon' },
    setAdvancedCollectionRequest: ignore, setNeuroanatomyMode: ignore,
    restoreRegionIsolation: unexpectedRestore, exitIsolation: unexpectedRestore,
    clearSelection: ignore, setSelectedSystemId: (id: string) => assert.equal(id, 'skeletal'),
  });
  select('skeletal');
});

test('switching through every image-card menu preserves a partially visible mixed composition without adding or zooming', () => {
  const nodes = [
    { instanceID: 1, visible: true },
    { instanceID: 2, visible: false },
    { instanceID: 3, visible: true },
    { instanceID: 4, visible: false },
  ];
  const visibility = new Map(nodes.map((node) => [node.instanceID, node.visible]));
  const camera = Promise.resolve({ position: [1, 2, 3], target: [0, 0, 0] });
  const snapshot = { path: ['advanced-neuroanatomy', 'diencephalon'], visibility, camera };
  const regionIsolationRef = { current: snapshot };
  let request: { id: string; revision: number } | null = null;
  const select = callback(app, 'handleAdvancedCollectionSelect', {
    ADVANCED_ATLAS_COLLECTIONS, mixCategories: true, nodes, regionIsolationRef,
    clearSelection: ignore, setSelectedSystemId: ignore, setNeuroanatomyMode: ignore,
    setAdvancedCollectionRequest: (update: Function) => { request = update(request); },
    isolateRegion: unexpectedRestore, exitIsolation: unexpectedRestore,
    setNodesVisibility: unexpectedRestore, focusVisibleNodes: unexpectedRestore,
  });
  for (const collection of [...ADVANCED_ATLAS_COLLECTIONS, ...ADVANCED_ATLAS_COLLECTIONS]) {
    select(collection.id);
    assert.equal(request?.id, collection.id);
    assert.deepEqual(nodes.map((node) => node.visible), [true, false, true, false]);
    assert.equal(regionIsolationRef.current, snapshot);
    assert.equal(regionIsolationRef.current.camera, camera);
    assert.deepEqual([...visibility.values()], [true, false, true, false]);
  }
});

test('selecting structures and returning to category lists in mix mode never unwinds an isolation snapshot', () => {
  let cleared = 0;
  callback(app, 'handleClearSelection', {
    mixCategories: true, exitIsolation: unexpectedRestore,
    clearSelection: () => { cleared++; },
  })();
  assert.equal(cleared, 1);
  callback(app, 'synchronizeSelection', {
    mixCategories: true, previousSelectedId: { current: 1 }, selectedNodeId: 2, isolatedNodeId: 1,
    nodes: [{ instanceID: 2, visible: true, systemId: 'skeletal' }],
    regionIsolationRef: { current: { path: ['advanced-neuroanatomy', 'diencephalon'] } },
    exitIsolation: unexpectedRestore, restoreRegionIsolation: unexpectedRestore,
    isNodeInRegion: unexpectedRestore, setSelectedSystemId: ignore,
  })();
});

test('desktop, mobile toolbar, and fullscreen use the same category navigation and visibility handlers', () => {
  const source = ts.createSourceFile('App.tsx', readFileSync(new URL(app, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const menus: Record<string, string>[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && ['SystemToolbar', 'MeshPanel', 'FullscreenAnatomyMenu'].includes(node.tagName.getText(source))) {
      const attributes: Record<string, string> = { component: node.tagName.getText(source) };
      for (const prop of node.attributes.properties) {
        if (ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer)) {
          attributes[prop.name.getText(source)] = prop.initializer.expression?.getText(source) ?? '';
        }
      }
      menus.push(attributes);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(menus.length, 4); // shared collectionNav + fullscreen + sidebar menus
  for (const menu of menus) {
    if (menu.component === 'SystemToolbar') {
      assert.equal(menu.onSelect, 'handleAtlasSystemSelect');
      assert.equal(menu.onSelectCollection, 'handleAdvancedCollectionSelect');
    } else {
      assert.equal(menu.mixCategories, 'mixCategories');
      assert.equal(menu.onIsolateRegion, 'isolateRegion');
      assert.equal(menu.onSetRegionVisibility, 'handleRegionVisibility');
      assert.equal(menu.onRestoreRegion, 'restoreRegionIsolation');
    }
  }
});

test('mixing uses accessible toggle and Add labels in desktop and fullscreen menus', () => {
  for (const enabled of [false, true]) {
    const toggle = MixCategoriesToggle({ enabled, onChange: (value) => assert.equal(value, !enabled) });
    const markup = renderToStaticMarkup(toggle);
    assert.ok(markup.includes('role="switch"'));
    assert.ok(markup.includes(`aria-checked="${enabled}"`));
    toggle.props.onClick();
  }
  const shared = {
    mixCategories: true, nodes: [], selectedSystemId: 'nervous' as const,
    neuroanatomyMode: 'advanced' as const, advancedCollectionRequest: { id: 'advanced-neuroanatomy/white-matter', revision: 1 },
    selectedNodeId: null, isolatedRegionPath: ['advanced-neuroanatomy', 'white-matter'],
    onNeuroanatomyModeChange: ignore, onSetRegionVisibility: ignore, onIsolateRegion: ignore,
    onRestoreRegion: ignore, regionPathForNode: () => null, isFocusing: false, focusError: null,
  };
  const desktop = renderToStaticMarkup(createElement(MeshPanel, {
    ...shared, isolatedNodeId: null, fadedNodeIds: new Set(), toggleVisibility: ignore,
    onSelect: ignore, onClearSelection: ignore, onToggleFade: ignore,
    onFocusWithContext: ignore, onExitIsolation: ignore,
  }));
  const fullscreen = renderToStaticMarkup(createElement(FullscreenAnatomyMenu, {
    ...shared, isIsolated: false, controlsAvailable: true, onIsolate: ignore, onRestore: ignore,
  }));
  for (const markup of [desktop, fullscreen]) {
    assert.ok(markup.includes('Add White matter fibers to mixed view'));
    assert.ok(!markup.includes('Restore view from White matter fibers'));
    assert.ok(markup.includes('aria-label="Expand White matter fibers"'), 'Menus still start collapsed');
  }
});
