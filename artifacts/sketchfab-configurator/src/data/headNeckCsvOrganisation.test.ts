import test from 'node:test';
import assert from 'node:assert/strict';
import nervousCsv from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import vascularCsv from '@assets/Cardiovascular_system_1792359799661.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { HEAD_NECK_TOPOGRAPHY_GROUPS as groups, headNeckTopographyPathForGroup as member,
  headNeckTopographyPathsForNode as paths, headNeckTopographyCataloguePathForGroup as catalogue } from './headNeckTopography';
import { skullBaseName, skullBaseNervousSource } from './skullBaseSources';
import { headNeckCervicalNerveFamily, cervicalNerveRegions } from './headNeckCervicalNerves';
import { headNeckSubclavianArteryPath, headNeckSubclavianVeinPath } from './headNeckSubclavianVessels';
import { MUSCULOSKELETAL_SOURCE_ENTRIES } from './musculoskeletalTaxonomy';
import { anteriorNeckSuperficialLayer } from './headNeckAnteriorTriangle';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isHeadTopographyNode } from './headTopography';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { searchAnatomy } from './anatomySearch';

const root = ['advanced-neuroanatomy', 'head-neck-topography'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, visible: false, type: 'MatrixTransform', systemId: null,
});
const registered = new Map<string, NervousGroup>();
const visit = (list: readonly NervousGroup[]) => list.forEach(g => {
  registered.set(g.id, g); if (g.children) visit(g.children);
});
visit(groups);
const sourceObjects = (csv: string) => [...csvRows(csv)].filter(row => row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5]));

test('Every cervical-plexus CSV component and C1–C8 spinal level has real, registered branch controls, excluding the misfiled V3 nerve', () => {
  let plexusCount = 0, spinalCount = 0;
  for (const row of sourceObjects(nervousCsv)) {
    const collections = skullBaseNervousSource.get(skullBaseName(row[4]))!;
    const n = node(row[4]);
    if (collections.has('NS_01_CERVICAL_PLEXUS') && !/mylohyoid/i.test(n.rawName)) {
      plexusCount++;
      assert.ok(member(n, [...root, 'cervical-plexus']), n.rawName);
      for (const section of ['anterior-triangle', 'lateral-neck', 'deep-neck', 'posterior-neck'])
        assert.ok(member(n, [...root, section, 'nerves', 'cervical-plexus']), `${section}/${n.rawName}`);
    }
    const level = [...collections].find(c => /^C[1-8]$/.test(c));
    if (level) {
      spinalCount++;
      assert.ok(paths(n).some(p => p.at(-1) === level.toLowerCase()), `${level}/${n.rawName}`);
      if (Number(level.slice(1)) <= 4) assert.ok(member(n, [...root, 'cervical-plexus', 'spinal-context']));
    }
    if (plexusCount && cervicalNerveRegions(n.rawName).length) {
      for (const p of paths(n)) assert.ok(registered.has(p.join('/')), `${n.rawName}/${p.join('/')}`);
      assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n));
    }
  }
  assert.ok(plexusCount >= 20, String(plexusCount));
  assert.ok(spinalCount >= 40, String(spinalCount));
  assert.equal(member(node('Nerve to mylohyoid muscle.l'), [...root, 'cervical-plexus']), null);
});

