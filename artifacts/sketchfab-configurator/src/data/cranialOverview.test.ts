import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CRANIAL_OVERVIEW_PATH, CRANIAL_OVERVIEW_GROUP } from './cranialOverview';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup, cranialNerveContextIds, cranialNerveForegroundIds } from './cranialNerveTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { CRANIAL_NERVES_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import { CranialNerveMenu } from '../components/CranialNerveMenu';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const source = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8');
const names = [...new Set([...source.split(/\r?\n/).filter(line => line.startsWith('OBJECT,')).map(line => line.split(',')[4]),
  'Sphenoid bone', 'Temporal bone.l', 'Temporal bone.r', 'Occipital bone', 'Ethmoid bone',
  'Stomach', 'Masseter muscle.l', 'Optic tract right_123', 'Radiatio optica.l.001_123'])];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName) ?? 'nervous',
}));
const object = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, `Missing source: ${name}`);
  return node;
};
const role = (name: string) => cranialNervePathForGroup(object(name), CRANIAL_OVERVIEW_PATH)?.[3];
const includes = (name: string) => assert.ok(cranialNervePathForGroup(object(name), CRANIAL_OVERVIEW_PATH), name);

test('Overview displays before I while retaining stable nerve indices and no startup selection', () => {
  assert.equal(CRANIAL_NERVE_GROUPS.length, 13);
  assert.deepEqual(CRANIAL_NERVE_GROUPS.slice(0, 12).map(group => group.id.split('/').at(-1)),
    ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii']);
  assert.equal(CRANIAL_NERVE_GROUPS.at(-1), CRANIAL_OVERVIEW_GROUP);
  const html = renderToStaticMarkup(createElement(CranialNerveMenu, {
    variant: 'strip', nodes, activeNerveId: null, onActivateNerve: () => {},
    isolatedRegionPath: null, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: null,
  }));
  assert.ok(html.includes('button-cranial-nerve-overview'));
  assert.ok(html.includes('Overview'));
  assert.ok(html.indexOf('button-cranial-nerve-overview') < html.indexOf('button-cranial-nerve-i"'));
  assert.ok(!html.includes('aria-pressed="true"'));
});

test('Overview includes the brainstem and only sphenoid/temporal bones as transparent context, with nuclei opaque', () => {
  const context = cranialNerveContextIds(nodes, CRANIAL_OVERVIEW_PATH);
  const foreground = cranialNerveForegroundIds(nodes, CRANIAL_OVERVIEW_PATH);
  for (const name of ['Sphenoid bone', 'Temporal bone.l', 'Temporal bone.r']) {
    assert.equal(role(name), 'bone-context');
    assert.ok(context.includes(object(name).instanceID));
    assert.ok(!foreground.includes(object(name).instanceID));
    assert.equal(object(name).systemId, 'skeletal');
  }
  for (const name of ['Occipital bone', 'Ethmoid bone', 'Stomach', 'Masseter muscle.l']) {
    assert.equal(cranialNervePathForGroup(object(name), CRANIAL_OVERVIEW_PATH), null, name);
  }
  for (const side of ['l', 'r']) {
    for (const stem of ['Midbrain', 'Pons', 'Medulla oblongata']) {
      const name = `${stem}.${side}`;
      assert.equal(role(name), 'brain', name);
      assert.ok(context.includes(object(name).instanceID));
    }
    for (const stem of ['Nucleus of oculomotor nerve', 'Nucleus of trochlear nerve', 'Nucleus of abducens nerve',
      'Motor nucleus of facial nerve', 'Nucleus of hypoglossal nerve', 'Nucleus of accessory nerve',
      'Principal (pontine) neucleus of trigeminal nerve', 'Mesencephalic nucleus of trigeminal nerve',
      'Spinal nucleus of trigeminal nerve', 'Posterior nucleus of vagus nerve', 'Nucleus of solitary tract']) {
      const name = `${stem}.${side}`;
      assert.equal(role(name), 'nuclei', name);
      assert.ok(foreground.includes(object(name).instanceID), name);
      assert.ok(!context.includes(object(name).instanceID), name);
    }
  }
});

test('Overview contains cranial nerves, olfactory and full visual pathway with basal forebrain nuclei', () => {
  for (const side of ['l', 'r']) {
    for (const stem of ['Olfactory nerve (I)', 'Optic nerve (II)', 'Optic tract', 'Optic chiasm', 'Optic radiation',
      'Oculomotor nerve (cisternal and cavernous part)', 'Trochlear nerve (IV)', 'Abducens nerve (VI)',
      'Facial nerve (VII)', 'Cochlear nerve', 'Vestibular nerve',
      'Glossopharyngeal nerve (IX)', 'Vagus nerve (X)', 'Accessory nerve (XI)', 'Hypoglossal nerve (XII)',
      'Septal nucleus', 'Basal nucleus of Maynert', 'Nucleus accumbens', 'Amygdaloid body']) includes(`${stem}.${side}`);
    includes(`Vestibulocochlear nerve (VIII).${side}${side === 'r' ? '.001' : ''}`);
  }
  assert.equal(role('Optic tract right_123'), 'optic');
  assert.equal(role('Radiatio optica.l.001_123'), 'optic');
  assert.equal(role('Septal nucleus.l'), 'basal-nuclei');
  assert.equal(role('Olfactory nerve (I).l'), 'olfactory');
});

test('Overview shows both cochleae and source vestibular labyrinths opaque within translucent temporal bones', () => {
  const scope = [...CRANIAL_OVERVIEW_PATH, 'inner-ear'];
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
  assert.ok(plan);
  const context = cranialNerveContextIds(nodes, scope);
  for (const side of ['l', 'r']) {
    const bone = object(`Temporal bone.${side}`);
    assert.ok(plan.show.includes(bone.instanceID));
    assert.ok(context.includes(bone.instanceID));
    for (const stem of ['Cochlea', 'Vestibule']) {
      const source = object(`${stem}.${side}`);
      assert.ok(plan.show.includes(source.instanceID));
      assert.ok(!context.includes(source.instanceID));
      for (const suffix of ['', '_123', '.001_123']) {
        const rawName = `${stem}.${side}${suffix}`;
        const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
        assert.equal(node.systemId, 'nervous', rawName);
        assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), rawName);
        assert.deepEqual(cranialNervePathForGroup(node, scope), scope, rawName);
        assert.ok(cranialNerveForegroundIds([node], scope).includes(node.instanceID), rawName);
        assert.ok(isNodeInRegion(node, scope, () => null), rawName);
      }
    }
  }
  for (const name of ['Stomach', 'Tympanic membrane.l', 'Auditory tube.r', 'Tensor typmani muscle.r']) {
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
});

