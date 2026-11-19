import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup, cranialNerveContextIds, cranialNerveForegroundIds } from './cranialNerveTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { CRANIAL_NERVES_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { vagalMuscleNames, vagusContextSystem } from './vagusTargets';
import { normalizeAdvancedObjectName } from './advancedCollection';
import { planRegionIsolation } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const namesFromCsv = (filename: string) => readFileSync(new URL(`../../../../attached_assets/${filename}`, import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => line.startsWith('OBJECT,')).map(line => line.split(',')[4]);
const names = [...new Set(['Nervous_system_CLean_1791612986964.csv', '0_Final_Muscles_fused__1791947151699.csv',
  'Cardiovascular_system_final_1790945714118.csv', 'Internal_organs_1790925899980.csv'].flatMap(namesFromCsv)
  .concat(['Temporal bone.l', 'Temporal bone.r', 'Sphenoid bone']))];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName) ?? 'nervous',
}));
const scope = ['advanced-neuroanatomy', 'cranial-nerves', 'x'];
const object = (rawName: string) => {
  const node = nodes.find(node => node.rawName === rawName);
  assert.ok(node, rawName);
  return node;
};
const planFor = (path: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', path, node => cranialNervePathForGroup(node, path))!;

test('X includes all source-supported vagal muscles and four vagal nuclei as opaque foreground with semitransparent brainstem and temporal bones', () => {
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const plan = planFor(scope);
  for (const side of ['l', 'r']) {
    for (const base of ['Posterior nucleus of vagus nerve', 'Nucleus ambiguus', 'Nucleus of solitary tract',
      'Spinal nucleus of trigeminal nerve', 'Vagus nerve (X)']) {
      const node = object(`${base}.${side}`);
      assert.ok(foreground.has(node.instanceID), node.rawName);
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
      assert.ok(!context.has(node.instanceID), node.rawName);
    }
    for (const base of ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone']) {
      assert.ok(context.has(object(`${base}.${side}`).instanceID));
    }
  }
  const muscles = nodes.filter(node => vagalMuscleNames.has(normalizeAdvancedObjectName(node.rawName)));
  assert.equal(muscles.length, 23, 'Eleven paired source muscles and the unpaired transverse arytenoid');
  for (const node of muscles) {
    assert.equal(node.systemId, 'muscular', node.rawName);
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'muscles']);
    assert.ok(foreground.has(node.instanceID), node.rawName);
    const rawName = `${node.rawName}.001_123`;
    const systemId = systemForMeshName(rawName);
    assert.equal(systemId, 'muscular');
    assert.ok(isNodeAllowedInAtlasView({ ...node, rawName, systemId }, CRANIAL_NERVES_VIEW));
  }
});

test('X admits only mapped thoracic vessels and organs, retaining them and transparent esophageal plexuses during nerve isolation', () => {
  const path = [...scope, 'nerves'];
  const plan = planFor(path);
  const context = new Set(cranialNerveContextIds(nodes, path));
  const foreground = new Set(cranialNerveForegroundIds(nodes, path));
  const vesselsAndOrgans = nodes.filter(node => vagusContextSystem(node.rawName));
  assert.ok(vesselsAndOrgans.length >= 27);
  for (const node of vesselsAndOrgans) {
    assert.equal(node.systemId, vagusContextSystem(node.rawName), node.rawName);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), node.rawName);
    assert.ok(plan.show.includes(node.instanceID), node.rawName);
    assert.ok(context.has(node.instanceID), node.rawName);
    assert.ok(!foreground.has(node.instanceID), node.rawName);
    const rawName = `${node.rawName}.001_123`;
    const systemId = systemForMeshName(rawName);
    assert.equal(systemId, node.systemId, rawName);
    const alias = { ...node, rawName, systemId };
    assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW), rawName);
    assert.deepEqual(cranialNervePathForGroup(alias, scope), cranialNervePathForGroup(node, scope), rawName);
    assert.equal(cranialNervePathForGroup(node, [...scope.slice(0, 2), 'ix']), null);
  }
  for (const name of ['Oesophagus Nerve Plexus', 'Oesophagus_Enteric_Plexus_Fine']) {
    const node = object(name);
    assert.equal(node.systemId, 'nervous');
    assert.ok(context.has(node.instanceID));
    assert.ok(plan.show.includes(node.instanceID));
    assert.ok(!foreground.has(node.instanceID));
  }
  for (const name of ['Right recurrent laryngeal nerve.r', 'Left recurrent laryngeal nerve.l']) {
    assert.ok(plan.show.includes(object(name).instanceID));
    assert.ok(foreground.has(object(name).instanceID));
  }
  for (const name of ['Aortic arch', 'Right subclavian artery', 'Pulmonary trunk', 'Trachea', 'Oesophagus', 'Stomach']) {
    assert.ok(plan.show.includes(object(name).instanceID), name);
  }
});

test('X keeps cardiac/aortic communicating plexuses opaque and does not import unrelated muscles, abdominal vessels or organs', () => {
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  for (const name of ['Aortic plexus', 'Cardiac plexus', 'Ascending aorta nerve Plexus']) {
    assert.deepEqual(cranialNervePathForGroup(object(name), scope), [...scope, 'cardiac-connections']);
    assert.ok(foreground.has(object(name).instanceID));
  }
  const plan = planFor(scope);
  for (const name of ['Stylopharyngeus muscle.r', 'Stylohyoid muscle.l', 'Thyrohyoid muscle.r',
    'Sternothyroid muscle.l', 'Inferior salivatory nucleus.r', 'Abdominal aorta', 'Inferior vena cava (abdominal part)', 'Sphenoid bone']) {
    assert.equal(cranialNervePathForGroup(object(name), scope), null, name);
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
  for (const node of nodes.filter(node => ['vascular', 'organs'].includes(node.systemId!))) {
    assert.equal(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), vagusContextSystem(node.rawName) === node.systemId, node.rawName);
  }
});

test('X menu exposes vessels, viscera, muscle targets and communicating plexuses across systems', () => {
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[9]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of ['Brainstem (semitransparent)', 'Temporal bones (semitransparent)',
    'Thoracic great vessels (semitransparent)', 'Trachea, esophagus, esophageal plexus and stomach (semitransparent)',
    'Cardiac and aortic plexuses (communicating pathways)', 'Innervated muscles']) assert.ok(html.includes(label), label);
});
