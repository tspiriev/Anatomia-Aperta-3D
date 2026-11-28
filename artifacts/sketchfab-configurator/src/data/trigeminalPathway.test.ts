import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup, cranialNerveContextIds, cranialNerveForegroundIds } from './cranialNerveTaxonomy';
import { CRANIAL_NERVES_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const exports = ['Nervous_system_CLean_1791612986964.csv', '0_Final_Muscles_fused__1791947151699.csv'];
const names = [...new Set(exports.flatMap(file => [...csvRows(
  readFileSync(new URL(`../../../../attached_assets/${file}`, import.meta.url), 'utf8'),
)].filter(row => row[0] === 'OBJECT').map(row => row[4])))];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
  systemId: systemForMeshName(rawName) ?? 'nervous', visible: true,
}));
const scope = ['advanced-neuroanatomy', 'cranial-nerves', 'v'];
const object = (name: string) => {
  const node = nodes.find(node => node.rawName === name); assert.ok(node, name); return node;
};
const members = (role: string) => nodes.filter(node => cranialNervePathForGroup(node, scope)?.[3] === role);

test('V adds trigeminal white matter, face-specific ascending fibers, VPM relay nuclei and postcentral gyri', () => {
  const expected = [
    'Dorsal trigeminal tract.l', 'Trigeminal lemniscus pain.l', 'Trigeminal lemniscus pain.r',
    'Trigeminal lemniscus proprioception.l', 'Trigeminal lemniscus proprioception.r',
    'Spinal trigeminal tract.l', 'Spinal trigeminal tract.r',
    'Somatosensory tract face.l', 'Somatosensory tract face.r',
    '13_Ventral_posteromedial_VPM', '13_Ventral_posteromedial_VPM.l',
    'Postcentral gyrus.l', 'Postcentral gyrus.r',
  ];
  for (const name of expected) {
    const node = object(name);
    assert.ok(isNodeInRegion(node, scope, () => null), name);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), name);
    assert.ok(isNodeInRegion({ ...node, rawName: `${name}.001_123` }, scope, () => null), name);
  }
  assert.equal(members('tracts').length, 7);
  assert.equal(members('ascending-fibers').length, 2);
  assert.equal(members('thalamic-nuclei').length, 2);
  for (const side of ['l', 'r']) {
    assert.deepEqual(cranialNervePathForGroup(object(`Principal (pontine) neucleus of trigeminal nerve.${side}`), scope), [...scope, 'nuclei']);
  }
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const opaque = new Set(cranialNerveForegroundIds(nodes, scope));
  for (const base of ['Midbrain', 'Pons', 'Medulla oblongata', 'Thalamus']) for (const side of ['l', 'r']) {
    const id = object(`${base}.${side}`).instanceID;
    assert.ok(context.has(id));
    assert.ok(!opaque.has(id));
  }
  assert.ok(context.has(object('00_Thalamic_background_core.l').instanceID));
  for (const name of expected) {
    const corticalContext = name.startsWith('Postcentral gyrus');
    assert.equal(opaque.has(object(name).instanceID), !corticalContext, name);
    assert.equal(context.has(object(name).instanceID), corticalContext, name);
  }
  const ascendingPath = [...scope, 'ascending-fibers'];
  const plan = planRegionIsolation(nodes, 'nervous', ascendingPath, node => cranialNervePathForGroup(node, ascendingPath))!;
  for (const id of context) assert.ok(plan.show.includes(id));
  for (const side of ['l', 'r']) {
    const cortex = object(`Postcentral gyrus.${side}`);
    assert.ok(plan.show.includes(cortex.instanceID));
    assert.ok(cranialNerveContextIds(nodes, ascendingPath).includes(cortex.instanceID));
    assert.ok(!cranialNerveForegroundIds(nodes, ascendingPath).includes(cortex.instanceID));
  }
  for (const name of ['Somatosensory tract legs.r', 'Somatosensory tract arm.l', 'Somatosensory tract trunk.r',
    '12_Ventral_posterolateral_VPL', 'Optic radiation.l', 'Precentral gyrus.l']) {
    assert.equal(cranialNervePathForGroup(object(name), scope), null, name);
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
});

