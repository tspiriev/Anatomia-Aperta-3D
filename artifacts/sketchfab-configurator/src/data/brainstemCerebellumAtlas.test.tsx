import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { BRAINSTEM_CEREBELLUM_VIEW, BRAIN_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { AUTONOMIC_SOURCE_OBJECTS } from './autonomicTaxonomy';
import { BRAINSTEM_CEREBELLUM_ROOT as ROOT, BRAINSTEM_CEREBELLUM_GROUPS,
  brainstemCerebellumPathForGroup as pathFor, brainstemCerebellumContextIds as contextIds,
  cerebellarSurfacePart } from './brainstemCerebellumAtlas';
import { brainstemCerebellumDisplay, expandCerebellarDisplayIds } from '../lib/brainstemCerebellumDisplay';
import { BrainstemCerebellumMenu } from '../components/BrainstemCerebellumMenu';
import { planRegionIsolation } from '../lib/regionIsolation';
import { normalizeAdvancedObjectName as key } from './advancedCollection';
import type { SceneNode } from '../types/sketchfab';

const scene: SceneNode[] = [...new Set(AUTONOMIC_SOURCE_OBJECTS.map(row => row.object_name))]
  .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName,
    type: 'MatrixTransform', systemId: 'nervous', visible: false }));
const find = (name: string) => {
  const n = scene.find(n => n.rawName.trim() === name);
  assert.ok(n, `Actual CSV mesh: ${name}`);
  return n;
};
const p = (...parts: string[]) => [...ROOT, ...parts];
function shown(path: readonly string[]) {
  const plan = planRegionIsolation(scene, 'nervous', path, n => pathFor(n, path))!;
  return new Set(plan.show);
}

test('separate atlas uses the new dedicated model and shared category structure without changing Brain', () => {
  assert.equal(BRAINSTEM_CEREBELLUM_VIEW.modelUid, '7f0c31427e24481797eba7369bc4c505');
  assert.equal(BRAIN_VIEW.modelUid, 'fe9c919b91c04fd8b2147106b07e5566');
  assert.equal(BRAINSTEM_CEREBELLUM_VIEW.href, '/atlas/brainstem-and-cerebellum');
  assert.equal(BRAINSTEM_CEREBELLUM_VIEW.brainstemCerebellum, true);
  assert.equal(BRAIN_VIEW.brainstemCerebellum, undefined);
  assert.equal(BRAIN_VIEW.brainGrossAnatomy, true);
  assert.deepEqual(BRAINSTEM_CEREBELLUM_GROUPS.map(g => g.label),
    ['Brainstem and cerebellum gross anatomy', 'Brainstem', 'Cerebellum']);
});

test('all source brainstem and cerebellar collection meshes, including parent objects, enter the opening overview', () => {
  const collections = new Set(['NS_01_CEREBELLUM', 'NS_02_BRAINSTEM_GROSS_ANATOMY', 'NS_03_BRAINSTEM_NUCLEI',
    'Brainstem fibers', 'Auditory', 'Ascending cerebellar', 'Trigeminal', 'Ascending sensory',
    'Medial longitudinal fascicle', 'Cerebellar']);
  const rows = AUTONOMIC_SOURCE_OBJECTS.filter(row => collections.has(row.collection_name)
    || /corticopontine/i.test(row.collection_name)
    || (row.collection_name.startsWith('NS_CN') && /nucl|neucle/i.test(row.object_name)));
  assert.ok(rows.length > 120);
  for (const row of rows) {
    const n = find(row.object_name.trim());
    assert.ok(pathFor(n, ROOT), row.object_name);
    assert.ok(isNodeAllowedInAtlasView(n, BRAINSTEM_CEREBELLUM_VIEW), row.object_name);
  }
  for (const name of ['Optic nerve.r', 'Dentate Gyrus.l', 'Rubrospinal tract']) {
    const n = scene.find(n => n.rawName.trim() === name);
    if (n) assert.equal(pathFor(n, ROOT), null, name);
  }
});

