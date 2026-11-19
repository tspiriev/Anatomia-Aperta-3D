import test from 'node:test';
import assert from 'node:assert/strict';
import inventory from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { LONG_TRACT_GROUPS, LONG_TRACT_ROOT_PATH, longTractPathForGroup, isLongTractNode,
  longTractMissingComponents, longTractSourceNote } from './longTractTaxonomy';
import { longTractContextIds, longTractMenuGroups } from './longTractTaxonomy';
import { isLongTractExcludedNode } from './longTractTaxonomy';
import { MIDBRAIN_GAZE_ID } from './midbrainGazeDefinition';
import { TRIGEMINAL_MOTOR_NUCLEUS_NAMES } from './trigeminalMotorNucleus';
import { LONG_TRACTS_VIEW, ATLAS_VIEWS, FULL_ANATOMY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

const names = [...new Set([...csvRows(inventory)].filter(row => row[0] === 'OBJECT' && row[5] === 'MESH').map(row => row[4]))];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, name: rawName, rawName, visible: true, type: 'MatrixTransform',
  systemId: systemForMeshName(rawName),
}));
const path = (...parts: string[]) => [...LONG_TRACT_ROOT_PATH, ...parts];
const get = (rawName: string) => { const node = nodes.find(node => node.rawName === rawName); assert.ok(node, rawName); return node; };
function plan(...parts: string[]) {
  const p = path(...parts);
  const result = planRegionIsolation(nodes, 'nervous', p, n => advancedNeuroanatomyPathForGroup(n, p));
  assert.ok(result, parts.join('/'));
  return result;
}
function includes(parts: string[], wanted: string[]) {
  const result = plan(...parts);
  for (const name of wanted) assert.ok(result.show.includes(get(name).instanceID), `${parts.join('/')}: ${name}`);
}

test('Explore Atlas registers the supplied model, five original systems and the new gaze collection, preserving Full anatomy first', () => {
  assert.equal(ATLAS_VIEWS[0], FULL_ANATOMY_VIEW);
  assert.ok(ATLAS_VIEWS.includes(LONG_TRACTS_VIEW));
  assert.equal(LONG_TRACTS_VIEW.modelUid, '5b43a33add0f417384c10677fe117fc6');
  assert.equal(LONG_TRACTS_VIEW.href, '/atlas/long-tracts');
  assert.equal(LONG_TRACTS_VIEW.label, 'Long Tracts and Brainstem–Cerebellar Pathways');
  assert.deepEqual(LONG_TRACT_GROUPS.map(g => g.label), ['Descending motor systems', 'Ascending sensory systems',
    'Cerebellar systems', 'Vestibular and oculomotor systems', 'Brainstem connections',
    'Midbrain Gaze Centers and Tectospinal Pathway']);
  assert.deepEqual(LONG_TRACT_GROUPS.map(g => g.children?.length), [4, 4, 5, 4, 4, 3]);
  for (const group of LONG_TRACT_GROUPS) {
    assert.ok(nodes.some(node => longTractPathForGroup(node, group.id.split('/'))), group.label);
    const serialized = JSON.stringify(group);
    for (const excluded of ['Association fibers', 'Commissural fibers', 'Limbic fibers', 'Thalamocortical radiations', 'Internal capsule'])
      assert.ok(!serialized.includes(excluded), excluded);
  }
});

test('corticospinal arm/trunk/leg and spinal subdivisions show complete available origins, brainstem components and spinal targets', () => {
  for (const child of ['arm', 'trunk', 'leg', 'lateral', 'anterior']) {
    includes(['descending-motor', 'corticospinal', child], ['Precentral gyrus.l', 'Precentral gyrus.r',
      'Base of cerebral peduncle (Midbrain).l', 'Base of cerebral peduncle (Midbrain).r',
      'Pyramid of medulla oblongata.l', 'Pyramid of medulla oblongata.r',
      'Lateral corticospinal tract', 'Anterior corticospinal tract', 'Anterior horn of spinal cord']);
  }
  includes(['descending-motor', 'corticobulbar'], ['Corticospinal tract face.l', 'Corticospinal tract face.r',
    'Motor nucleus of facial nerve.l', 'Nucleus ambiguus.r', 'Nucleus of hypoglossal nerve.l']);
});

test('corticobulbar parent, fibers and motor nuclei include bilateral III, IV and VI nuclei without fading them', () => {
  const ocular = ['Nucleus of oculomotor nerve', 'Nucleus of trochlear nerve', 'Nucleus of abducens nerve']
    .flatMap(name => [`${name}.l`, `${name}.r`]);
  for (const child of [[], ['fibers'], ['motor-nuclei']]) {
    const parts = ['descending-motor', 'corticobulbar', ...child];
    includes(parts, [...ocular, 'Motor nucleus of facial nerve.l', 'Nucleus ambiguus.r', 'Nucleus of hypoglossal nerve.l']);
    const faded = longTractContextIds(nodes, path(...parts));
    for (const name of ocular) assert.ok(!faded.includes(get(name).instanceID), `${name} keeps its source material`);
  }
});

test('corticobulbar includes the creator-confirmed motor nucleus mislabeled as a motor tract, including live aliases', () => {
  for (const name of TRIGEMINAL_MOTOR_NUCLEUS_NAMES) for (const suffix of ['', '.l', '.r', '.l.001_123']) {
    const node: SceneNode = { instanceID: 99999, rawName: `${name}${suffix}`, name: `${name}${suffix}`,
      systemId: null, type: 'MatrixTransform', visible: false };
    for (const leaf of [[], ['fibers'], ['motor-nuclei']]) {
      const p = path('descending-motor', 'corticobulbar', ...leaf);
      assert.ok(longTractPathForGroup(node, p), node.rawName);
      const result = planRegionIsolation([...nodes, node], 'nervous', p,
        n => advancedNeuroanatomyPathForGroup(n, p))!;
      assert.ok(result.show.includes(node.instanceID), node.rawName);
      assert.ok(!longTractMissingComponents([...nodes, node], p).includes('Motor trigeminal nucleus'));
    }
    assert.ok(isNodeAllowedInAtlasView(node, LONG_TRACTS_VIEW));
    assert.equal(longTractPathForGroup(node, path('ascending-sensory', 'trigeminal')), null,
      'sensory trigeminal pathways must not acquire the motor nucleus');
    assert.equal(node.rawName, `${name}${suffix}`);
  }
  assert.equal(longTractPathForGroup(get('Motor root of trigeminal nerve.l'),
    path('descending-motor', 'corticobulbar')), null, 'motor root is not an alias for the nucleus');
});

test('Dorsal Column–Medial Lemniscus includes columns, relay nuclei and sensory cortical connections without unrelated motor radiations', () => {
  includes(['ascending-sensory', 'dorsal-column-medial-lemniscus'], ['Gracile fasciculus', 'Cuneate fasciculus',
    'Gracile nucleus.l', 'Cuneate nucleus.r', 'Medial lemmniscus arms.r', 'Medial lemniscus legs.l',
    '12_Ventral_posterolateral_VPL', '12_Ventral_posterolateral_VPL.l']);
  const shown = plan('ascending-sensory').show;
  for (const name of ['Thalamocortical fibers to VL and VA.l', 'Arcuate fascicle.r'])
    assert.ok(!shown.includes(get(name).instanceID), name);
});

