import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MUSCULOSKELETAL_SOURCE_ENTRIES as entries, MUSCULOSKELETAL_ROOT_PATH as root,
  musculoskeletalPathForGroup as pathFor, cleanMusculoskeletalPath, classifyMusculoskeletalNode,
} from './musculoskeletalTaxonomy';
import { neckMuscleSubdivisions, neckMuscleGroups, neckBoneGroup, NECK_BONE_GROUPS } from './musculoskeletalNeck';
import { BONES_AND_JOINTS_ID, skeletalRegion } from './musculoskeletalSkeleton';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, type: 'MatrixTransform', visible: true,
});
const scene = entries.map((entry, i) => node(entry.name, i + 1));
const neck = [...root, 'neck', 'muscles'];
const plan = (path: readonly string[]) => planRegionIsolation(
  scene, 'muscular', cleanMusculoskeletalPath(path), item => pathFor(item, path))!;

test('Neck shows all available attachment-related bones without losing their primary skeletal regions', () => {
  const bones = entries.filter(entry => entry.category === 'bones' && entry.regions.includes('neck'));
  assert.equal(bones.length, 40);
  const allBones = plan([...root, 'neck', 'bones']);
  const wholeNeck = plan([...root, 'neck']);
  const supporting = plan([...root, 'neck', 'attachments', 'bones']);
  const attachments = plan([...root, 'neck', 'attachments']);
  const muscles = plan(neck);
  for (const bone of bones) {
    const item = scene.find(item => item.rawName === bone.name)!;
    assert.ok(neckBoneGroup(bone.name), bone.name);
    for (const p of [allBones, wholeNeck, supporting, attachments])
      assert.ok(p.show.includes(item.instanceID), bone.name);
    assert.ok(!muscles.show.includes(item.instanceID), 'Muscles-only scope stays muscle-only');
  }
  for (const group of NECK_BONE_GROUPS) {
    const p = [...root, 'neck', 'bones', group.id];
    const isolated = plan(p);
    assert.ok(isolated.show.length);
    for (const id of isolated.show) {
      assert.equal(entries[id - 1].category, 'bones');
      assert.equal(neckBoneGroup(entries[id - 1].name), group.id);
    }
  }
  for (const [name, primary] of [
    ['Vertebra T1', 'thoracic'], ['Vertebra T6', 'thoracic'],
    ['First rib.l', 'thoracic'], ['Sixth rib.r', 'thoracic'], ['Manubrium of sternum', 'thoracic'],
    ['Clavicle.l', 'upper-limb'], ['Scapula.r', 'upper-limb'],
    ['Occipital bone', 'skull'], ['Mandible', 'skull'],
    ['Palatine bone.l', 'skull'], ['Maxilla.r', 'skull'],
    ['Atlas (C1)', 'cervical'], ['Hyoid bone', 'cervical'],
  ]) {
    const entry = classifyMusculoskeletalNode(name)[0];
    assert.equal(skeletalRegion(entry), primary, name);
    assert.ok(pathFor(node(name), [...root, BONES_AND_JOINTS_ID, primary, 'bones']), name);
  }
  for (const name of ['Vertebra T1', 'Vertebra T6', 'First rib.l', 'Sixth rib.r', 'Manubrium of sternum'])
    assert.ok(classifyMusculoskeletalNode(name)[0].regions.includes('thorax'));
  for (let t = 1; t <= 6; t++) {
    const entry = classifyMusculoskeletalNode(`Vertebra T${t}`)[0];
    for (const region of ['thorax', 'back', 'abdomen', 'neck']) assert.ok(entry.regions.includes(region as typeof entry.regions[number]));
  }
  for (const name of ['Vertebra T7', 'Vertebra T12', 'Vertebra L1', 'Seventh rib.l',
    'Twelfth rib.r', 'Body of sternum', 'Frontal bone', 'Humerus.l', 'Hip bone.r']) {
    assert.equal(pathFor(node(name), [...root, 'neck', 'bones']), null, name);
  }
});

test('Neck attachment bone views keep the appropriate side and all midline vertebrae', () => {
  for (const side of ['left', 'right']) {
    const path = [...root, 'neck', 'bones', `@side-${side}`];
    const isolation = plan(path);
    assert.ok(isolation.show.length);
    for (const id of isolation.show) {
      const name = entries[id - 1].name;
      assert.ok(!/\.[lr]$/.test(name) || name.endsWith(side === 'left' ? '.l' : '.r'), name);
    }
    for (let t = 1; t <= 6; t++) assert.ok(isolation.show.includes(scene.find(n => n.rawName === `Vertebra T${t}`)!.instanceID));
    assert.ok(pathFor(node(`Second rib.${side === 'left' ? 'l' : 'r'}.001_42`), path));
  }
});

