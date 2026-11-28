import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup, cranialNerveContextIds, cranialNerveForegroundIds } from './cranialNerveTaxonomy';
import { isOpticOccipitalContext, OPTIC_OCCIPITAL_CONTEXT_NAME } from './opticVisualContext';
import { systemForMeshName } from './anatomicalSystems';
import { CRANIAL_NERVES_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { basalWholeBrainDisplay, expandWholeBrainIds } from '../lib/basalWholeBrain';
import { planRegionIsolation } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const sourceNames = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => line.startsWith('OBJECT,')).map(line => line.split(',')[4]);
const aliases = ['Right optic tract', 'Optic tract right', 'Optic tract (right)', 'Optic tract.r.001_123',
  'Occipital lobe.l', 'Right occipital lobe', 'Occipital lobes'];
const nodes: SceneNode[] = [...new Set([...sourceNames, ...aliases])]
  .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: false,
    systemId: systemForMeshName(rawName) ?? 'nervous' }));
const scope = ['advanced-neuroanatomy', 'cranial-nerves', 'ii'];

test('II right optic tract aliases enter the scene as opaque tracts alongside bilateral source tracts and optic radiations', () => {
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  const context = new Set(cranialNerveContextIds(nodes, scope));
  for (const rawName of [...aliases.slice(0, 4), 'Optic tract.l', 'Optic tract.r', 'Optic radiation.l', 'Optic radiation.r']) {
    const node = nodes.find(node => node.rawName === rawName)!;
    assert.ok(node, rawName);
    assert.equal(systemForMeshName(rawName), 'nervous', rawName);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), rawName);
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'tracts'], rawName);
    assert.ok(plan.show.includes(node.instanceID), rawName);
    assert.ok(foreground.has(node.instanceID), rawName);
    assert.ok(!context.has(node.instanceID), rawName);
  }
});

test('II bilateral occipital meshes become one selectable context row with shared visibility/fade/focus IDs, retained with optic radiations', () => {
  const display = basalWholeBrainDisplay(nodes, true, isOpticOccipitalContext,
    OPTIC_OCCIPITAL_CONTEXT_NAME, OPTIC_OCCIPITAL_CONTEXT_NAME);
  assert.ok(display.memberIds.length > 10);
  const row = display.nodes.find(node => node.instanceID === display.representativeId)!;
  assert.equal(row.name, OPTIC_OCCIPITAL_CONTEXT_NAME);
  assert.deepEqual(cranialNervePathForGroup(row, scope), [...scope, 'visual-cortex']);
  assert.equal(display.nodes.filter(isOpticOccipitalContext).length, 1);
  assert.deepEqual(expandWholeBrainIds([row.instanceID], display.memberIds), display.memberIds);
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const tractsPath = [...scope, 'tracts'];
  const plan = planRegionIsolation(nodes, 'nervous', tractsPath, node => cranialNervePathForGroup(node, tractsPath))!;
  for (const id of display.memberIds) {
    assert.ok(context.has(id));
    assert.ok(plan.show.includes(id));
    const node = nodes.find(node => node.instanceID === id)!;
    const rawName = `${node.rawName}.001_123`;
    const alias = { ...node, rawName, systemId: systemForMeshName(rawName) ?? undefined };
    assert.equal(alias.systemId, 'nervous', rawName);
    assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW), rawName);
    assert.deepEqual(cranialNervePathForGroup(alias, scope), [...scope, 'visual-cortex'], rawName);
  }
  for (const rawName of ['Cuneus.l', 'Cuneus.r', 'Occipital lobe.l', 'Right occipital lobe']) {
    assert.ok(display.memberIds.includes(nodes.find(node => node.rawName === rawName)!.instanceID), rawName);
  }
  for (const rawName of ['Precentral gyrus.l', 'Pons.r', 'Lateral geniculate body.r', 'Optic radiation.r', 'Optic tract.r']) {
    assert.ok(!display.memberIds.includes(nodes.find(node => node.rawName === rawName)!.instanceID), rawName);
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[1]], nodes: display.nodes,
    initialExpanded: new Set([scope.join('/'), [...scope, 'visual-cortex'].join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  assert.ok(html.includes(`data-testid="button-select-mesh-${row.instanceID}"`));
  assert.ok(html.includes(OPTIC_OCCIPITAL_CONTEXT_NAME));
  assert.ok(!html.includes('Cuneus.l'));
});