test('ascending body sensory systems retain the three requested spinal gray-matter meshes without fading them', () => {
  const gray = ['Posterior horn of spinal cord', 'Anterior horn of spinal cord', 'Lateral intermediate substance'];
  for (const parts of [
    ['ascending-sensory'],
    ['ascending-sensory', 'dorsal-column-medial-lemniscus', 'gracilis'],
    ['ascending-sensory', 'anterolateral', 'anterior-spinothalamic'],
  ]) {
    includes(parts, gray);
    const faded = longTractContextIds(nodes, path(...parts));
    for (const name of gray) assert.ok(!faded.includes(get(name).instanceID), `${name} retains its source material`);
  }
  const p = ['ascending-sensory', 'context', 'spinal-gray-matter'];
  assert.deepEqual(plan(...p).show.sort((a, b) => a - b),
    gray.map(name => get(name).instanceID).sort((a, b) => a - b));
  for (const [id, name] of [
    ['posterior-horn', gray[0]], ['anterior-horn', gray[1]], ['lateral-intermediate', gray[2]],
  ]) assert.deepEqual(plan(...p, id).show, [get(name).instanceID]);
  assert.equal(longTractPathForGroup(get('Intermediolateral nucleus'), path(...p)), null,
    'lateral intermediate substance is not replaced by the distinct intermediolateral nucleus');
});

test('descending motor pathways share the ascending spinal gray-matter menu and retain all three structures without fading them', () => {
  const gray = ['Posterior horn of spinal cord', 'Anterior horn of spinal cord', 'Lateral intermediate substance'];
  const descending = LONG_TRACT_GROUPS.find(g => g.id.endsWith('/descending-motor'))!;
  const ascending = LONG_TRACT_GROUPS.find(g => g.id.endsWith('/ascending-sensory'))!;
  const grayMenu = (group: typeof descending) => group.children!.find(g => g.id.endsWith('/context'))!
    .children!.find(g => g.id.endsWith('/spinal-gray-matter'))!;
  assert.deepEqual(grayMenu(descending).children!.map(g => g.label), grayMenu(ascending).children!.map(g => g.label));
  for (const parts of [
    ['descending-motor'],
    ['descending-motor', 'corticospinal', 'arm'],
    ['descending-motor', 'extrapyramidal', 'rubrospinal'],
    ['descending-motor', 'extrapyramidal', 'medial-reticulospinal'],
    ['descending-motor', 'extrapyramidal', 'medial-vestibulospinal'],
  ]) {
    includes(parts, gray);
    const faded = longTractContextIds(nodes, path(...parts));
    for (const name of gray) assert.ok(!faded.includes(get(name).instanceID), `${name} retains source material`);
  }
  const p = ['descending-motor', 'context', 'spinal-gray-matter'];
  assert.deepEqual(plan(...p).show.sort((a, b) => a - b),
    gray.map(name => get(name).instanceID).sort((a, b) => a - b));
  for (const [id, name] of [
    ['posterior-horn', gray[0]], ['anterior-horn', gray[1]], ['lateral-intermediate', gray[2]],
  ]) assert.deepEqual(plan(...p, id).show, [get(name).instanceID]);
});

test('corticobulbar views exclude all spinal-cord orientation while preserving brainstem, nuclei and basal-ganglia context', () => {
  const cord = ['White matter of spinal cord', 'Anterior horn of spinal cord',
    'Posterior horn of spinal cord', 'Lateral intermediate substance'];
  for (const leaf of [[], ['fibers'], ['motor-nuclei']]) {
    const parts = ['descending-motor', 'corticobulbar', ...leaf];
    const p = path(...parts);
    const result = plan(...parts);
    const faded = longTractContextIds(nodes, p);
    for (const name of cord) {
      assert.ok(result.hide.includes(get(name).instanceID), `${parts.join('/')}: hide ${name}`);
      assert.ok(!result.show.includes(get(name).instanceID));
      assert.ok(!faded.includes(get(name).instanceID));
      const alias = { ...get(name), rawName: `${name}.001_123` };
      assert.equal(isNodeInRegion(alias, p, () => null), false, alias.rawName);
    }
    includes(parts, ['Midbrain.l', 'Pons.r', 'Medulla oblongata.l',
      'Base of cerebral peduncle (Midbrain).l', 'Corticospinal tract face.r',
      'Nucleus of oculomotor nerve.l', 'Nucleus of trochlear nerve.r', 'Nucleus of abducens nerve.l',
      'Caudate nucleus.l', 'Putamen.r', 'Globus pallidus internus.l', 'Globus pallidus externus.r']);
  }
  for (const parts of [
    ['descending-motor'],
    ['descending-motor', 'corticospinal', 'arm'],
    ['descending-motor', 'extrapyramidal', 'rubrospinal'],
    ['ascending-sensory', 'dorsal-column-medial-lemniscus'],
  ]) includes(parts, cord);
});

test('ascending trigeminal parent and every subview exclude spinal-cord orientation, retaining cranial pathways and sensory targets', () => {
  const group = LONG_TRACT_GROUPS.find(g => g.id.endsWith('/ascending-sensory'))!.children!
    .find(g => g.id.endsWith('/trigeminal'))!;
  const cord = ['White matter of spinal cord', 'Anterior horn of spinal cord',
    'Posterior horn of spinal cord', 'Lateral intermediate substance'];
  for (const leaf of [[], ...group.children!.map(child => [child.id.split('/').at(-1)!])]) {
    const parts = ['ascending-sensory', 'trigeminal', ...leaf];
    const p = path(...parts);
    const result = plan(...parts);
    const faded = longTractContextIds(nodes, p);
    for (const name of cord) {
      assert.ok(result.hide.includes(get(name).instanceID), `${parts.join('/')}: hide ${name}`);
      assert.ok(!result.show.includes(get(name).instanceID));
      assert.ok(!faded.includes(get(name).instanceID));
      const alias = { ...get(name), rawName: `${name}.001_123` };
      assert.equal(isNodeInRegion(alias, p, () => null), false, alias.rawName);
    }
    includes(parts, ['Midbrain.l', 'Pons.r', 'Medulla oblongata.l', 'Thalamus.l', 'Thalamus.r',
      '13_Ventral_posteromedial_VPM', 'Spinal trigeminal tract.l', 'Spinal nucleus of trigeminal nerve.r',
      'Somatosensory tract face.l', 'Somatosensory tract face.r', 'Postcentral gyrus.l', 'Postcentral gyrus.r']);
  }
  for (const parts of [
    ['ascending-sensory'],
    ['ascending-sensory', 'dorsal-column-medial-lemniscus', 'gracilis'],
    ['ascending-sensory', 'anterolateral', 'lateral-spinothalamic'],
    ['descending-motor', 'corticospinal', 'arm'],
  ]) includes(parts, cord);
});

