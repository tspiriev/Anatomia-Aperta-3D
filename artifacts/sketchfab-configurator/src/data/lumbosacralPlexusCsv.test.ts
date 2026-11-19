import test from 'node:test';
import assert from 'node:assert/strict';
import nervousCsv from '@assets/0_Nervous_system_CLean_1792048160226.csv?raw';
import muscularCsv from '@assets/0_Final_Muscles_fused__1791947151699.csv?raw';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { LUMBAR_NERVES, SACRAL_NERVES, LOWER_LIMB_NERVES, LUMBOSACRAL_ROOT_PATH,
  LUMBOSACRAL_GROUPS, lumbosacralPathForGroup, lumbosacralSystemForName, lumbosacralContextIds, lumbosacralForegroundIds } from './lumbosacralPlexusTaxonomy';
import { LOWER_LIMB_DISTAL_BRANCHES } from './lowerLimbBranches';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import type { SceneNode } from '../types/sketchfab';

function meshes(csv: string): SceneNode[] {
  const [header, ...rows] = [...csvRows(csv)];
  const field = (row: string[], name: string) => row[header.indexOf(name)];
  const names = rows.filter(row => field(row, 'row_type') === 'OBJECT' && field(row, 'object_type') === 'MESH')
    .map(row => field(row, 'object_name'));
  return [...new Set(names)].map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
    systemId: systemForMeshName(rawName) ?? undefined,
  }));
}
const nerves = meshes(nervousCsv);
const muscles = meshes(muscularCsv);
const path = (...parts: string[]) => [...LUMBOSACRAL_ROOT_PATH, ...parts];
const get = (name: string) => {
  const node = nerves.find(node => node.rawName === name);
  assert.ok(node, `CSV source mesh: ${name}`);
  return node;
};

test('all source main nerves match the approved collections, including repeated memberships and both sides', () => {
  const mapped = new Set<string>();
  for (const [section, entries] of [
    ['lumbar', LUMBAR_NERVES], ['sacral', SACRAL_NERVES], ['lower-limb', LOWER_LIMB_NERVES],
  ] as const) {
    for (const entry of entries) {
      const requested = path(section, entry.id);
      const members = nerves.filter(node => lumbosacralPathForGroup(node, requested)?.length === requested.length);
      if (['accessory-obturator', 'obturator-internus'].includes(entry.id)) {
        assert.equal(members.length, 0, `${entry.id} is absent from this export`);
        continue;
      }
      assert.equal(members.length, 2, entry.id);
      for (const side of ['left', 'right']) {
        assert.equal(members.filter(node => lumbosacralPathForGroup(node, [...requested, side])).length, 1, `${entry.id} ${side}`);
      }
      members.forEach(node => {
        mapped.add(node.rawName);
        assert.equal(node.systemId, 'nervous', node.rawName);
      });
    }
  }
  assert.equal(mapped.size, 42);
});

test('CSV root geometry is shared at L4, and spinal roots never substitute for the absent L1 plexus root', () => {
  assert.equal(nerves.filter(node => lumbosacralPathForGroup(node, path('lumbar', 'roots', 'l1'))).length, 0);
  for (const [section, levels] of [
    ['lumbar', ['L2', 'L3', 'L4']], ['sacral', ['L4', 'L5', 'S1', 'S2', 'S3', 'S4']],
  ] as const) {
    for (const level of levels) {
      assert.equal(nerves.filter(node => lumbosacralPathForGroup(node, path(section, 'roots', level.toLowerCase()))).length, 2);
    }
  }
  for (const name of ['Lumbar plexus.l', 'Lumbar plexus.r'])
    assert.ok(lumbosacralPathForGroup(get(name), path('lumbar', 'roots')));
  for (const name of ['L1 anterior root.l', 'L1 posterior root.l'])
    {
      assert.ok(lumbosacralPathForGroup(get(name), path('lumbar', 'spinal-roots')));
      assert.equal(lumbosacralPathForGroup(get(name), path('lumbar', 'roots')), null);
    }
});

