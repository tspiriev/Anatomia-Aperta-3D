import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BRACHIAL_GROUPS, BRACHIAL_ROOT_PATH, brachialPathForGroup, brachialContextIds, brachialForegroundIds, brachialTrunkColorNodes, brachialDivisionColorNodes } from './brachialPlexusTaxonomy';
import { BRACHIAL_PLEXUS_VIEW, ATLAS_VIEWS, isNodeAllowedInAtlasView } from './atlasViews';
import { systemForMeshName } from './anatomicalSystems';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { BrachialPlexusMenu } from '../components/BrachialPlexusMenu';
import { BRACHIAL_WHOLE_BRAIN_NAME, isBrachialWholeBrainNode } from './brachialOverview';
import { basalWholeBrainDisplay, expandWholeBrainIds } from '../lib/basalWholeBrain';
import type { SceneNode } from '../types/sketchfab';

const names = ['Roots of brachial plexus.l', 'Roots of brachial plexus.r', 'C5 anterior root.l',
  'C5 posterior root.l', 'Superior trunk of brachial plexus.l', 'Subclavian nerve.l', 'Subclavian nerve.l.r',
  'Anterior division of superior trunk of brachial plexus.r', 'Anterior division of mandibular nerve.l',
  'Lateral cord of brachial plexus.l.', 'Median nerve.l', 'Median nerve.r', 'Ulnar nerve.l',
  'Anterior interosseous nerve of forearm.l', 'Posterior interosseous nerve of forearm.r',
  'Flexor digitorum profundus.l', 'Lumbrical muscles of hand.l', 'Pronator quadratus.l',
  'Abductor digiti minimi of foot.l', 'Tendon sheath of flexor pollicis longus.l', 'Subclavius muscle.l', 'Subscapularis muscle.l'];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, name: rawName, rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName),
}));
const node = (name: string) => nodes.find(n => n.rawName === name)!;
const path = (...parts: string[]) => [...BRACHIAL_ROOT_PATH, ...parts];
const belongs = (name: string, ...parts: string[]) => !!brachialPathForGroup(node(name), path(...parts));

