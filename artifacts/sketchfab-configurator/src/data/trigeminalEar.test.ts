import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { TRIGEMINAL_EAR_PATH as earPath, TRIGEMINAL_EAR_GROUP, trigeminalEarRole } from './trigeminalEar';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup, cranialNerveContextIds, cranialNerveForegroundIds } from './cranialNerveTaxonomy';
import { CRANIAL_NERVES_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { CranialNerveMenu } from '../components/CranialNerveMenu';
import type { SceneNode } from '../types/sketchfab';
import { formatAnatomicalName } from '../lib/anatomicalDisplayName';

const vPath = earPath.slice(0, 3);
const sourceNames = new Set([
  'First_combinedblend_1790668070052.csv', 'Nervous_system_CLean_1791612986964.csv',
  '0_Final_Muscles_fused__1791947151699.csv', 'Skeletal_system_and_muscle_attachments_1792221386788.csv',
].flatMap(file => [...csvRows(readFileSync(new URL(`../../../../attached_assets/${file}`, import.meta.url), 'utf8'))]
  .filter(row => row[0] === 'OBJECT').map(row => row[4])));
const object = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: formatAnatomicalName(rawName), systemId: systemForMeshName(rawName), type: 'MatrixTransform', visible: false,
});
const sourceScene = [...sourceNames].filter(name => trigeminalEarRole(name)).map((name, i) => object(name, i + 1));

test('both source sides of all requested available ear structures and the tensor tympani nerve enter V and its ear submenu', () => {
  for (const stem of ['Tensor tympani nerve', 'Tympanic membrane', 'Malleus', 'Incus', 'Stapes',
    'Auditory tube', 'Cochlea', 'Vestibule']) for (const side of ['l', 'r']) {
    const name = `${stem}.${side}`;
    assert.ok(sourceNames.has(name), `${name} is source-backed`);
    const expected = [...earPath, trigeminalEarRole(name)!];
    for (const suffix of ['', '.001_123']) {
      const node = object(name + suffix);
      assert.ok(node.systemId, node.rawName);
      assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), node.rawName);
      assert.deepEqual(cranialNervePathForGroup(node, vPath), expected);
      assert.ok(isNodeInRegion(node, earPath, item => cranialNervePathForGroup(item, earPath)));
    }
  }
});

test('live tensor tympani muscle labels are muscular motor targets, never substituted with a different muscle or nerve', () => {
  for (const stem of ['Tensor tympani muscle', 'Tensor tympani', 'Tensor typmani muscle'])
    for (const side of ['l', 'r']) for (const suffix of ['', '.001_123']) {
      const node = object(`${stem}.${side}${suffix}`);
      assert.equal(node.systemId, 'muscular', node.rawName);
      assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), node.rawName);
      assert.deepEqual(cranialNervePathForGroup(node, vPath), [...earPath, 'muscle']);
    }
  for (const name of ['Tensor tympani nerve.l', 'Nerve to tensor tympani muscle.r.001_123']) {
    const node = object(name);
    assert.equal(node.systemId, 'nervous');
    assert.deepEqual(cranialNervePathForGroup(node, vPath), [...earPath, 'nerve']);
  }
  for (const name of ['Tensor veli palatini muscle.l', 'Stapedius muscle.r',
    'Cochlear nerve.l', 'Cochlear nucleus.l', 'Tympanic nerve (Jacobson).r', 'Temporal bone.l'])
    assert.equal(trigeminalEarRole(name), null, `${name} is not a requested ear target`);
});

