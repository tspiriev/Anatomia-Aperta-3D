import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import {
  TEMPORAL_ASSOCIATION_ROOT_PATH as ROOT, TEMPORAL_ASSOCIATION_GROUPS,
  temporalAssociationPathForGroup as pathFor, temporalAssociationMissingComponents,
  isTemporalBrainContext, temporalAssociationContextIds, TEMPORAL_BRAIN_CONTEXT_NAME,
  isTemporalBrainstemContext,
} from './temporalAssociationTaxonomy';
import { TEMPORAL_ASSOCIATION_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import { basalWholeBrainDisplay, expandWholeBrainIds } from '../lib/basalWholeBrain';
import gross from './brainGrossAnatomyMemberships.json';
import fibers from './advancedFiberMemberships.json';

const node = (rawName: string, instanceID = 1) => ({
  rawName, name: rawName, instanceID, visible: true, type: 'MatrixTransform', systemId: 'nervous',
}) as SceneNode;
const path = (...parts: string[]) => [...ROOT, ...parts];
const matches = (name: string, ...parts: string[]) => pathFor(node(name), path(...parts)) !== null;

test('requested section and association subgroup order is preserved', () => {
  assert.deepEqual(TEMPORAL_ASSOCIATION_GROUPS.map(g => g.label), ['Temporal Stem', 'Sagittal Stratum', 'Association Fibers', 'Temporal lobe']);
  assert.equal(TEMPORAL_ASSOCIATION_GROUPS[0].children?.length, 9);
  assert.deepEqual(TEMPORAL_ASSOCIATION_GROUPS[2].children?.map(g => g.label), [
    'Superior Longitudinal System', 'Inferior Association System', 'Frontal Association', 'Limbic Association',
    TEMPORAL_BRAIN_CONTEXT_NAME,
  ]);
  assert.equal(TEMPORAL_ASSOCIATION_VIEW.modelUid, '79c954faa6284383902122319ecc136a');
});

test('temporal stem contains the six requested independently selectable fiber systems', () => {
  const names = [
    'Uncinate fascicle.l', 'Inferor FrontoOccipital Fascicle (IFOF).r',
    'Anterior commissure (temporal component)', "Meyer's loop.l", 'Auditory fibers.r', 'Temporoponne fibers.l',
  ];
  for (let i = 0; i < names.length; i++) {
    const child = TEMPORAL_ASSOCIATION_GROUPS[0].children![i];
    assert.ok(pathFor(node(names[i]), child.id.split('/')), names[i]);
    assert.ok(matches(names[i], 'temporal-stem'));
  }
});

test('sagittal stratum separates adjacent ILF from principal components and excludes unrelated systems', () => {
  for (const name of ['Inferor FrontoOccipital Fascicle (IFOF).l', 'Optic radiation.r', 'Pulvinar fibers.l']) {
    assert.ok(matches(name, 'sagittal-stratum', 'principal-components'));
  }
  const ilf = 'Inferior Longitudinal Fascicle (ILF).l';
  assert.ok(matches(ilf, 'sagittal-stratum', 'adjacent-pathway', 'ilf'));
  assert.equal(matches(ilf, 'sagittal-stratum', 'principal-components'), false);
  for (const name of ['Auditory fibers.l', 'Temporoponne fibers.r', 'Anterior commissure', 'Anterior commissure (temporal component)']) {
    assert.equal(matches(name, 'sagittal-stratum'), false, name);
  }
});

test('association systems retain source aliases, numbering and overlapping memberships', () => {
  for (const [name, group, leaf] of [
    ['Superior longitudinal fascicle (SLF) I.l', 'superior-longitudinal', 'slf1'],
    ['Superior longitudinal fiascicle (SLF) II.r', 'superior-longitudinal', 'slf2'],
    ['Superior longitudinal fascicle III.l', 'superior-longitudinal', 'slf3'],
    ['Arcuate fascicle.r', 'superior-longitudinal', 'arcuate'],
    ['Inferor FrontoOccipital Fascicle (IFOF).l', 'inferior-association', 'ifof'],
    ['Inferior Longitudinal Fascicle (ILF).r', 'inferior-association', 'ilf'],
    ['Middle longitudinal fasciculus.l', 'inferior-association', 'middleLongitudinal'],
    ['Uncinate fascicle.r', 'inferior-association', 'uncinate'],
    ['Frontal aslant tract.l', 'frontal-association', 'frontalAslant'],
    ['Cingulum fibers.r', 'limbic-association', 'cingulum'],
  ]) assert.ok(matches(name, 'association-fibers', group, leaf), name);
  assert.equal(matches('Superior longitudinal fiascicle (SLF) II.l', 'association-fibers', 'superior-longitudinal', 'slf1'), false);
  assert.ok(matches('Inferor FrontoOccipital Fascicle (IFOF).l', 'temporal-stem', 'ifof'));
  assert.ok(matches('Inferor FrontoOccipital Fascicle (IFOF).l', 'sagittal-stratum', 'principal-components', 'ifof'));
});

test('optic radiation is included in the temporal Meyer’s loop entry without segmenting source geometry', () => {
  assert.equal(matches('Anterior commissure', 'temporal-stem', 'temporalCommissure'), false);
  assert.ok(matches('Optic radiation.l', 'temporal-stem', 'temporalOptic'));
  assert.ok(matches('Optic radiation.r', 'temporal-stem', 'temporalOptic'));
  assert.ok(matches('Optic radiation.l', 'sagittal-stratum', 'principal-components', 'optic'));
  const missing = temporalAssociationMissingComponents([node('Optic radiation.l')], path('temporal-stem'));
  assert.equal(missing.includes('Optic radiation — temporal component (Meyer’s loop)'), false);
  assert.equal(isNodeAllowedInAtlasView(node('Medial longitudinal fascicle.l'), TEMPORAL_ASSOCIATION_VIEW), false);
});

test('shared isolation hides out-of-collection geometry and supports whole groups and individual fibers', () => {
  const nodes = [
    node('Uncinate fascicle.l', 1), node('Auditory fibers.r', 2),
    node('Optic radiation.l', 3), node('Inferior Longitudinal Fascicle (ILF).r', 4),
    node('Unassigned surface', 5),
  ];
  const isolated = planRegionIsolation(nodes, 'nervous', path('temporal-stem'), n =>
    advancedNeuroanatomyPathForGroup(n, path('temporal-stem')))!;
  assert.deepEqual(new Set(isolated.show), new Set([1, 2, 3]));
  assert.deepEqual(new Set(isolated.hide), new Set([4, 5]));
  const single = planRegionIsolation(nodes, 'nervous', path('temporal-stem', 'uncinate'), n =>
    advancedNeuroanatomyPathForGroup(n, path('temporal-stem', 'uncinate')))!;
  assert.deepEqual(single.show, [1]);
  const sagittal = planRegionIsolation(nodes, 'nervous', path('sagittal-stratum'), n =>
    advancedNeuroanatomyPathForGroup(n, path('sagittal-stratum')))!;
  assert.deepEqual(new Set(sagittal.show), new Set([3, 4]));
});

test('supratentorial context is retained with temporal fibers, excluding brainstem, cerebellum and fibers', () => {
  const nodes = [
    node(gross.frontal[0], 1), node(gross.temporal[0], 2),
    node(gross.pons[0], 3), node(gross['cerebellar-hemispheres'][0], 4),
    node('Uncinate fascicle.l', 5), node('Optic radiation.r', 6),
  ];
  assert.deepEqual(nodes.filter(isTemporalBrainContext).map(n => n.instanceID), [1, 2]);
  assert.deepEqual(temporalAssociationContextIds(nodes, path('temporal-stem', 'uncinate')), [1, 2]);
  assert.deepEqual(temporalAssociationContextIds(nodes, path('sagittal-stratum')), [1, 2]);
  const requested = path('temporal-stem', 'uncinate');
  const isolated = planRegionIsolation(nodes, 'nervous', requested, n => pathFor(n, requested))!;
  assert.deepEqual(new Set(isolated.show), new Set([1, 2, 5]));
  assert.deepEqual(new Set(isolated.hide), new Set([3, 4, 6]));
});

test('brain is one selectable display item and every member expands to the whole visibility group', () => {
  const nodes = [node(gross.frontal[0], 1), node(gross.temporal[0], 2), node('Optic radiation.r', 3)];
  const grouped = basalWholeBrainDisplay(nodes, true, isTemporalBrainContext, TEMPORAL_BRAIN_CONTEXT_NAME, TEMPORAL_BRAIN_CONTEXT_NAME);
  assert.deepEqual(grouped.memberIds, [1, 2]);
  assert.equal(grouped.nodes.filter(isTemporalBrainContext).length, 1);
  assert.equal(grouped.nodes.at(-1)!.name, TEMPORAL_BRAIN_CONTEXT_NAME);
  assert.ok(pathFor(grouped.nodes.at(-1)!, path('temporal-stem', 'supratentorialBrain')));
  assert.deepEqual(expandWholeBrainIds([grouped.representativeId!], grouped.memberIds), [1, 2]);
  assert.deepEqual(expandWholeBrainIds([2], grouped.memberIds), [1, 2]);
  const hidden = basalWholeBrainDisplay(nodes.map(n => ({ ...n, visible: n.instanceID === 3 })),
    true, isTemporalBrainContext, TEMPORAL_BRAIN_CONTEXT_NAME, TEMPORAL_BRAIN_CONTEXT_NAME);
  assert.equal(hidden.nodes.at(-1)!.visible, false);
});

test('Sagittal Stratum keeps one translucent whole-brain context with its groups and individual fibers', () => {
  const nodes = [
    node(gross.frontal[0], 1), node(gross.temporal[0], 2),
    node('Optic radiation.l', 3), node('Inferior Longitudinal Fascicle (ILF).r', 4),
    node(gross.pons[0], 5), node(gross['cerebellar-hemispheres'][0], 6),
    node('Auditory fibers.r', 7),
  ];
  assert.ok(TEMPORAL_ASSOCIATION_GROUPS[1].children!.some(g => g.label === TEMPORAL_BRAIN_CONTEXT_NAME));
  for (const [requested, expected] of [
    [path('sagittal-stratum'), [1, 2, 3, 4]],
    [path('sagittal-stratum', 'principal-components', 'optic'), [1, 2, 3]],
    [path('sagittal-stratum', 'adjacent-pathway', 'ilf'), [1, 2, 4]],
  ] as const) {
    const isolated = planRegionIsolation(nodes, 'nervous', requested, n => pathFor(n, requested))!;
    assert.deepEqual(new Set(isolated.show), new Set(expected));
    assert.deepEqual(temporalAssociationContextIds(nodes, requested), [1, 2]);
  }
  const grouped = basalWholeBrainDisplay(nodes, true, isTemporalBrainContext, TEMPORAL_BRAIN_CONTEXT_NAME, TEMPORAL_BRAIN_CONTEXT_NAME);
  assert.deepEqual(grouped.memberIds, [1, 2]);
  assert.equal(grouped.nodes.filter(isTemporalBrainContext).length, 1);
  assert.ok(pathFor(grouped.nodes.at(-1)!, path('sagittal-stratum', 'supratentorialBrain')));
  assert.deepEqual(expandWholeBrainIds([grouped.representativeId!], grouped.memberIds), [1, 2]);
  assert.deepEqual(temporalAssociationContextIds(nodes, path('association-fibers')), [1, 2]);
});

test('Association Fibers retains one semitransparent whole brain across every system and individual tract', () => {
  const nodes = [
    node(gross.frontal[0], 1), node(gross.temporal[0], 2),
    node('Superior longitudinal fascicle (SLF) I.l', 3),
    node('Inferior Longitudinal Fascicle (ILF).r', 4),
    node('Frontal aslant tract.l', 5), node('Cingulum fibers.r', 6),
    node(gross.pons[0], 7), node(gross['cerebellar-hemispheres'][0], 8),
    node('Auditory fibers.r', 9),
  ];
  for (const [parts, expected] of [
    [[], [1, 2, 3, 4, 5, 6]],
    [['superior-longitudinal'], [1, 2, 3]],
    [['superior-longitudinal', 'slf1'], [1, 2, 3]],
    [['inferior-association', 'ilf'], [1, 2, 4]],
    [['frontal-association', 'frontalAslant'], [1, 2, 5]],
    [['limbic-association', 'cingulum'], [1, 2, 6]],
  ] as const) {
    const requested = path('association-fibers', ...parts);
    const isolated = planRegionIsolation(nodes, 'nervous', requested, n => pathFor(n, requested))!;
    assert.deepEqual(new Set(isolated.show), new Set(expected));
    assert.deepEqual(temporalAssociationContextIds(nodes, requested), [1, 2]);
  }
  const grouped = basalWholeBrainDisplay(nodes, true, isTemporalBrainContext, TEMPORAL_BRAIN_CONTEXT_NAME, TEMPORAL_BRAIN_CONTEXT_NAME);
  assert.deepEqual(grouped.memberIds, [1, 2]);
  assert.equal(grouped.nodes.filter(isTemporalBrainContext).length, 1);
  assert.ok(pathFor(grouped.nodes.at(-1)!, path('association-fibers', 'supratentorialBrain')));
  assert.deepEqual(expandWholeBrainIds([grouped.representativeId!], grouped.memberIds), [1, 2]);
});

test('Temporal lobe includes the complete requested fiber list, amygdala, ventricles and basal ganglia', () => {
  const fibersAndStructures = [
    'Inferor FrontoOccipital Fascicle (IFOF).l', 'Inferior Longitudinal Fascicle (ILF).r',
    'Uncinate fascicle.l', 'Optic radiation.r', 'Anterior commissure', 'Amygdaloid body.l',
    'Cingulum fibers.r', 'Middle longitudinal fasciculus.l', 'Auditory fibers.r',
    'Temporoponne fibers.l', 'Pulvinar fibers.r',
    'Lateral ventricle.l', 'Lateral ventricle.r', 'Third ventricle',
    'Aqueduct of midbrain', 'Fourth ventricle',
    'Caudate nucleus.l', 'Putamen.r', 'Globus pallidus externus.l', 'Globus pallidus internus.r',
    'Nucleus accumbens.l', 'Subthalamic nucleus.r', 'Substantia nigra pars compacta.l',
    'Substantia nigra pars reticularis..r',
  ];
  for (const name of fibersAndStructures) {
    assert.ok(matches(name, 'temporal-lobe'), name);
    assert.ok(isNodeAllowedInAtlasView(node(name), TEMPORAL_ASSOCIATION_VIEW), name);
  }
  for (const name of ['Medial longitudinal fascicle.l', 'Left ventricle', 'Caudate to putamen.l']) {
    assert.equal(matches(name, 'temporal-lobe'), false, name);
  }
  assert.equal(matches('Anterior commissure', 'temporal-stem', 'temporalCommissure'), false);
  assert.equal(matches('Amygdaloid body.l', 'sagittal-stratum'), false);
});

test('Temporal lobe has independently selectable fibers, ventricles and basal ganglia', () => {
  const collection = TEMPORAL_ASSOCIATION_GROUPS[3];
  const labels = collection.children!.map(g => g.label);
  assert.equal(new Set(labels).size, labels.length, 'Do not duplicate the repeated ILF request');
  assert.ok(labels.includes('Middle longitudinal fasciculus'));
  assert.ok(labels.includes('Ventricles'));
  assert.ok(labels.includes('Basal ganglia'));
  assert.ok(matches('Lateral ventricle.l', 'temporal-lobe', 'ventricles', 'lateralVentricles'));
  assert.ok(matches('Putamen.r', 'temporal-lobe', 'basal-ganglia', 'putamen'));
  assert.equal(matches('Optic radiation.l', 'temporal-lobe', 'basal-ganglia'), false);
});

test('Temporal Stem and Sagittal Stratum include the same independently selectable ventricles and basal ganglia as Temporal lobe', () => {
  const structures = [
    ['Lateral ventricle.l', 'ventricles', 'lateralVentricles'],
    ['Third ventricle', 'ventricles', 'thirdVentricle'],
    ['Aqueduct of midbrain', 'ventricles', 'aqueduct'],
    ['Fourth ventricle', 'ventricles', 'fourthVentricle'],
    ['Caudate nucleus.l', 'basal-ganglia', 'caudate'],
    ['Putamen.r', 'basal-ganglia', 'putamen'],
    ['Globus pallidus externus.l', 'basal-ganglia', 'externalPallidum'],
    ['Globus pallidus internus.r', 'basal-ganglia', 'internalPallidum'],
    ['Nucleus accumbens.l', 'basal-ganglia', 'accumbens'],
    ['Subthalamic nucleus.r', 'basal-ganglia', 'subthalamic'],
    ['Substantia nigra pars compacta.l', 'basal-ganglia', 'substantiaNigra'],
  ];
  const nodes = [
    ...structures.map(([name], i) => node(name, i + 1)),
    node(gross.frontal[0], 100), node(gross.pons[0], 101),
    node(gross['cerebellar-hemispheres'][0], 102), node('Left ventricle', 103),
    node('Optic radiation.l', 104),
  ];
  for (const section of ['temporal-stem', 'sagittal-stratum']) {
    const collection = TEMPORAL_ASSOCIATION_GROUPS.find(g => g.id === path(section).join('/'))!;
    assert.ok(collection.children!.some(g => g.label === 'Ventricles'));
    assert.ok(collection.children!.some(g => g.label === 'Basal ganglia'));
    for (const [name, group, leafId] of structures) {
      assert.ok(matches(name, section, group, leafId), `${section}/${name}`);
      assert.equal(matches(name, 'sagittal-stratum', 'principal-components'), false);
      assert.equal(matches(name, 'association-fibers'), false);
    }
    const requested = path(section);
    const isolated = planRegionIsolation(nodes, 'nervous', requested, n => pathFor(n, requested))!;
    assert.deepEqual(new Set(isolated.show), new Set([...structures.map((_, i) => i + 1), 100, 104]));
    assert.deepEqual(new Set(isolated.hide), new Set([101, 102, 103]));
    assert.deepEqual(temporalAssociationContextIds(nodes, requested), [100], 'Only the brain is made transparent');
    for (const group of ['ventricles', 'basal-ganglia']) {
      const groupedPath = path(section, group);
      const grouped = planRegionIsolation(nodes, 'nervous', groupedPath, n => pathFor(n, groupedPath))!;
      const expectedIds = structures.flatMap(([, kind], i) => kind === group ? [i + 1] : []);
      assert.deepEqual(new Set(grouped.show), new Set([...expectedIds, 100]));
    }
  }
});

test('Temporal lobe recognizes both source-export middle longitudinal fascicles despite the source spelling', () => {
  const names = fibers.association.filter(name => name.startsWith('Middle longitudianl fascicle.'));
  assert.equal(names.length, 2);
  const nodes = names.map((name, i) => node(name, i + 1));
  const requested = path('temporal-lobe', 'middleLongitudinal');
  for (const name of names) {
    assert.ok(matches(name, 'temporal-lobe', 'middleLongitudinal'), name);
    assert.ok(matches(name, 'association-fibers', 'inferior-association', 'middleLongitudinal'), name);
    assert.ok(isNodeAllowedInAtlasView(node(name), TEMPORAL_ASSOCIATION_VIEW), name);
  }
  assert.deepEqual(temporalAssociationMissingComponents(nodes, requested), []);
  const isolated = planRegionIsolation([...nodes, node('Medial longitudinal fascicle.l', 3)],
    'nervous', requested, n => pathFor(n, requested))!;
  assert.deepEqual(isolated.show, [1, 2]);
  assert.deepEqual(isolated.hide, [3]);
});

test('Temporal lobe preserves the grouped translucent brain during whole-collection and individual selection', () => {
  const nodes = [
    node(gross.frontal[0], 1), node(gross.temporal[0], 2), node('Optic radiation.l', 3),
    node('Amygdaloid body.r', 4), node('Lateral ventricle.l', 5), node('Putamen.r', 6),
    node('Medial longitudinal fascicle.l', 7), node(gross.pons[0], 8),
    node(gross['cerebellar-hemispheres'][0], 9),
  ];
  const requested = path('temporal-lobe');
  const isolated = planRegionIsolation(nodes, 'nervous', requested, n => pathFor(n, requested))!;
  assert.deepEqual(new Set(isolated.show), new Set([1, 2, 3, 4, 5, 6, 8]));
  assert.deepEqual(new Set(isolated.hide), new Set([7, 9]));
  assert.deepEqual(temporalAssociationContextIds(nodes, requested), [1, 2, 8], 'Only cerebral surfaces and gross brainstem fade');
  const optic = path('temporal-lobe', 'optic');
  const single = planRegionIsolation(nodes, 'nervous', optic, n => pathFor(n, optic))!;
  assert.deepEqual(new Set(single.show), new Set([1, 2, 3, 8]));
  const grouped = basalWholeBrainDisplay(nodes, true, isTemporalBrainContext, TEMPORAL_BRAIN_CONTEXT_NAME, TEMPORAL_BRAIN_CONTEXT_NAME);
  assert.equal(grouped.nodes.filter(isTemporalBrainContext).length, 1);
  assert.ok(pathFor(grouped.nodes.at(-1)!, path('temporal-lobe', 'supratentorialBrain')));
  assert.deepEqual(expandWholeBrainIds([grouped.representativeId!], grouped.memberIds), [1, 2]);
});

test('Temporal lobe retains semitransparent gross midbrain, pons and medulla, without fading nuclei or adding cerebellum', () => {
  const nodes = [
    node(gross.midbrain[0], 1), node(gross.pons[0], 2), node(gross['medulla-oblongata'][0], 3),
    node('Nucleus of oculomotor nerve.l', 4), node('Temporoponne fibers.r', 5),
    node(gross['cerebellar-hemispheres'][0], 6),
  ];
  assert.deepEqual(nodes.filter(isTemporalBrainstemContext).map(n => n.instanceID), [1, 2, 3]);
  assert.deepEqual(temporalAssociationContextIds(nodes, path('temporal-lobe')), [1, 2, 3]);
  assert.deepEqual(temporalAssociationContextIds(nodes, path('temporal-stem')), []);
  for (const surface of nodes.slice(0, 3)) {
    assert.ok(pathFor(surface, path('temporal-lobe', 'brainstemGross')));
    assert.equal(matches(surface.rawName, 'temporal-stem'), false);
    assert.equal(matches(surface.rawName, 'sagittal-stratum'), false);
  }
  const requested = path('temporal-lobe', 'temporopontine');
  const isolated = planRegionIsolation(nodes, 'nervous', requested, n => pathFor(n, requested))!;
  assert.deepEqual(new Set(isolated.show), new Set([1, 2, 3, 5]));
  assert.deepEqual(new Set(isolated.hide), new Set([4, 6]));
});