test('descending motor views retain bilateral caudate, putamen and both pallidal segments beside corticospinal fibers', () => {
  const basal = ['Caudate nucleus', 'Putamen', 'Globus pallidus externus', 'Globus pallidus internus']
    .flatMap(name => [`${name}.l`, `${name}.r`]);
  for (const parts of [
    ['descending-motor'],
    ['descending-motor', 'corticospinal'],
    ...['arm', 'trunk', 'leg', 'lateral', 'anterior'].map(child => ['descending-motor', 'corticospinal', child]),
    ['descending-motor', 'corticobulbar', 'fibers'],
    ['descending-motor', 'extrapyramidal', 'rubrospinal'],
  ]) {
    includes(parts, basal);
    const faded = longTractContextIds(nodes, path(...parts));
    for (const name of basal) assert.ok(!faded.includes(get(name).instanceID), `${name}: original material`);
  }
  const p = ['descending-motor', 'context', 'basal-ganglia'];
  assert.deepEqual(plan(...p).show.sort((a, b) => a - b),
    basal.map(name => get(name).instanceID).sort((a, b) => a - b));
  for (const [id, prefix] of [['caudate', 'Caudate nucleus'], ['putamen', 'Putamen'], ['globus-pallidus', 'Globus pallidus']]) {
    assert.deepEqual(plan(...p, id).show.sort((a, b) => a - b),
      basal.filter(name => name.startsWith(prefix)).map(name => get(name).instanceID).sort((a, b) => a - b));
  }
  const scope = path('descending-motor', 'corticospinal', 'arm');
  for (const name of basal) {
    const alias = { ...get(name), instanceID: 99999, rawName: `${name}.001_123`, systemId: null };
    const result = planRegionIsolation([alias, ...nodes], 'nervous', scope,
      node => advancedNeuroanatomyPathForGroup(node, scope))!;
    assert.ok(result.show.includes(alias.instanceID), alias.rawName);
  }
  for (const other of ['ascending-sensory', 'cerebellar', 'vestibular-oculomotor', 'brainstem-connections'])
    for (const name of basal) assert.ok(!plan(other).show.includes(get(name).instanceID), `${other}: ${name}`);
  for (const name of ['Caudate to putamen.l', 'Caudate to putamen.r'])
    assert.equal(longTractPathForGroup(get(name), path(...p)), null);
});

test('descending motor views fade bilateral peduncular bases while leaving fibers and basal ganglia on source materials', () => {
  const bases = ['Base of cerebral peduncle (Midbrain).l', 'Base of cerebral peduncle (Midbrain).r'];
  for (const parts of [
    ['descending-motor'],
    ...['arm', 'trunk', 'leg', 'lateral', 'anterior'].map(child => ['descending-motor', 'corticospinal', child]),
    ['descending-motor', 'corticobulbar', 'fibers'],
    ['descending-motor', 'corticobulbar', 'motor-nuclei'],
  ]) {
    includes(parts, bases);
    const faded = longTractContextIds(nodes, path(...parts));
    for (const name of bases) assert.ok(faded.includes(get(name).instanceID), `${parts.join('/')}: ${name}`);
    for (const name of ['Caudate nucleus.l', 'Putamen.r', 'Globus pallidus internus.l', 'Globus pallidus externus.r',
      'Lateral corticospinal tract', 'Corticospinal tract arm.l', 'Nucleus of oculomotor nerve.l'])
      assert.ok(!faded.includes(get(name).instanceID), `${name}: original material`);
  }
  const initial = longTractContextIds(nodes, LONG_TRACT_ROOT_PATH);
  for (const name of bases) assert.ok(initial.includes(get(name).instanceID));
  for (const other of ['ascending-sensory', 'cerebellar', 'vestibular-oculomotor', 'brainstem-connections', MIDBRAIN_GAZE_ID])
    for (const name of bases) assert.ok(!longTractContextIds(nodes, path(other)).includes(get(name).instanceID));
});

test('extrapyramidal has six expandable nucleus-and-tract pathways using all available brainstem and spinal meshes', () => {
  const parent = LONG_TRACT_GROUPS.find(g => g.id.endsWith('/descending-motor'))!.children!
    .find(g => g.id.endsWith('/extrapyramidal'))!;
  assert.deepEqual(parent.children!.map(g => g.label), ['Rubrospinal', 'Tectospinal', 'Medial Reticulospinal',
    'Lateral Reticulospinal', 'Medial Vestibulospinal', 'Lateral Vestibulospinal']);
  assert.deepEqual(parent.children!.map(g => g.children!.length), [2, 2, 3, 3, 3, 2]);
  const mlf = names.filter(name => name.startsWith('Medial longitudinal fascicle'));
  const expected: Record<string, string[]> = {
    rubrospinal: ['Red nucleus.l', 'Red nucleus.r', 'Rubrospiinal tract.l', 'Rubrospinal tract.r', 'Rubrospinal tract'],
    tectospinal: ['Superior colliculus.l', 'Superior colliculus.r', 'Tectospinal tract.l', 'Tectospinal tract.r', 'Tectospinal tract'],
    'medial-reticulospinal': ['Reticular formation brainstem', 'Medial (pontine) reticulospinal tract.l',
      'Medial (pontine) reticulospinal tract.r', 'Medial reticulospinal tract'],
    'lateral-reticulospinal': ['Reticular formation brainstem', 'Lateral (medullary) reticulospinal tract.l',
      'Lateral (medullary) reticulospinal tract.r', 'Lateral reticulospinal tract'],
    'medial-vestibulospinal': ['Vestibular nuclei.l', 'Vestibular nuclei.r', 'Medial vestibulospinal tract', ...mlf],
    'lateral-vestibulospinal': ['Vestibular nuclei.l', 'Vestibular nuclei.r', 'Lateral vestiibulospinal tract.l',
      'Lateral vestiibulospinal tract.r', 'Lateral vestibulospinal tract'],
  };
  for (const group of parent.children!) {
    const id = group.id.split('/').at(-1)!;
    const parts = ['descending-motor', 'extrapyramidal', id];
    for (const sub of [[], ...group.children!.map(child => [child.id.split('/').at(-1)!])]) {
      includes([...parts, ...sub], [...expected[id], 'Midbrain.l', 'Pons.r', 'Medulla oblongata.l',
        'White matter of spinal cord', 'Anterior horn of spinal cord', 'Posterior horn of spinal cord',
        'Lateral intermediate substance', 'Caudate nucleus.l', 'Putamen.r', 'Globus pallidus internus.l']);
      const faded = longTractContextIds(nodes, path(...parts, ...sub));
      for (const name of expected[id]) assert.equal(faded.includes(get(name).instanceID),
        name === 'Reticular formation brainstem', `${id}: ${name}`);
    }
    if (id !== 'tectospinal') for (const side of ['l', 'r'])
      assert.ok(plan(...parts).hide.includes(get(`Superior colliculus.${side}`).instanceID));
  }
  for (const side of ['l', 'r']) {
    const colliculus = get(`Superior colliculus.${side}`);
    assert.ok(plan('descending-motor', 'extrapyramidal').show.includes(colliculus.instanceID));
    assert.ok(plan('descending-motor', 'corticospinal', 'arm').hide.includes(colliculus.instanceID));
    assert.ok(plan('descending-motor', 'corticobulbar').hide.includes(colliculus.instanceID));
  }
});

