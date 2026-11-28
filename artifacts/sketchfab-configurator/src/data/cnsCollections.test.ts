import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ADVANCED_NEUROANATOMY_GROUPS,
  advancedNeuroanatomyPathForGroup,
  classifyAdvancedNeuroanatomy,
} from './advancedNeuroanatomy';
import fiberMemberships from './advancedFiberMemberships.json';
import somatosensoryMemberships from './somatosensoryFiberMemberships.json';
import { whiteMatterSupplementPath } from './whiteMatterContext';
import { isNodeInRegion, planRegionIsolation, restorePreviousIsolation } from '../lib/regionIsolation';
import { classifyNervousObject } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

// The uploaded CSV has no quoted fields. Fail explicitly if a later fixture
// changes that format rather than silently splitting a quoted object name.
const source = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8');
assert.ok(!source.includes('"'), 'Use a full CSV parser if the export gains quoted fields');
const rows = source.trim().split(/\r?\n/).slice(1).map((line) => line.split(','));
const parents = new Map(rows.filter((row) => row[0] === 'COLLECTION').map((row) => [row[1], row[2]]));
const objects = rows.filter((row) => row[0] === 'OBJECT').map((row) => ({ collection: row[1], name: row[4] }));
function within(collection: string, root: string): boolean {
  const visited = new Set<string>();
  while (collection && !visited.has(collection)) {
    if (collection === root) return true;
    visited.add(collection);
    collection = parents.get(collection) ?? '';
  }
  return false;
}
const roots = {
  association: 'Fiber tracts association',
  projection: 'Fiber tracts projection ',
  commissural: 'FIber trackts comissural',
  'ascending-brainstem': 'Brainstem fibers',
  thalamic: 'Thalamic fibers',
};
const expectedFibers = new Map<string, string>();
for (const [category, root] of Object.entries(roots)) {
  for (const object of objects) {
    if (within(object.collection, root) && object.name !== 'Periaqueductal gray matter') {
      expectedFibers.set(object.name, category);
    }
  }
}
const expectedWhiteMatter = new Set([
  ...expectedFibers.keys(),
  ...objects.filter(({ name }) =>
    /^(?:Ansa peduncularis Amygdalo(?:septal|hypothalamic|thalamic) fibers|Medial forebrain bundle (?:dopamine|serotonin)|Stria terminalis|Stria medullaris thalami)\.[lr]$/i.test(name))
    .map(({ name }) => name),
]);
const nodes: SceneNode[] = objects.map(({ name }, index) => ({
  instanceID: index + 1, rawName: name, name, systemId: 'nervous', type: 'MatrixTransform', visible: index % 3 !== 0,
}));
nodes.push(
  { instanceID: 2001, rawName: 'Unknown mesh', name: 'Unknown mesh', systemId: 'nervous', type: 'Geometry', visible: true },
  { instanceID: 2002, rawName: 'Arcuate fascicle.l', name: 'Vessel with a misleading name', systemId: 'vascular', type: 'Geometry', visible: true },
);

test('every supplied white-matter membership and every exclusion agrees with the latest CSV', () => {
  assert.equal(objects.length, 1368);
  assert.equal(expectedFibers.size, 108);
  const sensoryObjects = objects.filter((object) => within(object.collection, 'Sensory tract'));
  assert.deepEqual(new Set(somatosensoryMemberships), new Set(sensoryObjects.map((object) => object.name)));
  for (const [category, names] of Object.entries(fiberMemberships)) {
    assert.deepEqual(new Set(names), new Set([...expectedFibers].filter(([, group]) => group === category).map(([name]) => name)));
  }
  for (const { name } of objects) {
    const expected = expectedFibers.get(name);
    const actual = classifyAdvancedNeuroanatomy(name);
    if (expected) {
      const path = ['advanced-neuroanatomy', 'white-matter', expected];
      if (sensoryObjects.some((object) => object.name === name)) path.push('somatosensory');
      assert.deepEqual(actual?.slice(0, path.length), path, name);
      assert.ok(actual!.length > path.length, `Missing named fiber subdivision: ${name}`);
    } else {
      assert.notEqual(actual?.[1], 'white-matter', `Nonmember incorrectly included: ${name}`);
    }
  }
});

test('white-matter isolation shows original CSV and basal fibers plus requested orientation anatomy', () => {
  const path = ['advanced-neuroanatomy', 'white-matter'];
  const plan = planRegionIsolation(nodes, 'nervous', path, (node) => advancedNeuroanatomyPathForGroup(node, path))!;
  assert.equal(expectedWhiteMatter.size, 122);
  const expected = nodes.filter(node => node.systemId === 'nervous'
    && (expectedWhiteMatter.has(node.rawName) || whiteMatterSupplementPath(node, path))).map(node => node.instanceID);
  assert.deepEqual(new Set(plan.show), new Set(expected));
  assert.equal(plan.hide.length, nodes.length - expected.length);
  assert.equal(plan.affected.length, nodes.length);
  assert.ok(plan.hide.includes(2001));
  assert.ok(plan.hide.includes(2002));
});

