import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVANCED_NEUROANATOMY_GROUPS, classifyAdvancedNeuroanatomy, advancedNeuroanatomyPathForGroup,
} from './advancedNeuroanatomy';
import { WHITE_MATTER_FIBER_GROUPS } from './whiteMatterFiberTaxonomy';
import memberships from './advancedFiberMemberships.json';
import { systemForMeshName } from './anatomicalSystems';
import { whiteMatterContextIds, whiteMatterSupplementPath } from './whiteMatterContext';
import { planRegionIsolation, restorePreviousIsolation } from '../lib/regionIsolation';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NervousSystemMenu } from '../components/NervousSystemMenu';

const root = ['advanced-neuroanatomy', 'white-matter'];
const nodes: SceneNode[] = [
  ...Object.values(memberships).flat(), 'Medial forebrain bundle serotonin.r',
  'Precentral gyrus.l', 'Pons.r', 'Thalamus.r', '01_Anterior_ventral_AV.l',
  'Unknown anatomy', 'Rubrospinal tract', 'Spinothalamic tract',
].map((rawName, i) => ({ rawName, name: rawName, instanceID: i + 1,
  systemId: systemForMeshName(rawName), type: 'MatrixTransform', visible: i % 3 !== 0 }));
const at = (...parts: string[]) => [...root, ...parts];
const within = (child: readonly string[], parent: readonly string[]) =>
  parent.every((part, i) => child[i] === part);
const leaves = (groups: readonly NervousGroup[]): NervousGroup[] =>
  groups.flatMap(g => g.children ? leaves(g.children) : [g]);
const allGroups = (groups: readonly NervousGroup[]): NervousGroup[] =>
  groups.flatMap(g => [g, ...allGroups(g.children ?? [])]);

test('Every source fiber has an actual named menu leaf, including export suffixes without merging sides or SLF numbers', () => {
  const ids = new Set(leaves(WHITE_MATTER_FIBER_GROUPS).map(g => g.id));
  const covered = new Set<string>();
  for (const names of Object.values(memberships)) for (const name of names) {
    const path = classifyAdvancedNeuroanatomy(name)!;
    assert.ok(ids.has(path.join('/')), name);
    covered.add(path.join('/'));
    for (const suffix of ['.001', '_572', '.001_572'])
      assert.deepEqual(classifyAdvancedNeuroanatomy(name + suffix), path, name + suffix);
    const runtime = nodes.find(n => n.rawName === name)!;
    assert.equal(runtime.systemId, 'nervous', name);
    assert.deepEqual(advancedNeuroanatomyPathForGroup(runtime, path), path, name);
  }
  for (const leaf of leaves(WHITE_MATTER_FIBER_GROUPS)) {
    if (leaf.id.startsWith(at('somatosensory').join('/'))) continue; // Shared peer access checked separately.
    assert.ok(covered.has(leaf.id), `Empty or invented tract leaf: ${leaf.label}`);
  }
  assert.notDeepEqual(classifyAdvancedNeuroanatomy('Superior longitudinal fascicle (SLF) I.r'),
    classifyAdvancedNeuroanatomy('Superior longitudinal fiascicle (SLF) II.r'));
  assert.notEqual(classifyAdvancedNeuroanatomy('Rubrospinal tract')?.[1], 'white-matter');
});

test('Every named family and tract isolates only its CSV fibers plus established orientation anatomy; restore is unchanged', () => {
  const visibleBefore = nodes.filter(n => n.visible).map(n => n.instanceID);
  for (const group of allGroups(WHITE_MATTER_FIBER_GROUPS)) {
    const path = group.id.split('/');
    const plan = planRegionIsolation(nodes, 'nervous', path,
      n => advancedNeuroanatomyPathForGroup(n, path))!;
    assert.ok(plan, group.id);
    const expected = nodes.filter(n => {
      const member = classifyAdvancedNeuroanatomy(n.rawName);
      if (path[2] === 'somatosensory')
        return member?.[2] === 'projection' && member[3] === 'somatosensory'
          && within([...root, ...member.slice(3)], path);
      return member && within(member, path);
    }).map(n => n.instanceID);
    const context = whiteMatterContextIds(nodes, path);
    assert.ok(expected.length > 0, group.label);
    const supplements = nodes.filter(n => whiteMatterSupplementPath(n, path)).map(n => n.instanceID);
    assert.deepEqual(new Set(plan.show), new Set([...expected, ...context, ...supplements]), group.label);
    assert.ok(plan.hide.includes(nodes.find(n => n.rawName === 'Unknown anatomy')!.instanceID));
    const visibility = new Map(nodes.map(n => [n.instanceID, n.visible]));
    plan.show.forEach(id => visibility.set(id, true));
    plan.hide.forEach(id => visibility.set(id, false));
    restorePreviousIsolation(false, () => assert.fail('No structure focus to restore'),
      () => plan.affected.forEach(n => visibility.set(n.instanceID, n.visible)));
    assert.deepEqual([...visibility].filter(([, visible]) => visible).map(([id]) => id), visibleBefore,
      'Restore uses the actual pre-isolation visible state');
  }
});

