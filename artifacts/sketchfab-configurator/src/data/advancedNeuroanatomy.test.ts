import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADVANCED_NEUROANATOMY_GROUPS, classifyAdvancedNeuroanatomy, advancedNeuroanatomyPathForNode, advancedNeuroanatomyPathForGroup, normalizeTractName } from './advancedNeuroanatomy';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import { classifyNervousObject } from './nervousTaxonomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';
import fiberMemberships from './advancedFiberMemberships.json';
import somatosensoryMemberships from './somatosensoryFiberMemberships.json';

function node(instanceID: number, rawName: string, visible = true, systemId: SceneNode['systemId'] = 'nervous'): SceneNode {
  return { instanceID, rawName, name: rawName, visible, systemId, type: 'MatrixTransform' };
}

test('white matter exposes somatosensory fibers directly while preserving their CSV projection subgroup', () => {
  assert.equal(ADVANCED_NEUROANATOMY_GROUPS.length, 4);
  assert.deepEqual(ADVANCED_NEUROANATOMY_GROUPS.map((group) => group.label), ['White matter fibers', 'Basal ganglia and diencephalon', 'Brainstem', 'Spinal cord']);
  assert.equal(ADVANCED_NEUROANATOMY_GROUPS[0].id, 'advanced-neuroanatomy/white-matter');
  assert.equal(ADVANCED_NEUROANATOMY_GROUPS[0].children?.length, 13);
  assert.deepEqual(ADVANCED_NEUROANATOMY_GROUPS[0].children?.map((group) => group.label),
    ['Association fibers', 'Projection fibers', 'Somatosensory fibers', 'Commissural fibers', 'Brainstem fibers — ascending, descending and connecting', 'Thalamic fibers', 'Basal forebrain fibers', 'Serotonergic fibers',
      'Whole brain (semitransparent)', 'Thalamus capsule (semitransparent)', 'Thalamic nuclei', 'Amygdalae', 'Hypothalamus']);
  const projection = ADVANCED_NEUROANATOMY_GROUPS[0].children!.find((group) => group.label === 'Projection fibers')!;
  assert.deepEqual(projection.children?.map((group) => group.label),
    ['Motor projection fibers', 'Somatosensory fibers', 'Corticopontine fibers', 'Whole brain (semitransparent)']);
  assert.ok(ADVANCED_NEUROANATOMY_GROUPS[0].children!.some((group) => group.label === 'Thalamic fibers'));
  for (const group of ADVANCED_NEUROANATOMY_GROUPS[0].children!) {
    assert.equal(group.id.split('/').length, 3);
  }
  assert.equal(ADVANCED_NEUROANATOMY_GROUPS[1].id, 'advanced-neuroanatomy/diencephalon');
});

test('white matter parent includes somatosensory and thalamic fibers while excluding diencephalon nuclei', () => {
  const nodes = [
    node(1, 'Arcuate fascicle.l'),
    node(2, 'Corticospinal tract face.r', false),
    node(3, 'Anterior commissure'),
    node(4, 'Spinothalamic tract.l'),
    node(5, 'Thalamus.r'),
    node(6, 'Unknown anatomy'),
    node(7, 'Arcuate fascicle.r', true, 'vascular'),
    node(8, 'Somatosensory tract arm.l'),
    node(9, 'Mediodorsal thalamic fibers.r'),
  ];
  const plan = planRegionIsolation(nodes, 'nervous', ['advanced-neuroanatomy', 'white-matter'], advancedNeuroanatomyPathForNode)!;
  assert.deepEqual(plan.show, [1, 2, 3, 4, 8, 9]);
  assert.deepEqual(plan.hide, [5, 6, 7]);
  assert.equal(nodes[1].visible, false);
});

test('somatosensory is visible with Projection collapsed in sidebar, mobile, and fullscreen collection menus', () => {
  const root = 'advanced-neuroanatomy/white-matter';
  const nodes = somatosensoryMemberships.map((name, index) => node(index + 1, name));
  const noop = () => {};
  for (const layout of ['stacked', 'columns'] as const) {
    for (const collectionsOnly of [false, true]) {
      const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
        groups: [ADVANCED_NEUROANATOMY_GROUPS[0]], nodes, layout, collectionsOnly, mixCategories: true,
        pathForNode: advancedNeuroanatomyPathForNode, pathForGroup: advancedNeuroanatomyPathForGroup,
        onSetVisibility: noop, onIsolate: noop, isolatedPath: null, onRestore: noop,
        onSelect: noop, toggleVisibility: noop, onToggleFade: noop, fadedNodeIds: new Set<number>(),
        browseState: { expanded: new Set([root]), showUnassigned: false }, onBrowseStateChange: noop,
      }));
      assert.equal([...html.matchAll(/>Somatosensory fibers<\/span>/g)].length, 1);
      const showButton = html.match(/<button\b[^>]*aria-label="Show Somatosensory fibers"[^>]*>/)?.[0];
      assert.ok(showButton, 'Direct Somatosensory entry must expose Show');
      assert.doesNotMatch(showButton, /\sdisabled(?:=|\s|>)/, 'All eight source models must be actionable');
    }
  }
});