test('V includes the bilateral muscles of mastication, not fascia or facial-expression/ocular muscles', () => {
  const bases = ['Temporalis muscle', 'Superficial part of masseter', 'Deep part of masseter',
    'Medial pterygoid muscle', 'Superior head of lateral pterygoid muscle', 'Inferior head of lateral pterygoid muscle'];
  assert.equal(members('muscles').length, 12);
  for (const base of bases) for (const side of ['l', 'r']) {
    const node = object(`${base}.${side}`);
    assert.equal(node.systemId, 'muscular');
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'muscles']);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW));
    const rawName = `${node.rawName}.001_123`;
    assert.equal(systemForMeshName(rawName), 'muscular');
    assert.ok(isNodeInRegion({ ...node, rawName }, scope, () => null));
    assert.ok(cranialNerveContextIds(nodes, scope).includes(node.instanceID));
    assert.ok(!cranialNerveForegroundIds(nodes, scope).includes(node.instanceID));
    const branchPath = [...scope, 'mandibular-posterior'];
    const plan = planRegionIsolation(nodes, 'nervous', branchPath, n => cranialNervePathForGroup(n, branchPath))!;
    assert.ok(plan.show.includes(node.instanceID));
  }
  for (const name of ['Masseteric fascia.l', 'Orbicularis oris muscle.r', 'Superior oblique muscle.l', 'Posterior belly of digastric muscle.r']) {
    assert.equal(cranialNervePathForGroup(object(name), scope), null, name);
  }
});

test('V has both posterior mandibular divisions and their source-supported branches, including those filed elsewhere in the export', () => {
  const bases = ['Posterior division of mandibular nerve', 'Lingual nerve', 'Auriculotemporal nerve',
    'Inferior alveolar nerve', 'Trunk of right inferior alveolar nerve', 'Mental nerve', 'Right mental nerve', 'Nerve to mylohyoid muscle'];
  for (const base of bases) for (const side of ['l', 'r']) {
    const node = object(`${base}.${side}`);
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'mandibular-posterior']);
    assert.ok(isNodeInRegion({ ...node, rawName: `${node.rawName}.001_123` }, scope, () => null));
  }
  assert.equal(members('mandibular-posterior').length, 16);
  const posteriorPath = [...scope, 'mandibular-posterior'];
  const plan = planRegionIsolation(nodes, 'nervous', posteriorPath, node => cranialNervePathForGroup(node, posteriorPath))!;
  assert.ok(plan.show.includes(object('Posterior division of mandibular nerve.r').instanceID));
  assert.ok(plan.hide.includes(object('Anterior division of mandibular nerve.l').instanceID));
  assert.ok(plan.hide.includes(object('Posterior superior alveolar nerve.r').instanceID), 'Maxillary branches must not enter posterior V3');
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[4]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of ['Brainstem (semitransparent)', 'Trigeminal white matter fibers', 'Thalamic relay nuclei (VPM)',
    'Ascending somatosensory fibers (face)', 'Postcentral gyri', 'Muscles of mastication (semitransparent)', 'Posterior division of mandibular nerve']) {
    assert.ok(html.includes(label), label);
  }
});

test('V includes every exported trigeminal nerve branch and ganglion, including anterior V3 and buccal branches filed elsewhere', () => {
  const rows = [...csvRows(readFileSync(new URL(
    '../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8'))];
  const exported = rows.filter(row => row[0] === 'OBJECT' && row[1] === 'NS_CN05_TRIGEMINAL'
    && row[5] === 'MESH' && !/oculomot(?:or|r)|common tendinous ring/i.test(row[4]));
  assert.ok(exported.length > 80);
  for (const row of exported) {
    const node = object(row[4]);
    assert.ok(isNodeInRegion(node, scope, () => null), node.rawName);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), node.rawName);
  }
  for (const base of ['Anterior division of mandibular nerve', 'Buccal nerve',
    'Right masseteric nerve', 'Lateral pterygoid nerve', 'Medial pterygoid nerve']) for (const side of ['l', 'r']) {
    const node = object(`${base}.${side}`);
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'mandibular-anterior']);
    assert.ok(isNodeInRegion({ ...node, rawName: `${node.rawName}.001_123` }, scope, () => null));
  }
  const rootPlan = planRegionIsolation(nodes, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
  assert.ok(rootPlan.show.includes(object('Anterior division of mandibular nerve.l').instanceID));
  assert.ok(rootPlan.show.includes(object('Buccal nerve.r').instanceID));
  assert.ok(rootPlan.show.includes(object('Lingual nerve.l').instanceID));
  assert.ok(rootPlan.show.includes(object('Lingual nerve.r').instanceID));
  assert.ok(rootPlan.hide.includes(object('Oculomotor nerve (cisternal and cavernous part).r').instanceID));
});

