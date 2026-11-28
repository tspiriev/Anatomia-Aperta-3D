import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LIMBIC_GROUP, classifyLimbicObject, limbicPathForGroup } from './limbicTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { advancedNeuroanatomyPathForGroup, classifyAdvancedNeuroanatomy } from './advancedNeuroanatomy';
import { BRAIN_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import grossMemberships from './brainGrossAnatomyMemberships.json';
import type { SceneNode } from '../types/sketchfab';
import { classifyDiencephalonObject } from './diencephalonTaxonomy';

function csvFields(line: string): string[] {
  const fields: string[] = [];
  let quoted = false, field = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (line[i] === ',' && !quoted) { fields.push(field); field = ''; }
    else field += line[i];
  }
  return [...fields, field];
}
const rows = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8')
  .trim().split(/\r?\n/).map(csvFields);
const header = rows.shift()!;
const names = [...new Set(rows.filter(row => row[header.indexOf('row_type')] === 'OBJECT')
  .map(row => row[header.indexOf('object_name')]))];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
  visible: true, systemId: systemForMeshName(rawName),
}));
const root = LIMBIC_GROUP.id.split('/');
const selected = nodes.filter(node => classifyLimbicObject(node.rawName));
const context = selected.filter(node => classifyLimbicObject(node.rawName)?.at(-1) === 'capsule');
const ignore = () => {};

test('anterior commissure is available in both limbic menus and connections without leaving its existing commissural collection', () => {
  const node = nodes.find(node => node.rawName === 'Anterior commissure')!;
  assert.ok(node);
  assert.equal(node.systemId, 'nervous');
  assert.ok(isNodeAllowedInAtlasView(node, BRAIN_VIEW));
  assert.equal(classifyAdvancedNeuroanatomy(node.rawName)?.[1], 'white-matter');
  for (const path of [
    ['advanced-neuroanatomy', 'brain-gross-anatomy', 'limbic-system'],
    root, [...root, 'structures'], [...root, 'white-matter'],
    [...root, 'white-matter', 'anterior-commissure'],
  ]) {
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.ok(plan.show.includes(node.instanceID), path.join('/'));
    assert.ok(!plan.hide.includes(node.instanceID));
    for (const rawName of [node.rawName, `${node.rawName}_123`, `${node.rawName}.001_123`]) {
      assert.ok(isNodeInRegion({ ...node, rawName }, path, () => null), rawName);
    }
  }
  for (const path of [
    ['advanced-neuroanatomy', 'brain-gross-anatomy', 'limbic-system'],
    [...root, 'structures'], [...root, 'white-matter', 'anterior-commissure'],
  ]) {
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
      nodes, groups: [{ id: path.join('/'), label: 'Limbic structures' }], namespace: 'commissure',
      pathForNode: (node: SceneNode) => advancedNeuroanatomyPathForGroup(node, path),
      pathForGroup: advancedNeuroanatomyPathForGroup, onSetVisibility: ignore,
      onIsolate: ignore, isolatedPath: null, onRestore: ignore, onSelect: ignore,
      toggleVisibility: ignore, onToggleFade: ignore, fadedNodeIds: new Set<number>(),
      browseState: { expanded: new Set([path.join('/')]), showUnassigned: false }, onBrowseStateChange: ignore,
    }));
    assert.ok(html.includes('Anterior commissure'), path.join('/'));
  }
});

test('anterior perforated substance is excluded from both limbic menus and isolation but remains in the Brain atlas', () => {
  const excluded = nodes.filter(node => /^Substantia perforata anterior\.[lr]$/i.test(node.rawName));
  assert.equal(excluded.length, 2);
  for (const path of [root, [...root, 'structures'], ['advanced-neuroanatomy', 'brain-gross-anatomy', 'limbic-system']]) {
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    for (const node of excluded) {
      assert.equal(node.systemId, 'nervous');
      assert.ok(isNodeAllowedInAtlasView(node, BRAIN_VIEW));
      assert.ok(plan.hide.includes(node.instanceID));
      assert.ok(!plan.show.includes(node.instanceID));
      for (const rawName of [node.rawName, `${node.rawName}_123`, `${node.rawName}.001_123`]) {
        assert.equal(advancedNeuroanatomyPathForGroup({ ...node, rawName }, path), null, rawName);
      }
    }
  }
});