test('the confirmed misspelled live muscles display the correct name and both enter Trigeminal isolation without renaming scene objects', () => {
  const muscles = ['l', 'r'].map((side, i) => object(`Tensor typmani muscle.${side}`, 9001 + i));
  const scope = [...earPath, 'muscle'];
  const scene = [...sourceScene, ...muscles];
  const plan = planRegionIsolation(scene, 'nervous', scope,
    node => cranialNervePathForGroup(node, scope))!;
  for (const [i, muscle] of muscles.entries()) {
    assert.ok(sourceNames.has(muscle.rawName), 'the confirmed muscle is present under its original misspelled source name');
    assert.equal(muscle.name, `Tensor tympani muscle (${i === 0 ? 'Left' : 'Right'})`);
    assert.equal(muscle.rawName, `Tensor typmani muscle.${i === 0 ? 'l' : 'r'}`);
    assert.equal(muscle.systemId, 'muscular');
    assert.ok(isNodeAllowedInAtlasView(muscle, CRANIAL_NERVES_VIEW));
    assert.deepEqual(cranialNervePathForGroup(muscle, vPath), scope);
    assert.ok(plan.show.includes(muscle.instanceID));
    assert.ok(cranialNerveForegroundIds(scene, vPath).includes(muscle.instanceID));
  }
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(CranialNerveMenu, {
      variant, nodes: scene, activeNerveId: vPath.join('/'), isolatedRegionPath: scope,
      selectedNodeId: muscles[0].instanceID, onActivateNerve: () => {}, onIsolateRegion: () => {},
      onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    assert.ok(!html.includes('Tensor typmani muscle'));
    assert.ok(html.includes('Tensor tympani muscle'));
  }
});

test('subgroup isolation preserves source names, selects exact members and excludes unrelated anatomy', () => {
  const unrelated = object('Deltoid muscle.l', 9000);
  const scene = [...sourceScene, unrelated];
  for (const role of ['nerve', 'middle-ear', 'auditory-tube', 'inner-ear']) {
    const path = [...earPath, role];
    const plan = planRegionIsolation(scene, 'nervous', path, node => cranialNervePathForGroup(node, path))!;
    assert.deepEqual(new Set(plan.show),
      new Set(sourceScene.filter(node => trigeminalEarRole(node.rawName) === role).map(node => node.instanceID)));
    assert.ok(plan.hide.includes(unrelated.instanceID));
    assert.ok(plan.show.length, role);
  }
  const all = planRegionIsolation(scene, 'nervous', earPath, node => cranialNervePathForGroup(node, earPath))!;
  assert.deepEqual(new Set(all.show), new Set(sourceScene.map(node => node.instanceID)));
  for (const node of sourceScene) assert.ok(sourceNames.has(node.rawName));
});

test('ear targets remain opaque foreground while existing V brainstem, thalamus and mastication context is unchanged', () => {
  const context = [
    object('Pons', 9001), object('Thalamus.l', 9002), object('Temporalis muscle.l', 9003),
  ];
  const muscle = object('Tensor tympani muscle.l', 9004);
  const scene = [...sourceScene, ...context, muscle];
  assert.deepEqual(cranialNerveContextIds(scene, vPath).sort(), context.map(node => node.instanceID).sort());
  assert.deepEqual(new Set(cranialNerveForegroundIds(scene, earPath)),
    new Set([...sourceScene, muscle].map(node => node.instanceID)));
});

test('VII exclusion and the existing VIII auditory memberships are preserved; skeletal and organ ear references are admitted', () => {
  const facial = [...vPath.slice(0, 2), 'vii'];
  for (const side of ['l', 'r']) {
    assert.equal(cranialNervePathForGroup(object(`Tensor tympani nerve.${side}`), facial), null);
    for (const stem of ['Cochlea', 'Tympanic membrane', 'Malleus', 'Incus', 'Stapes']) {
      const node = object(`${stem}.${side}`);
      const path = [...vPath.slice(0, 2), 'viii', 'cochlear'];
      assert.ok(cranialNervePathForGroup(node, path), node.rawName);
    }
  }
  for (const name of ['Malleus.r', 'Incus.l', 'Stapes.r']) {
    const node = { ...object(name), systemId: 'skeletal' as const };
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW));
    assert.deepEqual(cranialNervePathForGroup(node, vPath), [...earPath, 'middle-ear']);
  }
  const tube = { ...object('Eustachian tube.l'), systemId: 'organs' as const };
  assert.ok(isNodeAllowedInAtlasView(tube, CRANIAL_NERVES_VIEW));
  assert.deepEqual(cranialNervePathForGroup(tube, vPath), [...earPath, 'auditory-tube']);
});

test('sidebar and fullscreen expose the new ear collection through the shared menu with existing visibility and restore controls', () => {
  const group = CRANIAL_NERVE_GROUPS.find(group => group.id === vPath.join('/'))!;
  assert.ok(group.children!.includes(TRIGEMINAL_EAR_GROUP));
  assert.equal(TRIGEMINAL_EAR_GROUP.children!.length, 5);
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(CranialNerveMenu, {
      variant, nodes: sourceScene, activeNerveId: group.id, isolatedRegionPath: earPath, selectedNodeId: null,
      onActivateNerve: () => {}, onIsolateRegion: () => {}, onRestoreRegion: () => {},
      onSetRegionVisibility: () => {},
    }));
    // The existing shared tree initially collapses nerve roots; the new
    // collection is reached by expanding V, not by changing global browsing.
    for (const label of ['V Trigeminal nerve', 'Restore previous view', 'Show all'])
      assert.ok(html.includes(label), `${variant}: ${label}`);
  }
});