test('all 99 Neck muscles, including both requested trapezius portions, have explicit topographic groups', () => {
  const muscles = entries.filter(entry => entry.category === 'muscles' && entry.regions.includes('neck'));
  assert.equal(muscles.length, 99);
  for (const muscle of muscles) {
    assert.ok(neckMuscleSubdivisions(muscle.name).length, muscle.name);
    assert.ok(pathFor(node(muscle.name), neck), muscle.name);
    for (const region of muscle.regions) assert.ok(pathFor(node(muscle.name), [...root, region, 'muscles']));
  }
  const all = plan(neck);
  assert.equal(all.show.length, muscles.length, 'Parent count does not double-count overlapping triangles');
  for (const id of all.show) {
    const entry = entries[id - 1];
    assert.equal(entry.category, 'muscles');
    assert.ok(entry.regions.includes('neck'));
  }
});

test('every topographic leaf isolates precisely its own available muscles and hides unrelated anatomy', () => {
  const walk = (groups: ReturnType<typeof neckMuscleGroups>) => {
    for (const group of groups) {
      const path = group.id.split('/');
      const isolation = plan(path);
      assert.ok(isolation?.show.length, group.label);
      for (const item of scene) {
        const expected = Boolean(pathFor(item, path));
        assert.equal(isolation.show.includes(item.instanceID), expected, `${group.label}: ${item.rawName}`);
        assert.equal(isNodeInRegion(item, path, value => pathFor(value, path)), expected);
        if (!expected) assert.ok(isolation.hide.includes(item.instanceID));
      }
      if (group.children) walk(group.children);
    }
  };
  walk(neckMuscleGroups(neck));
});

test('anterior/posterior triangles overlap only through the same whole source muscles', () => {
  const omohyoid = node('Omohyoid muscle.l.001_72');
  for (const parts of [
    ['anterior', 'carotid'], ['anterior', 'muscular'],
    ['lateral', 'occipital'], ['lateral', 'omoclavicular'],
  ]) assert.deepEqual(pathFor(omohyoid, [...neck, ...parts]), [...neck, ...parts]);
  assert.equal(pathFor(node('Sternohyoid muscle.l'), [...neck, 'lateral']), null);
  assert.equal(pathFor(node('Platysma.r'), [...neck, 'posterior']), null);
  assert.equal(pathFor(node('Scalenus anterior muscle.l'), [...neck, 'prevertebral']), null);
  assert.ok(pathFor(node('Longus colli muscle.l'), [...neck, 'prevertebral']));
  assert.ok(pathFor(node('Rectus lateralis capitis muscle.r'), [...neck, 'prevertebral']));
  assert.ok(pathFor(node('Bucinator.l'), [...neck, 'adjacent-source']));
  assert.equal(pathFor(node('Bucinator.l'), [...neck, 'anterior']), null);
  for (const name of ['Descending part of trapezius muscle.l', 'Transverse part of trapezius muscle.r'])
    assert.ok(pathFor(node(name), [...neck, 'posterior', 'scapular']), 'Requested trapezius parts are cervical references');
});

test('topographic groups preserve side filtering, live cervical additions and opt-in attachments', () => {
  for (const side of ['left', 'right']) {
    const p = [...neck, 'posterior', `@side-${side}`];
    const isolated = plan(p);
    assert.ok(isolated.show.length);
    assert.ok(isolated.show.every(id => !/\.[lr]$/.test(scene[id - 1].rawName)
      || scene[id - 1].rawName.endsWith(side === 'left' ? '.l' : '.r')));
  }
  for (const [name, group] of [
    ['Semispinalis capitis muscle.l', 'transversospinal'],
    ['Cervical intertransversarii.r', 'segmental'],
    ['Cervical rotatores.l', 'transversospinal'],
  ]) assert.ok(pathFor(node(name), [...neck, 'posterior', group]), name);
  assert.ok(pathFor(node('Splenius cervicis.l'), [...neck, 'posterior', 'splenii']));
  for (const entry of entries.filter(entry => entry.category === 'attachments')) {
    assert.equal(pathFor(node(entry.name), neck), null);
    if (entry.regions.includes('neck'))
      assert.ok(pathFor(node(entry.name), [...root, 'neck', 'attachments']));
  }
  assert.deepEqual(neckMuscleSubdivisions('Unknown muscle.l'), []);
  assert.equal(pathFor(node('Lumbar intertransversarii.l'), neck), null);
  assert.equal(pathFor(node('Rotatores muscle.l'), neck), null);
  assert.ok(classifyMusculoskeletalNode('Obliquus superior capitis muscle.l')[0].regions.includes('back'));
});