test('Nerve detail controls separate C levels, named cutaneous branches and superior/inferior ansa roots', () => {
  const base = [...root, 'lateral-neck', 'nerves'];
  for (const [name, tail] of [
    ['C3 posterior root.l', ['spinal-roots', 'cervical-dorsal', 'c3']],
    ['C5 Dorsal root ganglion.r', ['spinal-roots', 'cervical-ganglia', 'c5']],
    ['C4 spinal nerve.l', ['spinal-nerves', 'cervical-spinal', 'c4']],
    ['FJ4261_BP29310_FMA7003_Trunk of C2 nerve root.l', ['cervical-plexus', 'roots', 'c2']],
    ['FJ4173_BP29081_FMA65396_Trunk of left great auricular nerve.l', ['cervical-plexus', 'cutaneous', 'great-auricular']],
    ['Lesser occipital nerve.r', ['cervical-plexus', 'cutaneous', 'lesser-occipital']],
    ['Transverse cervical nerve.l', ['cervical-plexus', 'cutaneous', 'transverse-cervical']],
    ['Supraclavicular nerve.r', ['cervical-plexus', 'cutaneous', 'supraclavicular']],
    ['Superior root ansa cervicali.l', ['cervical-plexus', 'ansa', 'superior-root']],
    ['FJ4272_BP29116_FMA55150_Inferior root of ansa cervicalis.r', ['cervical-plexus', 'ansa', 'inferior-root']],
  ] as const) {
    const p = [...base, ...tail];
    assert.ok(registered.has(p.join('/')), p.join('/'));
    assert.deepEqual(member(node(name), p), p, name);
  }
  for (const name of ['Anterior division of mandibular nerve.l', 'Posterior division of mandibular nerve.r']) {
    assert.equal(headNeckCervicalNerveFamily(name), null, 'Do not inherit the erroneous CSV brachial-plexus assignment');
    assert.equal(member(node(name), [...root, 'lateral-neck', 'nerves']), null);
    assert.ok(member(node(name), [...root, 'head', 'oral', 'nerves']));
  }
  for (const row of sourceObjects(nervousCsv).filter(row => row[1] === 'Sympathetic trunk Cervical')) {
    assert.ok(member(node(row[4]), [...base, 'autonomic']), row[4]);
    assert.equal(member(node(row[4]), [...base, 'cervical-plexus']), null, 'Sympathetic rami are not somatic cervical-plexus branches');
  }
  assert.ok(member(node('Cervical plexus'), [...root, 'cervical-plexus', 'roots', 'nerves', 'cervical-plexus', 'roots']));
});

test('Every reviewed subclavian arterial and venous CSV identity has correct hierarchy in all neck sections and relevant root-of-neck menus', () => {
  let arteries = 0, veins = 0;
  for (const row of sourceObjects(vascularCsv)) {
    const arterial = headNeckSubclavianArteryPath(row[4]), venous = headNeckSubclavianVeinPath(row[4]);
    if (!arterial && !venous) continue;
    const tissue = arterial ? 'arteries' : 'veins', branch = arterial ?? venous!;
    arterial ? arteries++ : veins++;
    const n = node(row[4]);
    for (const section of ['anterior-triangle', 'lateral-neck', 'deep-neck', 'posterior-neck']) {
      const p = [...root, section, tissue, 'subclavian', ...branch];
      assert.deepEqual(member(n, p), p, `${n.rawName}/${p.join('/')}`);
    }
    for (const region of [['deep-neck', 'root-of-neck'], ['lateral-neck', 'omoclavicular']]) {
      const p = [...root, ...region, tissue, 'subclavian', ...branch];
      assert.ok(member(n, p), `${n.rawName}/${p.join('/')}`);
    }
    for (const p of paths(n)) assert.ok(registered.has(p.join('/')), `${n.rawName}/${p.join('/')}`);
    assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n));
  }
  assert.ok(arteries >= 20, String(arteries));
  assert.ok(veins >= 12, String(veins));
  assert.equal(headNeckSubclavianArteryPath('Posterior intercostal arteries.l'), null, 'Do not label all aortic intercostal vessels as subclavian branches');
  for (const name of ['Maxillary veins.l', 'Pulmonary artery.l', 'Femoral vein.l'])
    assert.equal(headNeckSubclavianVeinPath(name), null, name);
  for (const name of ['Left subclavian artery', 'Right subclavian vein', 'Inferior thyroid artery.l', 'Cephalic vein.r'])
    assert.equal(member(node(name), [...root, 'head', 'orbit']), null);
  assert.equal(catalogue(node('Ascending cervical artery.l'), [...root, 'deep-neck']), null,
    'A supported live alias is not evidence of geometry in the CSV catalogue');
});

