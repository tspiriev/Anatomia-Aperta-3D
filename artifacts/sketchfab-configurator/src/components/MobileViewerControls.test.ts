import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileViewerControls } from './MobileViewerControls';

const noop = () => {};
const props = {
  open: null, onToggle: noop, selectedVisible: true, controlsAvailable: true,
  canUndo: false, canRestore: false, isIsolated: false,
  onToggleVisibility: noop, onIsolate: noop, onUndo: noop, onRestore: noop,
};

test('quick controls are unobtrusive until selection and retain recovery after hiding', () => {
  const empty = renderToStaticMarkup(createElement(MobileViewerControls, props));
  assert.ok(empty.includes('Tap a structure for quick controls'));
  assert.ok(!empty.includes('Quick structure controls'));
  const selected = renderToStaticMarkup(createElement(MobileViewerControls, { ...props, selectedName: 'Thalamus' }));
  for (const action of ['visibility', 'isolate', 'undo', 'restore'])
    assert.ok(selected.includes(`data-testid="button-mobile-${action}"`));
  assert.ok(selected.includes('aria-label="Hide"'));
  assert.ok(selected.includes('aria-label="Isolate"'));
  const recovery = renderToStaticMarkup(createElement(MobileViewerControls, { ...props, canUndo: true }));
  assert.ok(recovery.includes('Quick structure controls'));
  assert.match(recovery, /data-testid="button-mobile-undo" aria-label="Undo"/);
  const hidden = renderToStaticMarkup(createElement(MobileViewerControls, { ...props, selectedName: 'Thalamus', selectedVisible: false }));
  assert.ok(hidden.includes('aria-label="Show"'));
  const busy = renderToStaticMarkup(createElement(MobileViewerControls, { ...props, selectedName: 'Thalamus', controlsAvailable: false }));
  assert.equal((busy.match(/disabled=""/g) ?? []).length, 4);
  const browsing = renderToStaticMarkup(createElement(MobileViewerControls, { ...props, selectedName: 'Thalamus', open: 'collections' }));
  assert.ok(!browsing.includes('Quick structure controls'));
});

test('mobile Hide edits the current view and Undo restores the latest hide across systems', () => {
  const source = ts.createSourceFile('App.tsx', readFileSync(new URL('../App.tsx', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = new Map<string, string>();
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'MobileViewerControls') {
      for (const prop of node.attributes.properties)
        if (ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer))
          callbacks.set(prop.name.getText(source), prop.initializer.expression?.getText(source) ?? '');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  const calls: unknown[][] = [];
  const context = {
    selectedNodeId: 12, selectedDisplay: { visible: true },
    toggleNodeVisibility: (...args: unknown[]) => calls.push(['visibility', ...args]),
    undoLastHide: (...args: unknown[]) => calls.push(['undo', ...args]),
  };
  for (const name of ['onToggleVisibility', 'onUndo']) {
    const js = ts.transpileModule(`(${callbacks.get(name)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(js, context)();
  }
  assert.deepEqual(calls, [['visibility', 12, false], ['undo']]);
  assert.equal(callbacks.get('onIsolate'), 'handleIsolateSelected');
  assert.equal(callbacks.get('onRestore'), 'handleRestorePreviousView');
});

test('Undo availability requires an actual recorded hide of a still-hidden structure', () => {
  const source = ts.createSourceFile('hook.ts', readFileSync(new URL('../hooks/useSketchfabViewer.ts', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let callback = '';
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'canUndoHide' && node.initializer && ts.isCallExpression(node.initializer))
      callback = node.initializer.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  const js = ts.transpileModule(`(${callback})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { nodes: [{ instanceID: 1, visible: false }], hiddenHistoryRef: { current: [] as number[][] } };
  const available = vm.runInNewContext(js, context);
  assert.equal(available(), false, 'initial hidden anatomy is not undo history');
  context.hiddenHistoryRef.current = [[1]];
  assert.equal(available(), true);
  context.nodes[0].visible = true;
  assert.equal(available(), false, 'already restored anatomy disables Undo');
});
