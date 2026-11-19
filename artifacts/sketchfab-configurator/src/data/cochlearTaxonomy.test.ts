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
import { classifyDiencephalonObject } from './diencephalonTaxonomy';
import type { SceneNode } from '../types/sketchfab';

const names = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => line.startsWith('OBJECT,')).map(line => line.split(',')[4]);
const nodes: SceneNode[] = [...new Set([...names, 'Temporal bone.l', 'Temporal bone.r',
  ...['Incus', 'Malleus', 'Stapes'].flatMap(name => [`${name}.l`, `${name}.r`]), 'Sphenoid bone'])]
  .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: systemForMeshName(rawName) ?? 'nervous' }));
const root = ['advanced-neuroanatomy', 'cranial-nerves', 'viii'];
const scope = [...root, 'cochlear'];
const object = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, name);
  return node;
};
const planFor = (path: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', path, node => cranialNervePathForGroup(node, path))!;

test('VIII excludes both subthalamic nuclei and export aliases without removing their original diencephalon membership', () => {
  for (const side of ['l', 'r']) {
    const node = object(`Subthalamic nucleus.${side}`);
    for (const rawName of [node.rawName, `${node.rawName}.001_123`]) {
      const alias = { ...node, rawName };
      assert.equal(systemForMeshName(rawName), 'nervous');
      assert.ok(classifyDiencephalonObject(rawName));
      for (const path of [root, scope, [...scope, 'basal-ganglia'], [...root, 'vestibular']]) {
        assert.equal(cranialNervePathForGroup(alias, path), null, rawName);
        assert.ok(planFor(path).hide.includes(node.instanceID));
        assert.ok(!cranialNerveContextIds([alias], path).includes(node.instanceID));
        assert.ok(!cranialNerveForegroundIds([alias], path).includes(node.instanceID));
      }
    }
  }
});

test('VIII separates cochlear and vestibular sections and retains the existing shared VIII trunk in both', () => {
  const group = CRANIAL_NERVE_GROUPS[7];
  assert.deepEqual(group.children?.map(child => child.id.split('/').at(-1)), ['cochlear', 'vestibular']);
  const vestibular = [...root, 'vestibular'];
  for (const side of ['l', 'r']) {
    const nerve = object(`Vestibular nerve.${side}`);
    assert.ok(planFor(vestibular).show.includes(nerve.instanceID));
    assert.ok(planFor(scope).hide.includes(nerve.instanceID));
    assert.ok(planFor(vestibular).hide.includes(object(`Cochlear nerve.${side}`).instanceID));
    assert.ok(planFor(vestibular).hide.includes(object(`Temporal bone.${side}`).instanceID));
  }
  for (const name of ['Vestibulocochlear nerve (VIII).l', 'Vestibulocochlear nerve (VIII).r.001']) {
    assert.ok(planFor(scope).show.includes(object(name).instanceID));
    assert.ok(planFor(vestibular).show.includes(object(name).instanceID));
  }
});

test('cochlear scope includes bilateral cochleae, tympanic membranes and all three ossicles as opaque structures, with real system/export-alias recognition', () => {
  const plan = planFor(scope);
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  for (const base of ['Cochlear nerve', 'Cochlea', 'Tympanic membrane', 'Incus', 'Malleus', 'Stapes']) {
    for (const side of ['l', 'r']) {
      const node = object(`${base}.${side}`);
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
      assert.ok(foreground.has(node.instanceID), node.rawName);
      const rawName = `${node.rawName}.001_123`;
      const systemId = systemForMeshName(rawName);
      assert.equal(systemId, 'nervous');
      const alias = { ...node, rawName, systemId };
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW), rawName);
      assert.deepEqual(cranialNervePathForGroup(alias, scope), cranialNervePathForGroup(node, scope));
    }
  }
});

test('VIII vestibular view includes bilateral nuclei and superior temporal gyri as retained semitransparent context', () => {
  const vestibular = [...root, 'vestibular'];
  for (const base of ['Vestibular nuclei', 'Superior temporal gyrus (Lateral part)']) {
    for (const side of ['l', 'r']) {
      const node = object(`${base}.${side}`);
      assert.equal(systemForMeshName(node.rawName), 'nervous');
      assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW));
      for (const path of [root, vestibular, [...vestibular, 'nerves']]) {
        assert.ok(planFor(path).show.includes(node.instanceID), `${node.rawName}: ${path.join('/')}`);
        assert.ok(cranialNerveContextIds(nodes, path).includes(node.instanceID));
        assert.ok(!cranialNerveForegroundIds(nodes, path).includes(node.instanceID));
      }
      const alias = { ...node, rawName: `${node.rawName}.001_123` };
      assert.equal(systemForMeshName(alias.rawName), 'nervous');
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW));
      assert.deepEqual(cranialNervePathForGroup(alias, vestibular), cranialNervePathForGroup(node, vestibular));
    }
  }
  for (const side of ['l', 'r']) {
    assert.ok(cranialNerveForegroundIds(nodes, vestibular).includes(object(`Vestibular nerve.${side}`).instanceID));
    assert.ok(planFor(vestibular).hide.includes(object(`Middle temporal gyrus.${side}`).instanceID));
  }
});

