import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup, cranialNerveContextIds, cranialNerveForegroundIds } from './cranialNerveTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { CRANIAL_NERVES_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const namesFromCsv = (filename: string) => readFileSync(new URL(`../../../../attached_assets/${filename}`, import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => line.startsWith('OBJECT,')).map(line => line.split(',')[4]);
const names = [...new Set([...namesFromCsv('Nervous_system_CLean_1791612986964.csv'),
  ...namesFromCsv('0_Final_Muscles_fused__1791947151699.csv'),
  'Temporal bone.l', 'Temporal bone.r', 'Sphenoid bone', 'Ethmoid bone', 'Frontal bone', 'Tongue', 'Stomach'])];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName) ?? 'nervous',
}));
const scope = ['advanced-neuroanatomy', 'cranial-nerves', 'vii'];
const object = (rawName: string) => {
  const node = nodes.find(node => node.rawName === rawName);
  assert.ok(node, rawName);
  return node;
};

test('VII has semitransparent full brainstem, bilateral temporal bones and every mapped facial muscle, while nerves and relays stay opaque', () => {
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  for (const base of ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone',
    'Orbicularis oris muscle', 'Orbital part of orbicularis oculi', 'Platysma']) {
    for (const side of ['l', 'r']) {
      const node = object(`${base}.${side}`);
      assert.ok(context.has(node.instanceID), node.rawName);
      assert.ok(!foreground.has(node.instanceID), node.rawName);
      assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), node.rawName);
    }
  }
  const muscles = nodes.filter(node => cranialNervePathForGroup(node, scope)?.[3] === 'muscles');
  assert.ok(muscles.length > 0);
  for (const node of muscles) {
    assert.equal(node.systemId, 'muscular', node.rawName);
    assert.ok(context.has(node.instanceID), node.rawName);
    assert.ok(!foreground.has(node.instanceID), node.rawName);
  }
  for (const side of ['l', 'r']) {
    for (const base of ['Facial nerve (VII)', 'Motor nucleus of facial nerve', 'Superior salivatory nucleus',
      'Nucleus of solitary tract']) {
      const node = object(`${base}.${side}`);
      assert.ok(foreground.has(node.instanceID), node.rawName);
      assert.ok(!context.has(node.instanceID), node.rawName);
    }
    const bone = object(`Temporal bone.${side}`);
    const rawName = `${bone.rawName}.001_123`;
    const systemId = systemForMeshName(rawName);
    assert.equal(systemId, 'skeletal');
    const alias = { ...bone, rawName, systemId };
    assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW));
    assert.deepEqual(cranialNervePathForGroup(alias, scope), [...scope, 'bone-context']);
    for (const nerve of ['iii', 'iv', 'vi']) {
      assert.equal(cranialNervePathForGroup(bone, [...scope.slice(0, 2), nerve]), null);
    }
  }
});

test('VII distinguishes the limited relevant V trunks from VII branches, nuclei and ganglia, retaining semitransparent context', () => {
  const path = [...scope, 'trigeminal-connections'];
  const plan = planRegionIsolation(nodes, 'nervous', path, node => cranialNervePathForGroup(node, path))!;
  const foreground = new Set(cranialNerveForegroundIds(nodes, path));
  for (const side of ['l', 'r']) {
    for (const base of ['Lingual nerve', 'Zygomatic nerve', 'Lacrimal nerve', 'Frontal nerve', 'Ophthalmic nerve', 'Maxillary nerve',
      'Ganglionic branch of maxillary nerve', 'Posterior division of mandibular nerve',
      'Trigeminal nerve maxillary n (V)', 'Trigeminal nerve root', 'Trigeminal nerve (Gasserian) ganglion']) {
      const node = object(`${base}.${side}`);
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
      assert.ok(foreground.has(node.instanceID), node.rawName);
      const rawName = `${node.rawName}.001_123`;
      const systemId = systemForMeshName(rawName);
      assert.ok(systemId, rawName);
      const alias = { ...node, rawName, systemId };
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW), rawName);
      assert.ok(isNodeInRegion(alias, path, () => null), rawName);
      assert.deepEqual(cranialNervePathForGroup(alias, scope), path);
      assert.ok(!cranialNerveContextIds(nodes, scope).includes(node.instanceID));
      assert.ok(planRegionIsolation(nodes, 'nervous', scope, n => cranialNervePathForGroup(n, scope))!.show.includes(node.instanceID));
    }
    for (const base of ['Chorda tympani', 'Submandibular ganglion', 'Pterygopalatine ganglion',
      'Deep petrosal nerve', 'Superior salivatory nucleus', 'Nucleus of solitary tract']) {
      const node = object(`${base}.${side}`);
      assert.ok(plan.hide.includes(node.instanceID), node.rawName);
      assert.ok(cranialNerveForegroundIds(nodes, scope).includes(node.instanceID), node.rawName);
    }
    assert.deepEqual(cranialNervePathForGroup(object(`Chorda tympani.${side}`), scope), [...scope, 'nerves']);
    for (const base of ['Temporal bone', 'Pons', 'Orbicularis oris muscle']) {
      assert.ok(plan.show.includes(object(`${base}.${side}`).instanceID));
      assert.ok(!foreground.has(object(`${base}.${side}`).instanceID));
    }
    assert.deepEqual(cranialNervePathForGroup(object(`Lingual nerve.${side}`), ['advanced-neuroanatomy', 'cranial-nerves', 'v']),
      ['advanced-neuroanatomy', 'cranial-nerves', 'v', 'mandibular-posterior']);
    assert.deepEqual(cranialNervePathForGroup(object(`Superior salivatory nucleus.${side}`), scope), [...scope, 'nuclei']);
    assert.deepEqual(cranialNervePathForGroup(object(`Pterygopalatine ganglion.${side}`), scope), [...scope, 'ganglia']);
    assert.deepEqual(cranialNervePathForGroup(object(`Deep petrosal nerve.${side}`), scope), [...scope, 'petrosal-connections']);
  }
});

