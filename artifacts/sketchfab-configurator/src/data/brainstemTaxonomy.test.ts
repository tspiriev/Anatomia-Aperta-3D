import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BRAINSTEM_GROUP, classifyBrainstemObject, isBrainstemRetainedContext, brainstemContextIds, brainstemShowContextIds,
} from './brainstemTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import {
  ADVANCED_NEUROANATOMY_GROUPS,
  classifyAdvancedNeuroanatomy,
  advancedNeuroanatomyPathForGroup,
} from './advancedNeuroanatomy';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

// Selected rows in this source contain no embedded commas or quoted fields.
const rows = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1792051238150.csv', import.meta.url), 'utf8')
  .split(/\r?\n/).map((line) => line.split(',')).filter((row) => row[0] === 'OBJECT');
const fiberCollections = new Map([
  ['Brainstem fibers', []],
  ['Auditory', ['auditory']],
  ['Ascending cerebellar', ['ascending-cerebellar']],
  ['Trigeminal', ['trigeminal']],
  ['Ascending sensory', ['ascending-sensory']],
  ['Medial longitudinal fascicle', ['medial-longitudinal-fascicle']],
]);
const fiberRows = rows.filter((row) => fiberCollections.has(row[1]));
const nucleusRows = rows.filter((row) =>
  (row[1] === 'NS_03_BRAINSTEM_NUCLEI' && !row[4].startsWith('Vestibular nerve fibers to nuclei')) ||
  (row[1].startsWith('NS_CN') && /nucleus|neucleus/i.test(row[4])) ||
  (row[1] === 'NS_02_BRAINSTEM_GROSS_ANATOMY' && /colliculus|Superior olivary complex|N\. of the lateral lemniscus|Interstitial nucleus of Cajal|Nucleus of Darkschewitsch/.test(row[4])) ||
  /^(?:Periaqueductal gray matter|Ventral tegmental area\.[lr]|Substantia nigra pars (?:compacta|reticularis)\.+[lr])$/.test(row[4]),
);
const root = ['advanced-neuroanatomy', 'brainstem'];
const grossRows = rows.filter((row) =>
  row[1] === 'NS_02_BRAINSTEM_GROSS_ANATOMY' && /^(?:Midbrain|Pons|Medulla oblongata)\.[lr]$/.test(row[4]));
const allNames = [...grossRows, ...fiberRows, ...nucleusRows].map((row) => row[4]);

test('gross anatomy exposes the six CSV midbrain, pons, and medulla models with both sides and export variants', () => {
  assert.equal(grossRows.length, 6);
  const gross = BRAINSTEM_GROUP.children!.find((group) => group.id.endsWith('/gross-anatomy'))!;
  assert.deepEqual(gross.children?.map((group) => group.label), ['Midbrain', 'Pons', 'Medulla oblongata']);
  const paths = new Map([
    ['Midbrain', 'midbrain'], ['Pons', 'pons'], ['Medulla oblongata', 'medulla-oblongata'],
  ]);
  for (const row of grossRows) {
    const expected = [...root, 'gross-anatomy', paths.get(row[4].replace(/\.[lr]$/, ''))];
    for (const suffix of ['', '_123', '.001_123']) {
      assert.deepEqual(classifyBrainstemObject(row[4] + suffix), expected);
      assert.deepEqual(classifyAdvancedNeuroanatomy(row[4] + suffix), expected);
    }
  }
});

test('all 44 brainstem fiber meshes follow the CSV parent and descendant collections', () => {
  assert.equal(fiberRows.length, 44);
  for (const row of fiberRows) {
    assert.deepEqual(classifyBrainstemObject(row[4]), [...root, 'white-matter', ...fiberCollections.get(row[1])!], row[4]);
    assert.deepEqual(classifyBrainstemObject(row[4] + '_123'), classifyBrainstemObject(row[4]));
    assert.deepEqual(classifyBrainstemObject(row[4] + '.001_123'), classifyBrainstemObject(row[4]));
    assert.equal(classifyAdvancedNeuroanatomy(row[4])?.[1], 'white-matter', 'Keep the existing ascending-fibers menu available');
  }
});

