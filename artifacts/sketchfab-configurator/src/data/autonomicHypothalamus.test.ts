import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AUTONOMIC_HYPOTHALAMUS_NAMES, AUTONOMIC_HYPOTHALAMUS_SECTIONS, isAutonomicHypothalamusSurface } from './autonomicHypothalamus';
import { AUTONOMIC_GROUPS, AUTONOMIC_ROOT_PATH, AUTONOMIC_SOURCE_OBJECTS,
  autonomicPathForGroup, autonomicContextIds, autonomicForegroundIds } from './autonomicTaxonomy';
import { normalizeAutonomicName } from './autonomicTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import { classifyDiencephalonObject } from './diencephalonTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const categories = ['sympathetic', 'parasympathetic', 'head-neck'];
const wanted = new Set(AUTONOMIC_HYPOTHALAMUS_NAMES.map(normalizeAutonomicName));
const sourceNames = [...new Set(AUTONOMIC_SOURCE_OBJECTS.map(row => row.object_name.trim()))]
  .filter(name => wanted.has(normalizeAutonomicName(name)));
const object = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: rawName, systemId: systemForMeshName(rawName),
  type: 'MatrixTransform', visible: true,
});
const nodes = sourceNames.map((name, i) => object(name, i + 1));
const expandedIds = (group: NervousGroup): string[] => [
  group.id, ...(group.children ?? []).flatMap(expandedIds),
];

test('all requested hypothalamic nuclei and areas are backed by the original source export', () => {
  for (const name of AUTONOMIC_HYPOTHALAMUS_NAMES)
    assert.ok(sourceNames.some(source => normalizeAutonomicName(source) === normalizeAutonomicName(name)), name);
  assert.ok(sourceNames.includes('Hypothalamus'));
  for (const stem of AUTONOMIC_HYPOTHALAMUS_NAMES.filter(name => name !== 'Hypothalamus'))
    for (const side of ['l', 'r'])
      assert.ok(sourceNames.some(name => name.toLowerCase().startsWith(`${stem}.${side}`.toLowerCase())), `${stem}.${side}`);
});

test('hypothalamus fades in all three collections and the shared subgroup while nuclei remain opaque', () => {
  for (const category of categories) {
    const parent = [...AUTONOMIC_ROOT_PATH, category];
    const subgroup = [...parent, 'hypothalamus'];
    for (const scope of [parent, subgroup]) for (const source of nodes) {
      for (const suffix of ['', '_123', '.001_123']) {
        const rawName = source.rawName + suffix;
        const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
        assert.equal(node.systemId, 'nervous', rawName);
        assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
        const mapped = autonomicPathForGroup(node, scope)!;
        assert.deepEqual(mapped.slice(0, subgroup.length), subgroup, rawName);
        assert.ok(mapped.length > subgroup.length, 'Each mesh belongs to its anatomical submenu');
        assert.ok(isNodeInRegion(node, scope, () => null), rawName);
        const surface = isAutonomicHypothalamusSurface(rawName);
        assert.deepEqual(autonomicForegroundIds([node], scope), surface ? [] : [node.instanceID], rawName);
        assert.deepEqual(autonomicContextIds([node], scope), surface ? [node.instanceID] : [], rawName);
        const scene = [node, object('Femur.r', 10000), object('Thalamus.r', 10001)];
        const plan = planRegionIsolation(scene, 'nervous', scope, item => autonomicPathForGroup(item, scope))!;
        assert.deepEqual(plan.show, [node.instanceID], rawName);
        assert.ok(plan.hide.includes(10000));
        assert.ok(plan.hide.includes(10001));
        assert.equal(classifyDiencephalonObject(rawName)?.[2], 'hypothalamus', rawName);
      }
    }
  }
});

test('whole autonomic browsing and lateral/export aliases fade only the enclosing hypothalamus surface', () => {
  for (const rawName of ['Hypothalamus', 'Hypothalamus.r', 'Hypothalamus.l.001_123']) {
    const node = object(rawName);
    assert.deepEqual(autonomicContextIds([node], AUTONOMIC_ROOT_PATH), [node.instanceID], rawName);
    assert.deepEqual(autonomicForegroundIds([node], AUTONOMIC_ROOT_PATH), [], rawName);
    for (const category of categories) {
      const scope = [...AUTONOMIC_ROOT_PATH, category];
      assert.deepEqual(autonomicContextIds([node], scope), [node.instanceID], rawName);
    }
  }
  for (const rawName of ['Anterior_hypothalamic_nucleus.l', 'Lateral_hypothalamic_area.r',
    'Supraoptic_nucleus.r', 'Periventricular_nucleus.l'])
    assert.equal(isAutonomicHypothalamusSurface(rawName), false, rawName);
});

test('shared sidebar/fullscreen tree exposes the hypothalamus subgroup and its actual source meshes in each category', () => {
  for (const category of categories) {
    const parent = [...AUTONOMIC_ROOT_PATH, category];
    const group = AUTONOMIC_GROUPS.find(item => item.id === parent.join('/'))!;
    const child = group.children!.find(item => item.id === [...parent, 'hypothalamus'].join('/'));
    assert.equal(child?.label, 'Hypothalamus and autonomic nuclei');
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
      groups: [group], nodes, initialExpanded: new Set(expandedIds(group)),
      pathForNode: node => autonomicPathForGroup(node, parent), pathForGroup: autonomicPathForGroup,
      onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: parent, onRestore: () => {},
      onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
    }));
    assert.ok(html.includes(child!.label));
    for (const section of AUTONOMIC_HYPOTHALAMUS_SECTIONS) assert.ok(html.includes(section.label));
    for (const name of sourceNames) assert.ok(html.includes(name), `${category}: ${name}`);
  }
});

