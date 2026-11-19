import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MUSCULOSKELETAL_SOURCE_ENTRIES as entries, MUSCULOSKELETAL_GROUPS as groups,
  MUSCULOSKELETAL_REGIONS as regions,
  MUSCULOSKELETAL_ROOT_PATH as root, musculoskeletalPathForGroup as pathFor,
  musculoskeletalSide, cleanMusculoskeletalPath,
} from './musculoskeletalTaxonomy';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';

const scene = entries.map((entry, i) => ({
  instanceID: i + 1, rawName: entry.name, name: entry.name, type: 'MatrixTransform', visible: true,
}));
const base = [...root, 'abdomen'];
const plan = (path: readonly string[]) => planRegionIsolation(
  scene, 'muscular', cleanMusculoskeletalPath(path), node => pathFor(node, path))!;

test('Abdomen merges the bone/joint menu without changing source categories or other regional menus', () => {
  const region = groups.find(group => group.id === base.join('/'))!;
  assert.equal(region.children!.find(child => child.id.endsWith('/bones'))!.label, 'Bones and joints');
  assert.ok(!region.children!.some(child => child.id.endsWith('/joints-ligaments')));
  for (const region of regions.filter(region => region.id !== 'abdomen')) {
    const group = groups.find(group => group.id === [...root, region.id].join('/'))!;
    assert.ok(group.children!.some(child => child.id.endsWith('/joints-ligaments')), group.label);
  }
  const selected = plan([...base, 'bones']);
  const expected = entries.flatMap((entry, i) => entry.regions.includes('abdomen')
    && ['bones', 'joints-ligaments'].includes(entry.category) ? [i + 1] : []);
  assert.deepEqual(selected.show, expected);
  for (const category of ['bones', 'joints-ligaments'])
    assert.ok(selected.show.some(id => entries[id - 1].category === category));
});

test('Abdomen Muscles includes all regional muscles plus the same bones, joints and ligaments for orientation', () => {
  const path = [...base, 'muscles'];
  const selected = plan(path);
  const expected = entries.flatMap((entry, i) => entry.regions.includes('abdomen')
    && ['muscles', 'bones', 'joints-ligaments'].includes(entry.category) ? [i + 1] : []);
  assert.deepEqual(selected.show, expected);
  const bones = plan([...base, 'bones']);
  for (const id of bones.show) assert.ok(selected.show.includes(id));
  for (const name of ['Hip bone.l', 'Hip bone.r', 'Sacrum', 'Coccyx',
    'First rib.l', 'Twelfth rib.r', 'Vertebra T12', 'Vertebra L5', 'Inguinal ligament.r']) {
    const item = scene.find(node => node.rawName === name);
    assert.ok(item, name);
    assert.ok(selected.show.includes(item.instanceID), name);
  }
  assert.ok(selected.show.every(id => !['attachments', 'fasciae', 'bursae'].includes(entries[id - 1].category)));
  for (const name of ['Femur.l', 'Scapula.r', 'Articular capsule of elbow joint.l']) {
    const item = scene.find(node => node.rawName === name)!;
    assert.ok(selected.hide.includes(item.instanceID), name);
  }
});

test('combined Abdomen views preserve laterality and restore the preceding muscle/bone/joint composition', () => {
  for (const category of ['muscles', 'bones']) for (const side of ['left', 'right']) {
    const selected = plan([...base, category, `@side-${side}`]);
    assert.ok(selected.show.length);
    assert.ok(selected.show.every(id => musculoskeletalSide(scene[id - 1].rawName) !== (side === 'left' ? 'right' : 'left')));
    const sacrum = scene.find(node => node.rawName === 'Sacrum')!;
    assert.ok(selected.show.includes(sacrum.instanceID));
  }
  const combined = new Set(plan([...base, 'muscles']).show);
  const preceding = scene.map(node => ({ ...node, visible: combined.has(node.instanceID) }));
  const snapshot = captureRegionIsolation(preceding, [...base, 'bones'], 'muscle-view-camera');
  assert.deepEqual([...snapshot.visibility].filter(([, visible]) => visible).map(([id]) => id), [...combined]);
  assert.equal(snapshot.camera, 'muscle-view-camera');
});
