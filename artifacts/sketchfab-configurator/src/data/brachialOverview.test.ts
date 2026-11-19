import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import nervousCsv from '@assets/Nervous_system_CLean_1791612986964.csv?raw';
import combinedCsv from '@assets/First_combinedblend_1790668070052.csv?raw';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { brachialPathForGroup, brachialContextIds, brachialForegroundIds, BRACHIAL_ROOT_PATH } from './brachialPlexusTaxonomy';
import { isBrachialWholeBrainNode, BRACHIAL_WHOLE_BRAIN_NAME } from './brachialOverview';
import { isNodeAllowedInAtlasView, BRACHIAL_PLEXUS_VIEW } from './atlasViews';
import { basalWholeBrainDisplay } from '../lib/basalWholeBrain';
import { planRegionIsolation } from '../lib/regionIsolation';
import { BrachialPlexusMenu } from '../components/BrachialPlexusMenu';
import type { SceneNode } from '../types/sketchfab';

function sourceObjects(source: string) {
  const [header, ...rows] = [...csvRows(source)];
  return rows.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]])))
    .filter(row => row.row_type === 'OBJECT' && row.object_type === 'MESH');
}
const nervous = sourceObjects(nervousCsv);
const skeletal = sourceObjects(combinedCsv).filter(row => /(?:rib|sternum|clavicle|scapula|xiphoid|vertebra (?:t|th))/i.test(row.object_name));
const sourceNames = [...new Set([...nervous.map(row => row.object_name), ...skeletal.map(row => row.object_name),
  'Gyrus precentralis.l', 'Gyrus precentralis.r', 'Vertebra L1', 'First rib.l.001_123'])];
const nodes: SceneNode[] = sourceNames.map((rawName, i) => ({
  instanceID: i + 1, name: rawName, rawName, type: 'MatrixTransform', visible: true, systemId: systemForMeshName(rawName),
}));
const path = (...segments: string[]) => [...BRACHIAL_ROOT_PATH, 'overview', ...segments];
const node = (name: string) => {
  const found = nodes.find(n => n.rawName === name);
  assert.ok(found, name);
  return found;
};

test('Overview includes bilateral shoulders, twelve ribs, sternum, costal cartilages and thoracic spine as transparent skeletal context', () => {
  const names = ['Scapula.l', 'Scapula.r', 'Clavicle.l', 'Clavicle.r',
    'First rib.l', 'Twelfth rib.r', 'Costal cartilage of first rib.l', 'Costal cartilage of tenth rib.r',
    'Body of sternum', 'Manubrium of sternum', 'Xiphoid process', 'Vertebra T3', 'Vertebra T12', 'First rib.l.001_123'];
  const context = brachialContextIds(nodes, path());
  const foreground = brachialForegroundIds(nodes, path());
  for (const name of names) {
    const n = node(name);
    assert.equal(n.systemId, 'skeletal', name);
    assert.ok(isNodeAllowedInAtlasView(n, BRACHIAL_PLEXUS_VIEW), name);
    assert.ok(brachialPathForGroup(n, path()), name);
    assert.ok(context.includes(n.instanceID), name);
    assert.ok(!foreground.includes(n.instanceID), name);
  }
  assert.ok(!brachialPathForGroup(node('Vertebra L1'), path()));
  assert.ok(!brachialPathForGroup(node('Dorsal scapular nerve.l'), path('shoulder')));
});
test('precentral gyri and basal ganglia/ventricular source structures remain foreground and outside grouped whole brain', () => {
  const source = nervous.filter(row => ['NS_03_BASAL_GANGLIA', 'NS_06_VENTRICLES_AND_CHOROID'].includes(row.collection_name));
  assert.ok(source.length > 20);
  const names = [...source.map(row => row.object_name), 'Precentral gyrus.l', 'Precentral gyrus.r',
    'Gyrus precentralis.l', 'Gyrus precentralis.r', 'Subthalamic nucleus.l', 'Subthalamic nucleus.r'];
  const context = brachialContextIds(nodes, path());
  const foreground = brachialForegroundIds(nodes, path());
  const display = basalWholeBrainDisplay(nodes, true, isBrachialWholeBrainNode, BRACHIAL_WHOLE_BRAIN_NAME, BRACHIAL_WHOLE_BRAIN_NAME);
  assert.ok(display.memberIds.length > 100);
  for (const name of names) {
    const n = node(name);
    assert.ok(brachialPathForGroup(n, path()), name);
    assert.ok(foreground.includes(n.instanceID), name);
    assert.ok(!context.includes(n.instanceID), name);
    assert.ok(!display.memberIds.includes(n.instanceID), name);
    assert.ok(display.nodes.some(menuNode => menuNode.instanceID === n.instanceID), name);
  }
});
test('central subcollections use reviewed nested taxonomies and retain side-matched skeletal context', () => {
  assert.ok(brachialPathForGroup(node('Caudate nucleus.l'), path('basal-ganglia', 'striatum', 'caudate')));
  assert.ok(brachialPathForGroup(node('Lateral ventricle.r'), path('ventricular-system', 'ventricles', 'lateral')));
  const p = path('basal-ganglia', 'striatum', 'caudate', 'left');
  const plan = planRegionIsolation(nodes, 'nervous', p, n => brachialPathForGroup(n, p))!;
  assert.ok(plan);
  for (const name of ['Caudate nucleus.l', 'Scapula.l', 'First rib.l', 'Body of sternum', 'Vertebra T12']) {
    assert.ok(plan.show.includes(node(name).instanceID), name);
  }
  for (const name of ['Scapula.r', 'First rib.r']) {
    assert.ok(plan.hide.includes(node(name).instanceID), name);
  }
  const html = renderToStaticMarkup(createElement(BrachialPlexusMenu, {
    variant: 'sidebar', nodes: [], activeNerveId: path().join('/'), onActivateNerve: () => {},
    isolatedRegionPath: null, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: null,
  }));
  for (const label of ['Precentral gyri', 'Basal ganglia', 'Ventricular system', 'Thoracic cage', 'Scapulae and clavicles']) {
    assert.ok(html.includes(label), label);
  }
});