test('Overview simplifies V to roots, main divisions and traceable branches while preserving detailed V', () => {
  const detail = ['advanced-neuroanatomy', 'cranial-nerves', 'v'];
  for (const side of ['l', 'r']) {
    for (const stem of ['Trigeminal nerve root', 'Motor root of trigeminal nerve', 'Ophthalmic nerve',
      'Trigeminal nerve maxillary n (V)', 'Zygomatic nerve', 'Anterior division of mandibular nerve',
      'Posterior division of mandibular nerve', 'Auriculotemporal nerve', 'Inferior alveolar nerve', 'Lingual nerve']) {
      const name = `${stem}.${side}`;
      assert.equal(role(name), 'trigeminal', name);
      assert.ok(cranialNervePathForGroup(object(name), detail), name);
    }
    for (const stem of ['Zygomaticofacial nerve', 'Zygomaticotemporal nerve',
      'Communicating branch of right nasociliary nerve to cilliary ganglion', 'Ganglionic branch of maxillary nerve']) {
      const node = object(`${stem}.${side}`);
      assert.equal(cranialNervePathForGroup(node, CRANIAL_OVERVIEW_PATH), null, node.rawName);
      assert.ok(cranialNervePathForGroup(node, detail), node.rawName);
    }
  }
});

test('Overview admits both maxillary nerves under source and plain V2 names as opaque foreground, including export aliases', () => {
  const scope = [...CRANIAL_OVERVIEW_PATH, 'trigeminal'];
  for (const side of ['l', 'r']) {
    const source = object(`Trigeminal nerve maxillary n (V).${side}`);
    for (const stem of ['Trigeminal nerve maxillary n (V)', 'Maxillary nerve', 'Maxillary nerve (V2)']) {
      for (const suffix of ['', '_123', '.001_123']) {
        const rawName = `${stem}.${side}${suffix}`;
        const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
        assert.equal(node.systemId, 'nervous', rawName);
        assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), rawName);
        assert.deepEqual(cranialNervePathForGroup(node, scope), scope, rawName);
        assert.ok(cranialNerveForegroundIds([node], scope).includes(node.instanceID), rawName);
        assert.ok(!cranialNerveContextIds([node], scope).includes(node.instanceID), rawName);
        const plan = planRegionIsolation([node], 'nervous', scope, n => cranialNervePathForGroup(n, scope))!;
        assert.ok(plan.show.includes(node.instanceID), rawName);
      }
    }
  }
});

test('Overview subgroup isolation retains both translucent landmarks, excludes unrelated geometry and admits export aliases', () => {
  const scope = [...CRANIAL_OVERVIEW_PATH, 'trigeminal'];
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
  assert.ok(plan);
  for (const name of ['Sphenoid bone', 'Temporal bone.l', 'Temporal bone.r', 'Pons.l', 'Ophthalmic nerve.r']) {
    assert.ok(plan.show.includes(object(name).instanceID), name);
    assert.ok(isNodeInRegion(object(name), scope, () => null), name);
  }
  for (const name of ['Optic nerve (II).r', 'Stomach', 'Zygomaticofacial nerve.r']) {
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
  for (const name of ['Temporal bone.r', 'Sphenoid bone', 'Pons.l', 'Ophthalmic nerve.r',
    'Optic radiation.r', 'Basal nucleus of Maynert.l']) {
    for (const rawName of [name, `${name}_123`, `${name}.001_123`]) {
      const alias = { ...object(name), rawName, systemId: systemForMeshName(rawName) };
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW), rawName);
      assert.deepEqual(cranialNervePathForGroup(alias, CRANIAL_OVERVIEW_PATH),
        cranialNervePathForGroup(object(name), CRANIAL_OVERVIEW_PATH), rawName);
    }
  }
});

test('Overview subgroups are available through the shared sidebar and fullscreen collection controls', () => {
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_OVERVIEW_GROUP], nodes, collectionsOnly: true,
    initialExpanded: new Set([CRANIAL_OVERVIEW_GROUP.id]),
    pathForNode: node => cranialNervePathForGroup(node, CRANIAL_OVERVIEW_PATH),
    pathForGroup: cranialNervePathForGroup, onSetVisibility: () => {}, onIsolate: () => {},
    isolatedPath: null, onRestore: () => {}, onSelect: () => {}, toggleVisibility: () => {},
    onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const child of CRANIAL_OVERVIEW_GROUP.children!) assert.ok(html.includes(child.label));
  assert.ok(!html.includes('Zygomaticofacial nerve.r'));
});
