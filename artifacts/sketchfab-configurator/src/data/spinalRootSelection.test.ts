import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { SPINAL_NERVE_PATH } from './spinalCordAtlas';

// Exercise only the real callback; do not import browser pages into Node.
const source = ts.createSourceFile('App.tsx',
  readFileSync(new URL('../App.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function selectCallback(bindings: Record<string, unknown>) {
  let body: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'selectNode'
      && node.initializer && ts.isCallExpression(node.initializer)) body = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(body);
  const output = ts.transpileModule(`const callback = ${body.getText(source)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), `${output}\nreturn callback;`)(...Object.values(bindings));
}

test('Root anatomy menu selection zooms only the selected structure without hiding surrounding anatomy', () => {
  const calls: unknown[][] = [], camera = Promise.resolve(null);
  for (const section of ['anterior-roots', 'posterior-roots', 'ganglia', 'spinal-nerves', 'gray-matter', 'white-matter']) {
    calls.length = 0;
    selectCallback({
      view: { spinalCord: true },
      selectRawNode: (id: number) => calls.push(['select', id]),
      isolatedRegionPath: [...SPINAL_NERVE_PATH, section, 'cervical'],
      SPINAL_NERVE_PATH, captureCamera: () => camera,
      focusVisibleNodes: (...args: unknown[]) => calls.push(['focus', ...args]),
    })(42);
    assert.deepEqual(calls, [['select', 42], ['focus', [42], camera, true]], section);
  }
});

test('menu autozoom leaves reference models and other categories unchanged', () => {
  for (const [view, isolatedRegionPath] of [
    [{ spinalCord: true, spinalReferenceModelUid: 'reference' }, SPINAL_NERVE_PATH],
    [{ spinalCord: true }, ['advanced-neuroanatomy', 'long-tracts', 'spinal-cord-topography']],
    [{}, SPINAL_NERVE_PATH],
  ] as const) {
    const calls: number[] = [];
    selectCallback({
      view, isolatedRegionPath, SPINAL_NERVE_PATH,
      selectRawNode: (id: number) => calls.push(id),
      focusVisibleNodes: () => assert.fail('No root-menu autozoom outside Root anatomy'),
    })(42);
    assert.deepEqual(calls, [42]);
  }
});
