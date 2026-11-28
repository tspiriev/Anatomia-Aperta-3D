import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HotkeyReference } from './HotkeyReference';

for (const hasSelection of [false, true]) {
  test(`every hotkey and description stays white without dimming, with selection=${hasSelection}`, () => {
    const html = renderToStaticMarkup(createElement(HotkeyReference, { hasSelection }));
    assert.equal((html.match(/<kbd /g) ?? []).length, 7);
    assert.ok(!html.includes('text-white/'));
    assert.ok(!html.includes('opacity-30'));
    for (const label of ['Show only selected / restore', 'Restore previous view', 'Hide selected mesh',
      'Undo last hide', 'Show all / unfade all', 'Fullscreen', 'Exit fullscreen']) {
      assert.ok(html.includes(`<span class="text-[10px] text-white whitespace-nowrap">${label}</span>`), label);
    }
    assert.equal(html.includes('Select a mesh to use this shortcut'), !hasSelection);
  });
}
