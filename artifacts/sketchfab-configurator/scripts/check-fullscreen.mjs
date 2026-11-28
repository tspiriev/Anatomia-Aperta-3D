import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Exercise the actual keyboard callback with browser/scene dependencies
// stubbed. No Sketchfab network session is needed for shortcut regression checks.
const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleKeyDown') {
    callback = node.initializer.arguments[0].getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(callback, 'Keyboard callback must exist');
const compiled = ts.transpileModule(`(${callback})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const calls = [];
const record = (name, result) => (...args) => { calls.push([name, ...args]); return result; };
const context = {
  isFullscreen: true, selectedNodeId: 1, selectedSystemId: 'muscular',
  isolatedNodeId: null, nodes: [{ instanceID: 1, visible: true }],
  toggleFullscreen: record('fullscreen'),
  restoreRegionIsolation: record('restore-region', false),
  exitIsolation: record('restore-selection'),
  undoLastHide: record('undo', true),
  handleIsolateSelected: record('isolate-selection'),
  toggleNodeVisibility: record('visibility'),
  showAllNodes: record('show-all'),
  unfadeAllNodes: record('unfade-all'),
};
const handleKeyDown = vm.runInNewContext(compiled, context);
function press(key, overrides = {}) {
  calls.length = 0;
  const event = {
    key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, repeat: false,
    target: { closest: () => null }, preventDefault: record('prevent-default'), ...overrides,
  };
  handleKeyDown(event);
  return calls.map(([name]) => name);
}
assert.deepEqual(press('h'), ['restore-region', 'restore-selection', 'visibility', 'prevent-default']);
assert.deepEqual(press('i'), ['isolate-selection', 'prevent-default']);
assert.deepEqual(press('r'), ['restore-region', 'restore-selection', 'prevent-default']);
assert.deepEqual(press('a'), ['restore-region', 'restore-selection', 'show-all', 'unfade-all', 'prevent-default']);
assert.deepEqual(press('z', { ctrlKey: true }), ['restore-region', 'undo', 'prevent-default']);
assert.deepEqual(press('z', { metaKey: true }), ['restore-region', 'undo', 'prevent-default']);
assert.deepEqual(press('f'), ['prevent-default', 'fullscreen']);
assert.deepEqual(press('Escape'), ['prevent-default', 'fullscreen']);
assert.deepEqual(press('i', { repeat: true }), ['prevent-default']);
assert.deepEqual(press('h', { ctrlKey: true }), []);
assert.deepEqual(press('a', { target: { closest: () => ({ tagName: 'INPUT' }) } }), []);
assert.deepEqual(press('i', { target: { closest: () => ({ tagName: 'SELECT' }) } }), []);
context.isFullscreen = false;
assert.deepEqual(press('i'), ['isolate-selection', 'prevent-default']);
assert.deepEqual(press('Escape'), []);

// An old selected mesh outside the requested collection must not immediately
// trigger the selection-change effect and undo fullscreen collection isolation.
let fullscreenIsolateCallback;
function findFullscreenCallback(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'FullscreenAnatomyMenu') {
    const attribute = node.attributes.properties.find((prop) =>
      ts.isJsxAttribute(prop) && prop.name.getText(ast) === 'onIsolateRegion');
    fullscreenIsolateCallback = attribute.initializer.expression.getText(ast);
  }
  ts.forEachChild(node, findFullscreenCallback);
}
findFullscreenCallback(ast);
assert.ok(fullscreenIsolateCallback);
const collectionEvents = [];
const collectionContext = {
  nodes: [{ instanceID: 1, path: ['muscular-01', 'neck'] }], selectedNodeId: 1,
  regionPathForNode: (node) => node.path,
  pathIncludes: (nodePath, path) => path.every((part, index) => nodePath?.[index] === part),
  clearSelection: () => collectionEvents.push('clear-selection'),
  isolateRegion: () => collectionEvents.push('isolate-collection'),
};
const isolateCollection = vm.runInNewContext(ts.transpileModule(`(${fullscreenIsolateCallback})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText, collectionContext);
isolateCollection(['muscular-01', 'upper-limb']);
assert.deepEqual(collectionEvents.splice(0), ['clear-selection', 'isolate-collection']);
isolateCollection(['muscular-01', 'neck']);
assert.deepEqual(collectionEvents.splice(0), ['isolate-collection']);
collectionContext.selectedNodeId = null;
isolateCollection(['muscular-01', 'upper-limb']);
assert.deepEqual(collectionEvents.splice(0), ['isolate-collection']);

