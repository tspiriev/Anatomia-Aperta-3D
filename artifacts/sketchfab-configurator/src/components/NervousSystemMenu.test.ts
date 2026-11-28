import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NervousSystemMenu, menuCollectionNodeIds, type CollectionBrowseState } from './NervousSystemMenu';
import type { NervousGroup } from '../data/nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

const groups: readonly NervousGroup[] = [{
  id: 'spinal-cord',
  label: 'Spinal cord',
  children: [{
    id: 'white-matter',
    label: 'White matter',
    children: [{ id: 'motor-pathways', label: 'Motor pathways' }],
  }],
}];
const nodes: SceneNode[] = [
  { instanceID: 1, name: 'Example motor tract', rawName: 'Example motor tract', type: 'MatrixTransform', systemId: 'nervous', visible: true },
  { instanceID: 2, name: 'Unassigned tract', rawName: 'Unassigned tract', type: 'MatrixTransform', systemId: 'nervous', visible: true },
];
const path = ['spinal-cord', 'white-matter', 'motor-pathways'];
const ignore = () => {};

function render(browseState?: CollectionBrowseState) {
  return renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups,
    nodes,
    browseState,
    onBrowseStateChange: ignore,
    pathForNode: (node) => node.instanceID === 1 ? path : null,
    onSetVisibility: ignore,
    onIsolate: ignore,
    isolatedPath: null,
    onRestore: ignore,
    onSelect: ignore,
    toggleVisibility: ignore,
    onToggleFade: ignore,
    fadedNodeIds: new Set(),
  }));
}

test('a remounted collection tree restores every open level from panel state', () => {
  const state: CollectionBrowseState = {
    expanded: new Set(path.map((_, index) => path.slice(0, index + 1).join('/'))),
    showUnassigned: false,
  };
  const beforeSelection = render(state);
  // A fresh render has fresh component-local state, just like returning from
  // structure details. Only the surrounding panel's state restores the tree.
  const afterReturningToList = render(state);
  assert.equal(afterReturningToList, beforeSelection);
  for (const label of ['Spinal cord', 'White matter', 'Motor pathways']) {
    assert.ok(afterReturningToList.includes(`aria-label="Collapse ${label}"`));
  }
  assert.ok(afterReturningToList.includes('data-testid="button-select-mesh-1"'));
});

test('collapsed branches stay collapsed when restoring the tree', () => {
  const html = render({ expanded: new Set(['spinal-cord']), showUnassigned: false });
  assert.ok(html.includes('aria-label="Collapse Spinal cord"'));
  assert.ok(html.includes('aria-label="Expand White matter"'));
  assert.ok(!html.includes('data-testid="button-select-mesh-1"'));
});

test('unassigned expansion restores too, while a fresh session starts collapsed', () => {
  const saved = render({ expanded: new Set(), showUnassigned: true });
  assert.ok(saved.includes('data-testid="button-select-mesh-2"'));
  const fresh = render();
  assert.ok(fresh.includes('aria-label="Expand Spinal cord"'));
  assert.ok(!fresh.includes('data-testid="button-select-mesh-1"'));
  assert.ok(!fresh.includes('data-testid="button-select-mesh-2"'));
});

test('Show all is always offered, even without previous-view history or expanded branches', () => {
  assert.ok(render().includes('data-testid="button-show-all-nervous-view"'));
  assert.ok(render().includes('Show all'));
  assert.ok(!render().includes('Restore previous view'));
  const props = {
    groups, nodes, pathForNode: () => path,
    onSetVisibility: ignore, onIsolate: ignore, isolatedPath: path, onRestore: ignore,
    onSelect: ignore, toggleVisibility: ignore, onToggleFade: ignore, fadedNodeIds: new Set<number>(),
  };
  for (const collectionsOnly of [true, false]) {
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, { ...props, collectionsOnly }));
    assert.ok(html.includes('Show all'));
    assert.ok(html.includes('Restore previous view'));
    assert.ok(html.indexOf('Show all</button>') < html.indexOf('Restore previous view</button>'));
  }
  const empty = renderToStaticMarkup(createElement(NervousSystemMenu, { ...props, nodes: [] }));
  assert.match(empty, /<button[^>]*disabled=""[^>]*data-testid="button-show-all-nervous-view"/);
  const busy = renderToStaticMarkup(createElement(NervousSystemMenu, { ...props, disabled: true }));
  assert.match(busy, /<button[^>]*disabled=""[^>]*data-testid="button-show-all-nervous-view"/);
});

test('Show all includes hidden descendants and deduplicates overlapping categories, but never adds unassigned or unrelated meshes', () => {
  const hidden = nodes.map(node => ({ ...node, visible: false }));
  const displayed = [...groups, { id: 'spinal-cord/white-matter', label: 'Overlapping white matter' }];
  assert.deepEqual(menuCollectionNodeIds(hidden, displayed, node => node.instanceID === 1 ? path : null), [1]);
  assert.deepEqual(menuCollectionNodeIds(hidden, displayed, node =>
    node.instanceID === 1 ? ['spinal-cord/white-matter/motor-pathways'] : ['brain', 'cortex']), [1]);
  assert.deepEqual(menuCollectionNodeIds(hidden, [], () => path), []);
});

test('Show all honors collection-specific memberships instead of broad fallback classification', () => {
  const hidden = nodes.map(node => ({ ...node, visible: false }));
  assert.deepEqual(menuCollectionNodeIds(hidden, groups, () => path,
    node => node.instanceID === 1 ? null : path), [2]);
});