test('redundant Other CSV submenu is removed while its structures remain in existing gross anatomy groups', () => {
  assert.ok(!BRAINSTEM_CEREBELLUM_GROUPS[1].children!.some(g => g.id.endsWith('/other-csv-structures')));
  for (const [raw, part] of [
    ['Pyramid of medulla oblongata.l', 'medulla-oblongata'],
    ['Pyramid of medulla oblongata.r', 'medulla-oblongata'],
    ['Aqueduct of midbrain', 'midbrain'],
    ['Interpeduncular fossa.l', 'midbrain'],
    ['Interpeduncular fossa.r', 'midbrain'],
  ])
    assert.deepEqual(pathFor(find(raw), p('brainstem')), p('brainstem', 'gross-anatomy', part));
});

test('opening and gross anatomy distinguish transparent shells from original nuclei and fibers', () => {
  const overview = shown(ROOT), faded = new Set(contextIds(scene, ROOT));
  for (const name of ['Midbrain.l', 'Pons.r', 'Medulla oblongata.l', 'Thalamus.l',
    'Biventral lobule.l', 'Declive']) {
    const n = find(name);
    assert.ok(overview.has(n.instanceID), name);
    assert.ok(faded.has(n.instanceID), name);
  }
  for (const name of ['Red nucleus.l', 'Dentate_nucleus.r', 'Pontocerebellar fibers.l',
    'Olivocerebellar (Climbing fibers).r']) {
    const n = find(name);
    assert.ok(overview.has(n.instanceID), name);
    assert.ok(!faded.has(n.instanceID), name);
  }
  assert.deepEqual(new Set(contextIds(scene, p('gross-anatomy'))),
    new Set(scene.filter(n => /^(Superior|Inferior) colliculus\./.test(n.rawName)).map(n => n.instanceID)),
    'Colliculi remain semitransparent even in gross-detail views; other gross surfaces keep their materials');
  const gross = shown(p('gross-anatomy'));
  assert.ok(gross.has(find('Declive').instanceID));
  assert.ok(!gross.has(find('Dentate_nucleus.r').instanceID));
});

test('brainstem sensory fiber selections retain only corresponding thalamic relays and auditory cortex', () => {
  const vpl = scene.find(n => /12_Ventral_posterolateral_VPL/.test(n.rawName))!;
  const vpm = scene.find(n => /13_Ventral_posteromedial_VPM/.test(n.rawName))!;
  const mgb = find('Medial geniculate body.r');
  const cortex = find('Transverse temporal gyri.r');
  assert.ok(vpl && vpm);
  for (const [branch, wanted, unwanted] of [
    ['ascending-sensory/medial-lemniscus', vpl, vpm], ['ascending-sensory/trigeminal', vpm, vpl], ['auditory', mgb, vpl],
  ] as const) {
    const path = p('brainstem', 'white-matter', ...branch.split('/')), ids = shown(path);
    assert.ok(ids.has(wanted.instanceID), `${branch}: appropriate sensory thalamic relay`);
    assert.ok(!ids.has(unwanted.instanceID), `${branch}: no unrelated sensory relay`);
    assert.ok(ids.has(find('Thalamus.r').instanceID));
    assert.ok(!contextIds(scene, path).includes(wanted.instanceID));
    assert.equal(ids.has(cortex.instanceID), branch === 'auditory');
    if (branch === 'auditory') assert.ok(contextIds(scene, path).includes(cortex.instanceID));
  }
});

test('cerebellar nuclei and tracts retain vestibular, red, olive and motor-thalamic relays', () => {
  const path = p('cerebellum', 'white-matter'), ids = shown(path);
  for (const name of ['Vestibular nuclei.l', 'Olive.r', 'Red nucleus.l',
    'Dentate_nucleus.r', 'Nucleus_globosus.l', 'Nucleus_fastigii.r', 'Nucleus_emboliformis.l',
    'Dentatorubrothalamic tract.r', 'Interpositothalamic tract.l', 'Fastigiovestibular tract.r']) {
    const n = find(name);
    assert.ok(ids.has(n.instanceID), name);
    assert.ok(!contextIds(scene, path).includes(n.instanceID), name);
  }
  const vl = scene.find(n => /^11_Ventral_lateral_VL/.test(n.rawName))!;
  assert.ok(ids.has(vl.instanceID));
  assert.ok(contextIds(scene, path).includes(find('Thalamus.r').instanceID));
});