test('unsided spinal-cord meshes do not enter the brainstem fiber collections', () => {
  for (const name of ['Posterior spinocerebellar tract', 'Tectospinal tract', 'Rubrospinal tract']) {
    assert.equal(classifyBrainstemObject(name), null);
    assert.equal(classifyBrainstemObject(name + '_123'), null);
  }
});

test('all 66 represented nuclear meshes fit the seven requested categories and nonempty menu leaves', () => {
  assert.equal(nucleusRows.length, 66);
  const nuclei = BRAINSTEM_GROUP.children!.find((group) => group.id.endsWith('/nuclei'))!;
  assert.deepEqual(nuclei.children?.map((group) => group.id.split('/').at(-1)),
    ['gse', 'sve', 'gve', 'gsa', 'gva-sva', 'ssa', 'other']);
  const paths = new Set<string>();
  for (const row of nucleusRows) {
    const path = classifyBrainstemObject(row[4]);
    assert.ok(path, row[4]);
    assert.deepEqual(path.slice(0, 3), [...root, 'nuclei']);
    assert.deepEqual(classifyBrainstemObject(row[4] + '.001_123'), path, row[4]);
    paths.add(path.join('/'));
  }
  function visit(group: NervousGroup) {
    if (!group.children?.length) assert.ok(paths.has(group.id), `Empty invented nucleus: ${group.label}`);
    group.children?.forEach(visit);
  }
  visit(nuclei);
});

test('combined structures and dataset synonyms are not replaced with invented textbook subdivisions', () => {
  assert.deepEqual(classifyBrainstemObject('Posterior cochlear nucleus.l'), [...root, 'nuclei', 'ssa', 'dorsal-cochlear']);
  assert.deepEqual(classifyBrainstemObject('Anterior cochlear nucleus.r'), [...root, 'nuclei', 'ssa', 'ventral-cochlear']);
  assert.deepEqual(classifyBrainstemObject('Accessory nucleus of oculomotor nerve.l'), [...root, 'nuclei', 'gve', 'edinger-westphal']);
  assert.deepEqual(classifyBrainstemObject('Posterior nucleus of vagus nerve.r'), [...root, 'nuclei', 'gve', 'dorsal-vagus']);
  assert.deepEqual(classifyBrainstemObject('Vestibular nuclei.r'), [...root, 'nuclei', 'ssa', 'vestibular']);
  assert.deepEqual(classifyBrainstemObject('Cuneate nucleus.l.'), [...root, 'nuclei', 'gsa', 'cuneate']);
  for (const missing of [
    'Motor trigeminal nucleus', 'Principal sensory trigeminal nucleus',
    'Gustatory nucleus', 'Superior vestibular nucleus', 'Medial vestibular nucleus',
    'Locus coeruleus', 'Pontine nuclei', 'Raphe nuclei', 'Pedunculopontine nucleus',
    'Cuneiform nucleus', 'Interpeduncular nucleus', 'Interpeduncular fossa.l',
    'Oculomotor nerve (cisternal and cavernous part).r',
    'Vestibular nerve fibers to nuclei.l',
  ]) assert.equal(classifyBrainstemObject(missing), null, missing);
  assert.deepEqual(classifyBrainstemObject('Central tegmental tract (nucleus tractus solitarii).l'), [...root, 'white-matter']);
});

test('brainstem is the third card, below white matter in the two-column menu', () => {
  assert.deepEqual(ADVANCED_NEUROANATOMY_GROUPS.map((group) => group.label),
    ['White matter fibers', 'Basal ganglia and diencephalon', 'Brainstem', 'Spinal cord']);
  assert.equal(ADVANCED_NEUROANATOMY_GROUPS[2], BRAINSTEM_GROUP);
});

test('shared substantia nigra and fibers remain controllable through both old and brainstem branches', () => {
  const nigra: SceneNode = { instanceID: 1, rawName: 'Substantia nigra pars compacta.r', name: 'Nigra', systemId: 'nervous', type: 'MatrixTransform', visible: true };
  assert.equal(advancedNeuroanatomyPathForGroup(nigra, ['advanced-neuroanatomy', 'diencephalon'])?.[1], 'diencephalon');
  assert.equal(advancedNeuroanatomyPathForGroup(nigra, root)?.[1], 'brainstem');
  assert.equal(classifyAdvancedNeuroanatomy('Periaqueductal gray matter')?.[1], 'brainstem');
  assert.notEqual(classifyAdvancedNeuroanatomy('Periaqueductal gray matter')?.[1], 'white-matter');
});

