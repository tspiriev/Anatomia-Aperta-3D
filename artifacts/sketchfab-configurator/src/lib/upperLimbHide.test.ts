import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the actual callbacks without importing/mounting the whole app or
// substituting a mock 3D model into production.
function callback(file: string, name: string, bindings: Record<string, unknown>) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let body: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name
      && node.initializer && ts.isCallExpression(node.initializer))
      body = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(body, name);
  const js = ts.transpileModule(`const result = ${body.getText(source)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), `${js}\nreturn result;`)(...Object.values(bindings));
}

for (const modifier of ['ctrlKey', 'metaKey']) {
  for (const systemId of ['skeletal', 'muscular', 'vascular', 'nervous'])
    test(`${modifier}+Z restores a hidden ${systemId} mesh in Hand and wrist, not a browser/host action`, () => {
      const nodesRef = { current: [
        { instanceID: 1, rawName: 'Selected hand structure.l', systemId, visible: false },
        { instanceID: 2, rawName: 'Scaphoid bone.l', systemId: 'skeletal', visible: true },
      ] };
      const history = { current: [[1]] };
      const pendingVisibilityRef = { current: new Map<number, boolean>() };
      const isolation = { current: { path: ['advanced-neuroanatomy', 'upper-limb-topography', 'hand-wrist', 'thenar'] } };
      const bindings = {
        apiRef: { current: {} }, nodesRef, hiddenHistoryRef: history, pendingVisibilityRef,
        isolationRef: isolation, selectionRef: { current: null }, visibilityFrameRef: { current: 1 },
        setNodes: () => {}, flushVisibility: () => {}, clearSelection: () => assert.fail('Do not exit isolation'),
      };
      const setNodesVisibility = callback('../hooks/useSketchfabViewer.ts', 'setNodesVisibility', bindings);
      const undoLastHide = callback('../hooks/useSketchfabViewer.ts', 'undoLastHide', {
        nodesRef, hiddenHistoryRef: history, setNodesVisibility,
      });
      let prevented = false, stopped = false;
      const handleKeyDown = callback('../App.tsx', 'handleKeyDown', {
        view: { upperLimbTopography: true }, isTopographicAtlas: true,
        selectedSystemId: 'nervous', undoLastHide,
      });
      handleKeyDown({
        key: 'z', [modifier]: true, target: { closest: () => null }, repeat: false,
        preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; },
      });
      assert.ok(prevented, 'Prevent browser/host default even when the active system differs');
      assert.ok(stopped, 'Do not propagate to embedded-host shortcuts');
      assert.deepEqual(nodesRef.current.map(node => node.visible), [true, true]);
      assert.deepEqual([...pendingVisibilityRef.current], [[1, true]], 'Restore only the last hidden structure');
      assert.deepEqual(history.current, []);
      assert.equal(isolation.current.path.at(-1), 'thenar');
    });

  for (const repeat of [false, true])
    test(`${modifier}+Z is consumed with empty history or key repeat (${repeat})`, () => {
      let undoCalls = 0, prevented = false, stopped = false;
      callback('../App.tsx', 'handleKeyDown', {
        view: { upperLimbTopography: true }, isTopographicAtlas: true, selectedSystemId: 'nervous',
        undoLastHide: () => { undoCalls++; return false; },
      })({
        key: 'z', [modifier]: true, repeat, target: { closest: () => null },
        preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; },
      });
      assert.ok(prevented);
      assert.ok(stopped);
      assert.equal(undoCalls, repeat ? 0 : 1);
    });

  test(`${modifier}+Z leaves native text editing undo unchanged`, () => {
    callback('../App.tsx', 'handleKeyDown', {
      undoLastHide: () => assert.fail('Do not undo anatomy when editing text'),
    })({
      key: 'z', [modifier]: true, target: { closest: () => ({ tagName: 'INPUT' }) },
      preventDefault: () => assert.fail('Preserve native text undo'),
      stopPropagation: () => assert.fail('Preserve native text undo'),
    });
  });
}

test('Viewer shortcut listener uses matching capture-phase registration and cleanup', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  assert.match(app, /addEventListener\('keydown', handleKeyDown, true\)/);
  assert.match(app, /removeEventListener\('keydown', handleKeyDown, true\)/);
});

test('Command+Z handles non-Latin keyboard layouts and blocks other handlers on the same window', () => {
  for (const key of ['я', 'з', 'Unidentified']) {
    let undos = 0, prevented = false, stopped = false;
    callback('../App.tsx', 'handleKeyDown', {
      view: { upperLimbTopography: true }, isTopographicAtlas: true,
      undoLastHide: () => { undos++; },
    })({
      key, code: 'KeyZ', metaKey: true, target: null,
      preventDefault: () => { prevented = true; }, stopPropagation: () => {},
      stopImmediatePropagation: () => { stopped = true; },
    });
    assert.equal(undos, 1);
    assert.ok(prevented && stopped);
  }
});

test('Latin layouts keep browser Cmd+W and other modified shortcuts, including Shift+Cmd+Z', () => {
  for (const event of [
    { key: 'w', code: 'KeyZ', metaKey: true },
    { key: 'z', code: 'KeyZ', metaKey: true, shiftKey: true },
    { key: 'z', code: 'KeyZ', ctrlKey: true, altKey: true },
  ]) callback('../App.tsx', 'handleKeyDown', {
    undoLastHide: () => assert.fail('Do not override other shortcuts'),
  })({
    ...event, target: { closest: () => null },
    preventDefault: () => assert.fail('Preserve other browser shortcuts'),
  });
});

test('Non-Latin physical R restores the previous view and physical F toggles fullscreen', () => {
  for (const code of ['KeyR', 'KeyF']) {
    let calls = 0, prevented = false;
    callback('../App.tsx', 'handleKeyDown', {
      isFullscreen: false, handleRestorePreviousView: () => { calls++; },
      toggleFullscreen: () => { calls++; },
    })({
      key: code === 'KeyR' ? 'к' : 'а', code, target: { closest: () => null },
      preventDefault: () => { prevented = true; }, stopPropagation: () => {},
    });
    assert.equal(calls, 1);
    assert.ok(prevented);
  }
});
