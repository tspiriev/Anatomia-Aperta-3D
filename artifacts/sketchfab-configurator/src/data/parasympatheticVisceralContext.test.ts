import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AUTONOMIC_ROOT_PATH as root, autonomicPathForGroup as pathFor,
  autonomicContextIds, autonomicForegroundIds,
} from './autonomicTaxonomy';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { systemForMeshName } from './anatomicalSystems';
import { AutonomicNerveMenu } from '../components/AutonomicNerveMenu';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

const scene: SceneNode[] = [
  'Ascending aorta', 'Aortic arch', 'Thoracic aorta', 'Superior vena cava',
  'Inferior vena cava (thoracic part)', 'Pulmonary trunk', 'Left pulmonary artery', 'Right pulmonary artery',
  'Left superior pulmonary vein', 'Right inferior pulmonary vein',
  'Stomach', 'Mucosa of stomach', 'Vagus nerve (X).l',
  'Abdominal aorta', 'Inferior vena cava (abdominal part)', 'Right coronary artery', 'Liver', 'Trachea',
].map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: i < 10 || (i >= 13 && i <= 15) ? 'vascular' : i === 12 ? 'nervous' : 'organs',
}));
const context = scene.slice(0, 12);

test('Parasympathetic and Vagus views admit thoracic vessels and stomach as context, not opaque nerve targets', () => {
  for (const scope of [[...root, 'parasympathetic'], [...root, 'parasympathetic', 'vagus']]) {
    const isolated = planRegionIsolation(scene, 'nervous', scope, node => pathFor(node, scope))!;
    assert.deepEqual(autonomicContextIds(scene, scope), context.map(node => node.instanceID));
    assert.deepEqual(autonomicForegroundIds(scene, scope), [13]);
    assert.deepEqual(isolated.show, [...context.map(node => node.instanceID), 13]);
    for (const node of context) {
      assert.equal(systemForMeshName(node.rawName), node.systemId, node.rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), node.rawName);
      for (const suffix of ['', '.001_123']) {
        const alias = { ...node, rawName: node.rawName + suffix };
        assert.ok(pathFor(alias, scope), alias.rawName);
        assert.deepEqual(autonomicContextIds([alias], scope), [node.instanceID]);
      }
    }
  }
  for (const subgroup of ['cranial', 'sacral']) for (const node of context)
    assert.equal(pathFor(node, [...root, 'parasympathetic', subgroup]), null);
  const arch = scene[1];
  assert.ok(autonomicForegroundIds([arch], [...root, 'head-neck']).includes(arch.instanceID),
    'The same aortic arch stays opaque in Head and Neck');
  const stomach = scene[10];
  assert.ok(pathFor(stomach, [...root, 'enteric']), 'Existing Enteric organ membership remains');
});

test('vessels and stomach have independent shared controls in both menu layouts', () => {
  for (const subgroup of ['thoracic-vessels', 'stomach']) {
    const scope = [...root, 'parasympathetic', 'vagus', subgroup];
    const expected = subgroup === 'thoracic-vessels' ? context.slice(0, 10) : context.slice(10);
    assert.deepEqual(autonomicContextIds(scene, scope), expected.map(node => node.instanceID));
    assert.deepEqual(autonomicForegroundIds(scene, scope), []);
  }
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(AutonomicNerveMenu, {
      variant, nodes: scene, activeNerveId: [...root, 'parasympathetic'].join('/'),
      isolatedRegionPath: [...root, 'parasympathetic'], selectedNodeId: null,
      onActivateNerve: () => {}, onIsolateRegion: () => {}, onRestoreRegion: () => {},
      onSetRegionVisibility: () => {},
    }));
    assert.ok(html.includes('Thoracic vessels (semitransparent)'));
    assert.ok(html.includes('Stomach (semitransparent)'));
    assert.ok(html.includes('Show all'));
  }
});