test('spinocerebellar has three expandable pathways with available origins, peduncles and intermediate gray context', () => {
  const parent = LONG_TRACT_GROUPS.find(g => g.id.endsWith('/cerebellar'))!.children!
    .find(g => g.id.endsWith('/spinocerebellar'))!;
  assert.deepEqual(parent.children!.map(g => g.label),
    ['Posterior Spinocerebellar', 'Anterior Spinocerebellar', 'Cuneocerebellar']);
  assert.deepEqual(parent.children!.map(g => g.children!.length), [4, 4, 3]);
  const expected: Record<string, string[]> = {
    posterior: ["Dorsal nucleus Clarke's nucleus", 'Posterior spinocerebellar tract',
      'Posterior spinocerebellar tract.l', 'Posterior spinocerebellar tract.r'],
    anterior: ['Anterior spinocerebellar tract', 'Anterior spinocerebellar tract (Gowers).l',
      'Anterior spinocerebellar tract (Gowers).r', 'Superior cerebellar peduncle.l',
      'Superior cerebellar peduncle.r', 'Lateral intermediate substance'],
    cuneocerebellar: ['Accessory Cuneate nucleus.l.', 'Accessory Cuneate nucleus.r'],
  };
  for (const group of parent.children!) {
    const id = group.id.split('/').at(-1)!;
    includes(['cerebellar', 'spinocerebellar', id], [...expected[id], 'Thalamus.l', 'Thalamus.r',
      'Midbrain.l', 'Pons.r', 'Medulla oblongata.l', 'White matter of spinal cord']);
    for (const child of [group, ...group.children!]) {
      const p = child.id.split('/');
      const faded = longTractContextIds(nodes, p);
      for (const name of expected[id]) assert.ok(!faded.includes(get(name).instanceID), name);
    }
  }
  const p = path('cerebellar', 'spinocerebellar', 'anterior');
  assert.equal(isNodeInRegion(get('Intermediolateral nucleus'), p, () => null), false);
  assert.deepEqual(longTractMissingComponents(nodes, path('cerebellar', 'spinocerebellar', 'cuneocerebellar')), []);
});

test('posterior and anterior spinocerebellar spinal and brainstem entries preserve source segment distinctions and aliases', () => {
  for (const [id, spinal, brainstem] of [
    ['posterior', 'Posterior spinocerebellar tract', 'Posterior spinocerebellar tract'],
    ['anterior', 'Anterior spinocerebellar tract', 'Anterior spinocerebellar tract (Gowers)'],
  ]) {
    const spinalPath = path('cerebellar', 'spinocerebellar', id, 'spinal-cord');
    const brainPath = path('cerebellar', 'spinocerebellar', id, 'brainstem');
    for (const suffix of ['', '.001_123']) {
      const node = { ...get(spinal), rawName: `${spinal}${suffix}` };
      assert.ok(longTractPathForGroup(node, spinalPath));
      assert.equal(longTractPathForGroup(node, brainPath), null);
    }
    for (const side of ['l', 'r']) for (const suffix of ['', '.001_123']) {
      const node = { ...get(`${brainstem}.${side}`), rawName: `${brainstem}.${side}${suffix}` };
      assert.ok(longTractPathForGroup(node, brainPath));
      assert.equal(longTractPathForGroup(node, spinalPath), null);
    }
    const associated = id === 'posterior' ? ["Dorsal nucleus Clarke's nucleus"]
      : ['Superior cerebellar peduncle.l', 'Superior cerebellar peduncle.r', 'Lateral intermediate substance'];
    for (const branch of ['spinal-cord', 'brainstem'])
      includes(['cerebellar', 'spinocerebellar', id, branch], associated);
  }
});

test('optional cerebellar components appear only when their own live meshes exist, not when related pathway meshes exist', () => {
  const spinocerebellarMenu = (scene: SceneNode[]) => longTractMenuGroups(scene)
    .find(g => g.id.endsWith('/cerebellar'))!.children!.find(g => g.id.endsWith('/spinocerebellar'))!;
  const menu = spinocerebellarMenu(nodes);
  assert.deepEqual(menu.children!.map(g => g.children!.length), [3, 4, 1]);
  const future: SceneNode[] = ['Inferior cerebellar peduncle.l.001_123', 'Cuneocerebellar fibers.r']
    .map((rawName, i) => ({ instanceID: 99991 + i, name: rawName, rawName, type: 'MatrixTransform',
      systemId: 'nervous', visible: true }));
  assert.deepEqual(spinocerebellarMenu([...nodes, ...future]).children!.map(g => g.children!.length), [4, 4, 3]);
  for (const [id, rawName] of [
    ['posterior', future[0].rawName], ['cuneocerebellar', future[0].rawName], ['cuneocerebellar', future[1].rawName],
  ]) {
    const node = future.find(node => node.rawName === rawName)!;
    assert.ok(isNodeInRegion(node, path('cerebellar', 'spinocerebellar', id), () => null));
    assert.deepEqual(longTractContextIds([node], path('cerebellar', 'spinocerebellar', id)), []);
  }
  const wrongSystem = future.map(node => ({ ...node, systemId: 'skeletal' as const }));
  assert.deepEqual(spinocerebellarMenu([...nodes, ...wrongSystem]).children!.map(g => g.children!.length), [3, 4, 1]);
});

test('cerebellar pontocerebellar pathway includes bilateral temporopontine fibers with source spelling and corrected aliases', () => {
  const temporal = ['Temporoponne fibers.l', 'Temporoponne fibers.r'];
  for (const parts of [
    ['cerebellar'], ['cerebellar', 'afferents'], ['cerebellar', 'afferents', 'pontocerebellar'],
  ]) {
    includes(parts, [...temporal, 'Pontocerebellar fibers.l', 'Pontocerebellar fibers.r',
      'Fronto pontine fibers.l', 'Fronto pontine fibers.r', 'Occipitopontine fibers.l', 'Occipitopontine fibers.r',
      'Parietopontine fibers.l', 'Parietopontine fibers.r',
      'Thalamus.l', 'Thalamus.r']);
    const p = path(...parts);
    const faded = longTractContextIds(nodes, p);
    for (const name of temporal) {
      assert.ok(isNodeAllowedInAtlasView(get(name), LONG_TRACTS_VIEW));
      assert.ok(!faded.includes(get(name).instanceID), 'fibers retain source materials');
    }
    for (const spelling of ['Temporoponne fibers', 'Temporopontine fibers', 'Temporo-pontine fibers', 'Temporo pontine fibers']) {
      for (const side of ['l', 'r']) {
        const alias = { ...get(`Temporoponne fibers.${side}`), rawName: `${spelling}.${side}.001_123` };
        assert.ok(isNodeInRegion(alias, p, () => null), alias.rawName);
        assert.deepEqual(longTractContextIds([alias], p), []);
      }
    }
  }
  for (const parts of [
    ['cerebellar', 'efferents'], ['cerebellar', 'guillain-mollaret'],
    ['descending-motor'], ['ascending-sensory'], ['vestibular-oculomotor'], ['brainstem-connections'], [MIDBRAIN_GAZE_ID],
  ]) for (const name of temporal) assert.ok(plan(...parts).hide.includes(get(name).instanceID));
});

