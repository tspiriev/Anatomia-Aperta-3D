import test from 'node:test';
import assert from 'node:assert/strict';
import csv from '@assets/First_combinedblend_1790668070052.csv?raw';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { LUMBOSACRAL_ROOT_PATH, LUMBOSACRAL_GROUPS, lumbosacralPathForGroup,
  lumbosacralContextIds, lumbosacralForegroundIds } from './lumbosacralPlexusTaxonomy';
import { lumbarPlexusAnatomyPath } from './lumbarPlexusContext';
import { isNodeAllowedInAtlasView, LUMBOSACRAL_PLEXUS_VIEW } from './atlasViews';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

const names = [...new Set([...csvRows(csv)].filter(row => row[0] === 'OBJECT' && row[5] === 'MESH').map(row => row[4]))];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName) ?? undefined,
}));
const get = (name: string) => { const node = nodes.find(node => node.rawName === name); assert.ok(node, name); return node; };
const p = (...parts: string[]) => [...LUMBOSACRAL_ROOT_PATH, 'lumbar', ...parts];

test('CSV lumbar vertebrae, paired hip bones, sacrum and spinal cord belong to both plexuses, not Lower limb nerves', () => {
  const bones = ['Vertebra L1', 'Vertebra L2', 'Vertebra L3', 'Vertebra L4', 'Vertebra L5', 'Hip bone.l', 'Hip bone.r', 'Sacrum'];
  const cord = ['White matter of spinal cord', 'Anterior horn of spinal cord', 'Posterior horn of spinal cord'];
  const context = new Set(lumbosacralContextIds(nodes, p()));
  const foreground = new Set(lumbosacralForegroundIds(nodes, p()));
  for (const name of [...bones, ...cord]) {
    const node = get(name);
    assert.ok(isNodeAllowedInAtlasView(node, LUMBOSACRAL_PLEXUS_VIEW), name);
    assert.ok(lumbosacralPathForGroup(node, p('context')), name);
    assert.equal(context.has(node.instanceID), bones.includes(name), name);
    assert.equal(foreground.has(node.instanceID), cord.includes(name), name);
    assert.ok(lumbosacralPathForGroup(node, [...LUMBOSACRAL_ROOT_PATH, 'sacral', 'context']), name);
    assert.equal(lumbosacralPathForGroup(node, [...LUMBOSACRAL_ROOT_PATH, 'lower-limb']), null, name);
    assert.ok(lumbosacralPathForGroup({ ...node, rawName: `${name}.001_123` }, p()), name);
  }
  for (const name of ['Vertebra Th12', 'Humerus.l', 'Lumbar vertebral venous plexus']) {
    assert.equal(lumbarPlexusAnatomyPath(name), null, name);
  }
});
test('sacral nerve/root isolation retains the opaque cord and semitransparent side-matched bone context', () => {
  for (const parts of [['sciatic'], ['roots', 's1']]) {
    for (const side of ['left', 'right']) {
      const path = [...LUMBOSACRAL_ROOT_PATH, 'sacral', ...parts, side, 'without-muscles'];
      const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
      assert.ok(plan);
      const faded = new Set(lumbosacralContextIds(nodes, path));
      const opaque = new Set(lumbosacralForegroundIds(nodes, path));
      for (const name of ['Vertebra L1', 'Vertebra L5', 'Sacrum', `Hip bone.${side === 'left' ? 'l' : 'r'}`,
        'White matter of spinal cord', 'Anterior horn of spinal cord', 'Posterior horn of spinal cord']) {
        const node = get(name);
        assert.ok(plan.show.includes(node.instanceID), name);
        assert.ok(isNodeInRegion(node, path, () => null), name);
        assert.equal(faded.has(node.instanceID), node.systemId === 'skeletal', name);
        assert.equal(opaque.has(node.instanceID), node.systemId === 'nervous', name);
      }
      assert.ok(plan.hide.includes(get(`Hip bone.${side === 'left' ? 'r' : 'l'}`).instanceID));
      assert.ok(plan.hide.includes(get('Semitendinosus muscle.l').instanceID));
      assert.ok(plan.hide.includes(get('Semitendinosus muscle.r').instanceID));
    }
  }
});
test('lumbar nerve/root isolation retains midline context and matching hip bone even with muscles off', () => {
  for (const parts of [['femoral'], ['roots', 'l2']]) {
    const path = p(...parts, 'left', 'without-muscles');
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.ok(plan);
    const faded = new Set(lumbosacralContextIds(nodes, path));
    for (const name of ['Vertebra L1', 'Vertebra L5', 'Hip bone.l', 'Sacrum', 'White matter of spinal cord']) {
      const node = get(name);
      assert.ok(plan.show.includes(node.instanceID), name);
      assert.ok(isNodeInRegion(node, path, () => null), name);
      assert.equal(faded.has(node.instanceID), node.systemId === 'skeletal', name);
    }
    assert.ok(plan.hide.includes(get('Hip bone.r').instanceID));
    assert.ok(plan.hide.includes(get('Sartorius muscle.l').instanceID));
  }
});
test('context has separate Hide/Show groups and per-vertebra membership without bringing other context into those actions', () => {
  const lumbar = LUMBOSACRAL_GROUPS[0];
  const context = lumbar.children!.find(group => group.id.endsWith('/context'))!;
  assert.deepEqual(context.children!.map(group => group.id.split('/').at(-1)),
    ['vertebrae', 'iliac-bones', 'sacrum', 'spinal-cord', 'spinal-dura', 'inguinal-ligament']);
  assert.equal(context.children![0].children!.length, 5);
  assert.ok(lumbosacralPathForGroup(get('Vertebra L3'), p('context', 'vertebrae', 'l3')));
  assert.equal(lumbosacralPathForGroup(get('Vertebra L2'), p('context', 'vertebrae', 'l3')), null);
  const path = p('context', 'sacrum', 'right');
  const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
  assert.deepEqual(plan.show, [get('Sacrum').instanceID]);
  const sacral = LUMBOSACRAL_GROUPS[1].children!.find(group => group.id.endsWith('/context'))!;
  assert.deepEqual(sacral.children!.map(group => group.id.split('/').at(-1)),
    ['vertebrae', 'iliac-bones', 'sacrum', 'spinal-cord', 'spinal-dura', 'filum-terminale', 'lower-limb-bones']);
  assert.equal(sacral.children![0].children!.length, 5);
  for (const part of ['sacrum', 'spinal-cord', 'vertebrae', 'iliac-bones']) {
    const selected = [...LUMBOSACRAL_ROOT_PATH, 'sacral', 'context', part];
    const isolated = planRegionIsolation(nodes, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!;
    assert.ok(isolated);
    for (const id of isolated.show) {
      const node = nodes.find(node => node.instanceID === id)!;
      assert.equal(lumbarPlexusAnatomyPath(node.rawName)?.[0], part);
    }
  }
});
test('all 16 lumbar anterior/posterior roots have level and side controls; spinal dura stays semitransparent', () => {
  const rootGroup = LUMBOSACRAL_GROUPS[0].children!.find(group => group.id.endsWith('/spinal-roots'))!;
  assert.equal(rootGroup.children!.length, 2);
  for (const direction of ['anterior', 'posterior']) {
    const group = rootGroup.children!.find(group => group.id.endsWith(`/${direction}`))!;
    assert.equal(group.children!.length, 4);
    for (const level of [1, 2, 3, 4]) {
      const path = p('spinal-roots', direction, `l${level}`);
      const roots = nodes.filter(node => lumbosacralPathForGroup(node, path));
      assert.equal(roots.length, 2, `L${level} ${direction}`);
      for (const side of ['left', 'right']) {
        const selected = [...path, side, 'without-muscles'];
        const plan = planRegionIsolation(nodes, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!;
        assert.ok(plan);
        assert.equal(roots.filter(node => plan.show.includes(node.instanceID)).length, 1);
        assert.ok(plan.show.includes(get('Spinal dura').instanceID));
        assert.ok(lumbosacralContextIds(nodes, selected).includes(get('Spinal dura').instanceID));
        assert.ok(!lumbosacralForegroundIds(nodes, selected).includes(get('Spinal dura').instanceID));
        assert.equal(roots.filter(node => lumbosacralForegroundIds(nodes, selected).includes(node.instanceID)).length, 1);
      }
    }
  }
  const dura = get('Spinal dura');
  const duraPath = p('context', 'spinal-dura', 'left');
  const isolated = planRegionIsolation(nodes, 'nervous', duraPath, node => advancedNeuroanatomyPathForGroup(node, duraPath))!;
  assert.deepEqual(isolated.show, [dura.instanceID]);
  for (const section of ['lower-limb']) {
    const requested = [...LUMBOSACRAL_ROOT_PATH, section];
    assert.equal(lumbosacralPathForGroup(dura, requested), null);
    assert.ok(!lumbosacralContextIds(nodes, requested).includes(dura.instanceID));
  }
  assert.equal(lumbarPlexusAnatomyPath('Dura mater brain'), null);
  assert.equal(lumbosacralPathForGroup(get('L5 anterior root.l'), p('spinal-roots')), null);
});
test('all 24 sacral L4–S4 anterior/posterior roots are selectable separately, with opaque filum and semitransparent dura', () => {
  const rootGroup = LUMBOSACRAL_GROUPS[1].children!.find(group => group.id.endsWith('/spinal-roots'))!;
  const levels = ['L4', 'L5', 'S1', 'S2', 'S3', 'S4'];
  for (const direction of ['anterior', 'posterior']) {
    const group = rootGroup.children!.find(group => group.id.endsWith(`/${direction}`))!;
    assert.equal(group.children!.length, 6);
    for (const level of levels) {
      const requested = [...LUMBOSACRAL_ROOT_PATH, 'sacral', 'spinal-roots', direction, level.toLowerCase()];
      const roots = nodes.filter(node => lumbosacralPathForGroup(node, requested));
      assert.equal(roots.length, 2, `${level} ${direction}`);
      for (const side of ['left', 'right']) {
        const selected = [...requested, side, 'without-muscles'];
        const plan = planRegionIsolation(nodes, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!;
        assert.ok(plan);
        assert.equal(roots.filter(node => plan.show.includes(node.instanceID)).length, 1);
        const context = lumbosacralContextIds(nodes, selected);
        const foreground = lumbosacralForegroundIds(nodes, selected);
        for (const name of ['Filum terminale', 'Spinal dura']) {
          const node = get(name);
          assert.ok(plan.show.includes(node.instanceID), name);
          assert.ok(isNodeInRegion(node, selected, () => null), name);
          assert.equal(context.includes(node.instanceID), name === 'Spinal dura', name);
          assert.equal(foreground.includes(node.instanceID), name === 'Filum terminale', name);
        }
        assert.equal(roots.filter(node => foreground.includes(node.instanceID)).length, 1);
      }
    }
  }
  const filum = get('Filum terminale');
  assert.ok(isNodeAllowedInAtlasView(filum, LUMBOSACRAL_PLEXUS_VIEW));
  assert.ok(lumbosacralPathForGroup({ ...filum, rawName: 'Filum terminale.001_123' }, [...LUMBOSACRAL_ROOT_PATH, 'sacral']));
  for (const part of ['spinal-dura', 'filum-terminale']) {
    const requested = [...LUMBOSACRAL_ROOT_PATH, 'sacral', 'context', part, 'right'];
    const plan = planRegionIsolation(nodes, 'nervous', requested, node => advancedNeuroanatomyPathForGroup(node, requested))!;
    assert.deepEqual(plan.show, [get(part === 'spinal-dura' ? 'Spinal dura' : 'Filum terminale').instanceID]);
  }
  assert.equal(lumbosacralPathForGroup(filum, p()), null);
  assert.equal(lumbosacralPathForGroup(filum, [...LUMBOSACRAL_ROOT_PATH, 'lower-limb']), null);
  assert.equal(lumbosacralPathForGroup(get('L3 anterior root.l'), [...LUMBOSACRAL_ROOT_PATH, 'sacral']), null);
  assert.ok(lumbosacralPathForGroup(get('L4 anterior root.l'), p('spinal-roots', 'anterior', 'l4')));
  assert.ok(lumbosacralPathForGroup(get('L4 anterior root.l'), [...LUMBOSACRAL_ROOT_PATH, 'sacral', 'spinal-roots', 'anterior', 'l4']));
});

test('lumbar inguinal ligaments have independent side-matched controls and remain semitransparent with femoral branches', () => {
  for (const side of ['left', 'right']) {
    const suffix = side === 'left' ? 'l' : 'r';
    const ligament = get(`Inguinal ligament.${suffix}`);
    const opposite = get(`Inguinal ligament.${suffix === 'l' ? 'r' : 'l'}`);
    const requested = p('femoral', side, 'without-muscles');
    const plan = planRegionIsolation(nodes, 'nervous', requested, node => advancedNeuroanatomyPathForGroup(node, requested))!;
    assert.ok(plan.show.includes(ligament.instanceID));
    assert.ok(plan.hide.includes(opposite.instanceID));
    assert.ok(lumbosacralContextIds(nodes, requested).includes(ligament.instanceID));
    assert.ok(!lumbosacralForegroundIds(nodes, requested).includes(ligament.instanceID));
    const isolated = p('context', 'inguinal-ligament', side);
    assert.deepEqual(planRegionIsolation(nodes, 'nervous', isolated, node => advancedNeuroanatomyPathForGroup(node, isolated))!.show,
      [ligament.instanceID]);
    assert.ok(lumbosacralPathForGroup({ ...ligament, rawName: `${ligament.rawName}.001_123` }, p()));
    for (const section of ['sacral', 'lower-limb'])
      assert.equal(lumbosacralPathForGroup(ligament, [...LUMBOSACRAL_ROOT_PATH, section]), null);
  }
});

test('Cauda equina includes all 36 L1–S4 spinal roots, fused sacrum, lumbar bones, discs, cord, dura and filum only', () => {
  const path = [...LUMBOSACRAL_ROOT_PATH, 'cauda-equina'];
  const rootsPath = [...path, 'spinal-roots'];
  const members = nodes.filter(node => lumbosacralPathForGroup(node, path));
  assert.equal(members.length, 53);
  assert.equal(nodes.filter(node => lumbosacralPathForGroup(node, rootsPath)).length, 36);
  assert.equal(lumbosacralContextIds(nodes, path).length, 13, '6 bones, 6 discs and spinal dura');
  assert.equal(lumbosacralForegroundIds(nodes, path).length, 40, '36 roots, three cord meshes and filum');
  for (const node of members) assert.ok(isNodeAllowedInAtlasView(node, LUMBOSACRAL_PLEXUS_VIEW), node.rawName);
  const group = LUMBOSACRAL_GROUPS.find(group => group.id.endsWith('/cauda-equina'))!;
  const rootGroup = group.children!.find(group => group.id.endsWith('/spinal-roots'))!;
  assert.equal(rootGroup.children!.length, 2);
  for (const direction of ['anterior', 'posterior']) {
    assert.equal(rootGroup.children!.find(group => group.id.endsWith(`/${direction}`))!.children!.length, 9);
    for (const level of ['l1', 'l2', 'l3', 'l4', 'l5', 's1', 's2', 's3', 's4']) {
      const selected = [...rootsPath, direction, level];
      assert.equal(nodes.filter(node => lumbosacralPathForGroup(node, selected)).length, 2, `${direction} ${level}`);
    }
  }
  const context = group.children!.find(group => group.id.endsWith('/context'))!;
  assert.deepEqual(context.children!.map(group => group.id.split('/').at(-1)),
    ['vertebrae', 'sacrum', 'spinal-cord', 'spinal-dura', 'filum-terminale', 'intervertebral-discs']);
  for (const name of ['Hip bone.l', 'Inguinal ligament.r', 'Femoral nerve.l', 'L4 root.l', 'Sciatic nerve.l',
    'Intervertebral disc T11-T12', 'Intervertebral disc C2-C3', 'Interpubic disc', 'Vertebra T12']) {
    const node = get(name);
    assert.equal(lumbosacralPathForGroup(node, path), null, name);
    assert.ok(!isNodeInRegion(node, path, () => null), name);
  }
});

test('Cauda equina side filters preserve midline context while root isolation keeps bones/discs faded and nerves opaque', () => {
  const path = [...LUMBOSACRAL_ROOT_PATH, 'cauda-equina'];
  for (const side of ['left', 'right']) {
    const whole = [...path, side, 'without-muscles'];
    assert.equal(nodes.filter(node => lumbosacralPathForGroup(node, whole)).length, 35);
    const selected = [...path, 'spinal-roots', 'posterior', 'l2', side, 'without-muscles'];
    const plan = planRegionIsolation(nodes, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!;
    assert.equal(plan.show.length, 18, 'one side-specific root plus 17 retained context meshes');
    assert.equal(lumbosacralContextIds(nodes, selected).length, 13);
    assert.equal(lumbosacralForegroundIds(nodes, selected).length, 5, 'selected root plus three opaque cord meshes and filum');
    for (const name of ['Spinal dura', 'White matter of spinal cord', 'Filum terminale', 'Sacrum',
      'Vertebra L1', 'Vertebra L5', 'Intervertebral disc T12-L1', 'Intervertebral disc L5-S1']) {
      const node = get(name);
      assert.ok(plan.show.includes(node.instanceID), name);
      assert.ok(isNodeInRegion(node, selected, () => null), name);
    }
    const left = get('L2 posterior root.l.001');
    const right = get('L2 posterior root.r');
    assert.ok(plan.show.includes((side === 'left' ? left : right).instanceID));
    assert.ok(plan.hide.includes((side === 'left' ? right : left).instanceID));
  }
});

test('entering Cauda equina automatically shows all six semitransparent discs without a switch and excludes every muscle', () => {
  const base = [...LUMBOSACRAL_ROOT_PATH, 'cauda-equina'];
  for (const modifiers of [[], ['without-muscles'], ['left', 'without-muscles'], ['right', 'without-muscles']]) {
    const path = [...base, ...modifiers];
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    const context = new Set(lumbosacralContextIds(nodes, path));
    const foreground = new Set(lumbosacralForegroundIds(nodes, path));
    for (const level of ['T12-L1', 'L1-L2', 'L2-L3', 'L3-L4', 'L4-L5', 'L5-S1']) {
      const disc = get(`Intervertebral disc ${level}`);
      assert.ok(plan.show.includes(disc.instanceID), `${level} is shown on category selection`);
      assert.ok(context.has(disc.instanceID), `${level} receives semitransparent context opacity`);
      assert.ok(!foreground.has(disc.instanceID), `${level} must not become opaque`);
    }
    for (const muscle of nodes.filter(node => node.systemId === 'muscular'))
      assert.ok(!plan.show.includes(muscle.instanceID), muscle.rawName);
  }
});

test('Cauda equina context has independent Hide/Show scopes, including each disc, without leaking discs into other collections', () => {
  const path = [...LUMBOSACRAL_ROOT_PATH, 'cauda-equina', 'context'];
  for (const [part, count] of [['vertebrae', 5], ['sacrum', 1], ['spinal-cord', 3], ['spinal-dura', 1],
    ['filum-terminale', 1], ['intervertebral-discs', 6]] as const) {
    const selected = [...path, part, 'right'];
    const plan = planRegionIsolation(nodes, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!;
    assert.equal(plan.show.length, count, part);
    for (const id of plan.show)
      assert.equal(lumbarPlexusAnatomyPath(nodes.find(node => node.instanceID === id)!.rawName)?.[0], part);
  }
  for (const level of ['T12-L1', 'L1-L2', 'L2-L3', 'L3-L4', 'L4-L5', 'L5-S1']) {
    const node = get(`Intervertebral disc ${level}`);
    assert.ok(lumbosacralPathForGroup(node, LUMBOSACRAL_ROOT_PATH), 'disc must be admitted to atlas');
    const selected = [...path, 'intervertebral-discs', level.toLowerCase()];
    assert.deepEqual(planRegionIsolation(nodes, 'nervous', selected, n => advancedNeuroanatomyPathForGroup(n, selected))!.show,
      [node.instanceID]);
    assert.ok(lumbosacralPathForGroup({ ...node, rawName: `${node.rawName}.001_123` }, selected));
    for (const section of ['lumbar', 'sacral', 'lower-limb'])
      assert.equal(lumbosacralPathForGroup(node, [...LUMBOSACRAL_ROOT_PATH, section]), null);
  }
});

test('Sacral plexus includes all 60 exported femur/tibia/fibula and ankle/foot bone meshes as semitransparent context', () => {
  const path = [...LUMBOSACRAL_ROOT_PATH, 'sacral', 'context', 'lower-limb-bones'];
  const members = nodes.filter(node => lumbosacralPathForGroup(node, path));
  assert.equal(members.length, 60);
  assert.deepEqual(lumbosacralForegroundIds(members, path), []);
  assert.equal(lumbosacralContextIds(members, path).length, 60);
  const expected = (name: string) =>
    /^(Femur|Tibia|Fibula|Talus|Calcaneus|Navicular bone|Cuboid bone|(Medial|Intermediate|Lateral) cuneiform bone)\.[lr]$/.test(name)
    || /^(First|Second|Third|Fourth|Fifth) metatarsal bone\.[lr]$/.test(name)
    || /^(Proximal|Middle|Distal) phalanx of (first|second|third|fourth|fifth) finger of foot\.[lr]$/.test(name)
    || /^Sesamoid bones of foot\.[lr]$/.test(name);
  assert.deepEqual(members.map(node => node.rawName).sort(), nodes.filter(node => expected(node.rawName)).map(node => node.rawName).sort());
  for (const node of members) {
    assert.equal(node.systemId, 'skeletal', node.rawName);
    assert.ok(isNodeAllowedInAtlasView(node, LUMBOSACRAL_PLEXUS_VIEW), node.rawName);
    assert.ok(lumbosacralPathForGroup(node, LUMBOSACRAL_ROOT_PATH), node.rawName);
    assert.ok(lumbosacralPathForGroup({ ...node, rawName: `${node.rawName}.001_123` }, path), node.rawName);
    for (const section of ['lumbar', 'lower-limb', 'cauda-equina'])
      assert.equal(lumbosacralPathForGroup(node, [...LUMBOSACRAL_ROOT_PATH, section]), null, node.rawName);
  }
  const sacral = LUMBOSACRAL_GROUPS[1].children!.find(group => group.id.endsWith('/context'))!;
  const bones = sacral.children!.find(group => group.id.endsWith('/lower-limb-bones'))!;
  assert.deepEqual(bones.children!.map(group => group.label), ['Femur', 'Tibia', 'Fibula', 'Ankle and foot bones']);
  for (const name of ['Patella.l', 'Humerus.l', 'Scaphoid bone.l', 'Proximal phalanx of first finger of hand.r',
    'Tibionavicular ligament.l']) assert.equal(lumbosacralPathForGroup(get(name), path), null, name);
});

test('sacral nerve/root isolation retains only side-matched leg bones, with independent bone and foot controls', () => {
  const base = [...LUMBOSACRAL_ROOT_PATH, 'sacral'];
  const bonePath = [...base, 'context', 'lower-limb-bones'];
  const bones = nodes.filter(node => lumbosacralPathForGroup(node, bonePath));
  for (const side of ['left', 'right']) {
    for (const subgroup of [['sciatic'], ['superior-gluteal'], ['roots', 's1'], ['spinal-roots', 'posterior', 's4']]) {
      const selected = [...base, ...subgroup, side, 'without-muscles'];
      const plan = planRegionIsolation(nodes, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!;
      const faded = new Set(lumbosacralContextIds(nodes, selected));
      assert.equal(bones.filter(node => plan.show.includes(node.instanceID)).length, 30, `${subgroup}: ${side}`);
      for (const bone of bones) {
        const matching = bone.rawName.endsWith(side === 'left' ? '.l' : '.r');
        assert.equal(plan.show.includes(bone.instanceID), matching, bone.rawName);
        assert.equal(faded.has(bone.instanceID), matching, bone.rawName);
        assert.equal(isNodeInRegion(bone, selected, () => null), matching, bone.rawName);
      }
    }
    for (const [parts, count] of [
      [['femur'], 1], [['tibia'], 1], [['fibula'], 1], [['foot-ankle'], 27],
      [['foot-ankle', 'tarsals'], 7], [['foot-ankle', 'metatarsals'], 5],
      [['foot-ankle', 'phalanges'], 14], [['foot-ankle', 'sesamoids'], 1],
    ] as const) {
      const selected = [...bonePath, ...parts, side];
      const plan = planRegionIsolation(nodes, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!;
      assert.equal(plan.show.length, count, `${parts}: ${side}`);
      assert.equal(lumbosacralContextIds(nodes, selected).length, count);
    }
    const selected = [...bonePath, 'foot-ankle', 'tarsals', 'medial-cuneiform', side];
    assert.deepEqual(planRegionIsolation(nodes, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!.show,
      [get(`Medial cuneiform bone.${side === 'left' ? 'l' : 'r'}`).instanceID]);
  }
});