test('misplaced CSV entries and inconsistent spellings follow the approved anatomical groups, not collection location', () => {
  for (const name of ['Pudental nerve.r', 'Nerve to piriformis muscle.l', 'S1 root left', 'S3 root.l']) {
    assert.ok(lumbosacralPathForGroup(get(name), path('sacral')), name);
    assert.equal(lumbosacralPathForGroup(get(name), path('lumbar')), null, name);
  }
  for (const name of ['Ilio-inguinal nerve.l', 'Iliohypogastric nerve.r.', 'Genitofemoral nerve.r'])
    assert.ok(lumbosacralPathForGroup(get(name), path('lumbar')), name);
  // Branches overlap their parent plexus and Lower limb nerves.
  for (const name of ['Femoral branch of genitofemoral nerve.r', 'Anterior branch of obturator nerve.l',
    'Muscular branches of deep fibular nerve.l', 'Infrapatellar branch of saphenous nerve.r'])
    {
      assert.ok(lumbosacralPathForGroup(get(name), path('lower-limb')), name);
      const section = name.startsWith('Muscular branches') ? 'sacral' : 'lumbar';
      assert.ok(lumbosacralPathForGroup(get(name), path(section)), name);
      assert.equal(lumbosacralPathForGroup(get(name), path(section === 'lumbar' ? 'sacral' : 'lumbar')), null, name);
    }
});

test('latest muscular CSV targets remain muscular and semitransparent, not tendons, fasciae, bursae or ligaments', () => {
  const targets = muscles.filter(node => lumbosacralSystemForName(node.rawName) === 'muscular');
  for (const name of ['Tensor fasciae latae.l', 'Tensor fasciae latae.r']) {
    const excluded = muscles.find(node => node.rawName === name);
    assert.ok(excluded);
    assert.equal(lumbosacralPathForGroup(excluded, LUMBOSACRAL_ROOT_PATH), null);
  }
  assert.ok(targets.length > 100, 'source targets must not silently disappear');
  const context = new Set(lumbosacralContextIds(targets, LUMBOSACRAL_ROOT_PATH));
  assert.deepEqual(lumbosacralForegroundIds(targets, LUMBOSACRAL_ROOT_PATH), []);
  for (const node of targets) {
    assert.equal(node.systemId, 'muscular', node.rawName);
    assert.ok(lumbosacralPathForGroup(node, LUMBOSACRAL_ROOT_PATH), node.rawName);
    assert.ok(context.has(node.instanceID), node.rawName);
    assert.equal(lumbosacralPathForGroup(node, path('without-muscles')), null, node.rawName);
  }
  for (const name of ['Iliopsoas fascia.l', 'Bursa of piriformis muscle.l', 'Tendon of extensor digitorum longus.l.001']) {
    const node = muscles.find(node => node.rawName === name);
    assert.ok(node, name);
    assert.equal(lumbosacralPathForGroup(node, LUMBOSACRAL_ROOT_PATH), null, name);
  }
});