test('brainstem, gross anatomy, and all nuclear categories isolate exact source members without losing restore visibility', () => {
  const nodes: SceneNode[] = allNames.map((rawName, index) => ({
    instanceID: index + 1, rawName, name: rawName, systemId: 'nervous', type: 'MatrixTransform', visible: index % 2 === 0,
  }));
  nodes.push(
    { instanceID: 1000, rawName: 'Thalamus.r', name: 'Thalamus', systemId: 'nervous', type: 'MatrixTransform', visible: true },
    { instanceID: 1001, rawName: 'Arcuate fascicle.l', name: 'Arcuate', systemId: 'nervous', type: 'MatrixTransform', visible: true },
    { instanceID: 1002, rawName: 'Unknown', name: 'Unknown', systemId: 'nervous', type: 'MatrixTransform', visible: true },
    { instanceID: 1003, rawName: 'Artery', name: 'Artery', systemId: 'vascular', type: 'MatrixTransform', visible: true },
  );
  const original = nodes.map((node) => node.visible);
  const counts = [
    [root, 116], [[...root, 'gross-anatomy'], 6],
    [[...root, 'gross-anatomy', 'midbrain'], 2],
    [[...root, 'gross-anatomy', 'pons'], 2],
    [[...root, 'gross-anatomy', 'medulla-oblongata'], 2],
    [[...root, 'white-matter'], 44],
    [[...root, 'white-matter', 'auditory'], 4], [[...root, 'nuclei'], 66],
    [[...root, 'nuclei', 'gse'], 8], [[...root, 'nuclei', 'sve'], 6],
    [[...root, 'nuclei', 'gve'], 8], [[...root, 'nuclei', 'gsa'], 12],
    [[...root, 'nuclei', 'gva-sva'], 2], [[...root, 'nuclei', 'ssa'], 8],
    [[...root, 'nuclei', 'other'], 22],
  ] as const;
  for (const [path, count] of counts) {
    const plan = planRegionIsolation(nodes, 'nervous', path, (node) => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.ok(plan, path.join('/'));
    const countWithContext = count + (['nuclei', 'white-matter'].includes(path[2]) ? 6 : 0);
    assert.equal(plan.show.length, countWithContext, path.join('/'));
    assert.equal(new Set(plan.show).size, countWithContext);
    assert.equal(plan.hide.length, nodes.length - countWithContext);
    assert.ok(plan.hide.includes(1000));
    assert.ok(plan.hide.includes(1001));
    assert.ok(plan.hide.includes(1002), 'Unknown anatomy must not remain in an isolated CNS collection');
    assert.ok(plan.hide.includes(1003), 'Other systems must not remain in an isolated CNS collection');
    assert.deepEqual(nodes.map((node) => node.visible), original);
  }
});

test('every brainstem subcategory and individual nucleus uses its exact path for menus, selection and isolation, including export aliases', () => {
  const nodes: SceneNode[] = allNames.map((rawName, index) => ({
    instanceID: index + 1, rawName, name: rawName, systemId: 'nervous', type: 'MatrixTransform', visible: true,
  }));
  const visit = (group: NervousGroup) => {
    const path = group.id.split('/');
    const members = nodes.filter(node => {
      const classified = classifyBrainstemObject(node.rawName);
      return isBrainstemRetainedContext(node, path)
        || (classified && path.every((part, index) => classified[index] === part));
    });
    assert.ok(members.length, `Empty or incorrect brainstem path: ${group.id}`);
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.deepEqual(new Set(plan.show), new Set(members.map(node => node.instanceID)), group.id);
    for (const node of nodes) {
      for (const rawName of [node.rawName, `${node.rawName}.001_123`]) {
        assert.equal(isNodeInRegion({ ...node, rawName }, path, () => null),
          members.includes(node), `${group.id}: ${rawName}`);
      }
    }
    for (const child of group.children ?? []) visit(child);
  };
  visit(BRAINSTEM_GROUP);
});

test('Showing or isolating any nucleus retains only the six gross surfaces as context, never other nuclei or fibers', () => {
  const names = [...grossRows.map(row => row[4]), 'Nucleus of oculomotor nerve.l',
    'Nucleus of abducens nerve.r', 'Medial lemmniscus arms.l', 'Thalamus.r', 'Unknown anatomy'];
  const nodes: SceneNode[] = names.map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: false,
    systemId: systemForMeshName(rawName),
  }));
  const context = [1, 2, 3, 4, 5, 6];
  const path = [...root, 'nuclei', 'gse', 'oculomotor'];
  assert.deepEqual(brainstemContextIds(nodes, path), context);
  assert.deepEqual(brainstemShowContextIds(nodes, [7]), context);
  assert.deepEqual(brainstemShowContextIds(nodes, [8]), context);
  assert.deepEqual(brainstemShowContextIds(nodes, [9]), context);
  assert.deepEqual(brainstemShowContextIds(nodes, [10, 11]), []);
  assert.deepEqual(brainstemContextIds(nodes, [...root, 'white-matter']), context);
  assert.deepEqual(brainstemContextIds(nodes, ['supratentorial', 'brainstem']), []);
  assert.equal(isBrainstemRetainedContext({ ...nodes[0], systemId: 'vascular' }, path), false);
  const plan = planRegionIsolation(nodes, 'nervous', path, n => advancedNeuroanatomyPathForGroup(n, path))!;
  assert.deepEqual(new Set(plan.show), new Set([...context, 7]));
  assert.deepEqual(plan.hide, [8, 9, 10, 11]);
  assert.ok(context.every(id => isNodeInRegion(nodes[id - 1], path, () => null)));
  assert.ok(context.every(id => advancedNeuroanatomyPathForGroup(nodes[id - 1], path)?.[2] === 'gross-anatomy'),
    'Orientation must not be relabeled as nuclei or appear in nucleus-only Show/Hide membership');
  assert.ok(nodes.every(n => n.visible === false), 'Keep the previous visibility intact for Restore');
});

