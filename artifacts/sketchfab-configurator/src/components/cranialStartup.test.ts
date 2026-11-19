import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CranialNerveMenu } from './CranialNerveMenu';
import { CRANIAL_NERVES_VIEW, AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from '../data/atlasViews';
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
function callback(name: string, bindings: Record<string, unknown>) {
  const declaration = find(app, node => ts.isVariableDeclaration(node) && node.name.getText(app) === name) as ts.VariableDeclaration;
  assert.ok(declaration.initializer && ts.isCallExpression(declaration.initializer));
  return evaluate(app, declaration.initializer.arguments[0], bindings);
}
const scene: SceneNode[] = [
  { instanceID: 1, rawName: 'Olfactory nerve (I).l', name: 'Olfactory nerve', type: 'MatrixTransform', systemId: 'nervous', visible: true },
  { instanceID: 2, rawName: 'Mandible.l', name: 'Mandible', type: 'MatrixTransform', systemId: 'skeletal', visible: true },
  { instanceID: 3, rawName: 'Unclassified anatomy', name: 'Unclassified anatomy', type: 'Geometry', visible: true },
  { instanceID: 4, rawName: 'Pons.l', name: 'Pons', type: 'MatrixTransform', systemId: 'nervous', visible: false },
];

test('cranial startup has no default nerve and preserves the whole model until a nerve is selected', () => {
  const declaration = find(app, node => ts.isVariableDeclaration(node)
    && ts.isArrayBindingPattern(node.name) && node.name.elements[0]?.getText(app) === 'activeNerveId') as ts.VariableDeclaration;
  assert.ok(declaration.initializer && ts.isCallExpression(declaration.initializer));
  assert.equal(declaration.initializer.arguments[0].kind, ts.SyntaxKind.NullKeyword);
  for (const overview of [true, false]) {
    const result = callback('nodes', {
      cranialOverview: overview, modelNodes: scene, view: CRANIAL_NERVES_VIEW, isNodeAllowedInAtlasView,
    })();
    assert.deepEqual(result, overview ? scene : scene.filter(node => isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW)));
  }
});

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

test('autonomic startup retains the full model and Sketchfab opening animation without category isolation or camera fitting', () => {
  const init = find(app, node => ts.isCallExpression(node) && node.expression.getText(app) === 'useSketchfabViewer') as ts.CallExpression;
  assert.equal(evaluate(app, init.arguments[1], { view: AUTONOMIC_NERVOUS_SYSTEM_VIEW }), false);
  assert.equal(evaluate(app, init.arguments[1], { view: CRANIAL_NERVES_VIEW }), true);
  const declaration = find(app, node => ts.isVariableDeclaration(node)
    && node.name.getText(app) === 'cranialOverview') as ts.VariableDeclaration;
  const overview = evaluate(app, declaration.initializer!, { isNerveAtlas: true, activeNerveId: null });
  assert.equal(overview, true);
  assert.deepEqual(callback('nodes', {
    cranialOverview: overview, modelNodes: scene, view: AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView,
  })(), scene);
  const effect = find(app, node => ts.isCallExpression(node) && node.expression.getText(app) === 'useEffect'
    && node.arguments[0]?.getText(app).includes('initialCranialFrameDone.current = true')) as ts.CallExpression;
  const ref = { current: false };
  evaluate(app, effect.arguments[0], {
    view: AUTONOMIC_NERVOUS_SYSTEM_VIEW, cranialOverview: true, initialCranialFrameDone: ref, apiMode: 'api',
    isViewerReady: true, materialsReady: true, modelNodes: scene,
    focusVisibleNodes: () => assert.fail('Do not override the opening camera animation'),
    isolateRegion: () => assert.fail('Do not isolate a category on startup'),
    setNodesVisibility: () => assert.fail('Do not hide the initial full model'),
    setCollectionContext: () => assert.fail('Do not change initial opacity'),
  })();
  assert.equal(ref.current, false);
});

test('manual nerve/subgroup activation retains the chosen root and the requested custom isolation', () => {
  let active: string | null = null;
  let isolated: readonly string[] = [];
  const fn = callback('handleActivateNerve', {
    olfactoryBrainActive: false, opticOccipitalActive: false, plexusHeartActive: false, brachialOverviewActive: false, selectedNodeId: null, wholeBrainMemberIds: [],
    clearSelection: () => {}, setActiveNerveId: (id: string) => { active = id; },
    isolateRegion: (path: readonly string[]) => { isolated = path; },
  });
  const path = ['advanced-neuroanatomy', 'cranial-nerves', 'v', 'mandibular-posterior'];
  fn(path);
  assert.equal(active, path.slice(0, 3).join('/'));
  assert.deepEqual(isolated, path);
  const html = renderToStaticMarkup(createElement(CranialNerveMenu, {
    variant: 'sidebar', nodes: scene, activeNerveId: null, onActivateNerve: () => {},
    isolatedRegionPath: null, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: null,
  }));
  assert.ok(html.includes('The whole model is shown. Choose a nerve above'));
  assert.ok(!html.includes('Structures of the selected nerve.'));
});
