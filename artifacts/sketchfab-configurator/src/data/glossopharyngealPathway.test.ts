import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup, cranialNerveContextIds, cranialNerveForegroundIds } from './cranialNerveTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { CRANIAL_NERVES_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const namesFromCsv = (filename: string) => readFileSync(new URL(`../../../../attached_assets/${filename}`, import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => line.startsWith('OBJECT,')).map(line => line.split(',')[4]);
const nodes: SceneNode[] = [...new Set([...namesFromCsv('Nervous_system_CLean_1791612986964.csv'),
  ...namesFromCsv('0_Final_Muscles_fused__1791947151699.csv'), 'Temporal bone.l', 'Temporal bone.r', 'Sphenoid bone'])]
  .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: systemForMeshName(rawName) ?? 'nervous' }));
const scope = ['advanced-neuroanatomy', 'cranial-nerves', 'ix'];
const object = (rawName: string) => {
  const node = nodes.find(node => node.rawName === rawName);
  assert.ok(node, rawName);
  return node;
};
const planFor = (path: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', path, node => cranialNervePathForGroup(node, path))!;

test('IX has bilateral 18% brainstem and temporal bones with opaque IX nerves, four associated nuclei and stylopharyngeus muscles', () => {
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  const plan = planFor(scope);
  assert.equal(context.size, 8);
  for (const side of ['l', 'r']) {
    for (const base of ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone']) {
      const node = object(`${base}.${side}`);
      assert.ok(context.has(node.instanceID), node.rawName);
      assert.ok(!foreground.has(node.instanceID), node.rawName);
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
    }
    for (const base of ['Glossopharyngeal nerve (IX)', 'Nucleus ambiguus', 'Inferior salivatory nucleus',
      'Nucleus of solitary tract', 'Spinal nucleus of trigeminal nerve', 'Stylopharyngeus muscle']) {
      const node = object(`${base}.${side}`);
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
      assert.ok(foreground.has(node.instanceID), node.rawName);
      assert.ok(!context.has(node.instanceID), node.rawName);
      const rawName = `${node.rawName}.001_123`;
      const systemId = systemForMeshName(rawName);
      assert.ok(systemId, rawName);
      const alias = { ...node, rawName, systemId };
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW), rawName);
      assert.deepEqual(cranialNervePathForGroup(alias, scope), cranialNervePathForGroup(node, scope));
    }
    assert.equal(object(`Stylopharyngeus muscle.${side}`).systemId, 'muscular');
    const bone = object(`Temporal bone.${side}`);
    const rawName = `${bone.rawName}.001_123`;
    const systemId = systemForMeshName(rawName);
    assert.equal(systemId, 'skeletal');
    assert.deepEqual(cranialNervePathForGroup({ ...bone, rawName, systemId }, scope), [...scope, 'bone-context']);
  }
  assert.equal(nodes.filter(node => cranialNervePathForGroup(node, scope)?.[3] === 'muscles').length, 2);
});

test('IX tympanic subgroup includes Jacobson nerve, membrane, plexus, lesser petrosal, otic ganglion and inferior salivatory relay with retained transparent context', () => {
  const path = [...scope, 'tympanic-pathway'];
  const plan = planFor(path);
  const foreground = new Set(cranialNerveForegroundIds(nodes, path));
  for (const side of ['l', 'r']) {
    for (const base of ['Tympanic nerve (Jacobson)', 'Tympanic membrane', 'Tympanic plexus',
      'Lesser petrosal nerve', 'Otic ganglion', 'Inferior salivatory nucleus']) {
      const node = object(`${base}.${side}`);
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
      assert.ok(foreground.has(node.instanceID), node.rawName);
      const rawName = `${node.rawName}.001_123`;
      const systemId = systemForMeshName(rawName);
      assert.equal(systemId, 'nervous', rawName);
      const alias = { ...node, rawName, systemId };
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW));
      assert.deepEqual(cranialNervePathForGroup(alias, path), path);
    }
    for (const base of ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone']) {
      assert.ok(plan.show.includes(object(`${base}.${side}`).instanceID));
    }
    assert.equal(cranialNervePathForGroup(object(`Lesser petrosal nerve.${side}`), [...scope.slice(0, 2), 'vii']), null);
    assert.deepEqual(cranialNervePathForGroup(object(`Otic ganglion.${side}`), [...scope.slice(0, 2), 'v']),
      [...scope.slice(0, 2), 'v', 'ganglia']);
    assert.deepEqual(cranialNervePathForGroup(object(`Inferior salivatory nucleus.${side}`), scope), [...scope, 'nuclei']);
  }
});

test('IX excludes other nerves and muscles while showing the requested collections in its menu', () => {
  const plan = planFor(scope);
  for (const name of ['Stylohyoid muscle.r', 'Posterior belly of digastric muscle.l', 'Orbicularis oris muscle.r',
    'Superior salivatory nucleus.l', 'Chorda tympani.r', 'Facial nerve (VII).l', 'Tensor tympani nerve.r', 'Sphenoid bone']) {
    assert.equal(cranialNervePathForGroup(object(name), scope), null, name);
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[8]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of ['Brainstem (semitransparent)', 'Temporal bones (semitransparent)', 'Nuclei',
    'Innervated muscles', 'Tympanic–lesser petrosal–otic pathway', 'Ganglia']) assert.ok(html.includes(label), label);
});
