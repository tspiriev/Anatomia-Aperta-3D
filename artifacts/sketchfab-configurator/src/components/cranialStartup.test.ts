import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { CRANIAL_NERVES_VIEW } from '../data/atlasViews';
import type { SceneNode } from '../types/sketchfab';

const app = ts.createSourceFile('App.tsx', readFileSync(new URL('../App.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const hook = ts.createSourceFile('useSketchfabViewer.ts', readFileSync(new URL('../hooks/useSketchfabViewer.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(source: ts.SourceFile, predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) { if (predicate(node)) result = node; ts.forEachChild(node, visit); }
  visit(source); assert.ok(result); return result;
}
function evaluate(source: ts.SourceFile, node: ts.Node, bindings: Record<string, unknown>) {
  const js = ts.transpileModule(`const value = ${node.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(bindings), `${js}; return value;`)(...Object.values(bindings));
}
const scene: SceneNode[] = [
  { instanceID: 1, rawName: 'Olfactory nerve (I).l', name: 'Olfactory nerve', type: 'MatrixTransform', systemId: 'nervous', visible: true },
  { instanceID: 2, rawName: 'Mandible.l', name: 'Mandible', type: 'MatrixTransform', systemId: 'skeletal', visible: true },
  { instanceID: 3, rawName: 'Unclassified anatomy', name: 'Unclassified anatomy', type: 'Geometry', visible: true },
  { instanceID: 4, rawName: 'Pons.l', name: 'Pons', type: 'MatrixTransform', systemId: 'nervous', visible: false },
];

test('cranial startup waits for readiness and frames all visible model objects once without isolating or hiding anything', () => {
  const effect = find(app, node => ts.isCallExpression(node) && node.expression.getText(app) === 'useEffect'
    && node.arguments[0]?.getText(app).includes('initialCranialFrameDone.current = true')) as ts.CallExpression;
  for (const [overview, ready, materials, mode, shouldFrame] of [
    [true, true, true, 'api', true], [true, false, true, 'api', false],
    [true, true, false, 'api', false], [true, true, true, 'embed', false], [false, true, true, 'api', false],
  ] as const) {
    const calls: number[][] = [];
    const ref = { current: false };
    const fn = evaluate(app, effect.arguments[0], {
      view: CRANIAL_NERVES_VIEW, cranialOverview: overview, initialCranialFrameDone: ref, apiMode: mode,
      isViewerReady: ready, materialsReady: materials, modelNodes: scene,
      focusVisibleNodes: (ids: number[]) => { calls.push(ids); },
      isolateRegion: () => assert.fail('Startup must not isolate any nerve'),
      setNodesVisibility: () => assert.fail('Startup must not hide part of the whole model'),
      setCollectionContext: () => assert.fail('Startup must not apply nerve-specific opacity'),
    });
    fn(); fn();
    assert.deepEqual(calls, shouldFrame ? [[1, 2, 3]] : []);
  }
});

test('only the static cranial viewer disables Sketchfab intro motion, including embed fallback', () => {
  const init = find(hook, node => ts.isCallExpression(node) && node.expression.getText(hook) === 'client.init') as ts.CallExpression;
  const options = init.arguments[1] as ts.ObjectLiteralExpression;
  const spread = options.properties.find(ts.isSpreadAssignment)!;
  assert.ok(spread);
  assert.deepEqual(evaluate(hook, spread.expression, { staticStartup: true }), { camera: 0, autospin: 0 });
  assert.deepEqual(evaluate(hook, spread.expression, { staticStartup: false }), {});
  const embed = find(hook, node => ts.isVariableDeclaration(node) && node.name.getText(hook) === 'EMBED_URL') as ts.VariableDeclaration;
  const urlFor = evaluate(hook, embed.initializer!, {});
  assert.equal(new URL(urlFor('model', true)).searchParams.get('camera'), '0');
  assert.equal(new URL(urlFor('model', true)).searchParams.get('autospin'), '0');
  assert.equal(new URL(urlFor('model')).searchParams.get('camera'), null);
});
