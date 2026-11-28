import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CranialNerveMenu } from './CranialNerveMenu';
import { CRANIAL_NERVE_GROUPS } from '../data/cranialNerveTaxonomy';

const ignore = () => {};

test('every cranial nerve and Overview omit the explanatory header text in normal and fullscreen menus', () => {
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    for (const activeNerveId of [null, ...CRANIAL_NERVE_GROUPS.map(group => group.id)]) {
      const html = renderToStaticMarkup(createElement(CranialNerveMenu, {
        variant, activeNerveId, nodes: [], selectedNodeId: null,
        isolatedRegionPath: activeNerveId?.split('/') ?? null,
        onActivateNerve: ignore, onIsolateRegion: ignore, onRestoreRegion: ignore,
        onSetRegionVisibility: ignore,
      }));
      const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1];
      assert.ok(header, `${variant}: ${activeNerveId}`);
      assert.ok(header.includes('CRANIAL NERVES'));
      assert.ok(!/<p(?:\s|>)/.test(header), 'No redundant paragraph or empty text placeholder');
      assert.ok(!header.includes('stay opaque'));
      assert.ok(!header.includes('semitransparent'));
      assert.ok(header.includes('Show all'));
      if (activeNerveId) assert.ok(header.includes('Restore previous view'));
    }
  }
});