test('hippocampal commissure is available in Limbic white matter with exact selection and isolation paths', () => {
  const node = nodes.find(node => node.rawName === 'Hippocampal commissure')!;
  assert.ok(node, 'Use the combined source mesh, not invented left/right objects');
  assert.equal(node.systemId, 'nervous');
  assert.ok(isNodeAllowedInAtlasView(node, BRAIN_VIEW));
  const path = [...root, 'white-matter', 'hippocampal-commissure'];
  for (const rawName of [node.rawName, `${node.rawName}_123`, `${node.rawName}.001_123`]) {
    const alias = { ...node, rawName, systemId: systemForMeshName(rawName) };
    assert.equal(alias.systemId, 'nervous');
    assert.deepEqual(classifyLimbicObject(rawName), path);
    for (const parent of [root, [...root, 'white-matter'], path]) {
      assert.ok(isNodeInRegion(alias, parent, () => null));
    }
  }
  const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
  assert.deepEqual(plan.show, [node.instanceID]);
  assert.equal(plan.hide.length, nodes.length - 1);
});

test('the focused limbic collection includes all gross structures, requested fibers and associated nuclei from the live source export', () => {
  const added = nodes.filter(node => node.rawName.startsWith('Ansa peduncularis ')
    || classifyDiencephalonObject(node.rawName)?.[2] === 'hypothalamus'
    || node.rawName === 'Hippocampal commissure');
  assert.equal(selected.length, 54 + added.length);
  for (const name of grossMemberships.limbic) assert.ok(selected.some(node => node.rawName === name), name);
  for (const node of selected) {
    assert.equal(node.systemId, 'nervous', node.rawName);
    assert.ok(isNodeAllowedInAtlasView(node, BRAIN_VIEW), node.rawName);
    assert.ok(classifyLimbicObject(`${node.rawName}_123`), node.rawName);
  }
  const plan = planRegionIsolation(nodes, 'nervous', root, node => advancedNeuroanatomyPathForGroup(node, root))!;
  assert.deepEqual(plan.show, selected.map(node => node.instanceID));
  assert.equal(plan.hide.length, nodes.length - selected.length);
  for (const name of ['Spinal dura', 'Lateral geniculate body.l', '12_Ventral_posterolateral_VPL', 'Pons']) {
    assert.equal(classifyLimbicObject(name), null, name);
  }
});

test('limbic white matter exposes the requested bilateral fibers and shared fornix/striae without moving existing memberships', () => {
  const white = [...root, 'white-matter'];
  const plan = planRegionIsolation(nodes, 'nervous', white, node => advancedNeuroanatomyPathForGroup(node, white))!;
  assert.equal(plan.show.length, 21);
  for (const [id, count] of [
    ['cingulum', 2], ['anterior-thalamic-radiations', 2], ['mammillothalamic', 2],
    ['mediodorsal-thalamic', 2], ['fornix', 1], ['anterior-commissure', 1], ['hippocampal-commissure', 1], ['stria-terminalis', 2], ['stria-medullaris', 2],
  ] as const) {
    const path = [...white, id];
    const members = nodes.filter(node => isNodeInRegion(node, path, () => null));
    assert.equal(members.length, count, id);
    assert.ok(members.every(node => !context.includes(node)));
  }
  assert.equal(classifyAdvancedNeuroanatomy('Cingulum fibers.l')?.[1], 'white-matter');
  assert.equal(classifyAdvancedNeuroanatomy('04_Mediodorsal_MD.l')?.[1], 'diencephalon');
});

