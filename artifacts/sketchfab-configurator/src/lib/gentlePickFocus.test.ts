import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createGentlePickFocus, gentlePickCamera } from './gentlePickFocus';
import type { ViewerCamera } from './viewerCamera';

const distance = (camera: ViewerCamera) =>
  Math.hypot(...camera.position.map((value, i) => value - camera.target[i]));

test('a pick centers the actual clicked point, preserves the viewing direction and applies only 8% zoom', () => {
  const camera = { position: [30, -40, 100], target: [0, 0, 0] };
  const next = gentlePickCamera(camera, [50, 20, -600])!;
  assert.deepEqual(next.target, [50, 20, -600]);
  assert.ok(Math.abs(distance(next) / distance(camera) - 0.92) < 1e-12);
  next.position.forEach((value, i) =>
    assert.ok(Math.abs((value - next.target[i]) - (camera.position[i] - camera.target[i]) * 0.92) < 1e-10));
  assert.deepEqual(camera, { position: [30, -40, 100], target: [0, 0, 0] });
});

test('repeated clicks do not progressively zoom in, and manual closer zoom is never zoomed back out', () => {
  let camera: ViewerCamera = { position: [0, -100, 0], target: [0, 0, 0] };
  const moves: ViewerCamera[] = [];
  const focus = createGentlePickFocus({
    getCameraLookAt: callback => callback(null, camera),
    setCameraLookAt: (position, target, duration) => {
      assert.equal(duration, 0.55);
      camera = { position, target };
      moves.push(camera);
    },
  }, () => true);
  for (let i = 0; i < 25; i++) focus([0, 0, i * 50]);
  for (const move of moves) assert.ok(Math.abs(distance(move) - 92) < 1e-10);
  camera = { position: [0, -20, 1200], target: [0, 0, 1200] };
  focus([5, 0, 1300]);
  assert.ok(Math.abs(distance(camera) - 20) < 1e-10);
  assert.deepEqual(camera.target, [5, 0, 1300]);
});

test('invalid hit or camera data cannot produce a camera command; typed coordinate arrays are supported', () => {
  const camera = { position: [0, 100, 0], target: [0, 0, 0] };
  for (const point of [undefined, null, {}, [1, 2], [1, 2, NaN], [1, Infinity, 2], ['1', 2, 3]])
    assert.equal(gentlePickCamera(camera, point), null);
  assert.ok(gentlePickCamera(camera, new Float32Array([1, 2, 3])));
  assert.equal(gentlePickCamera({ position: [0, 0, 0], target: [0, 0, 0] }, [1, 2, 3]), null);
  assert.equal(gentlePickCamera({ position: [0, NaN, 0], target: [0, 0, 0] }, [1, 2, 3]), null);
  const focus = createGentlePickFocus({
    getCameraLookAt: () => { assert.fail('Do not read the camera for invalid hit coordinates'); },
    setCameraLookAt: () => { assert.fail('Do not move the camera'); },
  }, () => true);
  focus(undefined);
});

test('newer picks win over delayed camera responses and unmounted viewers cannot move the camera', () => {
  const callbacks: ((err: Error | null, camera: ViewerCamera) => void)[] = [];
  const targets: number[][] = [];
  let active = true;
  const focus = createGentlePickFocus({
    getCameraLookAt: callback => callbacks.push(callback),
    setCameraLookAt: (_, target) => targets.push(target),
  }, () => active);
  focus([1, 0, 0]); focus([2, 0, 0]);
  const camera = { position: [0, 100, 0], target: [0, 0, 0] };
  callbacks[1](null, camera); callbacks[0](null, camera);
  assert.deepEqual(targets, [[2, 0, 0]]);
  focus([3, 0, 0]);
  active = false;
  callbacks[2](null, camera);
  assert.deepEqual(targets, [[2, 0, 0]]);
});

test('disabled atlases, missing camera capabilities and SDK errors leave the camera alone', () => {
  const api = {
    getCameraLookAt: () => { assert.fail('Disabled atlas must not read the camera'); },
    setCameraLookAt: () => { assert.fail('Disabled atlas must not move the camera'); },
  };
  createGentlePickFocus(api, () => false)([1, 2, 3]);
  createGentlePickFocus({}, () => true)([1, 2, 3]);
  createGentlePickFocus({
    getCameraLookAt: callback => callback(new Error('Unavailable camera'), { position: [], target: [] }),
    setCameraLookAt: () => { assert.fail('Failed camera reads must not move the camera'); },
  }, () => true)([1, 2, 3]);
});

test('App enables gentle click focus only in Long tracts and Spinal cord anatomy, including reference models', () => {
  const source = ts.createSourceFile('App.tsx',
    readFileSync(new URL('../App.tsx', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let option: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useSketchfabViewer')
      option = node.arguments[4];
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(option);
  const enabled = new Function('view', `return ${option.getText(source)}`);
  for (const view of [{ spinalCord: true }, { longTracts: true },
    { spinalCord: true, longTracts: false, preserveAnnotations: true }]) assert.equal(enabled(view), true);
  for (const view of [{}, { musculoskeletal: true }, { thalamusCapsule: true },
    { temporalAssociation: true }, { cranialNerves: true }, { autonomicNerves: true }])
    assert.equal(enabled(view), false);
});

test('the actual viewer click callback resolves geometry to its selectable structure and retains selection behavior without changing visibility', () => {
  const source = ts.createSourceFile('useSketchfabViewer.ts',
    readFileSync(new URL('../hooks/useSketchfabViewer.ts', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true);
  let handler: ts.ArrowFunction | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'api.addEventListener'
      && node.arguments[0]?.getText(source) === "'click'" && ts.isArrowFunction(node.arguments[1]))
      handler = node.arguments[1];
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(handler);
  const code = ts.transpile(`(${handler.getText(source)})`, { target: ts.ScriptTarget.ES2022 });
  const selected: number[] = [], picks: unknown[] = [];
  let clears = 0, keyboardFocus = 0;
  const selection = { current: null as { instanceID: number } | null };
  const bindings = {
    selectableAncestorRef: { current: new Map([[11, 1]]) },
    parentMapRef: { current: new Map([[12, 1]]) },
    panelIdsRef: { current: new Set([1]) },
    selectionRef: selection,
    selectNode: (id: number) => { selected.push(id); selection.current = { instanceID: id }; },
    clearSelection: () => { clears++; selection.current = null; },
    focusPickedPoint: (point: unknown) => picks.push(point),
    iframe: { parentElement: { focus: () => { keyboardFocus++; } } },
    console: { log: () => {} },
  };
  const click = new Function(...Object.keys(bindings), `return ${code}`)(...Object.values(bindings));
  // Every click, including background and unselectable picks, returns keyboard focus.
  for (const info of [{ instanceID: 11, position3D: [1, 2, 3] }, { instanceID: 12, position3D: [4, 5, 6] },
    { instanceID: 99, position3D: [7, 8, 9] }, {}]) {
    const before = keyboardFocus;
    click(info);
    assert.ok(keyboardFocus > before, JSON.stringify(info));
  }
  assert.deepEqual(selected, [1]);
  assert.equal(clears, 1);
  assert.deepEqual(picks, [[1, 2, 3], [4, 5, 6]]);
});