test('regional subdivisions follow CSV-backed anatomy and distinguish longitudinal zones from rostrocaudal regions', () => {
  const expected = {
    preoptic: ['Medial_preoptic_nucleus', 'Lateral_preoptic_nucleus'],
    anterior: ['Anterior_hypothalamic_nucleus', 'Suprachiasmatic_nucleus', 'Supraoptic_nucleus'],
    tuberal: ['Arcuate_nucleus', 'Dorsomedial_nucleus', 'Ventromedial_nucleus'],
    posterior: ['Posterior_hypothalamic_nucleus', 'Tuberomammillary_nucleus'],
    periventricular: ['Periventricular_nucleus'],
    'longitudinal-areas': ['Lateral_hypothalamic_area', 'Dorsal hypothalamic area'],
  };
  assert.equal(new Set(AUTONOMIC_HYPOTHALAMUS_NAMES.map(normalizeAutonomicName)).size, 14);
  for (const category of categories) {
    const parent = [...AUTONOMIC_ROOT_PATH, category, 'hypothalamus'];
    const scene = [...nodes.map(n => ({ ...n, visible: n.instanceID % 2 === 0 })),
      object('Paraventricular_nucleus.r', 10000), object('Medial_mammillary_nucleus.l', 10001),
      object('Thalamus.r', 10002), object('Femur.r', 10003)];
    for (const [region, names] of Object.entries(expected)) {
      const requested = [...parent, region];
      const keys = new Set(names.map(normalizeAutonomicName));
      const wantedIds = nodes.filter(n => keys.has(normalizeAutonomicName(n.rawName))).map(n => n.instanceID);
      const plan = planRegionIsolation(scene, 'nervous', requested, n => autonomicPathForGroup(n, requested))!;
      assert.deepEqual(plan.show, wantedIds, requested.join('/'));
      assert.deepEqual(autonomicForegroundIds(scene, requested), wantedIds);
      assert.deepEqual(autonomicContextIds(scene, requested), [], 'Nuclei and areas stay opaque');
      for (const snapshot of plan.affected)
        assert.equal(snapshot.visible, scene.find(n => n.instanceID === snapshot.instanceID)?.visible,
          'Restore retains prior visibility');
      for (const other of nodes.filter(n => !wantedIds.includes(n.instanceID)))
        assert.equal(autonomicPathForGroup(other, requested), null, other.rawName);
      for (const n of scene.slice(nodes.length)) assert.equal(autonomicPathForGroup(n, requested), null);
    }
    const surface = [...parent, 'surface'];
    const surfaceIds = nodes.filter(n => isAutonomicHypothalamusSurface(n.rawName)).map(n => n.instanceID);
    assert.deepEqual(autonomicContextIds(scene, surface), surfaceIds);
    assert.deepEqual(autonomicForegroundIds(scene, surface), []);
    const plan = planRegionIsolation(scene, 'nervous', surface, n => autonomicPathForGroup(n, surface))!;
    assert.deepEqual(plan.show, surfaceIds);
  }
});

test('individual nucleus controls include all source sides and aliases without changing unrelated categories', () => {
  for (const category of categories) {
    const parent = [...AUTONOMIC_ROOT_PATH, category, 'hypothalamus'];
    for (const section of AUTONOMIC_HYPOTHALAMUS_SECTIONS) {
      for (const [id, , name] of section.nuclei) {
        const requested = [...parent, section.id, id];
        const keys = nodes.filter(n => normalizeAutonomicName(n.rawName) === normalizeAutonomicName(name));
        assert.ok(keys.length >= 2, name);
        const plan = planRegionIsolation(nodes, 'nervous', requested, n => autonomicPathForGroup(n, requested))!;
        assert.deepEqual(plan.show, keys.map(n => n.instanceID), name);
        for (const n of keys) assert.deepEqual(autonomicPathForGroup(n, requested), requested);
        assert.deepEqual(autonomicContextIds(nodes, requested), []);
      }
    }
    const group = AUTONOMIC_GROUPS.find(g => g.id === [...AUTONOMIC_ROOT_PATH, category].join('/'))!;
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
      groups: [group], nodes, initialExpanded: new Set(expandedIds(group)), collectionsOnly: true,
      pathForNode: n => autonomicPathForGroup(n, parent), pathForGroup: autonomicPathForGroup,
      onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: parent, onRestore: () => {},
      onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
    }));
    for (const section of AUTONOMIC_HYPOTHALAMUS_SECTIONS) {
      assert.ok(html.includes(section.label));
      for (const [, label] of section.nuclei) assert.ok(html.includes(label), label);
    }
    assert.ok(html.includes('Hypothalamus surface (semitransparent)'));
    assert.ok(!html.includes('Paraventricular'));
  }
});

test('hypothalamic additions do not admit unrelated thalamic/mammillary nuclei or expand enteric/plexus categories', () => {
  for (const category of categories) {
    const parent = [...AUTONOMIC_ROOT_PATH, category];
    for (const name of ['Thalamus.r', '02_Anterior_dorsal_AD.l', 'Medial_mammillary_nucleus.r',
      'Lateral_mammillary_nucleus.l', 'Mediodorsal nucleus.r', 'Arcuate fascicle.l']) {
      assert.equal(autonomicPathForGroup(object(name), parent), null, name);
    }
  }
  for (const category of ['plexuses', 'enteric'])
    for (const node of nodes)
      assert.equal(autonomicPathForGroup(node, [...AUTONOMIC_ROOT_PATH, category]), null, node.rawName);
});
