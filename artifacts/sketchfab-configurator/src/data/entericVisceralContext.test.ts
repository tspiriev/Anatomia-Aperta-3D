import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { classifyVisceraObject } from './visceraTaxonomy';
import { isEntericVisceralName } from './entericVisceralContext';
import { AUTONOMIC_GROUPS, AUTONOMIC_ROOT_PATH, AUTONOMIC_SOURCE_OBJECTS,
  autonomicPathForGroup, autonomicContextIds, autonomicForegroundIds } from './autonomicTaxonomy';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import { AutonomicNerveMenu } from '../components/AutonomicNerveMenu';
import { MeshRow } from '../components/MeshRow';
import type { SceneNode } from '../types/sketchfab';

const csv = readFileSync(new URL('../../../../attached_assets/Internal_organs_1790925899980.csv', import.meta.url), 'utf8');
const sourceNames = [...new Set([...csvRows(csv)].filter(row => row[0] === 'OBJECT' && row[5] === 'MESH')
  .map(row => row[4]))];
const names = [...new Set([...sourceNames, ...AUTONOMIC_SOURCE_OBJECTS.map(row => row.object_name.trim()),
  'Vertebra T1', 'Aortic arch'])];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName),
}));
const root = [...AUTONOMIC_ROOT_PATH, 'enteric'];
const organs = [...root, 'organs'];
const object = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, `Missing source ${name}`);
  return node;
};
const opaqueNames = ['Duodenum_Enteric_Plexus_Fine', 'Stomach_Enteric_Plexus_Fine', 'Jejunum_Enteric_Plexus_Fine',
  'Urinary bladder Nerve Plexus', 'Prostate Nerve Plexus'];
const removedGlands = [
  '(Accessory parotid gland).r', '(Accessory parotid gland).l',
  'Parotid gland.r', 'Parotid gland.l', 'Submandibular gland.r', 'Submandibular gland.l',
  'Sublingual gland.r', 'Sublingual gland.l',
  'Neurohypophysis', 'Adenohypophysis', 'Pineal gland', 'Thyroid gland',
  'Superior parathyroid gland.l', 'Superior parathyroid gland.r',
  'Inferior parathyroid gland.l', 'Inferior parathyroid gland.r',
];