test('Shared somatosensory access subdivides arm, leg, trunk and face identically without duplicate structures', () => {
  for (const part of ['arm', 'legs', 'trunk', 'face']) {
    const source = nodes.filter(n => n.rawName.startsWith(`Somatosensory tract ${part}.`));
    assert.equal(source.length, 2);
    for (const n of source) {
      assert.deepEqual(advancedNeuroanatomyPathForGroup(n, at('somatosensory', part)), at('somatosensory', part));
      assert.deepEqual(advancedNeuroanatomyPathForGroup(n, at('projection', 'somatosensory', part)),
        at('projection', 'somatosensory', part));
    }
  }
});

test('Anatomical corrections are display labels only: optic radiations stay in CSV Association and combined thalamic meshes stay combined', () => {
  const cases = [
    ['Optic radiation.r', ['association', 'optic-radiation']],
    ['Corticospinal tract face.l', ['projection', 'motor', 'face']],
    ['Temporoponne fibers.r', ['projection', 'corticopontine', 'temporal']],
    ['Thalamocortical fibers to VL and VA.r', ['thalamic', 'va-vl']],
    ['Thalamocortical from lateral LD and LP.l', ['thalamic', 'ld-lp']],
    ['Rubrospiinal tract.l', ['ascending-brainstem', 'descending-motor', 'rubrospinal']],
    ['Rubrospinal tract.r', ['ascending-brainstem', 'descending-motor', 'rubrospinal']],
    ['Medial longitudinal fascicle - Internuclear fibers', ['ascending-brainstem', 'connecting', 'mlf', 'internuclear']],
  ] as const;
  for (const [name, suffix] of cases) assert.deepEqual(classifyAdvancedNeuroanatomy(name), at(...suffix));
});

test('All nested fiber controls retain whole-brain context and the thalamic landmarks at their existing opacity', () => {
  const whiteMatter = ADVANCED_NEUROANATOMY_GROUPS[0];
  const menu = new Map(allGroups([whiteMatter]).map(g => [g.id, g]));
  for (const g of allGroups(WHITE_MATTER_FIBER_GROUPS)) {
    assert.ok(menu.get(g.id)?.children?.some(child => child.id === `${g.id}/brain-context`), g.id);
    const path = g.id.split('/');
    const ids = whiteMatterContextIds(nodes, path);
    for (const name of ['Precentral gyrus.l', 'Pons.r']) {
      const n = nodes.find(n => n.rawName === name)!;
      assert.ok(ids.includes(n.instanceID), g.id);
    }
    const capsule = nodes.find(n => n.rawName === 'Thalamus.r')!;
    assert.equal(ids.includes(capsule.instanceID), path[2] === 'thalamic');
    if (path[2] === 'thalamic') {
      assert.ok(menu.get(g.id)?.children?.some(child => child.id === `${g.id}/thalamic-nuclei`));
      assert.ok(menu.get(g.id)?.children?.some(child => child.id === `${g.id}/thalamus-capsule`));
    }
  }
  const n = nodes.find(n => n.rawName === 'Medial forebrain bundle serotonin.r')!;
  assert.deepEqual(advancedNeuroanatomyPathForGroup(n, at('serotonergic')),
    at('serotonergic', 'medial-forebrain-bundle'));
});

test('Expanded sidebar and fullscreen menus expose actionable named tract subdivisions using the shared controls', () => {
  const noop = () => {};
  for (const layout of ['stacked', 'columns'] as const) for (const collectionsOnly of [false, true]) {
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
      groups: [ADVANCED_NEUROANATOMY_GROUPS[0]], nodes, layout, collectionsOnly, mixCategories: false,
      pathForNode: n => advancedNeuroanatomyPathForGroup(n, root),
      pathForGroup: advancedNeuroanatomyPathForGroup,
      onSetVisibility: noop, onIsolate: noop, isolatedPath: null, onRestore: noop,
      onSelect: noop, toggleVisibility: noop, onToggleFade: noop, fadedNodeIds: new Set<number>(),
      browseState: { expanded: new Set([root.join('/'), ...allGroups(WHITE_MATTER_FIBER_GROUPS).map(g => g.id)]),
        showUnassigned: false }, onBrowseStateChange: noop,
    }));
    for (const label of ['Arcuate fasciculus', 'SLF I', 'SLF II', 'SLF III', 'Arm corticospinal fibers',
      'Temporopontine fibers', 'Arm somatosensory fibers', 'Callosal body fibers',
      'Mediodorsal thalamic fibers', 'VA / VL thalamocortical fibers (combined mesh)', 'Rubrospinal tract']) {
      const showButton = html.split(`aria-label="Show ${label}"`)[1]?.split('>')[0];
      assert.notEqual(showButton, undefined, `${layout}/${collectionsOnly}: ${label}`);
      assert.doesNotMatch(showButton!, /\sdisabled(?:=|\s|$)/, `Empty control: ${label}`);
      assert.ok(html.includes(`aria-label="Hide ${label}"`), label);
      assert.ok(html.includes(`aria-label="Isolate ${label}"`), label);
    }
  }
});
