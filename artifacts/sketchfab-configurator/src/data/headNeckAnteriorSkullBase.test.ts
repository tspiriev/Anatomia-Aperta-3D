import test from 'node:test';
import assert from 'node:assert/strict';
import nervousCsv from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import vascularCsv from '@assets/Cardiovascular_system_1792359799661.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { SceneNode } from '../types/sketchfab';
import { nasalAnteriorSkullBaseTissue, NASAL_ANTERIOR_SKULL_BASE_SOURCE_PATH } from './headNeckAnteriorSkullBase';
import { headNeckTopographyPathForGroup, headNeckTopographySystemForNode } from './headNeckTopography';
import { skullBasePathForGroup, skullBaseSystemForNode } from './skullBaseTaxonomy';
import { skullBaseVesselKind } from './skullBaseSources';
import { isNodeAllowedInAtlasView, HEAD_NECK_TOPOGRAPHY_VIEW } from './atlasViews';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { searchAnatomy } from './anatomySearch';

const root = ['advanced-neuroanatomy', 'head-neck-topography', 'head', 'nasal-pterygopalatine'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: rawName, type: 'MatrixTransform', systemId: null, visible: false,
});

test('Every source anterior-fossa nerve and vessel is imported into the matching nasal tissue collection', () => {
  const counts = { nerves: 0, arteries: 0, veins: 0 };
  for (const csv of [nervousCsv, vascularCsv]) for (const row of csvRows(csv)) {
    if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5])) continue;
    const n = node(row[4]);
    if (!skullBasePathForGroup(n, NASAL_ANTERIOR_SKULL_BASE_SOURCE_PATH)) continue;
    const system = skullBaseSystemForNode(n);
    const kind = skullBaseVesselKind(n.rawName);
    const expected = system === 'vascular' ? (kind === 'arterial' ? 'arteries' : kind === 'venous' ? 'veins' : null)
      : system === 'nervous' && /nerve|gangli|plexus|olfactory/i.test(n.rawName) && !/nucle|neucle|olfactory sulcus/i.test(n.rawName) ? 'nerves' : null;
    assert.equal(nasalAnteriorSkullBaseTissue(n), expected, n.rawName);
    if (!expected) continue;
    counts[expected]++;
    assert.ok(headNeckTopographyPathForGroup(n, [...root, expected]), n.rawName);
    assert.ok(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), n.rawName);
    assert.equal(headNeckTopographySystemForNode(n), expected === 'nerves' ? 'nervous' : 'vascular');
  }
  for (const count of Object.values(counts)) assert.ok(count > 0, JSON.stringify(counts));
});

test('Expanded nasal membership includes non-nasal source nerves, ECA branches and intracranial vessels without moving other memberships', () => {
  for (const [name, tissue] of [
    ['Oculomotor nerve (cisternal and cavernous part).l', 'nerves'],
    ['Trigeminal nerve (Gasserian) ganglion.l', 'nerves'],
    ['Anterior ethmoidal nerve.l', 'nerves'], ['Posterior ethmoidal nerve.r', 'nerves'],
    ['Internal carotid artery sympathetic plexus.l', 'nerves'],
    ['Anterior cerebral artery.l', 'arteries'], ['External carotid artery.l', 'arteries'],
    ['Ophthalmic artery.l', 'arteries'],
    ['FJ5011_BP29192_FMA66472_Trunk of right superior thyroid artery.l', 'arteries'],
    ['Cavernous_Sinus_R', 'veins'], ['Anterior_Intercavernous_Sinus', 'veins'],
    ['Posterior_Intercavernous_Sinus', 'veins'], ['Superior sagittal sinus', 'veins'],
  ]) assert.ok(headNeckTopographyPathForGroup(node(name), [...root, tissue]), name);
  assert.ok(headNeckTopographyPathForGroup(node('Ophthalmic artery.l'), [...root.slice(0, 3), 'orbit', 'arteries']));
  assert.ok(!headNeckTopographyPathForGroup(node('Anterior cerebral artery.l'), [...root.slice(0, 3), 'orbit', 'arteries']));
  for (const name of ['Pons', 'Nucleus of oculomotor nerve.l', 'Masseter muscle.l',
    'Pulmonary artery.l', 'Vagus nerve (X).l', 'Basilar artery', 'Unknown nasal artery'])
    assert.equal(nasalAnteriorSkullBaseTissue(node(name)), null, name);
});

test('Olfactory sulcus is excluded only from the nasal collection; the original skull-base membership is retained', async () => {
  for (const name of ['Olfactory sulcus.l', 'Olfactory sulcus.r', 'Olfactory sulcus.r.001', 'Olfactory_sulcus_L']) {
    const n = node(name);
    assert.equal(nasalAnteriorSkullBaseTissue(n), null, name);
    assert.equal(headNeckTopographyPathForGroup(n, root), null, name);
    assert.ok(skullBasePathForGroup(n, NASAL_ANTERIOR_SKULL_BASE_SOURCE_PATH), name);
  }
  const sulci = ['Olfactory sulcus.l', 'Olfactory sulcus.r'].map((name, i) => node(name, i + 2));
  const nodes = [node('Anterior ethmoidal nerve.l', 1), ...sulci];
  const plan = planRegionIsolation(nodes, 'nervous', root, n => headNeckTopographyPathForGroup(n, root))!;
  assert.deepEqual(plan.show, [1]);
  assert.deepEqual(plan.hide, [2, 3]);
  const { results } = await searchAnatomy('olfactory sulcus');
  assert.ok(results.length);
  assert.ok(results.every(result => result.destinations.every(destination =>
    destination.atlasId !== 'head-neck-topography' || destination.collections.every(label =>
      !label.includes('Nasal cavity and pterygopalatine region')))));
});

test('Nasal tissue isolation remains independent and previous-view snapshot includes unknown geometry', () => {
  const nodes = ['Anterior ethmoidal nerve.l', 'Anterior cerebral artery.l', 'Cavernous_Sinus_L',
    'Vagus nerve (X).l', 'Unknown mesh'].map((name, i) => ({ ...node(name, i + 1), visible: i % 2 === 0 }));
  for (const [tissue, id] of [['nerves', 1], ['arteries', 2], ['veins', 3]] as const) {
    const path = [...root, tissue];
    const plan = planRegionIsolation(nodes, 'nervous', path, n => headNeckTopographyPathForGroup(n, path))!;
    assert.deepEqual(plan.show, [id]);
    assert.deepEqual(plan.hide, nodes.filter(n => n.instanceID !== id).map(n => n.instanceID));
    const snapshot = captureRegionIsolation(nodes, path, null, null);
    assert.deepEqual([...snapshot.visibility], nodes.map(n => [n.instanceID, n.visible]));
  }
});

test('Homepage search discovers the expanded nasal destination', async () => {
  const results = await searchAnatomy('anterior cerebral artery');
  assert.ok(results.results.some(result => result.destinations.some(destination =>
    destination.href.includes('head-neck')
      && destination.collections.some(collection => collection.includes('Nasal cavity and pterygopalatine region')))));
});