test('cochlear auditory fibers and all source-supported brainstem/thalamic relays stay opaque with semitransparent temporal/basal/brainstem context and ventricular landmarks', () => {
  const path = [...scope, 'tracts'];
  const plan = planFor(path);
  const context = new Set(cranialNerveContextIds(nodes, scope));
  for (const base of ['Anterior cochlear nucleus', 'Posterior cochlear nucleus', 'Superior olivary complex',
    'N. of the lateral lemniscus', 'Inferior colliculus', 'Medial geniculate body', 'Auditory fibers']) {
    for (const side of ['l', 'r']) {
      const node = object(`${base}.${side}`);
      assert.ok(planFor(scope).show.includes(node.instanceID), node.rawName);
      assert.ok(cranialNerveForegroundIds(nodes, scope).includes(node.instanceID), node.rawName);
      assert.ok(!context.has(node.instanceID), node.rawName);
    }
  }
  for (const name of ['Auditory decussation inferior colliculus', 'Auditory decussation nucleus lateral lemnniscus']) {
    assert.ok(plan.show.includes(object(name).instanceID), name);
  }
  for (const base of ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone', 'Caudate nucleus', 'Putamen',
    'Globus pallidus externus', 'Globus pallidus internus', 'Nucleus accumbens', 'Transverse temporal gyri',
    'Superior temporal gyrus (Lateral part)', 'Middle temporal gyrus']) for (const side of ['l', 'r']) {
    const node = object(`${base}.${side}`);
    assert.ok(context.has(node.instanceID), node.rawName);
    assert.ok(plan.show.includes(node.instanceID), node.rawName);
    assert.ok(!cranialNerveForegroundIds(nodes, scope).includes(node.instanceID), node.rawName);
  }
  for (const name of ['Lateral ventricle.l', 'Lateral ventricle.r', 'Third ventricle']) {
    assert.ok(plan.show.includes(object(name).instanceID), name);
    assert.ok(cranialNerveForegroundIds(nodes, path).includes(object(name).instanceID), name);
    assert.ok(!context.has(object(name).instanceID));
  }
});

test('VIII explicitly maps the exact bilateral lateral superior temporal gyrus meshes as translucent context in both subdivisions', () => {
  for (const side of ['l', 'r']) {
    const node = object(`Superior temporal gyrus (Lateral part).${side}`);
    for (const subdivision of ['cochlear', 'vestibular']) {
      const path = [...root, subdivision];
      const role = subdivision === 'cochlear' ? 'superior-temporal-context' : 'temporal-context';
      assert.deepEqual(cranialNervePathForGroup(node, path), [...path, role]);
      for (const activePath of [path, [...path, 'nerves']]) {
        assert.ok(planFor(activePath).show.includes(node.instanceID));
        assert.ok(cranialNerveContextIds(nodes, activePath).includes(node.instanceID));
        assert.ok(!cranialNerveForegroundIds(nodes, activePath).includes(node.instanceID));
      }
      const alias = { ...node, rawName: `${node.rawName}.001_123` };
      assert.equal(systemForMeshName(alias.rawName), 'nervous');
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW));
      assert.deepEqual(cranialNervePathForGroup(alias, path), [...path, role]);
    }
  }
});

test('cochlear isolation excludes vestibular anatomy, other sensory relays, fourth ventricle and unrequested ear components', () => {
  const plan = planFor(scope);
  for (const name of ['Vestibular nerve.r', 'Vestibular nuclei.l', 'Vestibule.r', 'Lateral geniculate body.r',
    'Fourth ventricle', 'Sphenoid bone', 'Auditory tube.r', 'Tympanic nerve (Jacobson).l', 'Tensor typmani muscle.r']) {
    const node = object(name);
    assert.equal(cranialNervePathForGroup(node, scope), null, name);
    assert.ok(plan.hide.includes(node.instanceID), name);
  }
  for (const nerve of ['iii', 'iv', 'vi', 'vii']) for (const bone of ['Incus.r', 'Malleus.l', 'Stapes.r']) {
    assert.equal(cranialNervePathForGroup(object(bone), [...root.slice(0, 2), nerve]), null);
  }
});

test('VIII collection menu exposes the nested cochlear roles and leaves vestibular as its own section', () => {
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[7]], nodes,
    initialExpanded: new Set([root.join('/'), scope.join('/'), [...root, 'vestibular'].join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, root), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of ['Cochlear nerve — auditory pathway', 'Vestibular nerve', 'Auditory ossicles',
    'Auditory brainstem and thalamic relays', 'Basal ganglia (semitransparent)', 'Lateral and third ventricles',
    'Temporal lobes and auditory cortex (semitransparent)', 'Vestibular nuclei (semitransparent)',
    'Superior temporal gyrus (lateral part, semitransparent)']) assert.ok(html.includes(label), label);
});
