import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  NECK_SOURCE_OBJECTS, NECK_TOPOGRAPHY_GROUPS, NECK_TOPOGRAPHY_ROOT,
  neckTopographyPathForGroup, neckTopographySettings, neckTopographySystemForNode,
  neckBoneContextIds, NECK_TOPOGRAPHY_MODEL_UID,
} from './neckTopography';
import { cervicalNerveName, headNeckCervicalNerveFamily } from './headNeckCervicalNerves';
import { isNeckPeripheralDisc } from './neckPeripheralPlexuses';
import { planRegionIsolation } from '../lib/regionIsolation';
import { headNeckContextArguments } from './headNeckPetrosalSettings';
import { NeckTopographyMenu } from '../components/NeckTopographyMenu';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const nodes: SceneNode[] = NECK_SOURCE_OBJECTS.map((row, i) => ({
  rawName: row.rawName, name: row.rawName, instanceID: i + 1, type: 'MatrixTransform',
  systemId: neckTopographySystemForNode({ rawName: row.rawName, systemId: null }),
  visible: true, materialIDs: [], children: [], parent: null, isGeometry: true,
}));
const p = (...parts: string[]) => [...NECK_TOPOGRAPHY_ROOT, 'cervical-plexus', ...parts];
const n = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, `Actual Neck source: ${name}`);
  return node;
};
const plan = (...parts: string[]) => {
  const path = p(...parts);
  return planRegionIsolation(nodes, 'nervous', path, node => neckTopographyPathForGroup(node, path))!;
};
const complete = (...parts: string[]) => {
  const base = plan(...parts);
  const settings = neckTopographySettings(nodes, base.show, p(...parts));
  return { ids: new Set([...base.show, ...settings.supportIds]), settings };
};
const flatten = (groups: readonly NervousGroup[]): NervousGroup[] =>
  groups.flatMap(group => [group, ...flatten(group.children ?? [])]);
const spine = ['Atlas (C1)', 'Axis (C2)', ...[3, 4, 5, 6, 7].map(level => `Vertebra C${level}`)];
const discs = nodes.filter(node => isNeckPeripheralDisc(node.rawName));
const spinal = (maximum: number) => nodes.filter(node => {
  const family = headNeckCervicalNerveFamily(node.rawName);
  const level = Number(cervicalNerveName(node.rawName).match(/\bc([1-8])\b/)?.[1]);
  return (family === 'spinal-roots' || family === 'spinal-nerves') && level >= 1 && level <= maximum;
});
const noop = () => {};

test('Renamed peripheral menu merges modeled roots and cutaneous branches into Cervical plexus', () => {
  const group = NECK_TOPOGRAPHY_GROUPS.find(group => group.id === p().join('/'))!;
  assert.equal(group.label, 'Neck peripheral nerve and plexuses');
  assert.ok(group.children?.some(child => child.id === p('plexus').join('/') && child.label === 'Cervical plexus'));
  assert.ok(!group.children?.some(child => /\/(?:roots|cutaneous)$/.test(child.id)));
  assert.ok(flatten([group]).every(group => !/Modeled roots|proximal nerve components/.test(group.label)));
  for (const variant of ['sidebar', 'fullscreen', 'strip'] as const) {
    const html = renderToStaticMarkup(createElement(NeckTopographyMenu, {
      variant, nodes, activeNerveId: p().join('/'), isolatedRegionPath: p(),
      selectedNodeId: null, onActivateNerve: noop, onSetRegionVisibility: noop,
      onIsolateRegion: noop, onRestoreRegion: noop,
    }));
    assert.match(html, /Neck peripheral nerve and plexuses/);
    assert.ok(!/Modeled roots|proximal nerve components|Uses only this neck model/.test(html));
  }
});

test('Combined cervical plexus shows every available C1–C4 component and branch with skeletal/disc references only', () => {
  const ids = new Set(plan('plexus').show);
  for (const node of spinal(4)) assert.ok(ids.has(node.instanceID), node.rawName);
  for (const node of nodes.filter(node => headNeckCervicalNerveFamily(node.rawName) === 'cervical-plexus'))
    assert.ok(ids.has(node.instanceID), node.rawName);
  for (const name of [...spine, 'Greater occipital nerve.r', 'Greater occipital nerve.l'])
    assert.ok(ids.has(n(name).instanceID), name);
  for (const node of nodes.filter(node => ids.has(node.instanceID)))
    assert.ok(['nervous', 'skeletal', 'joints'].includes(node.systemId!), node.rawName);
  assert.ok(!ids.has(n('C5 anterior root.r').instanceID));
  assert.ok(!ids.has(n('Rami communicantes albi.r').instanceID), 'Do not confuse autonomic rami with cervical spinal rami');
});

test('All supplied cervical discs and nucleus components, including C7–T1, appear and are semitransparent', () => {
  assert.ok(discs.length >= 14);
  for (const branch of ['plexus', 'ansa', 'phrenic', 'relations', 'spinal-context']) {
    const { ids, settings } = complete(branch);
    for (const node of discs) {
      assert.ok(ids.has(node.instanceID), `${branch}/${node.rawName}`);
      assert.ok(settings.contextIds.includes(node.instanceID), `${branch}/${node.rawName}`);
    }
  }
  for (const name of ['Nucleus pulposus C2-C3', 'Nucleus pulposus C3-C4',
    'Intervertebral disc C7-T1', 'Nucleus pulposus C7-T1.001'])
    assert.ok(plan().show.includes(n(name).instanceID), name);
  assert.equal(neckTopographyPathForGroup({ rawName: 'Intervertebral disc C1-C2' }, p('ansa')), null);
});

