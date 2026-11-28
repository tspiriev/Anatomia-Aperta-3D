import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemporalAssociationMenu } from './TemporalAssociationMenu';
import { TEMPORAL_ASSOCIATION_GROUPS } from '../data/temporalAssociationTaxonomy';

test('all temporal atlas categories omit redundant descriptive text in sidebar and fullscreen menus', () => {
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    for (const group of TEMPORAL_ASSOCIATION_GROUPS) {
      const html = renderToStaticMarkup(createElement(TemporalAssociationMenu, {
        variant, nodes: [], activeNerveId: group.id,
        isolatedRegionPath: group.id.split('/'), selectedNodeId: null,
        onActivateNerve: () => {}, onIsolateRegion: () => {},
        onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
      }));
      for (const text of [
        'Select a fiber individually', 'Source fiber materials are preserved.',
        'Principal components:', 'The supratentorial brain is semitransparent',
        'The supratentorial brain provides semitransparent context',
        'Temporal lobe displays the requested', 'Not separately identified in this model:',
        'Ventricles and basal ganglia are available as separate expandable groups',
      ]) assert.ok(!html.includes(text), `${variant}/${group.label}: ${text}`);
      assert.ok(html.includes('Restore previous view'), `${variant}/${group.label} preserves restore control`);
    }
  }
});