test('cerebellar system and all pathways retain bilateral translucent thalamic surfaces without fading nuclei or fibers', () => {
  const group = LONG_TRACT_GROUPS.find(g => g.id.endsWith('/cerebellar'))!;
  const visit = (entry: typeof group) => {
    const parts = entry.id.split('/').slice(2);
    const p = path(...parts);
    includes(parts, ['Thalamus.l', 'Thalamus.r']);
    const faded = longTractContextIds(nodes, p);
    for (const side of ['l', 'r']) {
      assert.ok(faded.includes(get(`Thalamus.${side}`).instanceID), `${entry.label}: ${side}`);
      const alias = { ...get(`Thalamus.${side}`), rawName: `Thalamus.${side}.001_123` };
      assert.ok(isNodeInRegion(alias, p, () => null));
      assert.deepEqual(longTractContextIds([alias], p), [alias.instanceID]);
    }
    assert.ok(!faded.includes(get('11_Ventral_lateral_VL').instanceID));
    for (const child of entry.children ?? []) {
      if (!child.id.endsWith('/context')) visit(child);
    }
  };
  visit(group);
  includes(['cerebellar', 'efferents', 'dentatorubrothalamic'], ['11_Ventral_lateral_VL']);
  assert.deepEqual(plan('cerebellar', 'context', 'thalamus').show.sort((a, b) => a - b),
    ['Thalamus.l', 'Thalamus.r'].map(name => get(name).instanceID).sort((a, b) => a - b));
  for (const other of ['descending-motor', 'vestibular-oculomotor', MIDBRAIN_GAZE_ID]) {
    for (const side of ['l', 'r'])
      assert.ok(!plan(other).show.includes(get(`Thalamus.${side}`).instanceID), other);
  }
});

test('ascending body and face pathways show corresponding somatosensory fibers and postcentral gyri inside faded thalamic orientation', () => {
  const body = ['Somatosensory tract arm', 'Somatosensory tract trunk', 'Somatosensory tract legs']
    .flatMap(name => [`${name}.l`, `${name}.r`]);
  const face = ['Somatosensory tract face.l', 'Somatosensory tract face.r'];
  const cortex = ['Postcentral gyrus.l', 'Postcentral gyrus.r'];
  for (const [parts, fibers, relay, excluded] of [
    [['ascending-sensory', 'dorsal-column-medial-lemniscus'], body, '12_Ventral_posterolateral_VPL', face],
    [['ascending-sensory', 'dorsal-column-medial-lemniscus', 'gracilis'], body, '12_Ventral_posterolateral_VPL', face],
    [['ascending-sensory', 'anterolateral', 'anterior-spinothalamic'], body, '12_Ventral_posterolateral_VPL', face],
    [['ascending-sensory', 'anterolateral', 'lateral-spinothalamic'], body, '12_Ventral_posterolateral_VPL', face],
    [['ascending-sensory', 'trigeminal'], face, '13_Ventral_posteromedial_VPM', body],
    [['ascending-sensory', 'trigeminal', 'lemniscus'], face, '13_Ventral_posteromedial_VPM', body],
  ] as [string[], string[], string, string[]][]) {
    includes(parts, [...fibers, ...cortex, relay, 'Thalamus.l', 'Thalamus.r']);
    const shown = plan(...parts).show;
    const faded = longTractContextIds(nodes, path(...parts));
    for (const shell of ['Thalamus.l', 'Thalamus.r']) assert.ok(faded.includes(get(shell).instanceID));
    for (const name of [...fibers, ...cortex, relay]) assert.ok(!faded.includes(get(name).instanceID), `${name}: source material`);
    for (const name of excluded) assert.ok(!shown.includes(get(name).instanceID), `${parts.join('/')}: excludes ${name}`);
  }
  includes(['ascending-sensory'], [...body, ...face, ...cortex, 'Thalamus.l', 'Thalamus.r']);
  for (const group of ['dorsal-column-medial-lemniscus', 'anterolateral', 'trigeminal']) {
    for (const leaf of ['somatosensory-fibers', 'postcentral-gyrus'])
      includes(['ascending-sensory', group, leaf], [...(group === 'trigeminal' ? face : body), ...cortex]);
  }
  for (const leaf of ['spinoreticular', 'spinotectal']) {
    const shown = plan('ascending-sensory', 'anterolateral', leaf).show;
    for (const name of [...body, ...face, ...cortex]) assert.ok(!shown.includes(get(name).instanceID));
  }
  assert.deepEqual(plan('ascending-sensory', 'context', 'thalamus').show.sort((a, b) => a - b),
    ['Thalamus.l', 'Thalamus.r'].map(name => get(name).instanceID).sort((a, b) => a - b));
});

test('Guillain–Mollaret includes both crossed loops and the complete available source connections', () => {
  includes(['cerebellar', 'guillain-mollaret'], ['Dentate_nucleus.l', 'Dentate_nucleus.r',
    'Red nucleus.l', 'Red nucleus.r', 'Olive.l', 'Olive.r',
    'Dentatorubrothalamic tract.l', 'Dentatorubrothalamic tract.r',
    'Central tegmental tract (Guillain-Mollaet Triangle).l', 'Central tegmental tract (Guillain-Mollaet Triangle).r',
    'Olivodentate fibers (Guillain-Mollaet Triangle).l', 'Olivodentate fibers (Guillain-Mollaet Triangle).r',
    'Olivocerebellar (Climbing fibers).l', 'Olivocerebellar (Climbing fibers).r']);
  assert.match(longTractSourceNote(path('cerebellar', 'guillain-mollaret')), /contralateral/);
});

test('overlapping vestibulospinal, oculomotor and tegmental memberships remain available in each relevant system', () => {
  const v = get('Lateral vestiibulospinal tract.r');
  for (const p of [path('descending-motor', 'extrapyramidal', 'lateral-vestibulospinal'),
    path('vestibular-oculomotor', 'vestibulospinal', 'lateral')]) assert.ok(longTractPathForGroup(v, p));
  includes(['vestibular-oculomotor', 'vestibulo-ocular'], ['Vestibular nuclei.l', 'Nucleus of oculomotor nerve.r',
    'Nucleus of trochlear nerve.l', 'Nucleus of abducens nerve.r',
    'Medial longitudinal fascicle - Fibers to abducens nerve.l']);
  const t = get('Central tegmental tract (Guillain-Mollaet Triangle).r');
  for (const p of [path('cerebellar', 'guillain-mollaret'), path('brainstem-connections', 'central-tegmental')])
    assert.ok(longTractPathForGroup(t, p));
});

