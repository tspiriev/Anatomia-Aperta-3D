import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BRAIN_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from '../data/atlasViews';
import { classifyNervousObject } from '../data/nervousTaxonomy';
import { SystemToolbar } from './SystemToolbar';
import { MeshPanel } from './MeshPanel';
import { FullscreenAnatomyMenu } from './FullscreenAnatomyMenu';
import type { SceneNode } from '../types/sketchfab';

const noop = () => {};
const modelNodes: SceneNode[] = [
  ['Midbrain.l', 'nervous'], ['Somatosensory tract arm.l', 'nervous'],
  ['Mediodorsal thalamic fibers.r', 'nervous'], ['Caudate nucleus.l', 'nervous'],
  ['Spinal cord', 'nervous'], ['Skull', 'skeletal'],
].map(([rawName, systemId], index) => ({
  instanceID: index + 1, rawName, name: rawName, systemId: systemId as SceneNode['systemId'],
  visible: true, type: 'MatrixTransform',
}));

test('Brain desktop and mobile cards keep all three brain collections but remove skeletal and spinal cards', () => {
  for (const view of [BRAIN_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW]) {
    const html = renderToStaticMarkup(createElement(SystemToolbar, {
      nodes: modelNodes.filter((node) => isNodeAllowedInAtlasView(node, view)),
      selectedSystemId: 'nervous', systemIds: view.systemIds,
      showAdvancedCollections: view.showAdvancedCollections,
      excludedNeuroanatomyGroupIds: view.excludedNeuroanatomyGroupIds,
      brainGrossAnatomy: view.brainGrossAnatomy,
      onSelect: noop, onSelectCollection: noop, onSetVisibility: noop,
    }));
    for (const label of ['White matter fibers', 'Basal ganglia and diencephalon', 'Brainstem']) {
      assert.ok(html.includes(label), label);
    }
    if (view === BRAIN_VIEW) {
      assert.ok(html.includes('Brain gross anatomy'));
      assert.ok(!html.includes('Nervous system'));
      assert.ok(!html.includes('Skeletal system'));
      assert.ok(!html.includes('Spinal cord'));
      assert.ok(html.includes('--atlas-card-count:7'));
      assert.ok(html.includes('button-select-collection-basal-forebrain'));
      assert.ok(html.includes('button-select-collection-limbic-system'));
      assert.ok(html.includes('Dura and meninges'));
      const desktop = html.slice(html.indexOf('aria-label="System cards"'));
      assert.ok(desktop.indexOf('button-select-collection-meninges') < desktop.indexOf('button-select-system-nervous'));
      assert.ok(desktop.indexOf('button-select-system-nervous') < desktop.indexOf('button-select-collection-limbic-system'));
      assert.ok(desktop.indexOf('button-select-collection-limbic-system') < desktop.indexOf('button-select-collection-white-matter'));
    } else {
      assert.ok(!html.includes('Dura and meninges'));
      assert.ok(!html.includes('button-select-collection-limbic-system'));
      assert.ok(!html.includes('button-select-collection-basal-forebrain'));
      assert.ok(html.includes('Skeletal system'));
      assert.ok(html.includes('Spinal cord'));
      assert.ok(html.includes('--atlas-card-count:6'));
    }
  }
});

test('Brain sidebar and fullscreen both filter spinal groups in Standard and Advanced anatomy', () => {
  const common = {
    nodes: modelNodes.filter((node) => isNodeAllowedInAtlasView(node, BRAIN_VIEW)),
    selectedSystemId: 'nervous' as const, mixCategories: true,
    excludedNeuroanatomyGroupIds: BRAIN_VIEW.excludedNeuroanatomyGroupIds,
    brainGrossAnatomy: BRAIN_VIEW.brainGrossAnatomy,
    selectedNodeId: null, isolatedRegionPath: null,
    regionPathForNode: (node: SceneNode) => classifyNervousObject(node.rawName),
    onNeuroanatomyModeChange: noop, onSetRegionVisibility: noop,
    onIsolateRegion: noop, onRestoreRegion: noop, isFocusing: false, focusError: null,
  };
  for (const mode of ['standard', 'advanced'] as const) {
    const panel = renderToStaticMarkup(createElement(MeshPanel, {
      ...common, neuroanatomyMode: mode, toggleVisibility: noop,
      fadedNodeIds: new Set<number>(), onSelect: noop, onClearSelection: noop,
      onToggleFade: noop, isolatedNodeId: null, onFocusWithContext: noop, onExitIsolation: noop,
    }));
    const fullscreen = renderToStaticMarkup(createElement(FullscreenAnatomyMenu, {
      ...common, neuroanatomyMode: mode, isIsolated: false,
      controlsAvailable: true, onIsolate: noop, onRestore: noop,
    }));
    for (const html of [panel, fullscreen]) {
      assert.ok(!html.includes('Spinal cord'));
      assert.ok(!html.includes('Skeletal system'));
      if (mode === 'advanced') {
        for (const label of ['White matter fibers', 'Basal ganglia and diencephalon', 'Brainstem']) {
          assert.ok(html.includes(label), label);
        }
      } else {
        for (const label of ['Brain gross anatomy', 'Brain lobes', 'Brainstem gross anatomy', 'Cerebellum gross anatomy', 'Limbic system']) {
          assert.ok(html.includes(label), label);
        }
        assert.ok(!html.includes('White Matter / Fiber Tracts'));
        assert.ok(!html.includes('Nervous system'));
      }
    }
  }
});

test('all four shared menus receive the same view exclusions and both toolbars use configurable atlas cards', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  assert.equal((app.match(/excludedNeuroanatomyGroupIds=\{view\.excludedNeuroanatomyGroupIds\}/g) ?? []).length, 4);
  assert.equal((app.match(/showAdvancedCollections=\{Boolean\(view\.showAdvancedCollections\)\}/g) ?? []).length, 2);
  assert.equal((app.match(/brainGrossAnatomy=\{view\.brainGrossAnatomy\}/g) ?? []).length, 4);
  assert.ok(app.includes('useSketchfabViewer(view.modelUid, Boolean(view.cranialNerves))'));
  assert.ok(app.includes('modelNodes.filter((node) => isNodeAllowedInAtlasView(node, view))'));
  assert.ok(app.includes('if (view.systemIds) setNodesVisibility(nodes.map((node) => node.instanceID), true)'));
});
