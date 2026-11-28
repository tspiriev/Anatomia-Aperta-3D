import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AUTONOMIC_ROOT_PATH, AUTONOMIC_GROUPS, AUTONOMIC_SOURCE_OBJECTS,
  autonomicPathForGroup, autonomicContextIds, autonomicForegroundIds } from './autonomicTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const root = [...AUTONOMIC_ROOT_PATH, 'plexuses'];
const paravertebral = [...root, 'paravertebral'];
const object = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: rawName, systemId: systemForMeshName(rawName),
  type: 'MatrixTransform', visible: true,
});
const groups = {
  ganglia: ['Superior cervical sympathetic ganglion.r', 'Middle cervical sympathetic ganglion.l',
    'Cervicothoracic Ganglion (Stellatum).r', 'Sympathetic ganglia Thoracic region.r',
    'Sympathetic gangion lumbar region.l', 'Sympathetic ganglia sacral region.r',
    'Paravertebral sympathetic ganglia.l'],
  'grey-rami': ['Rami communicantes grisei.r', 'Rami communicantes griseithoracic retion.l',
    'Rami communicantes grisei sacral region.r'],
  'white-rami': ['Rami communicantes albi.l', 'Rami communicantes albi thoracic region.r',
    'Rami communicantes albi lumbar region.l', 'Rami communicantes albi sacral region.r'],
  'cervical-roots': ['C1 anterior root.r', 'C2 anterior posterior.l', 'C3 posterior root.r',
    'C4 dorsal root.l', 'C5 anterior root.r', 'C6 posterior root.l',
    'C7 anterior root.r', 'C8 posterior root.l'],
  'thoracic-roots': ['Th1  posterior root.r', 'T1 anterior root.l', 'Th6 posterior root.r',
    'T6 anterior root.l', 'Th12 anterior root.r', 'T12 posterior root.l'],
};
const extra = ['Superior cervical cardiac sympathetic nerve.r', 'L1 anterior root.r', 'S4 posterior root.l',
  'Coeliac ganglia.l', 'C1 Dorsal root ganglion.r', 'C1 spinal nerve.r', 'Vertebra C3', 'Vertebra T4'];
const names = [...new Set([...AUTONOMIC_SOURCE_OBJECTS.map(row => row.object_name.trim()),
  ...Object.values(groups).flat(), ...extra])];
const nodes = names.map((name, i) => object(name, i + 1));
const find = (name: string) => nodes.find(node => node.rawName === name)!;

test('superior cervical cardiac sympathetic nerve and right aliases belong to all three requested views and cardiac plexus', () => {
  for (const rawName of ['Superior cervical cardiac sympathetic nerve.r',
    'Superior cervical cardiac sympathetic nerve right', 'Right superior cervical cardiac sympathetic nerve'])
    for (const suffix of ['', '_123', '.001_123']) {
      const node = object(rawName + suffix);
      assert.equal(node.systemId, 'nervous', node.rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), node.rawName);
      for (const scope of [[...AUTONOMIC_ROOT_PATH, 'sympathetic'],
        [...AUTONOMIC_ROOT_PATH, 'head-neck'], root, [...root, 'cardiac']]) {
        assert.ok(isNodeInRegion(node, scope, () => null), node.rawName);
        assert.ok(autonomicPathForGroup(node, scope), node.rawName);
        assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID]);
        assert.deepEqual(autonomicContextIds([node], scope), []);
        assert.deepEqual(planRegionIsolation([node], 'nervous', scope,
          item => autonomicPathForGroup(item, scope))!.show, [node.instanceID]);
      }
    }
});

test('paravertebral whole selection and five individual selections isolate their exact neural members and retain translucent bones', () => {
  for (const [id, selectedNames] of Object.entries(groups)) {
    const scope = [...paravertebral, id];
    for (const parent of [root, paravertebral, scope]) {
      const plan = planRegionIsolation(nodes, 'nervous', parent, node => autonomicPathForGroup(node, parent))!;
      for (const name of selectedNames) {
        assert.ok(plan.show.includes(find(name).instanceID), `${parent.join('/')}: ${name}`);
        for (const suffix of ['', '_123', '.001_123']) {
          const node = object(name + suffix);
          assert.equal(node.systemId, 'nervous', node.rawName);
          assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), node.rawName);
          assert.deepEqual(autonomicPathForGroup(node, parent), scope, node.rawName);
          assert.ok(isNodeInRegion(node, parent, () => null), node.rawName);
          assert.deepEqual(autonomicForegroundIds([node], parent), [node.instanceID], node.rawName);
          assert.deepEqual(autonomicContextIds([node], parent), [], node.rawName);
        }
      }
      for (const name of ['Vertebra C3', 'Vertebra T4'])
        assert.ok(plan.show.includes(find(name).instanceID), name);
    }
    for (const [otherId, otherNames] of Object.entries(groups)) if (otherId !== id)
      for (const name of otherNames) assert.equal(autonomicPathForGroup(find(name), scope), null, `${id}: ${name}`);
  }
});

test('prevertebral ganglia, dorsal root ganglia, cardiac nerves and lumbar/sacral roots are not relabelled as cervical/thoracic paravertebral groups', () => {
  for (const name of extra.filter(name => !name.startsWith('Vertebra')))
    assert.equal(autonomicPathForGroup(find(name), paravertebral), null, name);
  for (const name of ['L1 anterior root.r', 'S4 posterior root.l'])
    assert.ok(autonomicPathForGroup(find(name), root), name);
  assert.ok(autonomicPathForGroup(find('Coeliac ganglia.l'), [...root, 'abdominal']));
});

test('right advanced menu renders the combined selection, five child selections and shared show/hide/isolate/restore controls', () => {
  const group = AUTONOMIC_GROUPS.find(item => item.id === root.join('/'))!;
  const section = group.children!.find(item => item.id === paravertebral.join('/'))!;
  assert.equal(section.children!.length, 5);
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [group], nodes,
    initialExpanded: new Set([group.id, section.id, ...section.children!.map(child => child.id)]),
    pathForNode: node => autonomicPathForGroup(node, root), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: paravertebral, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of [section.label, ...section.children!.map(child => child.label)])
    assert.ok(html.includes(label), label);
  for (const name of Object.values(groups).flat()) assert.ok(html.includes(name), name);
  for (const label of ['Show all', `aria-label="Hide ${section.label}"`, 'Isolate', 'Restore previous view'])
    assert.ok(html.includes(label), label);
});