test('enteric view retains assigned visceral context except head/neck glands, preserving opaque nerves and excluding review objects', () => {
  const plan = planRegionIsolation(nodes, 'nervous', root, node => autonomicPathForGroup(node, root))!;
  const assigned = sourceNames.filter(name => classifyVisceraObject(name) && !removedGlands.includes(name));
  assert.ok(assigned.length > 100);
  for (const name of assigned) {
    const node = object(name);
    assert.equal(node.systemId, 'organs', name);
    assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(autonomicContextIds([node], root).includes(node.instanceID), name);
    assert.deepEqual(autonomicForegroundIds([node], root), [], name);
    for (const suffix of ['', '_123', '.001_123']) {
      const rawName = name + suffix;
      const alias = { ...node, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(alias.systemId, 'organs', rawName);
      assert.ok(isNodeInRegion(alias, root, () => null), rawName);
      assert.deepEqual(autonomicContextIds([alias], root), [node.instanceID], rawName);
    }
  }
  for (const name of sourceNames.filter(name => !classifyVisceraObject(name))) {
    assert.equal(isEntericVisceralName(name), false, name);
    assert.equal(autonomicPathForGroup(object(name), root), null, name);
  }
  for (const name of opaqueNames) {
    const node = object(name);
    assert.equal(node.systemId, 'nervous', name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.deepEqual(autonomicForegroundIds([node], root), [node.instanceID], name);
    assert.deepEqual(autonomicContextIds([node], root), [], name);
  }
  for (const name of ['Vertebra T1', 'Aortic arch', 'Right renal arteryNerve Plexus', 'Motor root of trigeminal nerve.l']) {
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
});

test('head/neck glands are hidden and excluded from enteric groups and opacity, without changing ownership or head/neck membership', () => {
  const plan = planRegionIsolation(nodes, 'nervous', root, node => autonomicPathForGroup(node, root))!;
  for (const name of removedGlands) {
    assert.ok(plan.hide.includes(object(name).instanceID), name);
    for (const suffix of ['', '_123', '.001_123']) {
      const rawName = name + suffix;
      const node = { ...object(name), rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'organs', rawName);
      assert.equal(isEntericVisceralName(rawName), false, rawName);
      for (const scope of [root, organs]) {
        assert.equal(autonomicPathForGroup(node, scope), null, rawName);
        assert.equal(isNodeInRegion(node, scope, () => null), false, rawName);
        assert.deepEqual(autonomicContextIds([node], scope), [], rawName);
        assert.deepEqual(autonomicForegroundIds([node], scope), [], rawName);
      }
      if (/parotid|submandibular|sublingual/.test(name)) {
        assert.ok(autonomicPathForGroup(node, [...AUTONOMIC_ROOT_PATH, 'head-neck']), rawName);
      }
    }
  }
  for (const name of ['Liver', 'Pancreas']) {
    const node = object(name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.deepEqual(autonomicContextIds([node], root), [node.instanceID], name);
  }
});

test('right advanced menu exposes a separate visceral group with individual Hide and Show controls', () => {
  const sample = ['Stomach', 'Duodenum', 'Liver', 'Gallbladder', 'Pancreas', 'Urinary bladder'].map(object);
  const render = (displayNodes: SceneNode[]) => renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [AUTONOMIC_GROUPS[4]], nodes: displayNodes,
    initialExpanded: new Set([root.join('/'), organs.join('/')]),
    pathForNode: node => autonomicPathForGroup(node, root), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: root, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  const html = render([...sample, ...opaqueNames.map(object), ...removedGlands.map(object)]);
  assert.ok(html.includes('Visceral organs (semitransparent)'));
  for (const name of opaqueNames) {
    assert.ok(html.includes(`aria-label="Hide ${name}"`), name);
    assert.ok(render([{ ...object(name), visible: false }]).includes(`aria-label="Show ${name}"`), name);
  }
  for (const name of removedGlands) assert.ok(!html.includes(`aria-label="Hide ${name}"`), name);
  for (const node of sample) {
    assert.ok(html.includes(`aria-label="Hide ${node.name}"`), node.name);
    assert.ok(render([{ ...node, visible: false }]).includes(`aria-label="Show ${node.name}"`), node.name);
  }
  const sidebar = renderToStaticMarkup(createElement(AutonomicNerveMenu, {
    variant: 'sidebar', nodes: [...sample, ...opaqueNames.map(object)], activeNerveId: root.join('/'),
    onActivateNerve: () => {}, isolatedRegionPath: root, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: null,
  }));
  assert.ok(sidebar.includes('Visceral organs (semitransparent)'));
});

test('each organ visibility button toggles only that organ and remains available while hidden', () => {
  let stomach = object('Stomach');
  const duodenum = object('Duodenum');
  const changes: [number, boolean][] = [];
  const toggleVisibility = (id: number, visible: boolean) => {
    changes.push([id, visible]);
    stomach = { ...stomach, visible };
  };
  for (const action of ['Hide', 'Show']) {
    const row = MeshRow({ node: stomach, isSelected: false, isFaded: true,
      onSelect: () => {}, onToggleFade: () => {}, toggleVisibility });
    const button = row.props.children.find((child: any) => child?.props?.['aria-label'] === `${action} ${stomach.name}`);
    assert.ok(button, `${action} button missing`);
    button.props.onClick();
    assert.equal(duodenum.visible, true);
    assert.ok(isNodeInRegion(stomach, organs, () => null));
  }
  assert.deepEqual(changes, [[stomach.instanceID, false], [stomach.instanceID, true]]);
});