test('all 66 exported lower-limb nerve meshes include the distal branches from Other branches and Lower limb nerves', () => {
  const mapped = nerves.filter(node => lumbosacralPathForGroup(node, path('lower-limb')));
  assert.equal(mapped.length, 66);
  const [header, ...rows] = [...csvRows(nervousCsv)];
  const nameIndex = header.indexOf('object_name');
  const collectionIndex = header.indexOf('collection_name');
  for (const row of rows.filter(row => row[0] === 'OBJECT' && row[collectionIndex] === 'NS_06_LOWER_LIMB_NERVES'))
    assert.ok(mapped.some(node => node.rawName === row[nameIndex]), row[nameIndex]);
  for (const name of [
    'Dorsal digital branches of superficial fibular nerve.r', 'Dorsal digital branches of deep fibular nerve.l',
    'Intermediate dorsal cutaneous nerve of foot.r', 'Medial dorsal cutaneous nerve of foot.l',
    'Medial sural cutaneous nerve.r', 'Sural communicating branch of common fibular nerve.l',
    'Muscular branches of deep fibular nerve.r', 'Anterior cutaneous branches of femoral nerve.l',
    'Posterior branch of obturator nerve.r', 'Inferior cluneal nerves.l', 'Medial clluneal nerves.r',
    'Superior cluneal nerves.l', 'Anterior root of posterior femoral cutaneous nerve.r',
    'Femoral branch of genitofemoral nerve.l',
  ]) assert.ok(mapped.includes(get(name)), name);
  assert.deepEqual(lumbosacralContextIds(mapped, path('lower-limb')), []);
  assert.equal(lumbosacralForegroundIds(mapped, path('lower-limb')).length, 66);
});

test('distal branches have individual browsable subgroups under their parent nerve', () => {
  const lower = LUMBOSACRAL_GROUPS.find(group => group.id.endsWith('/lower-limb'))!;
  for (const [id, definitions] of Object.entries(LOWER_LIMB_DISTAL_BRANCHES)) {
    const parent = lower.children!.find(group => group.id.endsWith(`/${id}`))!;
    const branches = parent.children!.find(group => group.id.endsWith('/branches'))!;
    assert.deepEqual(branches.children!.map(group => group.label), definitions.map(definition => definition.label));
    for (const subgroup of branches.children!) {
      const matches = nerves.filter(node => lumbosacralPathForGroup(node, subgroup.id.split('/')));
      assert.equal(matches.length, 2, subgroup.label);
      for (const node of matches) assert.equal(node.systemId, 'nervous', node.rawName);
    }
  }
});

test('sciatic, tibial and common fibular isolation follow downstream foot nerves with correct side and muscle controls', () => {
  for (const [id, examples] of [
    ['sciatic', ['Proper plantar digital branches of lateral plantar nerve.l', 'Dorsal digital branches of deep fibular nerve.l']],
    ['tibial', ['Proper plantar digital branches of medial plantar nerve.l', 'Common plantar digital branches of lateral plantar nerve.l']],
    ['common-fibular', ['Dorsal digital branches of superficial fibular nerve.l', 'Medial dorsal cutaneous nerve of foot.l']],
  ] as const) {
    const requested = path('lower-limb', id, 'left', 'without-muscles');
    const plan = planRegionIsolation(nerves, 'nervous', requested, node => advancedNeuroanatomyPathForGroup(node, requested))!;
    assert.ok(plan);
    for (const name of examples) {
      const node = get(name);
      assert.ok(plan.show.includes(node.instanceID), name);
      assert.ok(isNodeInRegion(node, requested, () => null), name);
      assert.ok(plan.hide.includes(get(name.replace(/\.l$/, '.r')).instanceID));
    }
    assert.ok(plan.hide.includes(get('Saphenous nerve.l').instanceID));
    if (id === 'tibial') assert.ok(plan.hide.includes(get('Deep fibular nerve.l').instanceID));
    if (id === 'common-fibular') assert.ok(plan.hide.includes(get('Tibial nerve.l').instanceID));
  }
});

test('unsided plantar digital mesh stays Both-only, without inferring missing right geometry', () => {
  const node = get('Common plantar digital branches of medial plantar nerve');
  const requested = path('lower-limb', 'medial-plantar', 'branches', 'common-plantar-digital');
  assert.ok(lumbosacralPathForGroup(node, requested));
  assert.equal(lumbosacralPathForGroup(node, [...requested, 'left']), null);
  assert.equal(lumbosacralPathForGroup(node, [...requested, 'right']), null);
  assert.ok(lumbosacralPathForGroup(get('Common plantar digital branches of medial plantar nerve.l'), [...requested, 'left']));
  assert.equal(lumbosacralPathForGroup(get('Genital branch of genitofemoral nerve.l'), path('lower-limb')), null);
  assert.equal(lumbosacralPathForGroup(get('Pudendal nerve.l'), path('lower-limb')), null);
});

