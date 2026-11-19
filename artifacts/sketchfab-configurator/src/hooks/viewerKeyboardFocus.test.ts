import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function harness() {
  const text = readFileSync(new URL('./useViewerFullscreen.ts', import.meta.url), 'utf8');
  const source = ts.createSourceFile('focus.ts', text, ts.ScriptTarget.Latest, true);
  let effect: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect'
      && node.arguments[0]?.getText(source).includes('returnKeyboardFocus')) effect = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(effect);
  const listeners = new Map<string, (event?: unknown) => void>();
  const frames = new Map<number, () => void>(), timers = new Map<number, () => void>();
  let id = 0, focuses = 0;
  const iframe = { tagName: 'IFRAME' }, input = { tagName: 'INPUT' }, body = { tagName: 'BODY' };
  const document = {
    activeElement: body,
    addEventListener: (type: string, fn: (event?: unknown) => void) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
  };
  const container = {
    contains: (element: unknown) => element === iframe,
    focus: () => { focuses++; document.activeElement = { tagName: 'DIV' }; },
  };
  const bindings = {
    containerRef: { current: container }, document,
    window: {
      addEventListener: document.addEventListener,
      removeEventListener: document.removeEventListener,
    },
    requestAnimationFrame: (fn: () => void) => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    setTimeout: (fn: () => void) => { timers.set(++id, fn); return id; },
    clearTimeout: (id: number) => timers.delete(id),
  };
  const js = ts.transpileModule(`const effect = ${effect.getText(source)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const cleanup = new Function(...Object.keys(bindings), `${js}; return effect();`)(...Object.values(bindings));
  return { document, iframe, input, listeners, frames, timers, cleanup, focuses: () => focuses };
}

test('Deferred iframe focus is reclaimed even when blur precedes the actual focus transfer', () => {
  const h = harness();
  h.listeners.get('blur')!();
  h.frames.forEach(fn => fn());
  assert.equal(h.focuses(), 0);
  h.document.activeElement = h.iframe;
  h.timers.forEach(fn => fn());
  assert.equal(h.focuses(), 1);
});

test('Iframe focusin also reclaims shortcuts without stealing focus from text fields', () => {
  const h = harness();
  h.document.activeElement = h.iframe;
  h.listeners.get('focusin')!({ type: 'focusin', target: h.iframe });
  h.frames.forEach(fn => fn());
  assert.equal(h.focuses(), 1);
  h.document.activeElement = h.input;
  h.timers.forEach(fn => fn());
  h.listeners.get('focusin')!({ type: 'focusin', target: h.input });
  assert.equal(h.focuses(), 1);
});

test('Focus retries do not touch unrelated iframes and are removed when the viewer unmounts', () => {
  const h = harness();
  h.document.activeElement = { tagName: 'IFRAME' };
  h.listeners.get('blur')!();
  h.frames.forEach(fn => fn());
  h.timers.forEach(fn => fn());
  assert.equal(h.focuses(), 0);
  h.cleanup();
  assert.equal(h.listeners.size, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
});