test('normalize Blender and Sketchfab suffixes without merging numbered SLF tracts', () => {
  assert.equal(normalizeTractName('Arcuate fascicle.l.001_123'), 'arcuate fascicle.l');
  assert.equal(normalizeTractName('Arcuate fascicle_123.r'), 'arcuate fascicle.r');
  assert.notEqual(normalizeTractName('Rubrospinal tract'), normalizeTractName('Rubrospinal tract.r'));
  assert.notEqual(normalizeTractName('Superior longitudinal fascicle (SLF) I.r'), normalizeTractName('Superior longitudinal fiascicle (SLF) II.r'));
});

test('recognized source objects follow the requested CSV collection memberships', () => {
  for (const [category, names] of Object.entries(fiberMemberships)) {
    for (const name of names) {
      for (const suffix of ['', '_123', '.001_75']) {
        const path = ['advanced-neuroanatomy', 'white-matter', category];
        if (category === 'projection' && somatosensoryMemberships.includes(name)) path.push('somatosensory');
        const actual = classifyAdvancedNeuroanatomy(name + suffix)!;
        assert.deepEqual(actual.slice(0, path.length), path, name + suffix);
        assert.ok(actual.length > path.length, 'Each source fiber now has a named subdivision');
      }
    }
  }
});

test('exclude the requested gray-matter exception and objects from sibling CSV collections', () => {
  for (const name of [
    'U fibers white matter of telencephalon.r',
    'Posterior commissure',
    'Corpus callosum',
    'Unidentified tract',
  ]) assert.equal(classifyAdvancedNeuroanatomy(name), null);
  assert.equal(classifyAdvancedNeuroanatomy('Hippocampal commissure')?.[1], 'limbic-system');
  for (const name of ['Periaqueductal gray matter', 'Periaqueductal gray matter.001_123', 'Ventral tegmental area.r']) {
    assert.equal(classifyAdvancedNeuroanatomy(name)?.[1], 'brainstem');
  }
});

test('advanced isolation hides every nonmember, including uncertain objects and other systems', () => {
  const nodes = [
    node(1, 'Arcuate fascicle.r'),
    node(2, 'Arcuate fascicle.l', false),
    node(3, 'Optic radiation.l'),
    node(4, 'Corpus callosum'),
    node(5, 'Cerebral cortex'),
    node(6, 'Unknown anatomy'),
    node(7, 'Arcuate fascicle.r', true, 'vascular'),
  ];
  const group = ['advanced-neuroanatomy', 'white-matter', 'association'];
  const plan = planRegionIsolation(nodes, 'nervous', group, advancedNeuroanatomyPathForNode)!;
  assert.deepEqual(plan.show, [1, 2, 3]);
  assert.deepEqual(plan.hide, [4, 5, 6, 7]);
  assert.deepEqual(plan.affected.map((item) => item.instanceID), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(nodes[1].visible, false, 'planning must not mutate previous visibility needed for restore');
  assert.equal(planRegionIsolation(nodes, 'nervous', ['advanced-neuroanatomy', 'white-matter', 'missing'], advancedNeuroanatomyPathForNode), null);
  assert.equal(advancedNeuroanatomyPathForNode(nodes[6]), null);
});

test('standard anatomy classification remains independent of the new layer', () => {
  assert.deepEqual(classifyNervousObject('Optic radiation.l'), ['supratentorial', 'white-matter']);
  assert.deepEqual(classifyNervousObject('Cingulum fibers.r'), ['supratentorial', 'limbic']);
  assert.deepEqual(classifyNervousObject('Spinothalamic tract.r'), ['spinal', 'ascending-tracts']);
  const nodes = [node(1, 'Cerebral cortex'), node(2, 'Unknown anatomy'), node(3, 'Artery', true, 'vascular')];
  const plan = planRegionIsolation(nodes, 'nervous', ['supratentorial'], (n) => classifyNervousObject(n.rawName))!;
  assert.deepEqual(plan.affected.map((n) => n.instanceID), [1], 'Standard anatomy still preserves uncertain objects and other systems');
});
