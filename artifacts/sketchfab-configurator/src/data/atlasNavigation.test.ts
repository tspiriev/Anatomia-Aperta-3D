import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_VIEWS } from './atlasViews';
import { ATLAS_NAVIGATION_MENUS } from './atlasNavigation';

test('independent system menus and full atlas partition all existing atlas routes', () => {
  const [nervous, skullBase, topographic, musculoskeletal, cardiovascular, organs, full] = ATLAS_NAVIGATION_MENUS;
  assert.deepEqual(ATLAS_NAVIGATION_MENUS.map((menu) => menu.id), ['nervous-system', 'skull-base', 'topographic-anatomy', 'musculoskeletal-system', 'cardiovascular-system', 'internal-organs', 'full-atlas']);
  assert.equal(cardiovascular.label, 'Cardiovascular system');
  assert.equal(organs.label, 'Internal organs');
  for (const menu of [cardiovascular, organs]) {
    assert.equal(menu.comingSoon, true);
    assert.deepEqual(menu.views, []);
  }
  assert.equal(topographic.label, 'Topographic anatomy');
  assert.deepEqual(topographic.views.map(view => [view.id, view.label, view.href]), [
    ['head-neck-topography', 'Head', '/atlas/head-neck'],
    ['neck-topography', 'Neck', '/atlas/neck'],
    ['upper-limb-topography', 'Upper limb', '/atlas/upper-limb'],
    ['lower-limb-topography', 'Lower limb', '/atlas/lower-limb'],
  ]);
  assert.equal(skullBase.label, 'Skull base');
  assert.deepEqual(skullBase.views.map(view => view.id), ['skull-base']);
  assert.equal(musculoskeletal.label, 'Musculoskeletal system');
  assert.deepEqual(musculoskeletal.views.map(view => view.id), ['musculoskeletal-system']);
  assert.equal(full.label, 'Explore the full atlas');
  assert.deepEqual(full.views.map((view) => view.id), ['full-anatomy']);
  assert.equal(nervous.label, 'Nervous system');
  assert.deepEqual(nervous.views.map((view) => view.id), [
    'brain', 'brainstem-and-cerebellum', 'temporal-stem-sagittal-stratum',
    'thalamus-internal-capsule', 'cranial-nerves', 'long-tracts', 'spinal-cord-anatomy',
    'autonomic-nervous-system', 'brachial-plexus', 'lumbar-sacral-plexuses',
    'central-nervous-system',
  ]);
  const routes = ATLAS_NAVIGATION_MENUS.flatMap((menu) => menu.views.map((view) => view.href));
  assert.equal(new Set(routes).size, routes.length);
  assert.deepEqual([...routes].sort(), ATLAS_VIEWS.map((view) => view.href).sort());
});
