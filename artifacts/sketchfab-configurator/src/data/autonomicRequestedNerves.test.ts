import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AUTONOMIC_GROUPS, AUTONOMIC_ROOT_PATH, AUTONOMIC_SOURCE_OBJECTS,
  autonomicPathForGroup, autonomicContextIds, autonomicForegroundIds } from './autonomicTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import { collectionVisibilityCommands } from '../lib/collectionVisibility';
import skeletalCsv from '@assets/Skeletal_system_and_muscle_attachments_1792221386788.csv?raw';
import cardiovascularCsv from '@assets/Cardiovascular_system_final_1790945714118.csv?raw';
import type { SceneNode } from '../types/sketchfab';

const path = (...parts: string[]) => [...AUTONOMIC_ROOT_PATH, ...parts];
const sympathetic = path('sympathetic');
const cervical = path('sympathetic', 'cervical');
const head = path('head-neck');
const plexuses = path('plexuses');
const object = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: rawName, systemId: systemForMeshName(rawName),
  type: 'MatrixTransform', visible: true,
});
const requestedHead = [
  'Communicating branch of  nasociliary nerve to cilliary ganglion.r',
  'Superior cervical cardiac sympathetic nerve',
  'Superior cervical cardiac sympathetic nerve right',
  'Right superior cervical cardiac sympathetic nerve',
  'Superior cervical cardiac sympathetic nerve (right)',
  'Superior cervical cardiac sympathetic nerve.r ',
  'middle cervical cardiac sympathetic nerve.l',
  'inferior cervical cardiac sympathetic nerve.r',
];
const cervicalRoots = [1, 2, 3, 4].map(level => `C${level} anterior root.r`);
const trunkRoots = [
  ...Array.from({ length: 12 }, (_, i) => [`T${i + 1}`, `Th${i + 1}`]).flat(),
  ...Array.from({ length: 5 }, (_, i) => `L${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `S${i + 1}`),
].flatMap(level => ['anterior root', 'posterior root', 'root'].flatMap(part =>
  ['l', 'r'].map(side => `${level} ${part}.${side}`)));
const communicatingRami = ['albi', 'grisei'].flatMap(kind =>
  ['', ' thoracic region', ' lumbar region', ' sacral region'].flatMap(region =>
    ['l', 'r'].map(side => `Rami communicantes ${kind}${region}.${side}`)));
const intercostals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  .flatMap((roman, i) => ['l', 'r'].flatMap(side =>
    [`Intercostal nerve ${roman}.${side}`, `Intercostal nerve ${i + 1}.${side}`]));

function assertOpaqueMember(rawName: string, scope: readonly string[]) {
  for (const suffix of ['', '_123', '.001', '.001_123']) {
    const node = object(rawName + suffix);
    assert.equal(node.systemId, 'nervous', node.rawName);
    assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), node.rawName);
    assert.ok(isNodeInRegion(node, scope, () => null), node.rawName);
    assert.ok(autonomicPathForGroup(node, scope), node.rawName);
    assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID], node.rawName);
    assert.deepEqual(autonomicContextIds([node], scope), [], node.rawName);
    const plan = planRegionIsolation([node, object('Femur.r', 2)], 'nervous', scope,
      item => autonomicPathForGroup(item, scope))!;
    assert.deepEqual(plan.show, [node.instanceID], node.rawName);
    assert.ok(plan.hide.includes(2), node.rawName);
    assert.equal(node.rawName, rawName + suffix, 'never rename source geometry');
  }
}

test('new nasociliary and cervical cardiac sympathetic meshes enter whole sympathetic, cervical and head/neck views', () => {
  for (const name of requestedHead) for (const scope of [sympathetic, cervical, head])
    assertOpaqueMember(name, scope);
  assertOpaqueMember(requestedHead[0], path('head-neck', 'ocular'));
  for (const stem of ['Superior', 'Middle', 'Inferior']) for (const side of ['l', 'r'])
    for (const scope of [sympathetic, cervical, head])
      assertOpaqueMember(`${stem} cervical cardiac sympathetic nerve.${side}`, scope);
});

test('C1–C4 anterior roots enter head/neck while retaining sympathetic cervical membership', () => {
  for (const name of cervicalRoots) for (const scope of [head, sympathetic, cervical])
    assertOpaqueMember(name, scope);
});

test('the actual right superior cervical cardiac nerve and live side-name variants are opaque members even when initially hidden', () => {
  const csvName = AUTONOMIC_SOURCE_OBJECTS.find(row =>
    row.object_name.trim() === 'Superior cervical cardiac sympathetic nerve.r')?.object_name;
  assert.ok(csvName, 'The right nerve is present in the creator’s CSV, under the vagus export collection');
  const scopes = [AUTONOMIC_ROOT_PATH, sympathetic, cervical, head, plexuses, path('plexuses', 'cardiac')];
  for (const name of [csvName, 'Superior cervical cardiac sympathetic nerve (Right)',
    'Superior cervical cardiac sympathetic nerve [right]',
    'Superior cervical cardiac sympathetic nerve.right',
    'Right superior cervical cardiac sympathetic nerve']) {
    for (const scope of scopes) {
      assertOpaqueMember(name, scope);
      const nerve = { ...object(name), visible: false };
      const plan = planRegionIsolation([nerve, object('Femur.r', 2)], 'nervous', scope,
        n => autonomicPathForGroup(n, scope))!;
      assert.deepEqual(plan.show, [nerve.instanceID]);
      assert.equal(plan.affected.find(n => n.instanceID === nerve.instanceID)?.visible, false,
        'Restore preserves the actual previous hidden state');
    }
  }
  for (const name of ['Superior cervical cardiac parasympathetic nerve (right)',
    'Superior cervical cardiac sympathetic nerve muscle (right)'])
    assert.equal(autonomicPathForGroup(object(name), sympathetic), null, name);
});

test('an explicit Show for the right cardiac nerve restores hidden ancestors and geometry without enabling sibling nerves', () => {
  // Menu state can be visible while Sketchfab's transform/geometry is hidden.
  const panel = { ...object('Superior cervical cardiac sympathetic nerve.r ', 3), visible: true };
  const raw = {
    root: { instanceID: 1, children: [2], visible: false },
    vagusExport: { instanceID: 2, children: [{ instanceID: 3 }, { instanceID: 5 }], visible: false },
    cardiacNerve: { instanceID: 3, children: [{ instanceID: 4 }], visible: false },
    geometry: { instanceID: 4, children: [], visible: false },
    sibling: { instanceID: 5, children: [6], visible: false },
    siblingGeometry: { instanceID: 6, children: [], visible: false },
  };
  const parents = new Map([[2, 1], [3, 2], [4, 3], [5, 2], [6, 5]]);
  const commands = collectionVisibilityCommands([panel.instanceID], raw, parents, new Set([3, 5]));
  assert.deepEqual(commands, [1, 2, 3, 4]);
  assert.ok(!commands.includes(5) && !commands.includes(6));
});

test('Thoracic sympathetic includes the source lumbar vertebrae around the right least splanchnic nerve without moving either side', () => {
  const lumbarNames = [...new Set(skeletalCsv.split(/\r?\n/).filter(line => line.startsWith('OBJECT,'))
    .map(line => line.split(',')[4]).filter(name => /^Vertebra L[1-5]$/.test(name)))].sort();
  assert.deepEqual(lumbarNames, ['Vertebra L1', 'Vertebra L2', 'Vertebra L3', 'Vertebra L4', 'Vertebra L5']);
  const rightName = AUTONOMIC_SOURCE_OBJECTS.find(row => row.object_name.trim() === 'Least splanchnic nerve.r')?.object_name;
  const leftName = AUTONOMIC_SOURCE_OBJECTS.find(row => row.object_name.trim() === 'Least splanchnic nerve.l')?.object_name;
  assert.ok(rightName && leftName, 'Both sides are actual CSV nerves');
  const thoracic = path('sympathetic', 'thoracic');
  const abdominal = path('sympathetic', 'abdominal');
  for (const suffix of ['', '_123', '.001_123']) {
    const vertebrae = lumbarNames.map((name, i) => ({ ...object(name + suffix, i + 1), visible: false }));
    const right = object(rightName + suffix, 10);
    const left = object(leftName + suffix, 11);
    const scene = [...vertebrae, right, left, object('Vertebra C3', 12),
      object('Vertebra T12', 13), object('Sacrum', 14), object('Femur.r', 15)];
    for (const bone of vertebrae) {
      assert.equal(bone.systemId, 'skeletal');
      assert.ok(isNodeAllowedInAtlasView(bone, AUTONOMIC_NERVOUS_SYSTEM_VIEW));
      assert.deepEqual(autonomicPathForGroup(bone, thoracic), thoracic);
      assert.deepEqual(autonomicPathForGroup(bone, abdominal), abdominal);
      assert.deepEqual(autonomicContextIds([bone], thoracic), [bone.instanceID], 'Lumbar bone stays semitransparent');
      assert.deepEqual(autonomicForegroundIds([bone], thoracic), []);
      assert.ok(autonomicPathForGroup(bone, plexuses), 'Retain the separate autonomic-plexus context');
      assert.equal(autonomicPathForGroup(bone, cervical), null);
    }
    assert.deepEqual(autonomicPathForGroup(right, thoracic), thoracic);
    assert.deepEqual(autonomicPathForGroup(right, abdominal), abdominal);
    assert.deepEqual(autonomicPathForGroup(left, abdominal), abdominal);
    assert.equal(autonomicPathForGroup(left, thoracic), null);
    const plan = planRegionIsolation(scene, 'nervous', thoracic, n => autonomicPathForGroup(n, thoracic))!;
    assert.deepEqual(plan.show, [1, 2, 3, 4, 5, 10, 13]);
    assert.deepEqual(plan.hide, [11, 12, 14, 15]);
    assert.deepEqual(autonomicContextIds(scene, thoracic), [1, 2, 3, 4, 5, 13]);
    assert.deepEqual(autonomicForegroundIds(scene, thoracic), [10], 'The right nerve remains opaque');
    assert.ok(plan.affected.filter(n => n.instanceID <= 5).every(n => !n.visible),
      'Restore keeps the previous lumbar visibility');
  }
});

test('Pelvic sympathetic shares exactly L3–L5 as semitransparent context while retaining sacrum, coccyx and opaque pelvic nerves', () => {
  const lumbarNames = [...new Set(skeletalCsv.split(/\r?\n/).filter(line => line.startsWith('OBJECT,'))
    .map(line => line.split(',')[4]).filter(name => /^Vertebra L[1-5]$/.test(name)))].sort();
  assert.equal(lumbarNames.length, 5);
  const nerveName = AUTONOMIC_SOURCE_OBJECTS.find(row =>
    /inferior hypogastric nerves and plexus/i.test(row.object_name))?.object_name;
  assert.ok(nerveName, 'Use the modeled inferior hypogastric nerve/plexus');
  const pelvic = path('sympathetic', 'pelvic');
  for (const suffix of ['', '_123', '.001_123']) {
    const bones = lumbarNames.map((name, i) => ({ ...object(name + suffix, i + 1), visible: false }));
    const scene = [...bones, object('Sacrum', 6), object('Coccyx', 7), object(nerveName, 8),
      object('Least splanchnic nerve.r', 9), object('Femur.r', 10), object('Abdominal aorta', 11)];
    for (const bone of bones) {
      assert.equal(bone.systemId, 'skeletal');
      assert.ok(isNodeAllowedInAtlasView(bone, AUTONOMIC_NERVOUS_SYSTEM_VIEW));
      assert.deepEqual(autonomicPathForGroup(bone, path('sympathetic', 'abdominal')), path('sympathetic', 'abdominal'));
      assert.deepEqual(autonomicPathForGroup(bone, path('sympathetic', 'thoracic')), path('sympathetic', 'thoracic'));
      assert.ok(autonomicPathForGroup(bone, plexuses), 'Preserve independent plexus context');
      assert.deepEqual(autonomicPathForGroup(bone, pelvic), bone.instanceID >= 3 ? pelvic : null);
    }
    const plan = planRegionIsolation(scene, 'nervous', pelvic, n => autonomicPathForGroup(n, pelvic))!;
    assert.deepEqual(plan.show, [3, 4, 5, 6, 7, 8]);
    assert.deepEqual(plan.hide, [1, 2, 9, 10, 11], 'Do not expand to L1/L2 or unrelated abdominal anatomy');
    assert.deepEqual(autonomicContextIds(scene, pelvic), [3, 4, 5, 6, 7]);
    assert.deepEqual(autonomicForegroundIds(scene, pelvic), [8]);
    assert.ok(plan.affected.filter(n => n.instanceID >= 3 && n.instanceID <= 5).every(n => !n.visible),
      'Restore preserves previous lumbar visibility');
  }
});

test('Abdominal sympathetic keeps the CSV aorta as vascular context and bilateral splanchnics without admitting thoracic vessels', () => {
  const vesselName = cardiovascularCsv.split(/\r?\n/).filter(line => line.startsWith('OBJECT,'))
    .map(line => line.split(',')[4]).find(name => name === 'Abdominal aorta');
  assert.ok(vesselName, 'Use the actual abdominal-aorta mesh from the cardiovascular CSV');
  const abdominal = path('sympathetic', 'abdominal');
  for (const suffix of ['', '_123', '.001_123']) {
    const aorta = { ...object(vesselName + suffix, 1), visible: false };
    assert.equal(aorta.systemId, 'vascular', 'Do not relabel an artery as a nerve');
    assert.ok(isNodeAllowedInAtlasView(aorta, AUTONOMIC_NERVOUS_SYSTEM_VIEW));
    for (const scope of [AUTONOMIC_ROOT_PATH, sympathetic, abdominal]) {
      assert.deepEqual(autonomicPathForGroup(aorta, scope), abdominal);
      assert.deepEqual(autonomicContextIds([aorta], scope), [1]);
      assert.deepEqual(autonomicForegroundIds([aorta], scope), []);
    }
    assert.ok(autonomicPathForGroup(aorta, path('plexuses', 'abdominal')),
      'Preserve the existing autonomic-plexus membership');
    for (const scope of [cervical, path('sympathetic', 'thoracic'), path('sympathetic', 'pelvic'),
      path('parasympathetic'), head, path('enteric')])
      assert.equal(autonomicPathForGroup(aorta, scope), null, scope.join('/'));
    const scene = [aorta, object('Vertebra L1', 2), object('Least splanchnic nerve.l', 3),
      object('Coeliac ganglia', 4), object('Least splanchnic nerve.r', 5),
      object('Thoracic aorta', 6), object('Femur.r', 7)];
    const plan = planRegionIsolation(scene, 'nervous', abdominal, n => autonomicPathForGroup(n, abdominal))!;
    assert.deepEqual(plan.show, [1, 2, 3, 4, 5]);
    assert.deepEqual(plan.hide, [6, 7]);
    assert.deepEqual(autonomicContextIds(scene, abdominal), [1, 2]);
    assert.deepEqual(autonomicForegroundIds(scene, abdominal), [3, 4, 5], 'Nerves and ganglia remain opaque');
    assert.equal(plan.affected.find(n => n.instanceID === 1)?.visible, false,
      'Restore keeps the previous aorta visibility');
  }
});

test('thoracic, lumbar and S1–S4 anterior/posterior roots, intercostals and both communicating rami enter the plexus view', () => {
  for (const name of [...trunkRoots, ...intercostals, ...communicatingRami, 'S4 root left'])
    assertOpaqueMember(name, plexuses);
  for (const name of ['Rami communicantes griseithoracic retion.r',
    'Rami communicantes lumbar region.l', 'Th1  posterior root.r'])
    assertOpaqueMember(name, plexuses);
});

test('existing source trunk roots and intercostals remain source-backed plexus members, without unrelated cervical anatomy', () => {
  const sourceNames = AUTONOMIC_SOURCE_OBJECTS.map(row => row.object_name.trim()).filter(name =>
    /^(?:(?:T|Th)(?:[1-9]|1[0-2])|L[1-5]|S[1-4])\s+.*root\b/i.test(name) && !/ganglion/i.test(name)
    || /^(?:Intercostal nerve|Rami communicantes)\b/i.test(name));
  assert.ok(sourceNames.length > 100);
  for (const name of sourceNames) assertOpaqueMember(name, plexuses);
  for (const name of ['C4 spinal nerve.l', 'Optic nerve.r',
    'Trigeminal motor nucleus.r', 'Femur.r', 'S6 root.r', 'T13 anterior root.r', 'L6 posterior root.l'])
    assert.equal(autonomicPathForGroup(object(name), plexuses), null, name);
  for (const name of [...cervicalRoots, ...trunkRoots, ...intercostals, ...communicatingRami])
    for (const category of ['parasympathetic', 'enteric'])
      assert.equal(autonomicPathForGroup(object(name), path(category)), null, name);
});

test('shared sidebar/fullscreen collection tree exposes the requested meshes in their assigned categories', () => {
  const names = [...requestedHead, ...cervicalRoots, ...trunkRoots, ...communicatingRami, ...intercostals];
  const nodes = names.map((name, i) => object(name, i + 1));
  for (const [scope, expected] of [
    [sympathetic, requestedHead],
    [head, [...requestedHead, ...cervicalRoots]],
    [plexuses, [...trunkRoots, ...communicatingRami, ...intercostals]],
  ] as const) {
    const group = AUTONOMIC_GROUPS.find(item => item.id === scope.join('/'))!;
    const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
      groups: [group], nodes, initialExpanded: new Set([group.id,
        ...group.children!.flatMap(child => [child.id, ...child.children?.map(leaf => leaf.id) ?? []])]),
      pathForNode: node => autonomicPathForGroup(node, scope), pathForGroup: autonomicPathForGroup,
      onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: scope, onRestore: () => {},
      onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
    }));
    for (const label of expected) assert.ok(html.includes(label), `${group.label}: ${label}`);
  }
});