test('all requested leaves are browsable and export omissions are disclosed instead of inventing meshes', () => {
  const visit = (groups: typeof LONG_TRACT_GROUPS): number => groups.reduce((count, g) => g.children
    ? count + visit(g.children) : count + 1, 0);
  assert.equal(visit(LONG_TRACT_GROUPS), 135);
  for (const [parts, missing] of [
    [['ascending-sensory', 'dorsal-column-medial-lemniscus'], 'Internal arcuate fibers'],
    [['ascending-sensory', 'anterolateral', 'spinoreticular'], 'Spinoreticular'],
    [['cerebellar', 'efferents', 'fastigioreticular'], 'Fastigioreticular'],
    [['brainstem-connections', 'reticular', 'raphe-spinal'], 'Raphe-spinal'],
    [['descending-motor', 'corticospinal'], 'Pyramidal decussation'],
  ] as const) assert.ok(longTractMissingComponents(nodes, path(...parts)).includes(missing), missing);
  assert.deepEqual(longTractMissingComponents(nodes, path('cerebellar', 'guillain-mollaret')), []);
  includes(['cerebellar', 'efferents', 'interpositorubral'], ['Nucleus_emboliformis.l', 'Nucleus_globosus.r',
    'Interpositothalamic tract.r', 'Red nucleus.l']);
  assert.match(longTractSourceNote(path('cerebellar', 'efferents', 'interpositorubral')), /whole exported/);
});

test('strict isolation hides unrelated and unidentified geometry, accepts exact live aliases, and never renames source nodes', () => {
  const original = JSON.stringify(nodes);
  const p = path('descending-motor', 'extrapyramidal', 'rubrospinal');
  const unclassified: SceneNode = { instanceID: 99999, rawName: 'Rubrospiinal tract.l.001_123', name: 'source untouched',
    systemId: null, type: 'MatrixTransform', visible: true };
  assert.ok(longTractPathForGroup(unclassified, p));
  const result = planRegionIsolation([...nodes, unclassified], 'nervous', p,
    node => advancedNeuroanatomyPathForGroup(node, p))!;
  assert.ok(result.show.includes(unclassified.instanceID));
  for (const name of ['Femoral nerve.l', 'Arcuate fascicle.l', 'Anterior commissure',
    'Thalamocortical fibers to VL and VA.r']) {
    const node = nodes.find(n => n.rawName === name);
    if (node) { assert.equal(isLongTractNode(node), false, name); assert.ok(result.hide.includes(node.instanceID)); }
  }
  for (const node of nodes) assert.equal(isNodeAllowedInAtlasView(node, LONG_TRACTS_VIEW), isLongTractNode(node));
  assert.equal(JSON.stringify(nodes), original);
});

test('brainstem solitary-tegmental views include bilateral thalamus, VPM and face somatosensory fibers without altering other pathway memberships', () => {
  const foreground = ['Nucleus of solitary tract.l', 'Nucleus of solitary tract.r',
    'Central tegmental tract (nucleus tractus solitarii).l', 'Central tegmental tract (nucleus tractus solitarii).r',
    '13_Ventral_posteromedial_VPM', '13_Ventral_posteromedial_VPM.l',
    'Somatosensory tract face.l', 'Somatosensory tract face.r'];
  for (const parts of [
    ['brainstem-connections'], ['brainstem-connections', 'central-tegmental'],
    ['brainstem-connections', 'central-tegmental', 'tract'],
    ['brainstem-connections', 'central-tegmental', 'vpm'],
    ['brainstem-connections', 'central-tegmental', 'somatosensory-face'],
    ['brainstem-connections', 'other', 'available-fibers'],
  ]) {
    includes(parts, [...foreground, 'Thalamus.l', 'Thalamus.r', 'Midbrain.l', 'Pons.r', 'Medulla oblongata.l']);
    const p = path(...parts);
    const faded = longTractContextIds(nodes, p);
    for (const side of ['l', 'r']) assert.ok(faded.includes(get(`Thalamus.${side}`).instanceID));
    for (const name of foreground) {
      assert.ok(!faded.includes(get(name).instanceID), `${name} keeps source material`);
      const alias = { ...get(name), rawName: `${name}.001_123` };
      assert.ok(isNodeInRegion(alias, p, () => null), alias.rawName);
    }
  }
  for (const parts of [
    ['brainstem-connections', 'central-tegmental', 'rubro-olivary'],
    ['brainstem-connections', 'reticular'], ['brainstem-connections', 'other', 'tectobulbar'],
  ]) {
    includes(parts, ['Thalamus.l', 'Thalamus.r']);
    for (const name of foreground) assert.ok(plan(...parts).hide.includes(get(name).instanceID), name);
  }
  const menu = longTractMenuGroups(nodes).find(g => g.id.endsWith('/brainstem-connections'))!;
  assert.ok(!menu.children!.some(child => child.id.endsWith('/context')));
});

test('vestibular and oculomotor systems retain source-material spinal gray matter throughout their pathways without a gross-anatomy menu', () => {
  const gray = ['Posterior horn of spinal cord', 'Anterior horn of spinal cord', 'Lateral intermediate substance'];
  const group = LONG_TRACT_GROUPS.find(g => g.id.endsWith('/vestibular-oculomotor'))!;
  const visit = (entry: typeof group) => {
    const p = entry.id.split('/');
    includes(p.slice(2), [...gray, 'White matter of spinal cord']);
    const faded = longTractContextIds(nodes, p);
    assert.ok(faded.includes(get('White matter of spinal cord').instanceID));
    for (const name of gray) {
      assert.ok(!faded.includes(get(name).instanceID), `${entry.label}: ${name} keeps source material`);
      const alias = { ...get(name), rawName: `${name}.001_123` };
      assert.ok(isNodeInRegion(alias, p, () => null), alias.rawName);
    }
    assert.ok(!plan(...p.slice(2)).show.includes(get('Intermediolateral nucleus').instanceID));
    for (const child of entry.children ?? []) if (!child.id.endsWith('/context')) visit(child);
  };
  visit(group);
  assert.ok(!longTractMenuGroups(nodes).find(g => g.id === group.id)!.children!
    .some(child => child.id.endsWith('/context')));
});

