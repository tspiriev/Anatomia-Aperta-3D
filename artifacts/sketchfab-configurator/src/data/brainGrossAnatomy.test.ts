import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BRAIN_GROSS_ANATOMY_GROUP, BRAIN_GROSS_ANATOMY_PATH, brainGrossAnatomyPathForNode, classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import memberships from './brainGrossAnatomyMemberships.json';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import { regionMenuForSystem } from './regionMenus';
import { systemForMeshName } from './anatomicalSystems';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const nodes: SceneNode[] = [...new Set(Object.values(memberships).flat())].map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, systemId: systemForMeshName(rawName), visible: true, type: 'MatrixTransform',
}));
const ignore = () => {};

test('both parahippocampal gyri remain in Temporal lobe and participate in both limbic menus and isolation', () => {
  const grossLimbic = [...BRAIN_GROSS_ANATOMY_PATH, 'limbic-system'];
  const temporal = [...BRAIN_GROSS_ANATOMY_PATH, 'brain-lobes', 'temporal'];
  const focusedLimbic = ['advanced-neuroanatomy', 'limbic-system', 'structures'];
  const gyri = nodes.filter(node => node.rawName.includes('(Parahippocampal*)'));
  assert.equal(gyri.length, 2);
  for (const path of [grossLimbic, temporal, focusedLimbic]) {
    const plan = planRegionIsolation(nodes, 'nervous', path,
      node => advancedNeuroanatomyPathForGroup(node, path))!;
    for (const node of gyri) {
      assert.ok(plan.show.includes(node.instanceID), `${node.rawName}: ${path.join('/')}`);
      assert.ok(!plan.hide.includes(node.instanceID));
      for (const rawName of [node.rawName, `${node.rawName}_123`, `${node.rawName}.001_123`]) {
        const scoped = advancedNeuroanatomyPathForGroup({ ...node, rawName }, path);
        assert.deepEqual(scoped, path, rawName);
      }
    }
  }
  for (const path of [grossLimbic, focusedLimbic]) {
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
      nodes, groups: [{ id: path.join('/'), label: 'Limbic structures' }], namespace: 'parahippocampal',
      pathForNode: brainGrossAnatomyPathForNode, pathForGroup: advancedNeuroanatomyPathForGroup,
      onSetVisibility: ignore, onIsolate: ignore, isolatedPath: null, onRestore: ignore,
      onSelect: ignore, toggleVisibility: ignore, onToggleFade: ignore, fadedNodeIds: new Set<number>(),
      browseState: { expanded: new Set([path.join('/')]), showUnassigned: false }, onBrowseStateChange: ignore,
    }));
    for (const node of gyri) assert.ok(html.includes(node.name), `${path.join('/')}: ${node.name}`);
  }
});

test('gross brain menus provide five source lobes, brainstem bodies, and cerebellar hemispheres and vermis', () => {
  const groups = BRAIN_GROSS_ANATOMY_GROUP.children!;
  assert.deepEqual(groups.map(g => g.label), ['Brain lobes', 'Brainstem gross anatomy', 'Cerebellum gross anatomy', 'Limbic system']);
  assert.deepEqual(groups[0].children!.map(g => g.label), ['Frontal lobe', 'Parietal lobe', 'Occipital lobe', 'Temporal lobe', 'Insular lobe']);
  assert.deepEqual(groups[1].children!.map(g => g.label), ['Midbrain', 'Pons', 'Medulla oblongata']);
  assert.deepEqual(groups[2].children!.map(g => g.label), ['Cerebellar hemispheres', 'Vermis']);
  assert.equal(regionMenuForSystem('nervous', true)?.groups, groups);
  assert.notEqual(regionMenuForSystem('nervous')?.groups, groups);
});

test('all 177 unique gross and limbic source meshes match their collection scopes and source numbered objects remain distinct', () => {
  assert.equal(nodes.length, 177);
  for (const [leaf, names] of Object.entries(memberships)) {
    for (const rawName of names) {
      const expectedLeaf = leaf === 'limbic' ? 'limbic-system' : leaf;
      const path = leaf === 'limbic' ? [...BRAIN_GROSS_ANATOMY_PATH, 'limbic-system'] : undefined;
      assert.equal(classifyBrainGrossAnatomy(rawName, path)?.at(-1), expectedLeaf, rawName);
      assert.equal(classifyBrainGrossAnatomy(rawName + '_123', path)?.at(-1), expectedLeaf, rawName);
      assert.equal(systemForMeshName(rawName + '_123'), 'nervous', rawName);
    }
  }
  assert.equal(classifyBrainGrossAnatomy('Lateral occipitotemporal gyrus.l.001_123')?.at(-1), 'temporal');
  assert.equal(classifyBrainGrossAnatomy('Lateral occipitotemporal gyrus.l_123')?.at(-1), 'temporal');
  assert.equal(classifyBrainGrossAnatomy('Middle frontal gyrus.l.001_123')?.at(-1), 'frontal');
});