test('ansa peduncularis and hypothalamus are included in limbic menus and isolation without changing their original collections', () => {
  for (const fiber of ['amygdaloseptal', 'amygdalohypothalamic', 'amygdalothalamic']) {
    const path = [...root, 'white-matter', 'ansa-peduncularis', fiber];
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    const members = nodes.filter(node => isNodeInRegion(node, path, () => null));
    assert.equal(members.length, 2, fiber);
    assert.deepEqual(plan.show, members.map(node => node.instanceID));
    for (const node of members) {
      assert.deepEqual(classifyAdvancedNeuroanatomy(node.rawName), path);
      assert.ok(advancedNeuroanatomyPathForGroup(node, [root[0], 'basal-forebrain']));
      assert.deepEqual(classifyLimbicObject(`${node.rawName}.001_123`), path);
    }
  }
  const path = [...root, 'hypothalamus'];
  const original = nodes.filter(node => classifyDiencephalonObject(node.rawName)?.[2] === 'hypothalamus');
  assert.ok(original.some(node => node.rawName === 'Hypothalamus'));
  assert.ok(original.some(node => node.rawName === 'Anterior_hypothalamic_nucleus.l'));
  const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
  assert.deepEqual(plan.show, original.map(node => node.instanceID));
  for (const node of original) {
    assert.ok(isNodeInRegion(node, path, () => null));
    assert.equal(classifyAdvancedNeuroanatomy(node.rawName)?.[1], 'diencephalon');
    assert.ok(advancedNeuroanatomyPathForGroup(node, [root[0], 'basal-forebrain']));
    assert.ok(classifyLimbicObject(`${node.rawName}.001_123`));
  }
});

test('every limbic thalamic nucleus isolation retains selectable thalamus context, while fiber isolation does not add it', () => {
  assert.equal(context.length, 3);
  const paths = selected.filter(node => classifyLimbicObject(node.rawName)?.[3] === 'nuclei')
    .map(node => classifyLimbicObject(node.rawName)!);
  for (const path of paths) {
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.equal(plan.show.length, 5, path.join('/'));
    for (const node of context) {
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
      assert.ok(isNodeInRegion(node, path, () => null), 'Clicking the capsule must not leave nucleus isolation');
      assert.deepEqual(limbicPathForGroup(node.rawName, path), path);
    }
  }
});

test('the limbic submenu exposes structures, fibers, nuclei and capsule with shared visibility/isolation controls', () => {
  const props = {
    nodes: selected, groups: [LIMBIC_GROUP], namespace: 'limbic',
    pathForNode: (node: SceneNode) => classifyLimbicObject(node.rawName),
    pathForGroup: advancedNeuroanatomyPathForGroup, onSetVisibility: ignore,
    onIsolate: ignore, isolatedPath: null, onRestore: ignore, onSelect: ignore,
    toggleVisibility: ignore, onToggleFade: ignore, fadedNodeIds: new Set<number>(),
    browseState: { expanded: new Set([
      LIMBIC_GROUP.id, [...root, 'white-matter'].join('/'), [...root, 'thalamus'].join('/'),
      [...root, 'thalamus', 'nuclei'].join('/'),
      [...root, 'white-matter', 'ansa-peduncularis'].join('/'),
      [...root, 'hypothalamus'].join('/'),
    ]), showUnassigned: false }, onBrowseStateChange: ignore,
  };
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, props));
  for (const label of ['Limbic structures', 'Cingulum fibers', 'Anterior thalamic radiations',
    'Hippocampal commissure',
    'Mammillothalamic tract (Vicq d’Azyr)', 'Thalamus capsule / outer surface',
    'Anterior nuclear complex', 'Mediodorsal nucleus (MD)', 'Midline nuclei',
    'Ansa peduncularis fibers', 'Amygdaloseptal fibers', 'Amygdalohypothalamic fibers',
    'Amygdalothalamic fibers', 'Hypothalamus', 'Preoptic nuclear complex', 'Tuberal nuclear complex']) {
    assert.ok(html.includes(label), label);
    for (const action of ['Show', 'Hide', 'Isolate']) assert.ok(html.includes(`${action} ${label}`), `${action} ${label}`);
  }
});
