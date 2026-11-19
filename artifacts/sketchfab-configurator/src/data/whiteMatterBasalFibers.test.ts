import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { systemForMeshName } from './anatomicalSystems';
import { advancedNeuroanatomyPathForGroup, advancedNeuroanatomyPathForNode, ADVANCED_NEUROANATOMY_GROUPS } from './advancedNeuroanatomy';
import { classifyBasalForebrainObject } from './basalForebrainTaxonomy';
import { classifyLimbicObject } from './limbicTaxonomy';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const root = ['advanced-neuroanatomy', 'white-matter'];
const names = ['Anterior commissure', ...['Ansa peduncularis Amygdaloseptal fibers',
  'Ansa peduncularis Amygdalohypothalamic fibers', 'Ansa peduncularis Amygdalothalamic fibers',
  'Stria terminalis', 'Stria medullaris thalami', 'Medial forebrain bundle dopamine',
  'Medial forebrain bundle serotonin'].flatMap(name => [`${name}.l`, `${name}.r`])];
const allNames = [...names, 'Nucleus accumbens.l', 'Basal nucleus of Maynert.r', 'Hypothalamus', 'Pons.r'];
const nodes: SceneNode[] = allNames.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, systemId: systemForMeshName(rawName),
  type: 'MatrixTransform', visible: true,
}));

test('White matter includes all basal forebrain fibers and bilateral serotonin, with exact nested and shared memberships', () => {
  for (const node of nodes.slice(0, names.length)) {
    assert.equal(node.systemId, 'nervous', node.rawName);
    for (const rawName of [node.rawName, `${node.rawName}.001_123`]) {
      const alias = { ...node, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(alias.systemId, 'nervous', rawName);
      const path = advancedNeuroanatomyPathForGroup(alias, [...root, 'basal-forebrain'])!;
      assert.ok(path);
      for (let length = 2; length <= path.length; length++) {
        assert.ok(isNodeInRegion(alias, path.slice(0, length), () => null), path.join('/'));
      }
      assert.equal(Boolean(classifyBasalForebrainObject(rawName)), !rawName.startsWith('Stria'),
        'Striae are excluded only from the separate Basal forebrain category');
      if (rawName.startsWith('Ansa')) assert.ok(classifyLimbicObject(rawName), 'Preserve Limbic membership');
    }
  }
  for (const [path, count] of [
    [root, 15], [[...root, 'basal-forebrain'], 15],
    [[...root, 'basal-forebrain', 'amygdaloseptal'], 2],
    [[...root, 'basal-forebrain', 'medial-forebrain-bundle'], 4],
    [[...root, 'basal-forebrain', 'medial-forebrain-bundle', 'serotonin'], 2],
    [[...root, 'serotonergic'], 2],
  ] as const) {
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    const orientationCount = path[2] === 'serotonergic' ? 1 : 2; // Pons context; basal/root also includes hypothalamus.
    assert.equal(plan.show.length, count + orientationCount, path.join('/'));
    assert.equal(plan.hide.length, nodes.length - count - orientationCount);
    if (path.at(-1) === 'serotonergic' || path.at(-1) === 'serotonin') {
      assert.ok(plan.show.every(id => {
        const name = nodes.find(node => node.instanceID === id)!.rawName;
        return name.includes('serotonin') || name === 'Pons.r' || (path[2] === 'basal-forebrain' && name === 'Hypothalamus');
      }));
    }
  }
  assert.equal(advancedNeuroanatomyPathForGroup(nodes[0], [...root, 'commissural'])?.[2], 'commissural');
});

test('White matter exposes both new entries and serotonin subdivisions in standard, compact and fullscreen collection menus', () => {
  const noop = () => {};
  for (const layout of ['standard', 'compact'] as const) for (const collectionsOnly of [false, true]) {
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
      nodes, groups: [ADVANCED_NEUROANATOMY_GROUPS[0]], namespace: 'basal-fibers', layout, collectionsOnly,
      pathForNode: advancedNeuroanatomyPathForNode, pathForGroup: advancedNeuroanatomyPathForGroup,
      onSetVisibility: noop, onIsolate: noop, isolatedPath: null, onRestore: noop, onSelect: noop,
      toggleVisibility: noop, onToggleFade: noop, fadedNodeIds: new Set<number>(),
      browseState: { expanded: new Set([root.join('/'), [...root, 'basal-forebrain'].join('/'),
        [...root, 'basal-forebrain', 'medial-forebrain-bundle'].join('/')]), showUnassigned: false },
      onBrowseStateChange: noop,
    }));
    for (const label of ['Basal forebrain fibers', 'Serotonergic fibers', 'Amygdaloseptal fibers', 'Medial forebrain bundle']) {
      assert.ok(html.includes(label));
      for (const action of ['Show', 'Hide', 'Isolate']) assert.ok(html.includes(`${action} ${label}`));
    }
  }
});