test('VII excludes all trigeminal nuclei and unnecessary V terminal branches while preserving V membership', () => {
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
  for (const side of ['l', 'r']) {
    for (const base of ['Spinal trigeminal tract', 'Spinal nucleus of trigeminal nerve', 'Mesencephalic nucleus of trigeminal nerve',
      'Principal (pontine) neucleus of trigeminal nerve', 'Supraorbital nerve', 'Supratrochlear nerve',
      'Zygomaticofacial nerve', 'Zygomaticotemporal nerve', 'Inferior alveolar nerve',
      'Anterior superior alveolar nerve']) {
      const node = nodes.find(node => node.rawName === `${base}.${side}`);
      // Some terminal branches exist on one side only in this export.
      if (!node) { assert.ok(!/nucleus|neucleus/.test(base), `${base}.${side}`); continue; }
      for (const rawName of [node.rawName, `${node.rawName}.001_123`]) {
        assert.equal(cranialNervePathForGroup({ ...node, rawName }, scope), null, rawName);
      }
      assert.ok(plan.hide.includes(node.instanceID), node.rawName);
      assert.ok(cranialNervePathForGroup(node, [...scope.slice(0, 2), 'v']), node.rawName);
    }
  }
});

test('VII admits the tongue as an opaque organ for taste, including export aliases, without admitting unrelated organs', () => {
  const tongue = object('Tongue');
  assert.equal(tongue.systemId, 'organs');
  for (const rawName of ['Tongue', 'Tongue.001_123']) {
    assert.equal(systemForMeshName(rawName), 'organs');
    const node = { ...tongue, rawName };
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW));
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'tongue-taste']);
    const plan = planRegionIsolation([node], 'nervous', scope, n => cranialNervePathForGroup(n, scope))!;
    assert.ok(plan.show.includes(node.instanceID));
    assert.ok(cranialNerveForegroundIds([node], scope).includes(node.instanceID));
    assert.ok(!cranialNerveContextIds([node], scope).includes(node.instanceID));
    assert.equal(cranialNervePathForGroup(node, [...scope.slice(0, 2), 'v']), null);
  }
  assert.equal(cranialNervePathForGroup(object('Stomach'), scope), null);
});

test('VII excludes tensor tympani and lesser petrosal nerves without removing them from the model, and limits bone and muscle scope', () => {
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
  for (const base of ['Tensor tympani nerve', 'Lesser petrosal nerve']) for (const side of ['l', 'r']) {
    const node = object(`${base}.${side}`);
    assert.equal(node.systemId, 'nervous');
    assert.equal(cranialNervePathForGroup(node, scope), null);
    assert.equal(cranialNervePathForGroup({ ...node, rawName: `${node.rawName}.001_123` }, scope), null);
    assert.ok(plan.hide.includes(node.instanceID));
  }
  for (const name of ['Sphenoid bone', 'Ethmoid bone', 'Frontal bone', 'Superior oblique muscle.l',
    'Lateral rectus muscle.r', 'Anterior belly of digastric muscle.r', 'Inferior salivatory nucleus.l']) {
    const node = object(name);
    assert.equal(cranialNervePathForGroup(node, scope), null, name);
    assert.ok(plan.hide.includes(node.instanceID), name);
  }
});

test('VII menu exposes temporal bones, semitransparent muscles and labelled VII–V/petrosal connections', () => {
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[6]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of ['Brain and brainstem (semitransparent)', 'Temporal bones (semitransparent)',
    'Facial muscles (semitransparent)', 'Facial nerve (VII) and branches',
    'Trigeminal nerve (V) — main trunks relevant to VII connections',
    'Tongue — VII taste in anterior two-thirds (chorda tympani)', 'Petrosal pathway (communicating nerves)']) {
    assert.ok(html.includes(label), label);
  }
  assert.ok(!html.includes('Tensor tympani nerve'));
  assert.ok(!html.includes('Lesser petrosal nerve'));
});

test('VII excludes bilateral occipitalis muscles and export aliases without changing their muscular ownership', () => {
  for (const side of ['l', 'r']) {
    const node = object(`Occipitalis muscle.${side}`);
    for (const rawName of [node.rawName, `${node.rawName}.001_123`]) {
      assert.equal(systemForMeshName(rawName), 'muscular', rawName);
      const alias = { ...node, rawName };
      for (const path of [scope, [...scope, 'muscles'], [...scope, 'nerves']]) {
        assert.equal(cranialNervePathForGroup(alias, path), null, rawName);
        const scene = nodes.map(n => n.instanceID === node.instanceID ? alias : n);
        const plan = planRegionIsolation(scene, 'nervous', path, n => cranialNervePathForGroup(n, path))!;
        assert.ok(plan.hide.includes(node.instanceID), rawName);
        assert.ok(!cranialNerveContextIds([alias], path).includes(node.instanceID));
      }
    }
  }
});