test('vestibular views include the complete exported MLF, internuclear fibers and medial vestibulospinal tract with retained brainstem context', () => {
  const mlfNames = names.filter(name => name.startsWith('Medial longitudinal fascicle'));
  assert.equal(mlfNames.length, 11, 'whole bilateral fascicles, internuclear mesh and eight target fibers');
  const brainstem = ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r', 'Medulla oblongata.l', 'Medulla oblongata.r'];
  const context = [...brainstem, 'White matter of spinal cord'];
  for (const parts of [
    ['vestibular-oculomotor'],
    ['vestibular-oculomotor', 'medial-longitudinal-fasciculus'],
    ['vestibular-oculomotor', 'medial-longitudinal-fasciculus', 'descending'],
    ['vestibular-oculomotor', 'vestibulo-ocular'],
  ]) {
    includes(parts, [...mlfNames, 'Medial vestibulospinal tract', ...context]);
    const faded = longTractContextIds(nodes, path(...parts));
    assert.deepEqual(faded.sort((a, b) => a - b), context.map(n => get(n).instanceID).sort((a, b) => a - b));
    for (const nerve of [...mlfNames, 'Medial vestibulospinal tract', 'Vestibular nuclei.l', 'Nucleus of abducens nerve.r'])
      assert.ok(!faded.includes(get(nerve).instanceID), `${nerve} must retain its source material`);
  }
  includes(['vestibular-oculomotor', 'vestibulospinal', 'medial'], ['Medial vestibulospinal tract', ...brainstem]);
  const isolated = plan('vestibular-oculomotor', 'context', 'pons');
  assert.deepEqual(isolated.show.sort((a, b) => a - b),
    ['Pons.l', 'Pons.r'].map(n => get(n).instanceID).sort((a, b) => a - b));
  for (const other of ['descending-motor', 'ascending-sensory', 'cerebellar', 'brainstem-connections']) {
    const faded = longTractContextIds(nodes, path(other));
    for (const mesh of context) {
      assert.ok(plan(other).show.includes(get(mesh).instanceID), `${other}: ${mesh}`);
      assert.ok(faded.includes(get(mesh).instanceID), `${other} fades ${mesh}`);
    }
  }
});

test('long-tract systems retain orientation and restrict superior colliculi to descending tectospinal and gaze memberships', () => {
  const backgrounds = ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r',
    'Medulla oblongata.l', 'Medulla oblongata.r', 'White matter of spinal cord'];
  for (const group of LONG_TRACT_GROUPS.filter(g => !g.id.endsWith(`/${MIDBRAIN_GAZE_ID}`))) {
    const section = group.id.split('/')[2];
    const p = path(section);
    const result = plan(section);
    const faded = longTractContextIds(nodes, p);
    for (const name of backgrounds) {
      assert.ok(result.show.includes(get(name).instanceID), `${section}: ${name}`);
      assert.ok(faded.includes(get(name).instanceID), `${section} fades ${name}`);
    }
    const reticular = get('Reticular formation brainstem');
    assert.equal(faded.includes(reticular.instanceID), result.show.includes(reticular.instanceID));
    for (const side of ['l', 'r']) {
      const colliculus = get(`Superior colliculus.${side}`);
      const tectospinalIncluded = section === 'descending-motor';
      assert.equal(longTractPathForGroup(colliculus, p) !== null, tectospinalIncluded);
      assert.equal(isNodeAllowedInAtlasView(colliculus, LONG_TRACTS_VIEW), true, 'available in the new gaze collection');
      assert.equal(result.show.includes(colliculus.instanceID), tectospinalIncluded);
      const alias = { ...colliculus, rawName: `${colliculus.rawName}.001_123` };
      assert.equal(longTractPathForGroup(alias, p) !== null, tectospinalIncluded);
      assert.equal(isLongTractExcludedNode(alias, section), !tectospinalIncluded);
    }
    const firstPathway = group.children!.find(child => !child.id.endsWith('/context'))!;
    const sub = firstPathway.children?.[0] ?? firstPathway;
    const isolated = plan(...sub.id.split('/').slice(2));
    for (const name of backgrounds) assert.ok(isolated.show.includes(get(name).instanceID), `${sub.label}: ${name}`);
    const whiteOnly = plan(section, 'context', 'spinal-white-matter');
    assert.deepEqual(whiteOnly.show, [get('White matter of spinal cord').instanceID]);
  }
});

test('MLF and gaze centers share bilateral vestibular nuclei on source materials without adding them to tectospinal', () => {
  for (const parts of [
    [MIDBRAIN_GAZE_ID], [MIDBRAIN_GAZE_ID, 'medial-longitudinal-fasciculus'],
    [MIDBRAIN_GAZE_ID, 'medial-longitudinal-fasciculus', 'vestibular-nuclei'],
    [MIDBRAIN_GAZE_ID, 'gaze-centers'],
    [MIDBRAIN_GAZE_ID, 'gaze-centers', 'vestibular-nuclei'],
  ]) {
    includes(parts, ['Vestibular nuclei.l', 'Vestibular nuclei.r']);
    const p = path(...parts);
    const faded = longTractContextIds(nodes, p);
    for (const side of ['l', 'r']) {
      const node = get(`Vestibular nuclei.${side}`);
      assert.ok(!faded.includes(node.instanceID));
      const alias = { ...node, rawName: `${node.rawName}.001_123` };
      assert.ok(isNodeInRegion(alias, p, () => null));
      assert.deepEqual(longTractContextIds([alias], p), []);
    }
  }
  for (const submenu of ['tectospinal-pathway'])
    for (const side of ['l', 'r'])
      assert.ok(plan(MIDBRAIN_GAZE_ID, submenu).hide.includes(get(`Vestibular nuclei.${side}`).instanceID));
});

