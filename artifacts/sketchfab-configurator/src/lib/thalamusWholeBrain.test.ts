import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import inventory from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import { csvRows, systemForMeshName } from '../data/anatomicalSystems';
import {
  THALAMUS_CAPSULE_GROUPS as groups, THALAMUS_CAPSULE_ROOT_PATH as root,
  isThalamusCapsuleCortexNode, thalamusCapsulePathForGroup,
} from '../data/thalamusCapsuleTaxonomy';
import { ThalamusCapsuleMenu } from '../components/ThalamusCapsuleMenu';
import { WHOLE_BRAIN_CONTEXT_NAME } from '../data/basalForebrainTaxonomy';
import { expandWholeBrainIds } from './basalWholeBrain';
import { isThalamusBrainOverviewPath, thalamusWholeBrainDisplay } from './thalamusWholeBrain';
import type { SceneNode } from '../types/sketchfab';

const node = (rawName: string, i: number): SceneNode => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
  visible: i % 2 === 0, systemId: systemForMeshName(rawName),
});
const nodes = [...new Set(csvRows(inventory).filter(row => row[0] === 'OBJECT' && row[5] === 'MESH')
  .map(row => row[4]))].map(node);
const descendants = (group: typeof groups[number]): typeof groups =>
  (group.children ?? []).flatMap(child => [child, ...descendants(child)]);

test('all three main views group the actual cortical surfaces as one selectable brain without merging source geometry', () => {
  const snapshot = structuredClone(nodes);
  for (const group of groups) {
    const path = group.id.split('/');
    const display = thalamusWholeBrainDisplay(nodes, path);
    const cortex = nodes.filter(isThalamusCapsuleCortexNode);
    assert.ok(cortex.length > 40, 'Actual exported cortical meshes');
    assert.ok(isThalamusBrainOverviewPath(path));
    assert.deepEqual(display.memberIds, cortex.map(node => node.instanceID));
    assert.equal(display.nodes.length, nodes.length - cortex.length + 1);
    const whole = display.nodes.find(node => node.instanceID === display.representativeId)!;
    assert.equal(whole.name, WHOLE_BRAIN_CONTEXT_NAME);
    assert.equal(whole.visible, cortex.some(node => node.visible));
    assert.ok(display.nodes.filter(node => node.instanceID !== display.representativeId)
      .every(node => !display.memberIds.includes(node.instanceID)));
  }
  assert.deepEqual(nodes, snapshot);
});

test('every advanced subdivision and side selection retains the original individual meshes and memberships', () => {
  for (const group of groups.flatMap(descendants)) {
    const path = group.id.split('/');
    const display = thalamusWholeBrainDisplay(nodes, path);
    assert.equal(isThalamusBrainOverviewPath(path), false, group.label);
    assert.deepEqual(display.memberIds, []);
    assert.deepEqual(display.nodes, nodes);
    for (const source of nodes.filter(node => thalamusCapsulePathForGroup(node, path)))
      assert.equal(display.nodes.find(node => node.instanceID === source.instanceID), source);
  }
  for (const path of [[], [...root], ['advanced-neuroanatomy', 'long-tracts', 'motor']])
    assert.equal(isThalamusBrainOverviewPath(path), false);
});

test('whole-brain hide/show expansion excludes all nuclei, fibers, thalamic envelopes, brainstem and cerebellum', () => {
  const display = thalamusWholeBrainDisplay(nodes, groups[0].id.split('/'));
  const ids = expandWholeBrainIds([display.representativeId!], display.memberIds);
  assert.deepEqual(ids, display.memberIds);
  assert.ok(nodes.filter(node => !isThalamusCapsuleCortexNode(node))
    .every(node => !ids.includes(node.instanceID)));
  for (const name of ['01_Anterior_ventral_AV', '04_Mediodorsal_MD.l',
    'Fronto pontine fibers.l', 'Thalamus.l', 'Midbrain.l', 'Cerebellar hemisphere.r']) {
    assert.equal(isThalamusCapsuleCortexNode(node(name, 0)), false, name);
  }
  assert.equal(isThalamusCapsuleCortexNode(node('Precentral gyrus.l.001_12345', 0)), true);
  const hidden = nodes.map(node => ids.includes(node.instanceID) ? { ...node, visible: false } : node);
  const hiddenDisplay = thalamusWholeBrainDisplay(hidden, groups[0].id.split('/'));
  assert.equal(hiddenDisplay.nodes.find(node => node.instanceID === display.representativeId)!.visible, false);
  assert.deepEqual(hidden.filter(node => !ids.includes(node.instanceID)), nodes.filter(node => !ids.includes(node.instanceID)));
});

test('selection cards name the grouped brain while advanced menu data remains the original segmented source', () => {
  const path = groups[0].id.split('/');
  const display = thalamusWholeBrainDisplay(nodes, path);
  const selected = display.nodes.find(node => node.instanceID === display.representativeId)!;
  const noop = () => {};
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(ThalamusCapsuleMenu, {
      variant, nodes, activeNerveId: groups[0].id, onActivateNerve: noop,
      isolatedRegionPath: path, onIsolateRegion: noop, onRestoreRegion: noop,
      onSetRegionVisibility: noop, selectedNodeId: selected.instanceID, selectedDisplayNode: selected,
    }));
    assert.ok(html.includes(WHOLE_BRAIN_CONTEXT_NAME), variant);
  }
});
