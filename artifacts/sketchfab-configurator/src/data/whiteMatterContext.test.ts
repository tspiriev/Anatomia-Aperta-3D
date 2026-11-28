import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { advancedNeuroanatomyPathForGroup, advancedNeuroanatomyPathForNode, ADVANCED_NEUROANATOMY_GROUPS } from './advancedNeuroanatomy';
import { WHITE_MATTER_ROOT, isWhiteMatterBrainContext, whiteMatterContextIds } from './whiteMatterContext';
import { WHOLE_BRAIN_CONTEXT_NAME, basalForebrainPathForGroup } from './basalForebrainTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { basalWholeBrainDisplay, expandWholeBrainIds } from '../lib/basalWholeBrain';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const root = [...WHITE_MATTER_ROOT];
const names = [...new Set(readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => line.startsWith('OBJECT,')).map(line => line.split(',')[4]))];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName),
}));
const object = (name: string) => { const node = nodes.find(node => node.rawName === name); assert.ok(node, name); return node; };
const planFor = (path: string[]) => planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
const whiteMatter = ADVANCED_NEUROANATOMY_GROUPS[0];
const noop = () => {};

test('all white matter fiber selections and nested basal/sensory selections include semitransparent whole brain orientation', () => {
  for (const suffix of [[], ['association'], ['projection'], ['projection', 'somatosensory'], ['somatosensory'],
    ['commissural'], ['ascending-brainstem'], ['thalamic'], ['basal-forebrain'],
    ['basal-forebrain', 'amygdalothalamic'], ['basal-forebrain', 'medial-forebrain-bundle', 'serotonin'], ['serotonergic']]) {
    const path = [...root, ...suffix];
    const plan = planFor(path);
    assert.ok(plan, path.join('/'));
    const context = new Set(whiteMatterContextIds(nodes, path));
    for (const name of ['Precentral gyrus.l', 'Postcentral gyrus.r', 'Transverse temporal gyri.l', 'Pons.r']) {
      const node = object(name);
      assert.ok(plan.show.includes(node.instanceID), `${path.join('/')}: ${name}`);
      assert.ok(context.has(node.instanceID), name);
      assert.ok(isNodeInRegion(node, path, () => null), name);
    }
  }
});