test('every nerve in all regional CSV folders is included, despite misplaced source collections', () => {
  const regionalFolders = new Set(['NS_01_PLEXUS_AND_ROOTS', 'NS_02_FEMORAL_NERVE',
    'NS_03_OBTURATOR_NERVE', 'NS_04_OTHER_BRANCHES', 'Lumbar plexus', 'NS_02_SCIATIC_NERVE',
    'NS_03_GLUTEAL_NERVES', 'NS_04_OTHER_BRANCHES_01', 'NS_06_LOWER_LIMB_NERVES']);
  const [header, ...rows] = [...csvRows(nervousCsv)];
  const field = (row: string[], key: string) => row[header.indexOf(key)];
  const regional = rows.filter(row => field(row, 'row_type') === 'OBJECT'
    && field(row, 'object_type') === 'MESH' && regionalFolders.has(field(row, 'collection_name')));
  assert.ok(regional.length >= 100);
  for (const row of regional) {
    const name = field(row, 'object_name');
    assert.ok(lumbosacralPathForGroup(get(name), LUMBOSACRAL_ROOT_PATH), name);
  }
  for (const node of nerves) {
    const name = node.rawName;
    const scopes: string[][] = [];
    if (/genitofemoral/.test(name)) scopes.push(['lumbar', 'genitofemoral']);
    else if (/saphenous/.test(name)) scopes.push(['lumbar', 'femoral'], ['lower-limb', 'femoral'], ['lower-limb', 'saphenous']);
    else if (/^(Femoral nerve|Anterior cutaneous branches of femoral)/.test(name))
      scopes.push(['lumbar', 'femoral'], ['lower-limb', 'femoral']);
    else if (/^(Obturator nerve|Anterior branch of obturator|Posterior branch of obturator)/.test(name))
      scopes.push(['lumbar', 'obturator'], ['lower-limb', 'obturator']);
    else if (/posterior femoral cutaneous|Posterior femoral cutaneous|Inferior cluneal/.test(name))
      scopes.push(['sacral', 'posterior-femoral-cutaneous']);
    else if (/Superior cluneal/.test(name)) scopes.push(['lumbar', 'other-cutaneous']);
    else if (/Medial clluneal/.test(name)) scopes.push(['sacral', 'other-cutaneous']);
    else if (/sciatic|Sciatic|fibular nerve|Tibial nerve|Sural nerve|sural cutaneous|plantar nerve|dorsal cutaneous nerve of foot/.test(name))
      scopes.push(['sacral', 'sciatic']);
    for (const scope of scopes) assert.ok(lumbosacralPathForGroup(node, path(...scope)), `${name}: ${scope.join('/')}`);
  }
});

test('femoral branches include the full exported saphenous pathway, with side and muscle controls', () => {
  for (const section of ['lumbar', 'lower-limb']) {
    const requested = path(section, 'femoral');
    assert.equal(nerves.filter(node => lumbosacralPathForGroup(node, requested)).length, 10);
    for (const side of ['left', 'right']) {
      const selected = [...requested, side, 'without-muscles'];
      const plan = planRegionIsolation(nerves, 'nervous', selected, node => advancedNeuroanatomyPathForGroup(node, selected))!;
      const foreground = lumbosacralForegroundIds(nerves, selected);
      const suffix = side === 'left' ? 'l' : 'r';
      for (const name of ['Femoral nerve', 'Anterior cutaneous branches of femoral nerve', 'Saphenous nerve',
        'Infrapatellar branch of saphenous nerve', 'Medial crural cutaneous branches of saphenous nerve']) {
        const node = get(`${name}.${suffix}`);
        assert.ok(plan.show.includes(node.instanceID), node.rawName);
        assert.ok(foreground.includes(node.instanceID), node.rawName);
        assert.ok(isNodeInRegion(node, selected, () => null), node.rawName);
      }
      assert.ok(plan.hide.includes(get(`Femoral branch of genitofemoral nerve.${suffix}`).instanceID));
      assert.ok(plan.hide.includes(get(`Obturator nerve.${suffix}`).instanceID));
    }
  }
});

