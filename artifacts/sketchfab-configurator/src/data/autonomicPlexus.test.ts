import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AUTONOMIC_GROUPS, AUTONOMIC_ROOT_PATH, AUTONOMIC_SOURCE_OBJECTS,
  autonomicPathForGroup, autonomicContextIds, autonomicForegroundIds } from './autonomicTaxonomy';
import { vagusContextSystem } from './vagusTargets';
import { PLEXUS_HEART_CONTEXT_NAME, isPlexusHeartNode, plexusContextSystem } from './autonomicPlexusContext';
import { systemForMeshName } from './anatomicalSystems';
import { classifyCardiovascularObject } from './cardiovascularTaxonomy';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { basalWholeBrainDisplay, expandWholeBrainIds } from '../lib/basalWholeBrain';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const cardiovascularCsv = readFileSync(new URL('../../../../attached_assets/Cardiovascular_system_final_1790945714118.csv', import.meta.url), 'utf8');
const cardiacNames = cardiovascularCsv.split(/\r?\n/).filter(line => line.startsWith('OBJECT,')).map(line => line.split(',')[4]);
const abdominalVessels = cardiacNames.filter(name => classifyCardiovascularObject(name)?.[0] === 'cardiovascular-06');
const root = [...AUTONOMIC_ROOT_PATH, 'plexuses'];
const bones = [...Array.from({ length: 12 }, (_, i) => `Vertebra T${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `Vertebra L${i + 1}`), 'Sacrum'];
const spinal = ['White matter of spinal cord', 'Anterior horn of spinal cord', 'Posterior horn of spinal cord',
  'Lateral intermediate substance', 'Intermediolateral nucleus', 'Intermediomedial nucleus'];
const heart = ['Right atrium', 'Left atrium', 'Right ventricle', 'Left ventricle', 'Right coronary artery',
  'Left coronary artery', 'Right inferolateral branch of right coronary artery', 'Circumflex artery of heart',
  'Anterior interventricular artery', 'Septal branches of anterior interventricular artery', 'Coronary sinus',
  'Great cardiac vein', 'Middle cardiac vein', 'Inferior vein of left ventricle',
  'Right coronary leaflet', 'Left coronary leaflet', 'Non-coronary leaflet',
  'Inferior papillary muscle of right ventricle'];
const greatArteries = ['Pulmonary trunk', 'Bifurcation of pulmonary trunk', 'Pulmonary arteries.j',
  'Left pulmonary artery', 'Right pulmonary artery', 'Aortic arch'];
const names = [...new Set([...AUTONOMIC_SOURCE_OBJECTS.map(row => row.object_name.trim()),
  ...cardiacNames, ...bones, 'Atlas (C1)', 'Vertebra C3', 'Coccyx', 'Stomach', 'Temporal bone.l'])];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName),
}));
const object = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, `Missing source ${name}`);
  return node;
};

test('whole autonomic plexus view adds translucent torso bones and cardiac/arterial context with opaque spinal cord and sympathetic chains', () => {
  const plan = planRegionIsolation(nodes, 'nervous', root, node => autonomicPathForGroup(node, root))!;
  const context = autonomicContextIds(nodes, root);
  const foreground = autonomicForegroundIds(nodes, root);
  for (const name of [...bones, ...heart, ...greatArteries, 'Thoracic aorta',
    ...abdominalVessels, 'Inferior vena cava (abdominal part)']) {
    const node = object(name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(context.includes(node.instanceID), name);
    assert.ok(!foreground.includes(node.instanceID), name);
    assert.ok(isNodeInRegion(node, root, () => null), name);
  }
  const chains = ['Sympathetic ganglia Thoracic region', 'Sympathetic gangion lumbar region',
    'Sympathetic ganglia sacral region', 'Sympathetic trunk'];
  for (const name of [...spinal, ...chains.flatMap(stem => [`${stem}.l`, `${stem}.r`]), 'Ganglion Impar',
    'Superior hypogastric plexus', 'Inferior hypogastric nerves and plexus',
    'Cardiac plexus', 'Right pulmonary artery nerve Plexus', 'Left pulmonary artery_ Plexus']) {
    const node = object(name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(foreground.includes(node.instanceID), name);
    assert.ok(!context.includes(node.instanceID), name);
  }
  for (const name of ['Coccyx', 'Stomach', 'Temporal bone.l',
    'Spinal dura', 'Dura mater brain', 'Ascending aorta',
    'Left inferior pulmonary vein']) {
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
});

test('greater, lesser and least splanchnic nerves are bilateral opaque abdominal-plexus members with source and runtime aliases', () => {
  const abdominal = [...root, 'abdominal'];
  for (const scope of [root, abdominal]) {
    const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    for (const side of ['l', 'r']) {
      for (const [sourceStem, aliases] of [
        ['Greater splanchnic nerves', ['Greater splanchnic nerve', 'Greater splanchnic nerves']],
        ['Lesser splanchinc nerves', ['Lesser splanchnic nerve', 'Lesser splanchnic nerves', 'Lesser splanchinc nerves']],
        ['Least splanchnic nerve', ['Least splanchnic nerve', 'Least splanchnic nerves']],
      ] as const) {
        const source = object(`${sourceStem}.${side}`);
        assert.ok(plan.show.includes(source.instanceID), source.rawName);
        assert.ok(autonomicPathForGroup(source, [...AUTONOMIC_ROOT_PATH, 'sympathetic',
          sourceStem === 'Least splanchnic nerve' && side === 'l' ? 'abdominal' : 'thoracic']));
        for (const stem of aliases) for (const suffix of ['', '_123', '.001_123']) {
          const rawName = `${stem}.${side}${suffix}`;
          const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
          assert.equal(node.systemId, 'nervous', rawName);
          assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
          assert.ok(isNodeInRegion(node, scope, () => null), rawName);
          assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID], rawName);
          assert.deepEqual(autonomicContextIds([node], scope), [], rawName);
          for (const category of ['parasympathetic', 'head-neck', 'enteric']) {
            assert.equal(autonomicPathForGroup(node, [...AUTONOMIC_ROOT_PATH, category]), null, rawName);
          }
        }
      }
    }
  }
});

test('autonomic plexus subgroup isolation retains torso bones and scopes cardiac, pulmonary and hypogastric anatomy', () => {
  for (const child of AUTONOMIC_GROUPS[3].children!) {
    const scope = child.id.split('/');
    const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    for (const name of bones) {
      assert.ok(plan.show.includes(object(name).instanceID), `${child.label}: ${name}`);
      assert.ok(isNodeInRegion(object(name), scope, () => null), name);
      assert.ok(autonomicContextIds(nodes, scope).includes(object(name).instanceID), name);
    }
    if (scope[3] === 'cardiac') {
      for (const name of [...heart, ...greatArteries]) assert.ok(plan.show.includes(object(name).instanceID), name);
    }
    if (scope[3] === 'pulmonary-esophageal') {
      for (const name of greatArteries.filter(name => name !== 'Aortic arch')) assert.ok(plan.show.includes(object(name).instanceID), name);
      assert.ok(plan.hide.includes(object('Right ventricle').instanceID));
    }
    if (scope[3] === 'pelvic') {
      for (const name of ['Superior hypogastric plexus', 'Inferior hypogastric nerves and plexus', 'Ganglion Impar']) {
        assert.ok(plan.show.includes(object(name).instanceID), name);
      }
      assert.ok(plan.hide.includes(object('Right ventricle').instanceID));
    }
  }
});

test('plexus view retains semitransparent C1–C7 during subgroup isolation and shows source grey rami and sympathetic trunks opaque', () => {
  const cervical = ['Atlas (C1)', 'Axis (C2)', ...Array.from({ length: 5 }, (_, i) => `Vertebra C${i + 3}`)];
  const cervicalNodes: SceneNode[] = cervical.map((rawName, i) => ({
    ...nodes[0], rawName, name: rawName, instanceID: 100000 + i, systemId: systemForMeshName(rawName),
  }));
  const scene = [...nodes.filter(node => !cervical.includes(node.rawName)), ...cervicalNodes];
  for (const scope of [root, ...AUTONOMIC_GROUPS[3].children!.map(child => child.id.split('/'))]) {
    const plan = planRegionIsolation(scene, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    for (const original of cervicalNodes) for (const suffix of ['', '_123', '.001_123']) {
      const rawName = original.rawName + suffix;
      const node = { ...original, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'skeletal', rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      assert.ok(isNodeInRegion(node, scope, () => null), rawName);
      assert.ok(plan.show.includes(node.instanceID), rawName);
      assert.deepEqual(autonomicContextIds([node], scope), [node.instanceID], rawName);
      assert.deepEqual(autonomicForegroundIds([node], scope), [], rawName);
    }
  }
  const plan = planRegionIsolation(scene, 'nervous', root, node => autonomicPathForGroup(node, root))!;
  for (const side of ['l', 'r']) for (const stem of ['Sympathetic trunk', 'Rami communicantes grisei',
    'Rami communicantes griseithoracic retion', 'Rami communicantes grisei sacral region']) {
    const source = object(`${stem}.${side}`);
    assert.ok(plan.show.includes(source.instanceID), source.rawName);
    for (const suffix of ['', '_123', '.001_123']) {
      const rawName = source.rawName + suffix;
      const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      assert.ok(isNodeInRegion(node, root, () => null), rawName);
      assert.deepEqual(autonomicForegroundIds([node], root), [node.instanceID], rawName);
      assert.deepEqual(autonomicContextIds([node], root), [], rawName);
    }
  }
  for (const side of ['l', 'r']) {
    const whiteRamus = object(`Rami communicantes albi.${side}`);
    assert.ok(autonomicPathForGroup(whiteRamus, root));
    assert.ok(autonomicPathForGroup(whiteRamus, [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'cervical']));
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [AUTONOMIC_GROUPS[3]], nodes: scene,
    initialExpanded: new Set([AUTONOMIC_GROUPS[3].id,
      ...AUTONOMIC_GROUPS[3].children!.flatMap(child => [child.id, ...child.children?.map(leaf => leaf.id) ?? []])]),
    pathForNode: node => autonomicPathForGroup(node, root), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: root, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of ['Atlas (C1)', 'Vertebra C7', 'Rami communicantes grisei.l', 'Sympathetic trunk.r'])
    assert.ok(html.includes(label), `shared sidebar/fullscreen tree: ${label}`);
});

test('aortic trunks and reviewed abdominal vessels appear in their plexus subgroups, keep vascular ownership and support runtime suffixes', () => {
  assert.ok(abdominalVessels.length > 50);
  const thoracic = [...root, 'pulmonary-esophageal'];
  const abdominal = [...root, 'abdominal'];
  for (const [scope, names] of [
    [thoracic, ['Thoracic aorta']],
    [abdominal, [...abdominalVessels, 'Inferior vena cava (abdominal part)']],
  ] as const) {
    const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    for (const name of names) {
      assert.ok(plan.show.includes(object(name).instanceID), name);
      for (const suffix of ['', '_123', '.001_123']) {
        const rawName = name + suffix;
        const node = { ...object(name), rawName, systemId: systemForMeshName(rawName) };
        assert.equal(node.systemId, 'vascular', rawName);
        assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
        assert.ok(isNodeInRegion(node, scope, () => null), rawName);
        assert.deepEqual(autonomicContextIds([node], scope), [node.instanceID], rawName);
        assert.deepEqual(autonomicForegroundIds([node], scope), [], rawName);
        // Sympathetic vessel membership is covered by autonomicSympatheticVessels.test.ts.
        for (const category of ['parasympathetic', 'head-neck', 'enteric']) {
          // Reviewed thoracic great vessels are also vagus context; abdominal vessels are not.
          const expected = category === 'parasympathetic' && vagusContextSystem(rawName) === 'vascular'
            ? [...AUTONOMIC_ROOT_PATH, 'parasympathetic', 'vagus', 'thoracic-vessels'] : null;
          assert.deepEqual(autonomicPathForGroup(node, [...AUTONOMIC_ROOT_PATH, category]), expected, rawName);
        }
      }
    }
    for (const name of ['External iliac artery.l', 'Iliolumbar artery.r', 'Right subclavian artery']) {
      assert.ok(plan.hide.includes(object(name).instanceID), name);
    }
  }
  for (const name of ['Coeliac trunk', 'Superior mesenteric artery', 'Inferior mesenteric artery',
    'Hepatic portal vein', 'Splenic vein', 'Right renal artery', 'Left renal vein',
    'Anterior inferior pancreaticoduodenal artery', 'Lumbar vertebral venous plexus']) {
    assert.ok(autonomicPathForGroup(object(name), abdominal), name);
  }
  for (const name of ['Abdominal aorta_Enteric_Plexus_Fine', 'Right renal arteryNerve Plexus']) {
    assert.equal(plexusContextSystem(name), null, name);
    assert.equal(object(name).systemId, 'nervous', name);
    assert.deepEqual(autonomicForegroundIds([object(name)], abdominal), [object(name).instanceID], name);
  }
});

test('plexus context keeps source ownership and export aliases without confusing pulmonary artery nerve plexuses with arteries', () => {
  for (const name of [...bones, ...heart, ...greatArteries, ...spinal, 'Inferior hypogastric nerves and plexus',
    'Sympathetic ganglia Thoracic region.l', 'Sympathetic gangion lumbar region.r']) {
    for (const suffix of ['', '_123', '.001_123']) {
      const rawName = name + suffix;
      const node = { ...object(name), rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, object(name).systemId, rawName);
      assert.ok(autonomicPathForGroup(node, root), rawName);
      assert.ok(isNodeInRegion(node, root, () => null), rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
    }
  }
  for (const name of ['Right pulmonary artery nerve Plexus', 'Left pulmonary artery_ Plexus', 'Ascending aorta nerve Plexus']) {
    assert.equal(plexusContextSystem(name), null, name);
    assert.equal(object(name).systemId, 'nervous', name);
  }
  for (const name of ['Right coronary artery', 'Right ventricle', 'Aortic arch']) {
    assert.equal(object(name).systemId, 'vascular', name);
    for (const category of ['sympathetic', 'parasympathetic', 'head-neck', 'enteric']) {
      if (category === 'parasympathetic' && vagusContextSystem(name) === 'vascular') {
        assert.deepEqual(autonomicPathForGroup(object(name), [...AUTONOMIC_ROOT_PATH, category]), [...AUTONOMIC_ROOT_PATH, 'parasympathetic', 'vagus', 'thoracic-vessels'], name);
        continue;
      }
      if (name === 'Aortic arch' && category === 'head-neck') {
        assert.ok(autonomicPathForGroup(object(name), [...AUTONOMIC_ROOT_PATH, category]));
        continue;
      }
      assert.equal(autonomicPathForGroup(object(name), [...AUTONOMIC_ROOT_PATH, category]), null, name);
    }
  }
  for (const name of ['Hypogastric nerve', 'Hypogastric nerves', 'Hypogastric plexus',
    'Inferior hypogastric plexus', 'Superior hypogastric nerves', 'Inferior hypogastric nerve',
    'Paravertebral sympathetic ganglia', 'Paravertebral sympathetic ganglion']) {
    for (const side of ['l', 'r']) {
      const rawName = `${name}.${side}.001_123`;
      const node = { ...nodes[0], rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(autonomicPathForGroup(node, root), rawName);
      assert.deepEqual(autonomicForegroundIds([node], root), [node.instanceID], rawName);
    }
  }
});

test('heart and coronary geometry act as one model for selection, display, hide/show and grouped focus without changing startup', () => {
  const inactive = basalWholeBrainDisplay(nodes, false, isPlexusHeartNode, PLEXUS_HEART_CONTEXT_NAME, PLEXUS_HEART_CONTEXT_NAME);
  assert.equal(inactive.nodes.length, nodes.length);
  assert.deepEqual(inactive.memberIds, []);
  const grouped = basalWholeBrainDisplay(nodes, true, isPlexusHeartNode, PLEXUS_HEART_CONTEXT_NAME, PLEXUS_HEART_CONTEXT_NAME);
  assert.ok(grouped.representativeId !== null);
  assert.equal(grouped.nodes.filter(node => node.rawName === PLEXUS_HEART_CONTEXT_NAME).length, 1);
  assert.ok(grouped.memberIds.length >= heart.length);
  for (const name of heart) {
    assert.ok(grouped.memberIds.includes(object(name).instanceID), name);
    assert.ok(!grouped.nodes.some(node => node.rawName === name), name);
  }
  const composite = grouped.nodes.find(node => node.rawName === PLEXUS_HEART_CONTEXT_NAME)!;
  assert.equal(composite.systemId, 'vascular');
  assert.ok(autonomicContextIds([composite], root).includes(composite.instanceID));
  assert.deepEqual(expandWholeBrainIds([composite.instanceID], grouped.memberIds), grouped.memberIds);
  for (const name of greatArteries) assert.ok(!grouped.memberIds.includes(object(name).instanceID), name);
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [AUTONOMIC_GROUPS[3]], nodes: [composite, object('Cardiac plexus')],
    initialExpanded: new Set([AUTONOMIC_GROUPS[3].id, `${root.join('/')}/cardiac`]),
    pathForNode: node => autonomicPathForGroup(node, root), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: root, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  assert.ok(html.includes(PLEXUS_HEART_CONTEXT_NAME));
  assert.ok(!html.includes('Right coronary artery'));
});