const server = await createServer({
  configFile: false,
  cacheDir: '/tmp/check-fullscreen-vite',
  optimizeDeps: { noDiscovery: true, include: [] },
  esbuild: { jsx: 'automatic' },
  resolve: { alias: {
    '@assets': fileURLToPath(new URL('../../../attached_assets', import.meta.url)),
    '@': fileURLToPath(new URL('../src', import.meta.url)),
  } },
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { FullscreenAnatomyMenu } = await server.ssrLoadModule('/src/components/FullscreenAnatomyMenu.tsx');
  const { SystemToolbar } = await server.ssrLoadModule('/src/components/SystemToolbar.tsx');
  const { ANATOMICAL_SYSTEMS } = await server.ssrLoadModule('/src/data/anatomicalSystems.ts');
  const { regionMenuForSystem } = await server.ssrLoadModule('/src/data/regionMenus.ts');
  const nodes = ANATOMICAL_SYSTEMS.map((system, index) => ({
    instanceID: index + 1, systemId: system.id, name: `Structure ${system.id}`,
    rawName: `Structure ${system.id}`, visible: true, type: 'MatrixTransform', children: [],
  }));
  const props = {
    nodes, selectedSystemId: 'muscular', selectedNodeId: 2,
    regionPathForNode: () => null, isolatedRegionPath: null,
    onSetRegionVisibility: () => {}, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    isIsolated: false, isFocusing: false, focusError: null, controlsAvailable: true,
    onIsolate: () => {}, onRestore: () => {},
  };
  const renderMenu = (extra = {}) => renderToStaticMarkup(React.createElement(FullscreenAnatomyMenu, { ...props, ...extra }));
  const html = renderMenu();
  assert.match(html, /data-testid="fullscreen-selected-name"[^>]*>Structure muscular/);
  assert.match(html, /Show only selected \(I\)/);
  assert.match(html, /Browse collections/);
  assert.match(html, /<details[^>]*\bopen(?:[=> ]|$)/, 'Collection browser is visible');
  assert.doesNotMatch(html, /fullscreen-structure-|Browse structures|Anatomical structure names|Unassigned structures/);
  for (const systemId of ['muscular', 'nervous', 'vascular', 'organs', 'attachments']) {
    const menuHtml = renderMenu({ selectedSystemId: systemId });
    const regionMenu = regionMenuForSystem(systemId);
    for (const group of regionMenu.groups) {
      assert.ok(menuHtml.includes(`aria-label="Show ${group.label.replaceAll('&', '&amp;')}"`), `${systemId}: ${group.label}`);
    }
    assert.doesNotMatch(menuHtml, /fullscreen-structure-|Unassigned structures/);
  }
  for (const systemId of ['skeletal', 'joints']) {
    assert.match(renderMenu({ selectedSystemId: systemId }), /No collections defined for this system/);
    assert.doesNotMatch(renderMenu({ selectedSystemId: systemId }), /fullscreen-structure-/);
  }
  assert.match(renderMenu({ isIsolated: true }), /Restore previous view \(R\)/);
  assert.match(renderMenu({ isFocusing: true }), /disabled=""[^>]*>Preparing selected structure/);
  assert.match(renderMenu({ selectedNodeId: null }), /disabled=""/);
  assert.match(renderMenu({ controlsAvailable: false }), /disabled=""/);
  assert.match(renderMenu({ focusError: 'Could not zoom' }), /role="alert"[^>]*>Could not zoom/);
  const toolbar = renderToStaticMarkup(React.createElement(SystemToolbar, {
    nodes, selectedSystemId: 'muscular', onSelect: () => {}, onSetVisibility: () => {},
  }));
  for (const { id } of ANATOMICAL_SYSTEMS) {
    assert.ok(toolbar.includes(`data-testid="button-select-system-${id}"`));
    assert.ok(toolbar.includes(`data-testid="button-visibility-system-${id}"`));
  }
  // Exercise the actual recursive collection row at every expanded level.
  // MeshRow throws if collections-only mode ever attempts to render a mesh.
  const menuSource = fs.readFileSync(new URL('../src/components/NervousSystemMenu.tsx', import.meta.url), 'utf8');
  const menuAst = ts.createSourceFile('Menu.tsx', menuSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = menuAst.statements.filter((node) => ts.isFunctionDeclaration(node)
    && ['pathOf', 'canonicalPath', 'isWithin', 'samePath', 'GroupRow'].includes(node.name?.text))
    .map((node) => node.getText(menuAst)).join('\n');
  const menuCompiled = ts.transpileModule(`${functions}\nGroupRow;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const icon = () => null;
  const GroupRow = vm.runInNewContext(menuCompiled, {
    React, ChevronDown: icon, ChevronRight: icon, Eye: icon, EyeOff: icon, Focus: icon, RotateCcw: icon,
    MeshRow: () => { throw new Error('Individual mesh row rendered in fullscreen'); },
  });
  for (const systemId of ['muscular', 'nervous', 'vascular', 'organs', 'attachments']) {
    const groups = regionMenuForSystem(systemId).groups;
    const entries = [];
    function collect(group, parent = []) {
      const path = group.id.includes('/') ? group.id.split('/') : [...parent, group.id];
      entries.push({ group, path, node: { instanceID: entries.length + 1, name: 'DO_NOT_SHOW_MESH_NAME', visible: true } });
      for (const child of group.children ?? []) collect(child, path);
    }
    for (const group of groups) collect(group);
    const expanded = new Set(entries.map(({ path }) => path.join('/')));
    const classified = entries.map(({ node, path }) => ({ node, path }));
    classified.push({ node: { instanceID: 9000, name: 'UNASSIGNED_MESH_NAME' }, path: null });
    const events = [];
    const rowProps = {
      namespace: `fullscreen-${systemId}`, parentPath: [], depth: 0,
      classified, expanded, onToggle: () => {}, isolatedPath: null,
      collectionsOnly: true, disabled: false,
      onSetVisibility: (ids, visible) => events.push(['visibility', ids, visible]),
      onIsolate: (path) => events.push(['isolate', path]),
      onRestore: () => events.push(['restore']),
      onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
    };
    const markup = groups.map((group) => renderToStaticMarkup(React.createElement(GroupRow, { ...rowProps, group }))).join('');
    assert.doesNotMatch(markup, /DO_NOT_SHOW_MESH_NAME|UNASSIGNED_MESH_NAME/);
    for (const { group, path } of entries) {
      const escaped = group.label.replaceAll('&', '&amp;');
      for (const action of ['Show', 'Hide', 'Isolate']) {
        assert.ok(markup.includes(`aria-label="${action} ${escaped}"`), `${systemId}: ${action} ${group.label}`);
      }
      const expectedIds = entries.filter((entry) => path.every((part, index) => entry.path[index] === part))
        .map((entry) => entry.node.instanceID);
      const element = GroupRow({ ...rowProps, group, parentPath: path.slice(0, -1) });
      function findButton(element, label) {
        if (!React.isValidElement(element)) return null;
        if (element.type === 'button' && element.props['aria-label'] === label) return element;
        for (const child of React.Children.toArray(element.props.children)) {
          const found = findButton(child, label);
          if (found) return found;
        }
        return null;
      }
      const show = findButton(element, `Show ${group.label}`);
      const hide = findButton(element, `Hide ${group.label}`);
      const isolate = findButton(element, `Isolate ${group.label}`);
      assert.equal(show.props.disabled, false);
      show.props.onClick();
      hide.props.onClick();
      isolate.props.onClick();
      // VM arrays have another prototype: compare serialized values.
      assert.equal(JSON.stringify(events.splice(0)), JSON.stringify([
        ['visibility', expectedIds, true], ['visibility', expectedIds, false], ['isolate', path],
      ]));
      const active = GroupRow({ ...rowProps, group, parentPath: path.slice(0, -1), isolatedPath: path });
      findButton(active, `Restore view from ${group.label}`).props.onClick();
      assert.deepEqual(events.splice(0), [['restore']]);
      const unavailable = GroupRow({ ...rowProps, group, parentPath: path.slice(0, -1), disabled: true });
      assert.equal(findButton(unavailable, `Show ${group.label}`).props.disabled, true);
    }
  }
  console.log('Fullscreen checks passed: shortcuts, selected anatomy, five collection hierarchies at every expanded level with no mesh rows, Show/Hide/Isolate/Restore callbacks, unavailable-viewer controls, and all seven system cards.');
} finally {
  await server.close();
}