test('new atlas uses supplied model and overview alongside five approved sections', () => {
  assert.equal(BRACHIAL_PLEXUS_VIEW.modelUid, 'd327ffccd7464160badb73687e02eac6');
  assert.ok(ATLAS_VIEWS.includes(BRACHIAL_PLEXUS_VIEW));
  assert.deepEqual(BRACHIAL_GROUPS.map(g => g.id.split('/').at(-1)), ['overview', 'roots', 'trunks', 'divisions', 'cords', 'terminal']);
});
test('light purple applies only to actual trunks in Trunks, including subgroups and side filters', () => {
  const names = ['Superior trunk of brachial plexus.l', 'Middle trunk of brachial plexus.r',
    'Inferior trunk of brachial plexus.l.001', 'Roots of brachial plexus.l', 'Suprascapular nerve.l'];
  const scene: SceneNode[] = names.map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  assert.deepEqual(brachialTrunkColorNodes(scene, path('trunks')).map(n => n.instanceID), [1, 2, 3]);
  assert.deepEqual(brachialTrunkColorNodes(scene, path('trunks', 'superior', 'left')).map(n => n.instanceID), [1, 3]);
  for (const category of ['roots', 'divisions', 'cords', 'overview', 'terminal']) {
    assert.deepEqual(brachialTrunkColorNodes(scene, path(category)), []);
  }
});
test('division color uses the same purple only in Divisions and excludes mandibular/context anatomy', () => {
  const names = ['Anterior division of superior trunk of brachial plexus.l',
    'Posterior division of middle trunk of brachial plexus.r',
    'Posterior division of inferior trunk of brachial plexus.l.003_123',
    'Anterior division of mandibular nerve.l', 'Superior trunk of brachial plexus.l',
    'Roots of brachial plexus.l', 'Lateral cord of brachial plexus.l'];
  const scene: SceneNode[] = names.map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: 'nervous',
  }));
  assert.deepEqual(brachialDivisionColorNodes(scene, path('divisions')).map(n => n.instanceID), [1, 2, 3]);
  const colors = brachialDivisionColorNodes(scene, path('divisions', 'superior', 'left'));
  assert.deepEqual(colors.map(n => n.instanceID), [1, 3]);
  assert.deepEqual(colors[0].color, brachialTrunkColorNodes(scene, path('trunks'))[0].color);
  for (const category of ['roots', 'trunks', 'cords', 'overview', 'terminal']) {
    assert.deepEqual(brachialDivisionColorNodes(scene, path(category)), []);
  }
});
test('source corrections preserve real roots and exclude misplaced mandibular divisions', () => {
  assert.ok(belongs('Roots of brachial plexus.l', 'roots'));
  assert.ok(belongs('C5 anterior root.l', 'roots', 'supporting-anterior-roots'));
  assert.ok(!belongs('C5 posterior root.l', 'roots'));
  assert.ok(!belongs('Anterior division of mandibular nerve.l', 'divisions'));
  assert.ok(belongs('Subclavian nerve.l', 'trunks', 'superior', 'subclavian'));
  assert.ok(!belongs('Subclavian nerve.l', 'divisions'));
});
test('median roots belong to their own cords, complete nerves stay terminal and distal branches remain in Overview', () => {
  assert.ok(!belongs('Median nerve.l', 'cords', 'lateral'));
  assert.ok(!belongs('Median nerve.l', 'cords', 'medial'));
  for (const [name, cord] of [['Lateral root of median nerve.l', 'lateral'], ['Medial root of median nerve.l', 'medial']]) {
    const n: SceneNode = { instanceID: -10, rawName: name, name, type: 'MatrixTransform', visible: true, systemId: 'nervous' };
    assert.ok(brachialPathForGroup(n, path('cords', cord)));
    assert.equal(brachialPathForGroup(n, path('cords', cord === 'lateral' ? 'medial' : 'lateral')), null);
  }
  assert.ok(belongs('Anterior interosseous nerve of forearm.l', 'terminal', 'median'));
  assert.ok(belongs('Posterior interosseous nerve of forearm.r', 'terminal', 'radial'));
  assert.ok(belongs('Anterior interosseous nerve of forearm.l', 'overview', 'plexus'));
  assert.ok(belongs('Posterior interosseous nerve of forearm.r', 'overview', 'plexus'));
});
test('terminal muscle targets are automatic, cord context optional, fused targets shared', () => {
  for (const name of ['Flexor digitorum profundus.l', 'Lumbrical muscles of hand.l']) {
    assert.ok(belongs(name, 'terminal', 'median'));
    assert.ok(belongs(name, 'terminal', 'ulnar'));
    assert.ok(!belongs(name, 'cords'));
    assert.ok(!belongs(name, 'cords', 'with-muscles'));
    assert.ok(!belongs(name, 'cords', 'lateral', 'median', 'muscles'));
  }
  assert.ok(!belongs('Subscapularis muscle.l', 'cords'));
  assert.ok(belongs('Subscapularis muscle.l', 'cords', 'posterior', 'with-muscles'));
  assert.ok(!isNodeAllowedInAtlasView(node('Abductor digiti minimi of foot.l'), BRACHIAL_PLEXUS_VIEW));
  assert.ok(!isNodeAllowedInAtlasView(node('Tendon sheath of flexor pollicis longus.l'), BRACHIAL_PLEXUS_VIEW));
});
test('side filters handle duplicate suffixes and do not guess ambiguous side', () => {
  assert.ok(belongs('Lateral cord of brachial plexus.l.', 'cords', 'left'));
  assert.ok(!belongs('Median nerve.r', 'terminal', 'left'));
  assert.ok(belongs('Subclavian nerve.l.r', 'trunks'));
  assert.ok(!belongs('Subclavian nerve.l.r', 'trunks', 'left'));
  assert.ok(!belongs('Subclavian nerve.l.r', 'trunks', 'right'));
});
test('isolation includes same-side muscles and hides all unrelated geometry', () => {
  const p = path('terminal', 'median', 'left');
  const plan = planRegionIsolation(nodes, 'nervous', p, n => brachialPathForGroup(n, p))!;
  assert.ok(plan.show.includes(node('Pronator quadratus.l').instanceID));
  assert.ok(plan.hide.includes(node('Median nerve.r').instanceID));
  assert.ok(plan.hide.includes(node('Anterior division of mandibular nerve.l').instanceID));
  assert.ok(isNodeInRegion(node('Flexor digitorum profundus.l'), p, () => null));
  assert.ok(brachialContextIds(nodes, p).includes(node('Pronator quadratus.l').instanceID));
  assert.ok(!brachialForegroundIds(nodes, p).includes(node('Pronator quadratus.l').instanceID));
  assert.ok(brachialForegroundIds(nodes, p).includes(node('Median nerve.l').instanceID));
});
test('menu renders side and cord muscle controls, search, and fullscreen without mesh lists', () => {
  const props = {
    nodes, activeNerveId: path('terminal').join('/'), onActivateNerve: () => {},
    isolatedRegionPath: null, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: null,
  };
  const html = renderToStaticMarkup(createElement(BrachialPlexusMenu, { ...props, variant: 'sidebar' }));
  assert.match(html, /button-brachial-side-left/);
  assert.match(html, /button-brachial-cord-muscles/);
  assert.match(html, /input-brachial-search/);
  assert.doesNotMatch(html, /fused per side/);
  const fullscreen = renderToStaticMarkup(createElement(BrachialPlexusMenu, { ...props, variant: 'fullscreen' }));
  assert.match(fullscreen, /fullscreen-anatomy-menu/);
  assert.match(fullscreen, /Terminal nerves/);
  assert.doesNotMatch(fullscreen, /Median nerve\.l/);
});