test('Cerebellum merges nuclear menus into three independently controllable subgroups', () => {
  const cerebellum = BRAINSTEM_CEREBELLUM_GROUPS[2];
  const nuclei = cerebellum.children!.find(g => g.id.endsWith('/nuclei'))!;
  assert.equal(nuclei.label, 'Cerebellar, brainstem and thalamic nuclei');
  assert.deepEqual(nuclei.children!.map(g => g.label), ['Cerebellar nuclei', 'Brainstem nuclei', 'Thalamic nuclei']);
  assert.ok(!cerebellum.children!.some(g => g.id.endsWith('/associated-nuclei')));
  const examples = [
    ['cerebellar', ['Dentate_nucleus.r', 'Nucleus_globosus.l', 'Nucleus_fastigii.r', 'Nucleus_emboliformis.l']],
    ['brainstem', ['Vestibular nuclei.l', 'Olive.r', 'Red nucleus.l']],
    ['thalamic', scene.filter(n => /^11_Ventral_lateral_VL|^10_Ventral_anterior_VA/.test(n.rawName)).map(n => n.rawName)],
  ] as const;
  const all = shown(nuclei.id.split('/'));
  for (const [subgroup, members] of examples) {
    assert.ok(members.length, subgroup);
    const path = [...nuclei.id.split('/'), subgroup], selected = shown(path);
    for (const member of members) {
      assert.ok(all.has(find(member).instanceID), `Merged parent includes ${member}`);
      assert.ok(selected.has(find(member).instanceID), `${subgroup} includes ${member}`);
    }
    for (const [other, otherMembers] of examples) if (other !== subgroup)
      for (const member of otherMembers)
        assert.ok(!selected.has(find(member).instanceID), `${subgroup} excludes ${member}`);
    assert.ok(!selected.has(find('Dentatorubrothalamic tract.r').instanceID));
    for (const leaf of nuclei.children!.find(g => g.id.endsWith(`/${subgroup}`))!.children!)
      assert.ok(shown(leaf.id.split('/')).size > 0, leaf.label);
  }
});

test('Mollaret triangle excludes dentatorubrothalamic fibers and thalamic shells while retaining its nuclei and other limbs', () => {
  const path = p('cerebellum', 'mollaret'), ids = shown(path);
  for (const side of ['l', 'r']) for (const name of ['Dentate_nucleus', 'Red nucleus', 'Olive',
    'Central tegmental tract (Guillain-Mollaet Triangle)',
    'Olivodentate fibers (Guillain-Mollaet Triangle)', 'Olivocerebellar (Climbing fibers)']) {
    const n = find(`${name}.${side}`);
    assert.ok(ids.has(n.instanceID), n.rawName);
    assert.ok(!contextIds(scene, path).includes(n.instanceID));
  }
  assert.ok(!ids.has(find('Central tegmental tract (nucleus tractus solitarii).l').instanceID));
  const mollaret = BRAINSTEM_CEREBELLUM_GROUPS[2].children!.find(g => g.id.endsWith('/mollaret'))!;
  assert.ok(!mollaret.children!.some(g => g.id.endsWith('/dentatorubral')));
  for (const requested of [path, ...mollaret.children!.map(g => g.id.split('/'))]) {
    const visible = shown(requested), context = contextIds(scene, requested);
    for (const side of ['l', 'r']) for (const name of ['Dentatorubrothalamic tract', 'Thalamus']) {
      const id = find(`${name}.${side}`).instanceID;
      assert.ok(!visible.has(id), `${requested.join('/')}: excludes ${name}.${side}`);
      assert.ok(!context.includes(id));
    }
    for (const rawName of ['Thalamic capsule.l', 'Capsule of thalamus.r']) {
      assert.equal(pathFor({ ...scene[0], rawName }, requested), null);
    }
  }
  assert.ok(shown(p('cerebellum', 'white-matter', 'efferents')).has(find('Dentatorubrothalamic tract.r').instanceID));
  const central = shown(p('cerebellum', 'mollaret', 'central-tegmental'));
  assert.ok(central.has(find('Red nucleus.l').instanceID));
  assert.ok(central.has(find('Olive.r').instanceID));
  assert.ok(!central.has(find('Dentate_nucleus.r').instanceID));
  const snapshot = planRegionIsolation(scene, 'nervous', path, n => pathFor(n, path))!;
  assert.ok(snapshot.affected.every(n => !n.visible), 'Restore preserves the previous hidden state');
});