test('gaze collection has the three reorganized menus and all fourteen entries use cross-collection source meshes', () => {
  const group = LONG_TRACT_GROUPS.find(g => g.id.endsWith(`/${MIDBRAIN_GAZE_ID}`))!;
  assert.deepEqual(group.children!.map(g => g.label),
    ['Medial Longitudinal Fasciculus', 'Midbrain Gaze Centers', 'Tectospinal System']);
  assert.deepEqual(group.children!.map(g => g.children!.length), [6, 5, 3]);
  assert.deepEqual(group.children!.map(g => g.children!.map(entry => entry.label)), [
    ['Medial longitudinal fasciculus (MLF)', 'Vestibular nuclei', 'Oculomotor nucleus (III)',
      'Trochlear nucleus (IV)', 'Abducens nucleus (VI)', 'MLF internuclear connections'],
    ['Interstitial nucleus of Cajal', 'Nucleus of Darkschewitsch', 'Superior colliculus',
      'Periaqueductal gray (associated midbrain structure)', 'Vestibular nuclei'],
    ['Superior colliculus', 'Tectospinal tract (brainstem)', 'Tectospinal tract (spinal cord)'],
  ]);
  const centers = ['Superior colliculus', 'Interstitial nucleus of Cajal', 'Nucleus of Darkschewitsch',
    'Nucleus of oculomotor nerve', 'Nucleus of trochlear nerve', 'Nucleus of abducens nerve', 'Vestibular nuclei']
    .flatMap(name => [`${name}.l`, `${name}.r`]);
  const mlf = names.filter(name => name.startsWith('Medial longitudinal fascicle'));
  const orientation = ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r', 'Medulla oblongata.l',
    'Medulla oblongata.r', 'White matter of spinal cord', 'Anterior horn of spinal cord', 'Posterior horn of spinal cord',
    'Intermediomedial nucleus', 'Intermediolateral nucleus'];
  const expected = [...centers, ...mlf, 'Periaqueductal gray matter',
    'Tectospinal tract.l', 'Tectospinal tract.r', 'Tectospinal tract', ...orientation];
  assert.deepEqual(plan(MIDBRAIN_GAZE_ID).show.sort((a, b) => a - b),
    expected.map(name => get(name).instanceID).sort((a, b) => a - b));
  for (const submenu of group.children!) for (const entry of submenu.children!) {
    const p = entry.id.split('/');
    assert.ok(nodes.some(node => longTractPathForGroup(node, p)), entry.label);
    const isolated = plan(...p.slice(2));
    for (const name of orientation) assert.ok(isolated.show.includes(get(name).instanceID), `${entry.label}: ${name}`);
    const faded = longTractContextIds(nodes, p);
    assert.deepEqual(faded.sort((a, b) => a - b),
      orientation.slice(0, 7).map(name => get(name).instanceID).sort((a, b) => a - b));
  }
  for (const side of ['l', 'r']) {
    const node = get(`Superior colliculus.${side}`);
    assert.equal(isLongTractExcludedNode(node, MIDBRAIN_GAZE_ID), false);
    for (const submenu of ['gaze-centers', 'tectospinal-pathway'])
      assert.ok(longTractPathForGroup(node, path(MIDBRAIN_GAZE_ID, submenu, 'superior-colliculus')));
  }
});

test('all gaze collection pathways retain intermediomedial and intermediolateral spinal gray matter without fading or a separate menu', () => {
  const group = LONG_TRACT_GROUPS.find(g => g.id.endsWith(`/${MIDBRAIN_GAZE_ID}`))!;
  const gray = ['Intermediomedial nucleus', 'Intermediolateral nucleus'];
  const visit = (entry: typeof group) => {
    const p = entry.id.split('/');
    includes(p.slice(2), gray);
    const faded = longTractContextIds(nodes, p);
    for (const name of gray) {
      assert.ok(!faded.includes(get(name).instanceID));
      const alias = { ...get(name), rawName: `${name}.001_123` };
      assert.ok(isNodeInRegion(alias, p, () => null), alias.rawName);
    }
    assert.ok(plan(...p.slice(2)).hide.includes(get('Lateral intermediate substance').instanceID),
      'do not substitute lateral intermediate substance for the intermediolateral nucleus');
    for (const child of entry.children ?? []) visit(child);
  };
  visit(group);
  assert.equal(longTractMenuGroups(nodes).find(g => g.id === group.id)!.children!.length, 3);
  for (const section of ['descending-motor', 'ascending-sensory', 'cerebellar', 'vestibular-oculomotor', 'brainstem-connections'])
    for (const name of gray) assert.ok(plan(section).hide.includes(get(name).instanceID), `${section}: ${name}`);
});

test('reorganized gaze submenu memberships preserve all MLF fibers, move cranial nuclei and scope periaqueductal gray correctly', () => {
  const mlf = names.filter(name => name.startsWith('Medial longitudinal fascicle'));
  const nuclei = ['Vestibular nuclei', 'Nucleus of oculomotor nerve', 'Nucleus of trochlear nerve', 'Nucleus of abducens nerve']
    .flatMap(name => [`${name}.l`, `${name}.r`]);
  includes([MIDBRAIN_GAZE_ID, 'medial-longitudinal-fasciculus'], [...mlf, ...nuclei]);
  includes([MIDBRAIN_GAZE_ID, 'medial-longitudinal-fasciculus', 'whole'], mlf);
  includes([MIDBRAIN_GAZE_ID, 'gaze-centers'], ['Interstitial nucleus of Cajal.l',
    'Interstitial nucleus of Cajal.r', 'Nucleus of Darkschewitsch.l', 'Nucleus of Darkschewitsch.r',
    'Superior colliculus.l', 'Superior colliculus.r', 'Periaqueductal gray matter']);
  for (const submenu of ['gaze-centers', 'tectospinal-pathway']) {
    const result = plan(MIDBRAIN_GAZE_ID, submenu);
    for (const name of nuclei) {
      if (submenu === 'gaze-centers' && name.startsWith('Vestibular nuclei'))
        assert.ok(result.show.includes(get(name).instanceID));
      else assert.ok(result.hide.includes(get(name).instanceID), `${submenu}: ${name}`);
    }
  }
  const p = path(MIDBRAIN_GAZE_ID, 'gaze-centers', 'periaqueductal-gray');
  for (const rawName of ['Periaqueductal gray matter', 'Periaqueductal gray', 'Periaqueductal gray matter.001_123']) {
    const alias = { ...get('Periaqueductal gray matter'), rawName };
    assert.ok(isNodeInRegion(alias, p, () => null));
    assert.deepEqual(longTractContextIds([alias], p), [], 'PAG retains source material');
  }
  for (const submenu of ['medial-longitudinal-fasciculus', 'tectospinal-pathway'])
    assert.ok(plan(MIDBRAIN_GAZE_ID, submenu).hide.includes(get('Periaqueductal gray matter').instanceID));
});

test('gaze tectospinal brainstem left/right and whole spinal-cord meshes remain distinct, including duplicate aliases', () => {
  const brainstem = path(MIDBRAIN_GAZE_ID, 'tectospinal-pathway', 'brainstem');
  const spinal = path(MIDBRAIN_GAZE_ID, 'tectospinal-pathway', 'spinal-cord');
  for (const suffix of ['', '.001_123']) {
    for (const side of ['l', 'r']) {
      const node = { ...get(`Tectospinal tract.${side}`), rawName: `Tectospinal tract.${side}${suffix}` };
      assert.ok(longTractPathForGroup(node, brainstem));
      assert.equal(longTractPathForGroup(node, spinal), null);
    }
    const node = { ...get('Tectospinal tract'), rawName: `Tectospinal tract${suffix}` };
    assert.ok(longTractPathForGroup(node, spinal));
    assert.equal(longTractPathForGroup(node, brainstem), null);
  }
  for (const branch of ['brainstem', 'spinal-cord']) {
    const isolated = plan(MIDBRAIN_GAZE_ID, 'tectospinal-pathway', branch);
    const tracts = ['Tectospinal tract', 'Tectospinal tract.l', 'Tectospinal tract.r']
      .filter(name => isolated.show.includes(get(name).instanceID));
    assert.deepEqual(tracts, branch === 'brainstem'
      ? ['Tectospinal tract.l', 'Tectospinal tract.r'] : ['Tectospinal tract']);
    for (const side of ['l', 'r']) assert.ok(isolated.show.includes(get(`Superior colliculus.${side}`).instanceID));
  }
});