test('somatosensory and thalamic subgroups retain exact CSV fibers plus requested orientation anatomy', () => {
  for (const [root, path, count] of [
    ['Sensory tract', ['advanced-neuroanatomy', 'white-matter', 'somatosensory'], 8],
    ['Sensory tract', ['advanced-neuroanatomy', 'white-matter', 'projection', 'somatosensory'], 8],
    ['Thalamic fibers', ['advanced-neuroanatomy', 'white-matter', 'thalamic'], 14],
  ] as const) {
    const expected = objects.filter((object) => within(object.collection, root)).map((object) => object.name);
    assert.equal(expected.length, count);
    const plan = planRegionIsolation(nodes, 'nervous', path, (node) => advancedNeuroanatomyPathForGroup(node, path))!;
    const shown = nodes.filter((node) => plan.show.includes(node.instanceID));
    const supplements = nodes.filter(node => whiteMatterSupplementPath(node, path)).map(node => node.rawName);
    const expectedWithContext = new Set([...expected, ...supplements]);
    assert.deepEqual(new Set(shown.map((node) => node.rawName)), expectedWithContext);
    assert.equal(shown.length, expectedWithContext.size);
    assert.equal(plan.hide.length, nodes.length - expectedWithContext.size);
  }
});

test('diencephalon, brainstem, and spinal roots contain exactly their reviewed source collections', () => {
  const expected = new Map<string, Set<string>>([
    ['diencephalon', new Set(objects.filter((o) => ['NS_04_DIENCEPHALON', 'NS_03_BASAL_GANGLIA'].includes(o.collection) || within(o.collection, 'Thalamus')).map((o) => o.name))],
    ['spinal-cord', new Set(objects.filter((o) => ['NS_02_SPINAL_CORD', 'NS_02_GRAY_MATTER', 'NS_03_GENERAL_WHITE_MATTER', 'NS_04_ASCENDING_SENSORY_TRACTS', 'NS_05_DESCENDING_MOTOR_TRACTS', 'NS_06_OTHER_TRACTS'].includes(o.collection)).map((o) => o.name))],
    // /ne?ucleus/: the source spells the principal trigeminal nucleus 'neucleus'.
    ['brainstem', new Set(objects.filter((o) =>
      within(o.collection, 'Brainstem fibers') ||
      (o.collection === 'NS_03_BRAINSTEM_NUCLEI' && !o.name.startsWith('Vestibular nerve fibers to nuclei')) ||
      (o.collection.startsWith('NS_CN') && /ne?ucleus/i.test(o.name)) ||
      (o.collection === 'NS_02_BRAINSTEM_GROSS_ANATOMY' && /^(?:Midbrain|Pons|Medulla oblongata)\.[lr]$/.test(o.name)) ||
      (o.collection === 'NS_02_BRAINSTEM_GROSS_ANATOMY' && /colliculus|Superior olivary complex|N\. of the lateral lemniscus|Interstitial nucleus of Cajal|Nucleus of Darkschewitsch/.test(o.name)) ||
      /^(?:Periaqueductal gray matter|Ventral tegmental area\.[lr]|Substantia nigra pars (?:compacta|reticularis)\.+[lr])$/.test(o.name)
    ).map((o) => o.name))],
  ]);
  for (const [group, count] of [['diencephalon', 96], ['brainstem', 116], ['spinal-cord', 29]] as const) {
    const path = ['advanced-neuroanatomy', group];
    const plan = planRegionIsolation(nodes, 'nervous', path, (node) => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.equal(expected.get(group)!.size, count);
    assert.deepEqual(new Set(plan.show.map((id) => nodes.find((node) => node.instanceID === id)!.rawName)), expected.get(group), group);
  }
});

test('every advanced CNS subdivision excludes all nonmembers and retains the complete restore snapshot', () => {
  const before = nodes.map((node) => node.visible);
  function check(group: NervousGroup) {
    const path = group.id.split('/');
    const plan = planRegionIsolation(nodes, 'nervous', path, (node) => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.ok(plan, group.id);
    assert.equal(plan.affected.length, nodes.length);
    assert.equal(plan.show.length + plan.hide.length, nodes.length);
    assert.equal(new Set([...plan.show, ...plan.hide]).size, nodes.length);
    const snapshot = new Map(plan.affected.map((node) => [node.instanceID, node.visible]));
    const isolated = nodes.map((node) => ({ ...node, visible: plan.show.includes(node.instanceID) }));
    const restored = isolated.map((node) => ({ ...node, visible: snapshot.get(node.instanceID)! }));
    assert.deepEqual(restored.map((node) => node.visible), before, group.id);
    assert.deepEqual(nodes.map((node) => node.visible), before, 'Planning must not mutate source state');
    group.children?.forEach(check);
  }
  ADVANCED_NEUROANATOMY_GROUPS.forEach(check);
});

test('selecting either arcuate fascicle retains isolated white matter and its original Restore snapshot', () => {
  const standardPath = (node: SceneNode) => classifyNervousObject(node.rawName);
  for (const path of [
    ['advanced-neuroanatomy', 'white-matter'],
    ['advanced-neuroanatomy', 'white-matter', 'association'],
  ]) {
    const plan = planRegionIsolation(nodes, 'nervous', path, (node) => advancedNeuroanatomyPathForGroup(node, path))!;
    const snapshot = new Map(plan.affected.map((node) => [node.instanceID, node.visible]));
    const isolated = nodes.map((node) => ({ ...node, visible: plan.show.includes(node.instanceID) }));
    for (const name of ['Arcuate fascicle.l', 'Arcuate fascicle.r']) {
      const selected = isolated.find((node) => node.rawName === name)!;
      assert.equal(selected.visible, true);
      // This is the selection effect's restore guard; a member must not trigger it.
      assert.equal(isNodeInRegion(selected, path, standardPath), true, name);
    }
    assert.deepEqual(isolated.filter((node) => node.visible).map((node) => node.instanceID), plan.show);
    const restored = isolated.map((node) => ({ ...node, visible: snapshot.get(node.instanceID)! }));
    assert.deepEqual(restored.map((node) => node.visible), nodes.map((node) => node.visible));
  }
});

test('selection membership agrees with isolation for every advanced group, including shared brainstem structures', () => {
  function check(group: NervousGroup) {
    const path = group.id.split('/');
    const plan = planRegionIsolation(nodes, 'nervous', path, (node) => advancedNeuroanatomyPathForGroup(node, path))!;
    const members = new Set(plan.show);
    for (const node of nodes) {
      assert.equal(
        isNodeInRegion(node, path, () => { throw new Error('Advanced selection must not use Standard anatomy'); }),
        members.has(node.instanceID),
        `${group.id}: ${node.rawName}`,
      );
    }
    group.children?.forEach(check);
  }
  ADVANCED_NEUROANATOMY_GROUPS.forEach(check);
});

test('standard collection selections still use standard memberships and reject outside structures', () => {
  const node = nodes[0];
  assert.equal(isNodeInRegion(node, ['brain', 'cerebrum'], () => ['brain', 'cerebrum', 'cortex']), true);
  assert.equal(isNodeInRegion(node, ['brain', 'cerebrum'], () => ['brain', 'cerebellum']), false);
  assert.equal(isNodeInRegion(node, ['brain', 'cerebrum'], () => null), false);
});

for (const withContext of [false, true]) {
  test(`uncinate focus ${withContext ? 'with context' : 'without context'} restores White matter first, then the original system view`, () => {
    const path = ['advanced-neuroanatomy', 'white-matter'];
    const plan = planRegionIsolation(nodes, 'nervous', path, (node) => advancedNeuroanatomyPathForGroup(node, path))!;
    const original = new Map(nodes.map((node) => [node.instanceID, node.visible]));
    let collectionSnapshot: Map<number, boolean> | null = new Map(original);
    let visibility = new Map(nodes.map((node) => [node.instanceID, plan.show.includes(node.instanceID)]));
    const whiteMatterView = new Map(visibility);
    const uncinate = nodes.find((node) => node.rawName === 'Uncinate fascicle.l')!;
    assert.ok(uncinate);
    assert.equal(visibility.get(uncinate.instanceID), true);

    // The viewer takes its structure snapshot from the current collection view.
    let structureSnapshot: Map<number, boolean> | null = new Map(visibility);
    const focusedIds = new Set([uncinate.instanceID]);
    if (withContext) {
      plan.show.filter((id) => id !== uncinate.instanceID).slice(0, 4).forEach((id) => focusedIds.add(id));
    }
    visibility = new Map(nodes.map((node) => [node.instanceID, focusedIds.has(node.instanceID)]));
    const restores: string[] = [];
    const restoreStructure = () => {
      restores.push('structure');
      assert.ok(structureSnapshot);
      visibility = new Map(structureSnapshot);
      structureSnapshot = null;
    };
    const restoreCollection = () => {
      restores.push('collection');
      assert.ok(collectionSnapshot);
      visibility = new Map(collectionSnapshot);
      collectionSnapshot = null;
    };

    restorePreviousIsolation(structureSnapshot !== null, restoreStructure, restoreCollection);
    assert.deepEqual(restores, ['structure']);
    assert.deepEqual(visibility, whiteMatterView);
    assert.deepEqual(collectionSnapshot, original, 'The original collection Restore snapshot must remain intact');
    assert.equal([...visibility.values()].filter(Boolean).length, plan.show.length);

    restorePreviousIsolation(structureSnapshot !== null, restoreStructure, restoreCollection);
    assert.deepEqual(restores, ['structure', 'collection']);
    assert.deepEqual(visibility, original);
    assert.equal(collectionSnapshot, null);
  });
}

test('Restore without structure focus goes directly to the collection restore action', () => {
  const actions: string[] = [];
  restorePreviousIsolation(false, () => actions.push('structure'), () => actions.push('collection'));
  assert.deepEqual(actions, ['collection']);
});