test('thalamic fibers add thalamus capsules and all source thalamic nuclei, while keeping nuclei opaque and other branches scoped', () => {
  const path = [...root, 'thalamic'];
  const plan = planFor(path);
  const context = new Set(whiteMatterContextIds(nodes, path));
  for (const name of ['Thalamus.l', 'Thalamus.r', '00_Thalamic_background_core.l']) {
    const node = object(name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(context.has(node.instanceID), name);
  }
  for (const node of nodes) {
    const original = basalForebrainPathForGroup(node.rawName);
    if (original?.[2] === 'thalamus') {
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
      assert.ok(!context.has(node.instanceID), node.rawName);
      assert.equal(advancedNeuroanatomyPathForGroup(node, path)?.[3], 'thalamic-nuclei');
    }
  }
  for (const name of ['Amygdaloid body.l', 'Hypothalamus']) assert.ok(plan.hide.includes(object(name).instanceID));
  for (const branch of ['association', 'projection', 'commissural', 'serotonergic']) {
    const plan = planFor([...root, branch]);
    for (const name of ['Thalamus.l', '01_Anterior_ventral_AV', '04_Mediodorsal_MD', 'Amygdaloid body.r'])
      assert.ok(plan.hide.includes(object(name).instanceID), `${branch}: ${name}`);
  }
});

test('basal fiber branches retain bilateral amygdalae, hypothalamus, thalamus capsule and opaque AV without adding other thalamic nuclei', () => {
  for (const suffix of [[], ['amygdaloseptal'], ['medial-forebrain-bundle', 'dopamine']]) {
    const path = [...root, 'basal-forebrain', ...suffix];
    const plan = planFor(path);
    const context = new Set(whiteMatterContextIds(nodes, path));
    for (const name of ['Amygdaloid body.l', 'Amygdaloid body.r', 'Hypothalamus', '01_Anterior_ventral_AV', '01_Anterior_ventral_AV.l']) {
      const node = object(name);
      assert.ok(plan.show.includes(node.instanceID), `${path.join('/')}: ${name}`);
      assert.ok(!context.has(node.instanceID), name);
    }
    assert.ok(context.has(object('Thalamus.l').instanceID));
    assert.ok(plan.hide.includes(object('04_Mediodorsal_MD').instanceID));
  }
  const source = object('01_Anterior_ventral_AV');
  for (const rawName of ['Anterior_ventral_AV.r', '01_Anterior_ventral_AV.l.001_123', 'Right anteroventral nucleus']) {
    const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
    assert.deepEqual(advancedNeuroanatomyPathForGroup(node, [...root, 'basal-forebrain']),
      [...root, 'basal-forebrain', 'av-nucleus']);
  }
});

test('isolating individual thalamic nuclei or basal targets retains translucent brain and capsule orientation', () => {
  for (const suffix of [['thalamic', 'thalamic-nuclei', 'anterior', 'av'],
    ['basal-forebrain', 'av-nucleus'], ['basal-forebrain', 'amygdala'], ['basal-forebrain', 'hypothalamus']]) {
    const path = [...root, ...suffix];
    const plan = planFor(path);
    assert.ok(plan, path.join('/'));
    const context = new Set(whiteMatterContextIds(nodes, path));
    for (const name of ['Thalamus.l', 'Precentral gyrus.l']) {
      const node = object(name);
      assert.ok(plan.show.includes(node.instanceID), name);
      assert.ok(isNodeInRegion(node, path, () => null), name);
      assert.ok(context.has(node.instanceID), name);
    }
    assert.ok(!context.has(object('01_Anterior_ventral_AV').instanceID));
  }
});

test('grouped whole brain controls do not include thalamic capsules or opaque targets, and expand selection/hide/fade to all brain surfaces', () => {
  const display = basalWholeBrainDisplay(nodes, true, isWhiteMatterBrainContext);
  assert.ok(display.memberIds.length > 100);
  const row = display.nodes.find(node => node.instanceID === display.representativeId)!;
  assert.equal(row.name, WHOLE_BRAIN_CONTEXT_NAME);
  assert.equal(display.nodes.filter(isWhiteMatterBrainContext).length, 1);
  assert.deepEqual(expandWholeBrainIds([row.instanceID], display.memberIds), display.memberIds);
  for (const name of ['Thalamus.l', 'Hypothalamus', 'Amygdaloid body.l', '01_Anterior_ventral_AV'])
    assert.ok(!display.memberIds.includes(object(name).instanceID), name);
  for (const branch of ['association', 'thalamic', 'basal-forebrain']) {
    const p = [...root, branch, 'brain-context'];
    assert.deepEqual(advancedNeuroanatomyPathForGroup(row, p), p);
    assert.ok(whiteMatterContextIds(nodes, p).length > 100);
  }
  const capsule = [...root, 'thalamus-capsule'];
  assert.ok(planFor(capsule).show.includes(object('Thalamus.l').instanceID));
});

test('standard, compact and fullscreen advanced fiber menus expose whole brain, thalamus nuclei/capsule and basal orientation controls', () => {
  const display = basalWholeBrainDisplay(nodes, true, isWhiteMatterBrainContext);
  for (const layout of ['standard', 'compact'] as const) for (const collectionsOnly of [false, true]) {
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
      nodes: display.nodes, groups: [whiteMatter], layout, collectionsOnly,
      initialExpanded: new Set([root.join('/'), [...root, 'association'].join('/'),
        [...root, 'thalamic'].join('/'), [...root, 'basal-forebrain'].join('/')]),
      pathForNode: advancedNeuroanatomyPathForNode, pathForGroup: advancedNeuroanatomyPathForGroup,
      onSetVisibility: noop, onIsolate: noop, isolatedPath: null, onRestore: noop,
      onSelect: noop, toggleVisibility: noop, onToggleFade: noop, fadedNodeIds: new Set(),
    }));
    for (const label of [WHOLE_BRAIN_CONTEXT_NAME, 'Thalamus capsule (semitransparent)',
      'Thalamic nuclei', 'Amygdalae', 'Hypothalamus', 'Anterior ventral (AV) nucleus']) {
      assert.ok(html.includes(label), label);
      for (const action of ['Show', 'Hide', 'Isolate']) assert.ok(html.includes(`${action} ${label}`), `${action} ${label}`);
    }
  }
});