test('lateral occipitotemporal duplicate belongs only to temporal lobe in classification, menus and isolation', () => {
  const frontal = [...BRAIN_GROSS_ANATOMY_PATH, 'brain-lobes', 'frontal'];
  const temporal = [...BRAIN_GROSS_ANATOMY_PATH, 'brain-lobes', 'temporal'];
  assert.ok(!memberships.frontal.includes('Lateral occipitotemporal gyrus.l.001'));
  assert.equal(memberships.temporal.filter(name => name === 'Lateral occipitotemporal gyrus.l.001').length, 1);
  for (const rawName of ['Lateral occipitotemporal gyrus.l.001', 'Lateral occipitotemporal gyrus.l.001_123']) {
    const n = { ...nodes[0], rawName, name: rawName, instanceID: 99999 };
    assert.equal(classifyBrainGrossAnatomy(rawName)?.at(-1), 'temporal');
    const frontalPlan = planRegionIsolation([...nodes, n], 'nervous', frontal,
      node => advancedNeuroanatomyPathForGroup(node, frontal))!;
    const temporalPlan = planRegionIsolation([...nodes, n], 'nervous', temporal,
      node => advancedNeuroanatomyPathForGroup(node, temporal))!;
    assert.ok(frontalPlan.hide.includes(n.instanceID));
    assert.ok(temporalPlan.show.includes(n.instanceID));
  }
});

test('gross collections exclude nuclei, fibers, nerves, and other systems; strict isolation targets only the chosen lobe', () => {
  const outside = ['Dentate_nucleus.l', 'Mediodorsal thalamic fibers.r', 'Olivocerebellar (Climbing fibers).l', 'C1 dorsal root', 'Unknown brain mesh']
    .map((rawName, i): SceneNode => ({
      instanceID: nodes.length + i + 1, rawName, name: rawName, visible: true, systemId: 'nervous', type: 'MatrixTransform',
    }));
  for (const node of outside) assert.equal(brainGrossAnatomyPathForNode(node), null);
  const frontal = [...BRAIN_GROSS_ANATOMY_PATH, 'brain-lobes', 'frontal'];
  const plan = planRegionIsolation([...nodes, ...outside], 'nervous', frontal,
    node => advancedNeuroanatomyPathForGroup(node, frontal))!;
  assert.equal(plan.show.length, memberships.frontal.length);
  assert.equal(plan.hide.length, nodes.length + outside.length - memberships.frontal.length);
  assert.ok(outside.every(node => plan.hide.includes(node.instanceID)));
  assert.equal(brainGrossAnatomyPathForNode({ ...nodes[0], systemId: 'skeletal' }), null);
});

test('expanded gross menu renders every lobe and gross subdivision with shared visibility and isolation controls', () => {
  const groups = BRAIN_GROSS_ANATOMY_GROUP.children!;
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    nodes, groups, namespace: 'brain-gross-anatomy',
    browseState: { expanded: new Set(groups.map(g => g.id)), showUnassigned: false },
    onBrowseStateChange: ignore, pathForNode: brainGrossAnatomyPathForNode,
    pathForGroup: advancedNeuroanatomyPathForGroup, onSetVisibility: ignore,
    onIsolate: ignore, isolatedPath: null, onRestore: ignore, onSelect: ignore,
    toggleVisibility: ignore, onToggleFade: ignore, fadedNodeIds: new Set<number>(),
  }));
  for (const group of groups) for (const leaf of group.children ?? [group]) {
    assert.ok(html.includes(leaf.label), leaf.label);
    assert.ok(html.includes(`Show ${leaf.label}`));
    assert.ok(html.includes(`Hide ${leaf.label}`));
    assert.ok(html.includes(`Isolate ${leaf.label}`));
  }
});

test('limbic isolation uses all 27 real-classified source meshes and retains export aliases without including other anatomy', () => {
  const path = [...BRAIN_GROSS_ANATOMY_PATH, 'limbic-system'];
  const plan = planRegionIsolation(nodes, 'nervous', path,
    node => advancedNeuroanatomyPathForGroup(node, path))!;
  const expected = nodes.filter(node => memberships.limbic.includes(node.rawName));
  assert.equal(expected.length, 27);
  assert.deepEqual(plan.show, expected.map(node => node.instanceID));
  assert.equal(plan.hide.length, 150);
  for (const node of expected) {
    assert.equal(node.systemId, 'nervous', node.rawName);
    assert.deepEqual(brainGrossAnatomyPathForNode(node, path), path);
  }
  assert.deepEqual(classifyBrainGrossAnatomy('Fornix.l_123'), path);
});