const overviewNames = ['Atlas (C1)', 'Axis (C2)', 'Vertebra C3', 'Vertebra C4', 'Vertebra C5',
  'Vertebra C6', 'Vertebra C7', 'Vertebra Th1', 'Vertebra Th2', 'Vertebra T3',
  'White matter of spinal cord', 'Anterior horn of spinal cord', 'Posterior horn of spinal cord',
  'Anterior corticospinal tract', 'Lateral corticospinal tract', 'Corticospinal tract arm.l',
  'Corticospinal tract arm.r', 'Corticospinal tract legs.r',
  'Frontal lobe.l', 'Cerebellum.r', 'Midbrain.l', 'Pons.r', 'Medulla oblongata.l'];
const overviewNodes: SceneNode[] = [...nodes, ...overviewNames.map((rawName, i) => ({
  instanceID: 100 + i, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName),
}))];
test('overview includes complete plexus, exact cervical/upper thoracic context, cord, arm and spinal motor tracts', () => {
  const p = path('overview');
  const members = overviewNodes.filter(n => brachialPathForGroup(n, p));
  for (const name of overviewNames.filter(n => n !== 'Corticospinal tract legs.r')) {
    assert.ok(members.some(n => n.rawName === name), name);
  }
  assert.ok(members.some(n => n.rawName === 'Median nerve.l'));
  assert.ok(members.some(n => n.rawName === 'Ulnar nerve.l'));
  assert.ok(!members.some(n => n.rawName === 'Pronator quadratus.l'));
  assert.ok(members.some(n => n.rawName === 'Vertebra T3'));
  assert.ok(!members.some(n => n.rawName === 'Corticospinal tract legs.r'));
  const context = brachialContextIds(overviewNodes, p);
  const foreground = brachialForegroundIds(overviewNodes, p);
  for (const n of members) {
    assert.equal(context.includes(n.instanceID), !/nerve|plexus|root|corticospinal/i.test(n.rawName), n.rawName);
    assert.equal(foreground.includes(n.instanceID), !context.includes(n.instanceID), n.rawName);
  }
});
test('whole brain groups supra/infratentorial surfaces and brainstem as one menu/picking/visibility model', () => {
  const display = basalWholeBrainDisplay(overviewNodes, true, isBrachialWholeBrainNode, BRACHIAL_WHOLE_BRAIN_NAME, BRACHIAL_WHOLE_BRAIN_NAME);
  assert.equal(display.memberIds.length, 5);
  assert.equal(display.nodes.filter(n => n.rawName === BRACHIAL_WHOLE_BRAIN_NAME).length, 1);
  assert.deepEqual(expandWholeBrainIds([display.representativeId!], display.memberIds), display.memberIds);
  const grouped = display.nodes.find(n => n.rawName === BRACHIAL_WHOLE_BRAIN_NAME)!;
  assert.ok(brachialPathForGroup(grouped, path('overview', 'brain')));
  const html = renderToStaticMarkup(createElement(BrachialPlexusMenu, {
    variant: 'sidebar', nodes: display.nodes, activeNerveId: path('overview').join('/'),
    onActivateNerve: () => {}, isolatedRegionPath: null, onIsolateRegion: () => {},
    onRestoreRegion: () => {}, onSetRegionVisibility: () => {}, selectedNodeId: null,
  }));
  assert.match(html, /Whole brain/);
  assert.doesNotMatch(html, /Frontal lobe\.l|Cerebellum\.r|Midbrain\.l/);
});
test('overview side filters retain central context and unsplit spinal tracts; subgroup focus preserves context', () => {
  const p = path('overview', 'tracts', 'left');
  const plan = planRegionIsolation(overviewNodes, 'nervous', p, n => brachialPathForGroup(n, p))!;
  for (const name of ['Vertebra C7', 'Vertebra Th2', 'White matter of spinal cord', 'Cerebellum.r', 'Pons.r',
    'Anterior corticospinal tract', 'Lateral corticospinal tract', 'Corticospinal tract arm.l']) {
    const n = overviewNodes.find(n => n.rawName === name)!;
    assert.ok(plan.show.includes(n.instanceID), name);
    assert.ok(isNodeInRegion(n, p, () => null), name);
  }
  assert.ok(plan.hide.includes(overviewNodes.find(n => n.rawName === 'Corticospinal tract arm.r')!.instanceID));
  assert.ok(brachialContextIds(overviewNodes, p).includes(overviewNodes.find(n => n.rawName === 'Pons.r')!.instanceID));
  assert.ok(!brachialPathForGroup(overviewNodes.find(n => n.rawName === 'Pons.r')!, path('roots')));
});
test('roots includes translucent cervical and Th1–Th2 vertebrae, with shared controls and retained subgroup context', () => {
  const vertebrae = overviewNodes.filter(n => /^(Atlas|Axis|Vertebra)/.test(n.rawName) && n.rawName !== 'Vertebra T3');
  for (const p of [path('roots'), path('roots', 'left'), path('roots', 'right'),
    path('roots', 'supporting-anterior-roots', 'left')]) {
    const plan = planRegionIsolation(overviewNodes, 'nervous', p, n => brachialPathForGroup(n, p))!;
    assert.ok(plan);
    const context = brachialContextIds(overviewNodes, p);
    const foreground = brachialForegroundIds(overviewNodes, p);
    for (const n of vertebrae) {
      assert.ok(plan.show.includes(n.instanceID), `${p.join('/')} — ${n.rawName}`);
      assert.ok(context.includes(n.instanceID));
      assert.ok(!foreground.includes(n.instanceID));
      assert.ok(isNodeInRegion(n, p, () => null));
    }
    for (const name of ['Vertebra T3', 'White matter of spinal cord', 'Pons.r']) {
      assert.ok(plan.hide.includes(overviewNodes.find(n => n.rawName === name)!.instanceID));
    }
  }
  for (const n of vertebrae) assert.ok(brachialPathForGroup(n, path('roots', 'vertebrae')));
  const html = renderToStaticMarkup(createElement(BrachialPlexusMenu, {
    variant: 'sidebar', nodes: overviewNodes, activeNerveId: path('roots').join('/'),
    onActivateNerve: () => {}, isolatedRegionPath: null, onIsolateRegion: () => {},
    onRestoreRegion: () => {}, onSetRegionVisibility: () => {}, selectedNodeId: null,
  }));
  assert.match(html, /Cervical vertebrae C1–C7 and Th1–Th2 \(semitransparent\)/);
});
test('Trunks alone fades roots, divisions, cords and shoulder bones, with side-aware retained context', () => {
  const extra = ['Scapula.l', 'Scapula.r', 'Clavicle.l', 'Clavicle.r',
    'Anterior division of superior trunk of brachial plexus.l', 'Middle trunk of brachial plexus.r'];
  const scene: SceneNode[] = [...overviewNodes, ...extra.map((rawName, i) => ({
    instanceID: 200 + i, name: rawName, rawName, type: 'MatrixTransform', visible: true,
    systemId: systemForMeshName(rawName),
  }))];
  const required = ['Roots of brachial plexus.l', 'Lateral cord of brachial plexus.l.',
    'Anterior division of superior trunk of brachial plexus.l', 'Scapula.l', 'Clavicle.l'];
  for (const p of [path('trunks'), path('trunks', 'superior', 'left')]) {
    const plan = planRegionIsolation(scene, 'nervous', p, n => brachialPathForGroup(n, p))!;
    assert.ok(plan);
    const context = brachialContextIds(scene, p);
    const foreground = brachialForegroundIds(scene, p);
    for (const name of required) {
      const n = scene.find(n => n.rawName === name)!;
      assert.ok(plan.show.includes(n.instanceID), name);
      assert.ok(context.includes(n.instanceID), name);
      assert.ok(!foreground.includes(n.instanceID), name);
      assert.ok(isNodeInRegion(n, p, () => null), name);
    }
    assert.ok(foreground.includes(node('Superior trunk of brachial plexus.l').instanceID));
    assert.ok(!context.includes(node('Superior trunk of brachial plexus.l').instanceID));
    if (p.includes('left')) {
      for (const name of ['Scapula.r', 'Clavicle.r', 'Roots of brachial plexus.r']) {
        assert.ok(plan.hide.includes(scene.find(n => n.rawName === name)!.instanceID), name);
      }
    }
    assert.ok(plan.hide.includes(scene.find(n => n.rawName === 'White matter of spinal cord')!.instanceID));
    assert.ok(plan.hide.includes(node('Median nerve.l').instanceID));
  }
  for (const name of required.slice(0, 3)) {
    assert.ok(brachialForegroundIds(scene, path('overview')).includes(scene.find(n => n.rawName === name)!.instanceID), name);
  }
  for (const n of scene.filter(n => /^Scapula|^Clavicle/.test(n.rawName))) {
    assert.ok(brachialPathForGroup(n, path('trunks', 'context', 'bones')));
    assert.ok(!brachialPathForGroup(n, path('roots')));
    assert.ok(brachialPathForGroup(n, path('overview')));
    assert.ok(brachialContextIds(scene, path('overview')).includes(n.instanceID));
  }
});
test('Divisions retains transparent roots, trunks, cords, shoulder bones and C1–C7/Th1–Th2 around opaque divisions', () => {
  const extra = ['Scapula.l', 'Scapula.r', 'Clavicle.l', 'Clavicle.r',
    'Anterior division of superior trunk of brachial plexus.l', 'Middle trunk of brachial plexus.r',
    'Posterior division of superior trunk of brachial plexus.l.003'];
  const scene: SceneNode[] = [...overviewNodes, ...extra.map((rawName, i) => ({
    instanceID: 300 + i, name: rawName, rawName, type: 'MatrixTransform', visible: true,
    systemId: systemForMeshName(rawName),
  }))];
  const central = scene.filter(n => /^(Atlas|Axis|Vertebra)/.test(n.rawName) && n.rawName !== 'Vertebra T3');
  const surrounds = ['Roots of brachial plexus.l', 'Superior trunk of brachial plexus.l',
    'Lateral cord of brachial plexus.l.', 'Scapula.l', 'Clavicle.l'].map(name => scene.find(n => n.rawName === name)!);
  const division = scene.find(n => n.rawName === 'Anterior division of superior trunk of brachial plexus.l')!;
  for (const p of [path('divisions'), path('divisions', 'superior', 'anterior', 'left')]) {
    const plan = planRegionIsolation(scene, 'nervous', p, n => brachialPathForGroup(n, p))!;
    assert.ok(plan);
    const context = brachialContextIds(scene, p);
    const foreground = brachialForegroundIds(scene, p);
    for (const n of [...central, ...surrounds]) {
      assert.ok(plan.show.includes(n.instanceID), n.rawName);
      assert.ok(context.includes(n.instanceID), n.rawName);
      assert.ok(!foreground.includes(n.instanceID), n.rawName);
      assert.ok(isNodeInRegion(n, p, () => null), n.rawName);
    }
    assert.ok(plan.show.includes(division.instanceID));
    assert.ok(foreground.includes(division.instanceID));
    assert.ok(!context.includes(division.instanceID));
    if (p.includes('left')) {
      for (const name of ['Scapula.r', 'Clavicle.r', 'Roots of brachial plexus.r', 'Middle trunk of brachial plexus.r']) {
        assert.ok(plan.hide.includes(scene.find(n => n.rawName === name)!.instanceID), name);
      }
    }
    for (const name of ['Vertebra T3', 'White matter of spinal cord', 'Pons.r', 'Median nerve.l', 'Anterior division of mandibular nerve.l']) {
      assert.ok(plan.hide.includes(scene.find(n => n.rawName === name)!.instanceID), name);
    }
  }
  const html = renderToStaticMarkup(createElement(BrachialPlexusMenu, {
    variant: 'sidebar', nodes: scene, activeNerveId: path('divisions').join('/'),
    onActivateNerve: () => {}, isolatedRegionPath: null, onIsolateRegion: () => {},
    onRestoreRegion: () => {}, onSetRegionVisibility: () => {}, selectedNodeId: null,
  }));
  assert.match(html, /Surrounding anatomy \(semitransparent\)/);
  const contextGroup = BRACHIAL_GROUPS.find(g => g.id === path('divisions').join('/'))?.children
    ?.find(g => g.id === path('divisions', 'context').join('/'));
  assert.ok(contextGroup?.children?.some(g => g.label === 'Cervical vertebrae C1–C7 and Th1–Th2 (semitransparent)'));
});
