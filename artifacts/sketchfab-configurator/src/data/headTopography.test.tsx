import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HEAD_TOPOGRAPHY_GROUPS as groups, headTopographyPathForGroup as resolve, isHeadTopographyNode, headTopographySettings } from './headTopography';
import { HEAD_NECK_TOPOGRAPHY_ROOT as root, HEAD_NECK_TOPOGRAPHY_SOURCE_ENTRIES as entries } from './headNeckTopography';
import { HEAD_NECK_TOPOGRAPHY_VIEW as view, isNodeAllowedInAtlasView } from './atlasViews';
import { HeadNeckTopographyMenu } from '../components/HeadNeckTopographyMenu';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, type: 'MatrixTransform', systemId: null, visible: true,
});
const all = entries.map((entry, i) => node(entry.name, i + 1));
const noop = () => {};
test('The seven pictured head subregions are the top-level collections, with stable existing paths', () => {
  assert.equal(view.label, 'Head');
  assert.equal(view.href, '/atlas/head-neck');
  assert.deepEqual(groups.map(g => g.label), [
    'Scalp and superficial face', 'Temporal and infratemporal regions',
    'Parotid and retromandibular region', 'Orbit',
    'Nasal cavity and pterygopalatine region', 'Oral cavity and floor of mouth',
    'Auricular and middle-ear region',
  ]);
  for (const group of groups) {
    assert.equal(group.id.split('/').length, 4);
    assert.ok(group.id.startsWith([...root, 'head'].join('/') + '/'));
    assert.ok(all.some(n => resolve(n, group.id.split('/'))), group.label);
  }
});
test('Overview, Show all and source scope exclude cervical structures, even when former parotid context overlapped', () => {
  for (const name of ['Sternocleidomastoid muscle.l', 'Thyroid gland', 'Parathyroid gland.l',
    'Vertebra C3', 'Clavicle.l', 'Phrenic nerve.l', 'Superior root ansa cervicalis.l', 'Roots of brachial plexus.l']) {
    assert.equal(isHeadTopographyNode(node(name)), false, name);
    assert.equal(isNodeAllowedInAtlasView(node(name), view), false, name);
    assert.equal(resolve(node(name), root), null, name);
  }
  for (const name of ['Frontal bone', 'Optic nerve (II).l', 'Parotid gland.l'])
    assert.ok(isHeadTopographyNode(node(name)), name);
  assert.equal(resolve(node('Frontal bone'), [...root, 'anterior-triangle']), null);
  const plan = planRegionIsolation(all, 'nervous', root, n => resolve(n, root))!;
  assert.ok(plan.show.length);
  for (const id of plan.show) assert.ok(isHeadTopographyNode(all[id - 1]));
});
test('Every promoted region keeps its tissue hierarchy and head-only isolation/context', () => {
  for (const group of groups) {
    const path = group.id.split('/');
    const plan = planRegionIsolation(all, 'nervous', path, n => resolve(n, path))!;
    assert.ok(plan.show.length, group.label);
    for (const id of plan.show) assert.ok(resolve(all[id - 1], path));
    const context = headTopographySettings(all, plan.show, path);
    for (const id of [...context.supportIds, ...context.contextIds])
      assert.ok(isHeadTopographyNode(all[id - 1]), `${group.label}: non-head support`);
  }
});
test('The shared top strip and sidebar open the promoted head regions directly; fullscreen retains collection controls', () => {
  const nodes = all.filter(isHeadTopographyNode);
  const props = { nodes, selectedNodeId: null, activeNerveId: null,
    onActivateNerve: noop, onIsolateRegion: noop, onRestoreRegion: noop, onSetRegionVisibility: noop };
  const strip = renderToStaticMarkup(createElement(HeadNeckTopographyMenu, { ...props, variant: 'strip' }));
  for (const group of groups) assert.ok(strip.includes(group.label));
  assert.ok(!strip.includes('Anterior triangle') && !strip.includes('Ansa cervicalis'));
  const orbit = groups.find(g => g.label === 'Orbit')!;
  const sidebar = renderToStaticMarkup(createElement(HeadNeckTopographyMenu, {
    ...props, variant: 'sidebar', activeNerveId: orbit.id, isolatedRegionPath: orbit.id.split('/'),
  }));
  assert.ok(sidebar.includes('Orbit') && sidebar.includes('Show all') && sidebar.includes('Restore previous view'));
  assert.ok(!sidebar.includes('Scalp and superficial face') && !sidebar.includes('HEAD AND NECK'));
  const fullscreen = renderToStaticMarkup(createElement(HeadNeckTopographyMenu, { ...props, variant: 'fullscreen' }));
  for (const group of groups) assert.ok(fullscreen.includes(group.label));
  assert.ok(!fullscreen.includes('Anterior triangle of neck'));
});
