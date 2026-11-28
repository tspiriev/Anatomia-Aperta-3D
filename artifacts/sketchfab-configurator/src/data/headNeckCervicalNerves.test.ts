import test from 'node:test';
import assert from 'node:assert/strict';
import nervousCsv from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { skullBaseName, skullBaseNervousSource } from './skullBaseSources';
import { HEAD_NECK_TOPOGRAPHY_GROUPS, headNeckTopographyPathForGroup,
  headNeckTopographySystemForNode } from './headNeckTopography';
import { neckInventoryFamily } from './headNeckNeurovascularInventory';
import { headNeckCervicalNerveFamily } from './headNeckCervicalNerves';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isHeadTopographyNode } from './headTopography';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { headNeckPetrosalSettings } from './headNeckPetrosalSettings';
import { searchAnatomy } from './anatomySearch';
import { isUpperCranialNerve, submentalMandibularPart } from './headNeckSubmental';

const root = ['advanced-neuroanatomy', 'head-neck-topography', 'anterior-triangle'];
const nerves = [...root, 'nerves'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, type: 'MatrixTransform', visible: false, systemId: null,
});

test('All modeled C1–C8 spinal components and both plexus inventories have actual, detailed anterior-neck menu paths', () => {
  const registered = new Set<string>();
  const visit = (groups: readonly NervousGroup[]) => groups.forEach(group => {
    registered.add(group.id); if (group.children) visit(group.children);
  });
  visit(HEAD_NECK_TOPOGRAPHY_GROUPS);
  let count = 0;
  for (const row of csvRows(nervousCsv)) {
    if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5])) continue;
    const collections = skullBaseNervousSource.get(skullBaseName(row[4]))!;
    if (![...collections].some(c => /^C[1-8]$/.test(c) || ['NS_01_CERVICAL_PLEXUS', 'NS_02_BRACHIAL_PLEXUS'].includes(c))) continue;
    count++;
    const n = node(row[4]), path = headNeckTopographyPathForGroup(n, nerves);
    if (isUpperCranialNerve(n.rawName)) {
      assert.equal(path, null, n.rawName);
      if (submentalMandibularPart(n.rawName))
        assert.ok(headNeckTopographyPathForGroup(n, [...root, 'submental', 'nerves']));
      continue;
    }
    assert.ok(path, n.rawName);
    assert.ok(registered.has(path.join('/')), path.join('/'));
    assert.equal(headNeckTopographySystemForNode(n), 'nervous', n.rawName);
    assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n), n.rawName);
    // The incorrectly filed mylohyoid branch remains available, but correctly
    // belongs to V3 rather than the cervical plexus.
    if (/mylohyoid/i.test(n.rawName)) assert.equal(path[nerves.length], 'cranial');
    else {
      assert.equal(path.length, nerves.length + 2, path.join('/'));
      if (collections.has('NS_02_BRACHIAL_PLEXUS')) assert.equal(path[nerves.length], 'brachial-plexus');
      if (collections.has('NS_01_CERVICAL_PLEXUS')) assert.equal(path[nerves.length], 'cervical-plexus');
    }
  }
  assert.ok(count > 100, String(count));
});

