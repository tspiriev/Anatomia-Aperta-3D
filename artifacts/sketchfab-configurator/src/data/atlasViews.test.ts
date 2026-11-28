import assert from 'node:assert/strict';
import test from 'node:test';
import { ATLAS_VIEWS, BRAIN_VIEW, BRAINSTEM_CEREBELLUM_VIEW, CRANIAL_NERVES_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW, FULL_ANATOMY_VIEW, isNodeAllowedInAtlasView, filterAtlasGroups, atlasMenuGroupExclusions } from './atlasViews';
import { ADVANCED_NEUROANATOMY_GROUPS, getAdvancedNeuroanatomyGroups } from './advancedNeuroanatomy';
import { NERVOUS_GROUPS } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

const nodes: SceneNode[] = [
  'skeletal', 'nervous', 'muscular', 'joints', 'attachments', 'vascular', 'organs', 'lymphatic', null,
].map((systemId, index) => ({
  instanceID: index + 1,
  rawName: `Structure ${index}`,
  name: `Structure ${index}`,
  systemId: systemId as SceneNode['systemId'],
  type: 'MatrixTransform',
  visible: true,
}));

test('Explore Atlas retains existing views and adds Brain on its own route', () => {
  assert.deepEqual(ATLAS_VIEWS.slice(0, 5).map((view) => view.label), ['Full anatomy', 'Central nervous system', 'Brain', 'Brainstem and cerebellum', 'Cranial nerves']);
  assert.deepEqual(ATLAS_VIEWS.slice(0, 5).map((view) => view.href), ['/atlas', '/atlas/central-nervous-system', '/atlas/brain', '/atlas/brainstem-and-cerebellum', '/atlas/cranial-nerves']);
  assert.equal(new Set(ATLAS_VIEWS.map((view) => view.id)).size, ATLAS_VIEWS.length);
});

test('Brain inherits CNS controls, uses the supplied model, and excludes skeletal and spinal menus', () => {
  assert.equal(BRAIN_VIEW.modelUid, 'fe9c919b91c04fd8b2147106b07e5566');
  assert.equal(BRAIN_VIEW.initialSystemId, CENTRAL_NERVOUS_SYSTEM_VIEW.initialSystemId);
  assert.equal(BRAIN_VIEW.showAdvancedCollections, true);
  assert.deepEqual(BRAIN_VIEW.systemIds, ['nervous']);
  assert.deepEqual(filterAtlasGroups(ADVANCED_NEUROANATOMY_GROUPS, atlasMenuGroupExclusions(BRAIN_VIEW)).map((group) => group.label),
    ['White matter fibers', 'Basal ganglia and diencephalon']);
  assert.ok(!filterAtlasGroups(NERVOUS_GROUPS, BRAIN_VIEW.excludedNeuroanatomyGroupIds).some((group) => group.id === 'spinal'));
  assert.equal(filterAtlasGroups(ADVANCED_NEUROANATOMY_GROUPS, CENTRAL_NERVOUS_SYSTEM_VIEW.excludedNeuroanatomyGroupIds).length, 4);
});

test('Brain hides only its duplicate standalone Brainstem menu, preserving context and the dedicated atlas', () => {
  const groups = getAdvancedNeuroanatomyGroups(true);
  const previous = filterAtlasGroups(groups, BRAIN_VIEW.excludedNeuroanatomyGroupIds);
  const visible = filterAtlasGroups(groups, atlasMenuGroupExclusions(BRAIN_VIEW));
  assert.deepEqual(visible, previous.filter(group => group.id.split('/').at(-1) !== 'brainstem'));
  assert.equal(visible.length, previous.length - 1);
  assert.ok(!BRAIN_VIEW.excludedNeuroanatomyGroupIds?.includes('brainstem'),
    'Menu removal must not remove shared brainstem geometry from Brain');
  for (const view of [BRAINSTEM_CEREBELLUM_VIEW, CRANIAL_NERVES_VIEW, CENTRAL_NERVOUS_SYSTEM_VIEW])
    assert.ok(!atlasMenuGroupExclusions(view)?.includes('brainstem'), view.label);
  assert.equal(BRAINSTEM_CEREBELLUM_VIEW.href, '/atlas/brainstem-and-cerebellum');
  assert.equal(BRAINSTEM_CEREBELLUM_VIEW.modelUid, '7f0c31427e24481797eba7369bc4c505');
});