test('Brainstem white-matter subgroups retain translucent gross orientation without adding nuclei or unrelated tracts', () => {
  const names = [...grossRows.map(row => row[4]), 'Auditory fibers.l', 'Auditory fibers.r',
    'Medial lemmniscus arms.l', 'Nucleus of abducens nerve.r', 'Unknown anatomy', 'Rubrospinal tract'];
  const nodes: SceneNode[] = names.map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
    visible: i % 2 === 0, systemId: systemForMeshName(rawName),
  }));
  const path = [...root, 'white-matter', 'auditory'];
  const context = [1, 2, 3, 4, 5, 6];
  const before = nodes.map(n => n.visible);
  assert.deepEqual(brainstemContextIds(nodes, path), context);
  assert.deepEqual(brainstemShowContextIds(nodes, [7, 8]), context);
  const plan = planRegionIsolation(nodes, 'nervous', path,
    n => advancedNeuroanatomyPathForGroup(n, path))!;
  assert.deepEqual(new Set(plan.show), new Set([...context, 7, 8]));
  assert.deepEqual(plan.hide, [9, 10, 11, 12]);
  for (const n of nodes.slice(0, 6)) {
    assert.ok(isNodeInRegion(n, path, () => null));
    assert.equal(advancedNeuroanatomyPathForGroup(n, path)?.[2], 'gross-anatomy');
  }
  assert.ok(nodes.slice(6).every(n => !isBrainstemRetainedContext(n, path)));
  assert.deepEqual(brainstemContextIds(nodes, ['advanced-neuroanatomy', 'white-matter', 'ascending-brainstem']), [],
    'Do not replace the main White matter atlas whole-brain orientation with a Brainstem-only envelope');
  assert.deepEqual(plan.affected.map(n => n.visible), before);
  assert.deepEqual(nodes.map(n => n.visible), before, 'Keep Restore snapshots unchanged');
});