test('Ansa includes all modeled C1–C4 components, XII, brainstem, cervical spine and its actual muscle targets', () => {
  const { ids, settings } = complete('ansa');
  for (const node of spinal(4)) assert.ok(ids.has(node.instanceID), node.rawName);
  for (const side of ['r', 'l']) for (const family of [
    'Sternohyoid muscle', 'Sternothyroid muscle', 'Omohyoid muscle',
    'Hypoglossal nerve (XII)', 'Pons', 'Medulla oblongata',
  ]) assert.ok(ids.has(n(`${family}.${side}`).instanceID), `${family}.${side}`);
  for (const name of spine) assert.ok(ids.has(n(name).instanceID), name);
  for (const side of ['r', 'l']) {
    assert.ok(settings.contextIds.includes(n(`Pons.${side}`).instanceID));
    assert.ok(settings.contextIds.includes(n(`Medulla oblongata.${side}`).instanceID));
    assert.ok(!settings.contextIds.includes(n(`Hypoglossal nerve (XII).${side}`).instanceID));
    assert.ok(!settings.contextIds.includes(n(`Sternohyoid muscle.${side}`).instanceID));
  }
  assert.ok(!ids.has(n('Thyrohyoid muscle.r').instanceID), 'C1 via XII is not an ansa branch');
  const args = headNeckContextArguments(settings, [...ids], false);
  assert.equal(args[2], true);
  assert.equal(args[6], true, 'Apply semitransparent brainstem/discs while preserving other source materials');
  const refraction = neckBoneContextIds(NECK_TOPOGRAPHY_MODEL_UID, nodes);
  assert.ok(spine.every(name => refraction.includes(n(name).instanceID)));
});

test('Ansa subroot nerve views keep requested references without adding the other ansa root', () => {
  const { ids, settings } = complete('ansa', 'superior-root', 'nerves');
  assert.ok(ids.has(n('Superior root ansa cervicalis.r').instanceID));
  for (const name of ['Hypoglossal nerve (XII).l', 'Sternothyroid muscle.r', 'C4 anterior root.l',
    'Pons.l', 'Atlas (C1)', 'Intervertebral disc C7-T1']) assert.ok(ids.has(n(name).instanceID), name);
  assert.ok(!ids.has(n('FJ4272_BP29116_FMA55150_Inferior root of ansa cervicalis.l').instanceID));
  assert.ok(settings.contextIds.includes(n('Pons.l').instanceID));
});

test('Phrenic includes C1–C3 spinal references, anterior/posterior scalenes, cervical vertebrae and clavicles', () => {
  const { ids } = complete('phrenic', 'nerves');
  for (const node of spinal(3)) assert.ok(ids.has(node.instanceID), node.rawName);
  for (const side of ['r', 'l']) for (const name of [
    'FJ4157_BP29423_FMA65387_Trunk of left phrenic nerve', 'Scalenus anterior muscle',
    'Scalenus posterior muscle', 'Clavicle',
  ]) assert.ok(ids.has(n(`${name}.${side}`).instanceID), `${name}.${side}`);
  for (const name of spine) assert.ok(ids.has(n(name).instanceID));
  assert.equal(flatten(NECK_TOPOGRAPHY_GROUPS).find(group => group.id === p('phrenic').join('/'))?.label,
    'Phrenic nerves (C3–C5)', 'Reference structures do not redefine the nerve origin');
});

test('Hypoglossal view adds modeled tongue targets while retaining its distinct C1-carried muscle targets', () => {
  const { ids } = complete('c1-via-xii', 'nerves');
  for (const side of ['r', 'l']) for (const name of [
    'Hypoglossal nerve (XII)', 'Genioglossus muscle', 'Hyoglossus muscle',
    'Geniohyoid muscle', 'Thyrohyoid muscle',
  ]) assert.ok(ids.has(n(`${name}.${side}`).instanceID), `${name}.${side}`);
  assert.ok(!ids.has(n('Sternohyoid muscle.r').instanceID));
});

test('Relations arterial submenu includes all 28 supplied subclavian trunks and downstream branches', () => {
  const ids = new Set(plan('relations', 'arteries').show);
  const names = ['Right subclavian artery', 'Left subclavian artery',
    ...['Vertebral artery', 'Inferior thyroid artery', 'Thyrocervical trunk',
      'Transverse cervical artery', 'Suprascapular artery', 'Internal thoracic artery',
      '(Superficial branch of transverse cervical artery)', '(Deep branch of transverse cervical artery)']
      .flatMap(name => ['r', 'l'].map(side => `${name}.${side}`)),
    ...['Deep cervical artery', 'Costocervical trunk', 'Supreme intercostal artery',
      'First posterior intercostal artery', 'Second posterior intercostal artery']
      .flatMap(name => ['r', 'l'].map(side => `${name}.${side}.001`))];
  assert.equal(names.length, 28);
  for (const name of names) assert.ok(ids.has(n(name).instanceID), name);
  for (const name of ['Axillary artery.r', 'Basilar artery', 'Thoraco-acromial artery.r'])
    assert.ok(!ids.has(n(name).instanceID), name);
});

test('Peripheral Hide and bone-only paths do not resurrect nerves, muscles or discs', () => {
  for (const branch of ['plexus', 'ansa', 'phrenic', 'c1-via-xii']) {
    const settings = neckTopographySettings(nodes, [], p(branch));
    assert.deepEqual(settings.supportIds, []);
    assert.deepEqual(settings.contextIds, []);
  }
  for (const branch of ['plexus', 'ansa', 'phrenic']) {
    const { ids, settings } = complete(branch, 'bones');
    assert.ok(ids.size > 0);
    assert.deepEqual(settings.contextIds, []);
    assert.ok([...ids].every(id => nodes[id - 1].systemId === 'skeletal'));
  }
});