test('right nasociliary communicating branch is a visible opaque nerve, not a ganglion, including Sketchfab duplicate/export aliases', () => {
  const name = 'Communicating branch of right nasociliary nerve to cilliary ganglion.r';
  const branchPath = [...scope, 'nerves'];
  const plan = planRegionIsolation(nodes, 'nervous', branchPath, node => cranialNervePathForGroup(node, branchPath))!;
  const node = object(name);
  assert.ok(plan.show.includes(node.instanceID));
  assert.ok(cranialNerveForegroundIds(nodes, branchPath).includes(node.instanceID));
  assert.ok(!cranialNerveContextIds(nodes, branchPath).includes(node.instanceID));
  for (const rawName of [name, `${name}_123`, `${name}.001_123`]) {
    const systemId = systemForMeshName(rawName);
    assert.equal(systemId, 'nervous', rawName);
    const alias = { ...node, rawName, systemId };
    assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW), rawName);
    assert.deepEqual(cranialNervePathForGroup(alias, scope), branchPath, rawName);
    assert.ok(isNodeInRegion(alias, scope, () => null));
  }
  for (const side of ['l', 'r']) {
    assert.deepEqual(cranialNervePathForGroup(object(`Trigeminal nerve (Gasserian) ganglion.${side}`), scope), [...scope, 'ganglia']);
    assert.deepEqual(cranialNervePathForGroup(object(`Ganglionic branch of maxillary nerve.${side}`), scope), branchPath);
  }
});

test('V includes bilateral VII chorda tympani with superior salivatory and solitary tract nuclei, preserving the VII nerve membership', () => {
  const pathway = [...scope, 'chorda-tympani'];
  const plan = planRegionIsolation(nodes, 'nervous', pathway, node => cranialNervePathForGroup(node, pathway))!;
  const foreground = cranialNerveForegroundIds(nodes, pathway);
  const context = cranialNerveContextIds(nodes, pathway);
  for (const base of ['Chorda tympani', 'Superior salivatory nucleus', 'Nucleus of solitary tract']) for (const side of ['l', 'r']) {
    const node = object(`${base}.${side}`);
    assert.deepEqual(cranialNervePathForGroup(node, scope), pathway);
    assert.ok(isNodeInRegion({ ...node, rawName: `${node.rawName}.001_123` }, scope, () => null));
    assert.ok(plan.show.includes(node.instanceID));
    assert.ok(foreground.includes(node.instanceID));
    assert.ok(!context.includes(node.instanceID), 'Do not fade the pathway with its brainstem context');
  }
  assert.equal(members('chorda-tympani').length, 6);
  for (const side of ['l', 'r']) {
    assert.ok(isNodeInRegion(object(`Chorda tympani.${side}`), ['advanced-neuroanatomy', 'cranial-nerves', 'vii'], () => null));
    assert.ok(plan.hide.includes(object(`Inferior salivatory nucleus.${side}`).instanceID), 'IX salivatory nuclei are not chorda tympani nuclei');
    assert.ok(plan.hide.includes(object(`Facial nerve (VII).${side}`).instanceID), 'Do not import the entire facial pathway into V');
  }
  for (const id of context) assert.ok(plan.show.includes(id));
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[4]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  assert.ok(html.includes('Chorda tympani (VII) and associated nuclei'));
  assert.ok(html.includes('Anterior division of mandibular nerve'));
});