test('Brain scene scope removes spinal models without removing shared brain pathways or changing CNS', () => {
  const samples: SceneNode[] = [
    ['Midbrain.l', 'nervous'], ['Somatosensory tract face.r', 'nervous'],
    ['Corticospinal tract arm.l', 'nervous'], ['Spinothalamic tract.l', 'nervous'],
    ['Spinal nucleus of trigeminal nerve.l', 'nervous'],
    ['Mediodorsal thalamic fibers.r', 'nervous'], ['Unknown brain mesh', null],
    ['Anterior horn of spinal cord', 'nervous'], ['Spinal cord', 'nervous'],
    ['Central canal', 'nervous'], ['Tectospinal tract', 'nervous'], ['C1 dorsal root', 'nervous'],
    ['Skull', 'skeletal'], ['Aorta', 'vascular'],
  ].map(([rawName, systemId], index) => ({
    instanceID: index + 1, rawName: rawName!, name: rawName!, visible: true,
    type: 'MatrixTransform', systemId: systemId as SceneNode['systemId'],
  }));
  assert.deepEqual(samples.filter((node) => isNodeAllowedInAtlasView(node, BRAIN_VIEW)).map((node) => node.instanceID), [1, 2, 3, 4, 5, 6, 7]);
  const hidden = samples.filter((node) => !isNodeAllowedInAtlasView(node, BRAIN_VIEW));
  assert.equal(hidden.length, 7);
  assert.ok(samples.slice(7, 12).every((node) => isNodeAllowedInAtlasView(node, CENTRAL_NERVOUS_SYSTEM_VIEW)));
  assert.ok(samples.every((node) => node.visible));
});

test('Full anatomy retains the original model, initial system, and unrestricted scope', () => {
  assert.equal(FULL_ANATOMY_VIEW.modelUid, 'a7654718603c4cd58111b4dd52213d4a');
  assert.equal(FULL_ANATOMY_VIEW.initialSystemId, 'muscular');
  assert.equal(FULL_ANATOMY_VIEW.systemIds, undefined);
  assert.deepEqual(nodes.filter((node) => isNodeAllowedInAtlasView(node, FULL_ANATOMY_VIEW)), nodes);
});

test('Central nervous system uses the supplied separate model and only bones and nervous-system categories', () => {
  assert.equal(CENTRAL_NERVOUS_SYSTEM_VIEW.modelUid, '3041be6d447e40f6bb8220e9999e16a9');
  assert.equal(CENTRAL_NERVOUS_SYSTEM_VIEW.initialSystemId, 'nervous');
  assert.deepEqual(CENTRAL_NERVOUS_SYSTEM_VIEW.systemIds, ['skeletal', 'nervous']);
  const allowed = nodes.filter((node) => isNodeAllowedInAtlasView(node, CENTRAL_NERVOUS_SYSTEM_VIEW));
  assert.deepEqual(allowed.map((node) => node.instanceID), [1, 2, 9]);
});

test('targeted Show all and scene exclusions partition the model without including other systems', () => {
  const show = nodes.filter((node) => isNodeAllowedInAtlasView(node, CENTRAL_NERVOUS_SYSTEM_VIEW));
  const hide = nodes.filter((node) => !isNodeAllowedInAtlasView(node, CENTRAL_NERVOUS_SYSTEM_VIEW));
  assert.deepEqual(hide.map((node) => node.systemId), ['muscular', 'joints', 'attachments', 'vascular', 'organs', 'lymphatic']);
  assert.equal(show.length + hide.length, nodes.length);
  assert.equal(new Set([...show, ...hide].map((node) => node.instanceID)).size, nodes.length);
  assert.ok(nodes.every((node) => node.visible), 'Scope checks must not mutate the original model');
});