test('CSV Head/Neck muscles, including cross-file posterior muscles, are available in anatomical muscle families', () => {
  let count = 0;
  for (const entry of MUSCULOSKELETAL_SOURCE_ENTRIES) {
    if (entry.category !== 'muscles' || !entry.regions.some(r => r === 'head' || r === 'neck')) continue;
    if (anteriorNeckSuperficialLayer(node(entry.name))) continue;
    count++;
    const detailed = paths(node(entry.name)).filter(p => p.includes('muscles') && p.at(-1) !== 'muscles');
    assert.ok(detailed.length, entry.name);
    for (const p of detailed) assert.ok(registered.has(p.join('/')), `${entry.name}/${p.join('/')}`);
  }
  assert.ok(count > 150, String(count));
  for (const [name, tail] of [
    ['Transverse part of trapezius muscle.l', ['posterior-neck', 'posterior-cervical', 'muscles', 'posterior-cervical']],
    ['Intermediate tendon of digastric muscle.r', ['anterior-triangle', 'submental', 'muscles', 'suprahyoid']],
    ['Middle pharyngeal constrictor.l', ['anterior-triangle', 'carotid', 'muscles', 'pharyngeal']],
    ['Sternocleidomastoid muscle.r', ['anterior-triangle', 'muscular', 'muscles', 'sternocleidomastoid']],
  ] as const) assert.ok(member(node(name), [...root, ...tail]), name);
});

test('Fine selections, Show all and Restore use the same complete vessel/nerve memberships rather than dropping their parents or broadening to other anatomy', () => {
  const scene = ['Left subclavian artery', 'Inferior thyroid artery.l', 'Thyrocervical trunk.l',
    'Transverse cervical artery.l', '(Deep branch of transverse cervical artery).l', 'Vertebral artery.l',
    'Right subclavian vein', 'Axillary vein.l', 'Cephalic vein.l', 'Suprascapular vein.l',
    'Great auricular nerve.l', 'Lesser occipital nerve.r', 'Pulmonary artery.l', 'Unknown mesh'].map((name, i) => node(name, i + 1));
  for (const [tail, expected] of [
    [['arteries', 'subclavian'], [1, 2, 3, 4, 5, 6]],
    [['arteries', 'subclavian', 'thyrocervical'], [2, 3, 4, 5]],
    [['arteries', 'subclavian', 'thyrocervical', 'transverse-cervical'], [4, 5]],
    [['veins', 'subclavian'], [7, 8, 9, 10]],
    [['veins', 'subclavian', 'axillary-inflow'], [8, 9]],
    [['nerves', 'cervical-plexus', 'cutaneous', 'great-auricular'], [11]],
  ] as const) {
    const p = [...root, 'lateral-neck', ...tail];
    const plan = planRegionIsolation(scene, 'nervous', p, n => member(n, p))!;
    assert.deepEqual(plan.show, expected);
    assert.ok(plan.hide.includes(13) && plan.hide.includes(14));
    const group = registered.get(p.join('/'))!;
    assert.deepEqual(menuCollectionNodeIds(scene, [group], n => paths(n)[0] ?? null, member), expected);
    assert.deepEqual([...captureRegionIsolation(scene, p, null, null).visibility], scene.map(n => [n.instanceID, false]));
  }
});

test('Cervical cutaneous branches now reach appropriate Head menus and source-backed homepage search', async () => {
  const greatAuricular = node('FJ4173_BP29081_FMA65396_Trunk of left great auricular nerve.l');
  for (const region of ['scalp-face', 'parotid', 'ear'])
    assert.ok(member(greatAuricular, [...root, 'head', region, 'nerves', 'cervical-plexus', 'cutaneous', 'great-auricular']));
  const { results } = await searchAnatomy('inferior thyroid artery');
  assert.ok(!results.some(result => result.destinations.some(d => d.atlasId === 'head-neck-topography')));
  const found = await searchAnatomy('great auricular nerve');
  assert.ok(found.results.some(result => result.destinations.some(d => d.atlasId === 'head-neck-topography'
    && d.collections.some(label => label.includes('Auricular and middle-ear region') && label.includes('Great auricular')))));
});