test('current shared nervous inventory covers all lumbar/sacral spinal roots, dura and filum without importing unrelated CNS anatomy', () => {
  for (const [section, levels, total] of [
    ['lumbar', ['L1', 'L2', 'L3', 'L4'], 16],
    ['sacral', ['L4', 'L5', 'S1', 'S2', 'S3', 'S4'], 24],
  ] as const) {
    const selected = path(section, 'spinal-roots');
    assert.equal(nerves.filter(node => lumbosacralPathForGroup(node, selected)).length, total);
    for (const level of levels) {
      for (const direction of ['anterior', 'posterior']) {
        for (const side of ['left', 'right'])
          assert.equal(nerves.filter(node => lumbosacralPathForGroup(node,
            [...selected, direction, level.toLowerCase(), side])).length, 1, `${section}: ${level} ${direction} ${side}`);
      }
    }
    assert.ok(lumbosacralPathForGroup(get('Spinal dura'), path(section, 'context', 'spinal-dura')));
  }
  assert.ok(lumbosacralPathForGroup(get('Filum terminale'), path('sacral', 'context', 'filum-terminale')));
  assert.equal(lumbosacralPathForGroup(get('Filum terminale'), path('lumbar')), null);
  assert.equal(lumbosacralPathForGroup(get('Dura mater brain'), LUMBOSACRAL_ROOT_PATH), null);
  assert.equal(lumbosacralPathForGroup(get('Median nerve.l'), LUMBOSACRAL_ROOT_PATH), null);
});

test('all source sacral nerves and their complete downstream branches are visible and opaque, not omitted by bone context', () => {
  const requested = path('sacral', 'without-muscles');
  const members = nerves.filter(node => lumbosacralPathForGroup(node, requested));
  assert.equal(members.length, 97);
  const plan = planRegionIsolation(nerves, 'nervous', requested, node => advancedNeuroanatomyPathForGroup(node, requested))!;
  const foreground = new Set(lumbosacralForegroundIds(nerves, requested));
  for (const node of members) {
    assert.ok(plan.show.includes(node.instanceID), node.rawName);
    assert.ok(isNodeInRegion(node, requested, () => null), node.rawName);
    assert.equal(foreground.has(node.instanceID), node.rawName !== 'Spinal dura', node.rawName);
  }
  for (const name of ['Superior gluteal nerve.l', 'Inferior gluteal nerve.r', 'Nerve to piriformis muscle.l',
    'Nerve to quadratus femoris muscle.r', 'Posterior femoral cutaneous nerve.l', 'Pudental nerve.r', 'Sciatic nerve.l',
    'Anterior root of posterior femoral cutaneous nerve.r', 'Inferior cluneal nerves.l', 'Medial clluneal nerves.r',
    'Tibial nerve.l', 'Common fibular nerve.r', 'Deep fibular nerve.l', 'Superficial fibular nerve.r',
    'Sural nerve.l', 'Medial plantar nerve.r', 'Lateral plantar nerve.l',
    'Proper plantar digital branches of lateral plantar nerve.r', 'Dorsal digital branches of deep fibular nerve.l'])
    assert.ok(foreground.has(get(name).instanceID), name);
  // Retain a selectable live-model group even though this CSV has no separate obturator-internus nerve mesh.
  assert.ok(LUMBOSACRAL_GROUPS[1].children!.some(group => group.id.endsWith('/obturator-internus')));
  assert.ok(plan.hide.includes(get('Femoral nerve.l').instanceID));
});