test('Cervical dorsal/ventral roots, ganglia, spinal nerves/rami and complete plexus components are separately selectable', () => {
  for (const [name, family, detail] of [
    ['C3 posterior root.l', 'spinal-roots', 'cervical-dorsal'],
    ['Dorsal root of cervical spinal nerve C5.r', 'spinal-roots', 'cervical-dorsal'],
    ['C8 ventral root.r', 'spinal-roots', 'cervical-ventral'],
    ['C4 anterior root.l', 'spinal-roots', 'cervical-ventral'],
    ['C2 Dorsal root ganglion.r', 'spinal-roots', 'cervical-ganglia'],
    ['C1 anterior posterior.l', 'spinal-roots', 'combined-c1-c2'],
    ['C8 spinal nerve.r', 'spinal-nerves', 'cervical-spinal'],
    ['Cervical nerve C6.l', 'spinal-nerves', 'cervical-spinal'],
    ['Dorsal ramus C4.r', 'spinal-nerves', 'cervical-dorsal-rami'],
    ['Ventral ramus C5.l', 'spinal-nerves', 'cervical-ventral-rami'],
    ['FJ4261_BP29310_FMA7003_Trunk of C2 nerve root.l', 'cervical-plexus', 'roots'],
    ['FJ4263_BP29309_FMA7007_Trunk of C4 nerve.r', 'cervical-plexus', 'roots'],
    ['Cervical plexus roots.r', 'cervical-plexus', 'roots'],
    ['Great auricular nerve.l', 'cervical-plexus', 'cutaneous'],
    ['Phrenic nerve.r', 'cervical-plexus', 'phrenic'],
    ['Superior root ansa cervicalis.l', 'cervical-plexus', 'ansa'],
    ['Roots of brachial plexus.r', 'brachial-plexus', 'roots'],
    ['Brachial plexus roots.l', 'brachial-plexus', 'roots'],
    ['Superior trunk.l', 'brachial-plexus', 'trunks'],
    ['Anterior division of upper trunk.r', 'brachial-plexus', 'divisions'],
    ['Posterior cord.l', 'brachial-plexus', 'cords'],
    ['Dorsal scapular nerve.l', 'brachial-plexus', 'branches'],
  ]) assert.deepEqual(headNeckTopographyPathForGroup(node(name), nerves), [...nerves, family, detail], name);
  assert.equal(neckInventoryFamily('Superior cervical sympathetic ganglion.l', 'nerves'), 'autonomic');
  assert.equal(neckInventoryFamily('Inferior cervical ganglion.r', 'nerves'), 'autonomic');
  assert.deepEqual(headNeckTopographyPathForGroup(node('L3 anterior root.l'), nerves),
    [...nerves, 'spinal-roots', 'other'], 'Do not remove other modeled roots or call them cervical');
  for (const name of ['Vertebra C5', 'C5', 'Cervical fascia', 'Cervical plexus artery',
    'Brachial plexus vein', 'Nucleus of accessory nerve', 'Scalenus anterior muscle'])
    assert.equal(headNeckCervicalNerveFamily(name), null, name);
});

test('Detailed cervical selections isolate only the actual matching geometry, preserve context and retain restore state', () => {
  const nodes = ['C3 posterior root.l', 'C3 anterior root.r', 'C3 Dorsal root ganglion.l',
    'C3 spinal nerve.r', 'Roots of brachial plexus.l', 'Superior trunk.l',
    'Platysma.l', 'Superficial investing cervical fascia.r', 'Pons', 'Midbrain', 'Medulla oblongata']
    .map((name, i) => node(name, i + 1));
  for (const [family, detail, expected] of [
    ['spinal-roots', 'cervical-dorsal', [1]],
    ['spinal-roots', 'cervical-ventral', [2]],
    ['spinal-roots', 'cervical-ganglia', [3]],
    ['spinal-nerves', 'cervical-spinal', [4]],
    ['brachial-plexus', 'roots', [5]],
    ['brachial-plexus', 'trunks', [6]],
  ] as const) {
    const path = [...nerves, family, detail];
    const plan = planRegionIsolation(nodes, 'nervous', path, n => headNeckTopographyPathForGroup(n, path))!;
    assert.deepEqual(plan.show, expected);
    assert.deepEqual(headNeckPetrosalSettings(nodes, plan.show, path).contextIds, [9, 10, 11]);
    assert.ok(plan.hide.includes(7) && plan.hide.includes(8));
    assert.deepEqual([...captureRegionIsolation(nodes, path, null, null).visibility], nodes.map(n => [n.instanceID, false]));
  }
  assert.deepEqual(planRegionIsolation(nodes, 'nervous', nerves, n => headNeckTopographyPathForGroup(n, nerves))!.show, [1, 2, 3, 4, 5, 6]);
});

test('Search no longer routes brachial roots to the head-only atlas', async () => {
  const { results } = await searchAnatomy('roots of brachial plexus');
  assert.ok(!results.some(result => result.destinations.some(destination =>
    destination.atlasId === 'head-neck-topography')));
});
