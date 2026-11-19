import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SkullBaseMenu } from './SkullBaseMenu';
import { SKULL_BASE_GROUPS } from '../data/skullBaseTaxonomy';
import type { SceneNode } from '../types/sketchfab';

test('Skull base uses shared category strips, collection trees, search, show all and restore in fullscreen and sidebar', () => {
  const nodes: SceneNode[] = [
    { rawName: 'Temporal bone.r', name: 'Temporal bone.r', instanceID: 1, systemId: 'skeletal', visible: true, type: 'MatrixTransform' },
    { rawName: 'Facial nerve (VII).l', name: 'Facial nerve (VII).l', instanceID: 2, systemId: 'nervous', visible: true, type: 'MatrixTransform' },
  ];
  for (const variant of ['strip', 'sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(SkullBaseMenu, {
      variant, nodes, activeNerveId: variant === 'strip' ? null : SKULL_BASE_GROUPS[2].id,
      isolatedRegionPath: SKULL_BASE_GROUPS[2].id.split('/'), selectedNodeId: null,
      onActivateNerve: () => {}, onIsolateRegion: () => {}, onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    if (variant === 'strip') {
      for (const group of SKULL_BASE_GROUPS) assert.ok(html.includes(group.label), group.label);
      assert.ok(html.includes('collection-strip-skull-base'));
    } else {
      assert.ok(html.includes('Restore previous view'));
      assert.ok(html.includes('Show all'));
      if (variant === 'sidebar') assert.ok(html.includes('input-skull-base-search'));
      assert.ok(html.includes('Petrous'));
       assert.ok(html.includes('separate jugular bulb is not identified'));
    }
  }
});

test('bone transparency switch exposes both states in sidebar and fullscreen, not the category strip', () => {
  for (const variant of ['sidebar', 'fullscreen', 'strip'] as const) {
    for (const enabled of [true, false]) {
      const html = renderToStaticMarkup(createElement(SkullBaseMenu, {
        variant, nodes: [], activeNerveId: null, isolatedRegionPath: null, selectedNodeId: null,
        boneTransparency: enabled, onBoneTransparencyChange: () => {},
        onActivateNerve: () => {}, onIsolateRegion: () => {}, onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
      }));
      if (variant === 'strip') assert.ok(!html.includes('toggle-skull-base-bone-transparency'));
      else {
        assert.ok(html.includes('aria-label="Bone transparency"'));
        assert.ok(html.includes(`aria-checked="${enabled}"`));
        assert.ok(html.includes(`>${enabled ? 'On' : 'Off'}</span>`));
      }
    }
  }
});

test('posterior fossa exposes whole-cerebellum visibility and advanced supply collections through the shared menus', () => {
  const posterior = SKULL_BASE_GROUPS.find(g => g.id.endsWith('/posterior-fossa'))!;
  const nodes: SceneNode[] = ['Flocculus.l', 'Anterior inferior cerebellar artery.l', 'Pons']
    .map((rawName, i) => ({ rawName, name: rawName, instanceID: i + 1, systemId: 'nervous',
      visible: true, type: 'MatrixTransform' }));
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(SkullBaseMenu, {
      variant, nodes, activeNerveId: posterior.id, isolatedRegionPath: posterior.id.split('/'),
      selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
      onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    assert.ok(html.includes('Cerebellum — whole (semitransparent)'));
    assert.ok(html.includes('Cerebellum — parts and arterial supply'));
    assert.ok(html.includes('typical SCA, AICA or PICA blood supply'));
    assert.ok(html.includes('territories overlap and vary'));
    assert.ok(html.includes('Cerebellar arterial anatomy reference'));
    assert.ok(html.includes('Show all'));
    assert.ok(html.includes('Restore previous view'));
  }
});
