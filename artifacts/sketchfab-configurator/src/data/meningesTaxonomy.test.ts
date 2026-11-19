import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { classifyMeningesObject, MENINGES_GROUP } from './meningesTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { getAdvancedNeuroanatomyGroups, advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { BRAIN_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const names = ['Falx cerebri', 'Tentorium cerebelli.r.001', 'Tentorium cerebelli.r.002',
  'Tentorium cerebelli.l', 'Tentorium cerebelli.r', 'Dura mater brain'];
const makeNode = (rawName: string, i: number): SceneNode => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
  visible: true, systemId: systemForMeshName(rawName),
});
const nodes = names.map(makeNode);
const path = MENINGES_GROUP.id.split('/');
const ignore = () => {};

test('all six cranial dura source meshes and export variants get runtime classification and Brain scope', () => {
  for (const name of names) for (const rawName of [name, `${name}_123`]) {
    const node = makeNode(rawName, 0);
    assert.equal(node.systemId, 'nervous', rawName);
    assert.ok(isNodeAllowedInAtlasView(node, BRAIN_VIEW), rawName);
    assert.equal(classifyMeningesObject(rawName)?.slice(0, 2).join('/'), MENINGES_GROUP.id, rawName);
  }
  for (const name of ['Spinal dura', 'Tentorial nerve.r', 'Frontal branch meningeal nerve.l', 'Unknown dura']) {
    assert.equal(classifyMeningesObject(name), null, name);
  }
});

test('Dura, tentorium, and falx isolation hides nonmembers and preserves all separate tentorial models', () => {
  const all = [...nodes, ...['Hippocampus.l', 'Arcuate fascicle.l', 'Spinal dura', 'Skull'].map((name, i) => makeNode(name, i + 6))];
  const plan = planRegionIsolation(all, 'nervous', path,
    node => advancedNeuroanatomyPathForGroup(node, path))!;
  assert.deepEqual(plan.show, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plan.hide, [7, 8, 9, 10]);
  const tentorium = [...path, 'tentorium'];
  const tentorial = planRegionIsolation(all, 'nervous', tentorium,
    node => advancedNeuroanatomyPathForGroup(node, tentorium))!;
  assert.deepEqual(tentorial.show, [2, 3, 4, 5]);
  assert.equal(getAdvancedNeuroanatomyGroups(true)[0], MENINGES_GROUP);
  assert.equal(getAdvancedNeuroanatomyGroups().length, 4, 'Other atlases retain their current menus');
});

test('meninges menu exposes the three model subgroups with shared controls and starts collapsed', () => {
  const props = {
    nodes, groups: [MENINGES_GROUP], namespace: 'meninges',
    pathForNode: (node: SceneNode) => classifyMeningesObject(node.rawName),
    pathForGroup: advancedNeuroanatomyPathForGroup, onSetVisibility: ignore,
    onIsolate: ignore, isolatedPath: null, onRestore: ignore, onSelect: ignore,
    toggleVisibility: ignore, onToggleFade: ignore, fadedNodeIds: new Set<number>(),
  };
  const collapsed = renderToStaticMarkup(createElement(NervousSystemMenu, props));
  assert.ok(collapsed.includes('Dura and meninges'));
  assert.ok(!collapsed.includes('Tentorium cerebelli'));
  const expanded = renderToStaticMarkup(createElement(NervousSystemMenu, {
    ...props, browseState: { expanded: new Set([MENINGES_GROUP.id]), showUnassigned: false },
    onBrowseStateChange: ignore,
  }));
  for (const label of ['Dura mater', 'Tentorium cerebelli', 'Falx cerebri']) {
    assert.ok(expanded.includes(label));
    for (const action of ['Show', 'Hide', 'Isolate']) assert.ok(expanded.includes(`${action} ${label}`));
  }
});
