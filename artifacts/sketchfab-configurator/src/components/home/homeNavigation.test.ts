import test from 'node:test';
import assert from 'node:assert/strict';
import { backToAtlasMenus } from './homeNavigation';

for (const reduced of [false, true]) for (const mobile of [false, true]) {
  test(`Closing returns to menus and focuses a visible control: reduced=${reduced}, mobile=${mobile}`, () => {
    const calls: string[] = [];
    const listeners = new Map<string, () => void>();
    let fallback: (() => void) | undefined;
    const control = (name: string, visible: boolean) => ({
      getClientRects: () => visible ? [{}] : [],
      focus: (opts: unknown) => { assert.deepEqual(opts, { preventScroll: true }); calls.push(name); },
    });
    const fakeWindow = {
      scrollY: 3200,
      scrollTo: (opts: unknown) => assert.deepEqual(opts, { top: 0, behavior: reduced ? 'auto' : 'smooth' }),
      addEventListener: (event: string, fn: () => void) => listeners.set(event, fn),
      removeEventListener: (event: string) => listeners.delete(event),
      setTimeout: (fn: () => void) => { fallback = fn; return 1; },
      clearTimeout: () => {},
    };
    const fakeDocument = {
      getElementById: (id: string) => {
        assert.equal(id, 'atlas-navigation');
        return { querySelectorAll: () => [control('desktop-menu', !mobile), control('mobile-toggle', mobile)] };
      },
    };
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: fakeDocument, configurable: true });
    try {
      backToAtlasMenus(reduced);
      if (!reduced) {
        assert.deepEqual(calls, [], 'Focus waits until the smooth scroll reaches the menus');
        fakeWindow.scrollY = 0;
        listeners.get('scroll')?.();
        assert.equal(listeners.size, 0, 'Scroll listener cleaned up');
        fallback?.();
      }
      assert.deepEqual(calls, [mobile ? 'mobile-toggle' : 'desktop-menu'], 'Focus moves once to the visible menu');
    } finally {
      if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
      else Reflect.deleteProperty(globalThis, 'window');
      if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
      else Reflect.deleteProperty(globalThis, 'document');
    }
  });
}