test('every brainstem advanced category shows thalamic shells only alongside thalamic nuclei', () => {
  const visit = (group: (typeof BRAINSTEM_CEREBELLUM_GROUPS)[number]) => {
    const requested = group.id.split('/');
    const ids = new Set(scene.filter(n => pathFor(n, requested)).map(n => n.instanceID));
    const includesRelay = scene.some(n => /VPL|VPM|Medial geniculate body|Medial geniculate nucleus/i.test(n.rawName)
      && ids.has(n.instanceID));
    for (const rawName of ['Thalamus.l', 'Thalamus.r', 'Thalamic capsule.l', 'Capsule of thalamus.r']) {
      const node = { ...scene[0], rawName };
      assert.equal(pathFor(node, requested) !== null, includesRelay, `${group.id}: ${rawName}`);
    }
    if (requested[3] !== 'gross-anatomy' || requested.length === 4 || requested[4] === 'pons')
      assert.ok(ids.has(find('Pons.r').instanceID), 'Brainstem context is preserved outside selectively editable gross leaves');
    group.children?.forEach(visit);
  };
  visit(BRAINSTEM_CEREBELLUM_GROUPS[1]);
});

test('hemispheres and vermis are independent grouped controls except in detailed gross anatomy', () => {
  const display = brainstemCerebellumDisplay(scene, p('cerebellum'));
  assert.equal(display.groups.length, 2);
  const [hemispheres, vermis] = display.groups;
  assert.ok(hemispheres.memberIds.length > 10);
  assert.ok(vermis.memberIds.length > 5);
  assert.deepEqual(expandCerebellarDisplayIds([hemispheres.representativeId], display.groups), hemispheres.memberIds);
  assert.ok(!expandCerebellarDisplayIds([hemispheres.representativeId], display.groups).includes(vermis.representativeId));
  assert.equal(display.nodes.filter(n => cerebellarSurfacePart(n.rawName)).length, 2);
  assert.deepEqual(brainstemCerebellumDisplay(scene, p('gross-anatomy')).groups, []);
  assert.equal(brainstemCerebellumDisplay(scene, p('gross-anatomy')).nodes.length, scene.length);
});

test('desktop/sidebar/fullscreen share the existing menu and expose all three collections and Mollaret', () => {
  const props = {
    nodes: scene, activeNerveId: p('cerebellum').join('/'), onActivateNerve: () => {},
    isolatedRegionPath: p('cerebellum'), onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: null,
  };
  for (const variant of ['strip', 'sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(<BrainstemCerebellumMenu {...props} variant={variant} />);
    assert.ok(!html.includes('Other CSV brainstem structures'));
    assert.ok(html.includes('Cerebellum'));
    if (variant === 'strip') for (const g of BRAINSTEM_CEREBELLUM_GROUPS) assert.ok(html.includes(g.label));
    else {
      assert.ok(!html.includes('Mollaret'), 'Nested collections stay hidden until the user expands Cerebellum');
      assert.ok(!html.includes('aria-expanded="true"'));
      assert.ok(html.includes('aria-expanded="false"'));
      assert.ok(html.toLowerCase().includes('restore'));
      assert.ok(html.toLowerCase().includes('show all'));
    }
  }
});
