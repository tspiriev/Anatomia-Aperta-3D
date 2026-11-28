import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MUSCULOSKELETAL_SOURCE_ENTRIES as entries, MUSCULOSKELETAL_ROOT_PATH as root,
  MUSCULOSKELETAL_GROUPS, musculoskeletalPathForGroup as pathFor,
  cleanMusculoskeletalPath, previousAttachmentSitesToHide,
} from './musculoskeletalTaxonomy';
import { upperLimbTopographicPaths, upperLimbTopographyGroup } from './upperLimbTopography';
import { upperLimbTissue } from './upperLimbTopographicMembership';
import { planRegionIsolation, isNodeInRegion, captureRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';

const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, type: 'MatrixTransform', visible: true,
});
const scene = entries.map((entry, i) => node(entry.name, i + 1));
const base = [...root, 'upper-limb', 'topography'];
const plan = (path: readonly string[], nodes = scene) => planRegionIsolation(
  nodes, 'muscular', cleanMusculoskeletalPath(path), item => pathFor(item, path))!;
const includes = (name: string, ...parts: string[]) => Boolean(pathFor(node(name), [...base, ...parts]));

test('all existing upper-limb tissues are mapped, and old tissue menus retain their membership and original source categories', () => {
  const upper = entries.filter(entry => entry.regions.includes('upper-limb'));
  for (const entry of upper) {
    assert.ok(upperLimbTopographicPaths(entry).length, entry.name);
    assert.ok(pathFor(node(entry.name), [...root, 'upper-limb', entry.category]), entry.name);
  }
  assert.equal(upper.filter(entry => entry.category === 'muscles').length, 118);
  const region = MUSCULOSKELETAL_GROUPS.find(g => g.id === [...root, 'upper-limb'].join('/'))!;
  for (const category of ['bones', 'muscles', 'joints-ligaments', 'fasciae', 'bursae', 'attachments'])
    assert.ok(region.children!.some(child => child.id.endsWith(`/${category}`)));
  const ordinary = plan([...root, 'upper-limb']);
  assert.ok(ordinary.show.every(id => entries[id - 1].category !== 'attachments'), 'Ordinary entry remains attachments-off');
});

test('every region and compartment isolates only its own source-backed tissues and uses identical selection scope', () => {
  const visit = (group: ReturnType<typeof upperLimbTopographyGroup>) => {
    const path = group.id.split('/');
    const isolation = plan(path);
    assert.ok(isolation?.show.length, group.label);
    assert.equal(new Set(isolation.show).size, isolation.show.length, 'Shared anatomy never duplicates geometry');
    for (const item of scene) {
      const expected = Boolean(pathFor(item, path));
      assert.equal(isolation.show.includes(item.instanceID), expected, `${group.label}: ${item.rawName}`);
      assert.equal(isNodeInRegion(item, path, value => pathFor(value, path)), expected);
      if (!expected) assert.ok(isolation.hide.includes(item.instanceID));
    }
    for (const child of group.children ?? []) visit(child);
  };
  visit(upperLimbTopographyGroup([...root, 'upper-limb'], entries));
});

test('shoulder combines available muscles, joints, bones, attachment patches, fascia and bursae', () => {
  const names = ['Supraspinatus muscle.l', 'Scapular spinal part of deltoid muscle.r',
    'Scapula.l', 'Clavicle.r', 'Humerus.l', 'Manubrium of sternum',
    'Articular capsule of glenohumeral joint.l', 'Articular capsule of sternoclavicular joint.r',
    'Deltoid fascia.l', 'Subacromial bursa.l'];
  for (const name of names) assert.ok(includes(name, 'shoulder'), name);
  const shoulder = plan([...base, 'shoulder']);
  for (const category of ['muscles', 'bones', 'joints-ligaments', 'fasciae', 'bursae', 'attachments'])
    assert.ok(shoulder.show.some(id => entries[id - 1].category === category), category);
  assert.equal(includes('Flexor digitorum profundus.l', 'shoulder'), false);
  assert.equal(includes('Femur.l', 'shoulder'), false);
});

test('anterior and posterior arm compartments include both shared septa without mixing opposing muscle groups', () => {
  for (const compartment of ['anterior', 'posterior']) {
    for (const septum of ['Medial', 'Lateral']) {
      const name = `${septum} intermuscular septum of arm.l`;
      assert.ok(includes(name, 'arm', compartment), name);
      assert.ok(includes(name, 'arm', compartment, 'fasciae'));
      assert.equal(includes(name, 'arm', compartment, 'muscles'), false, 'Septa have a connective-tissue teaching branch');
      assert.ok(entries.find(entry => entry.name === name && entry.category === 'muscles'), 'Original CSV classification unchanged');
    }
    for (const name of ['Humerus.l', 'Articular capsule of elbow joint.l'])
      assert.ok(includes(name, 'arm', compartment), name);
  }
  for (const name of ['Short head of biceps brachii.l', 'Long head of biceps brachii.r', 'Brachialis muscle.l', 'Coracobrachialis muscle.r']) {
    assert.ok(includes(name, 'arm', 'anterior', 'muscles'), name);
    assert.equal(includes(name, 'arm', 'posterior'), false);
  }
  for (const head of ['Long', 'Lateral', 'Medial']) {
    assert.ok(includes(`${head} head of triceps brachii.l`, 'arm', 'posterior', 'muscles'));
    assert.equal(includes(`${head} head of triceps brachii.l`, 'arm', 'anterior'), false);
  }
  assert.equal(includes('Coracobrachialis muscle.l', 'elbow'), false, 'Coracobrachialis does not cross the elbow');
});

test('forearm layers respect muscle identities rather than misleading source head names', () => {
  assert.ok(includes('Deep head of pronator teres.l', 'forearm', 'anterior', 'superficial', 'muscles'));
  assert.equal(includes('Deep head of pronator teres.l', 'forearm', 'anterior', 'deep'), false);
  for (const head of ['Humero-ulnar', 'Radial'])
    assert.ok(includes(`${head} head of flexor digitorum superficialis.l`, 'forearm', 'anterior', 'intermediate', 'muscles'));
  for (const name of ['Flexor digitorum profundus.l', 'Flexor pollicis longus.l', 'Pronator quadratus.r'])
    assert.ok(includes(name, 'forearm', 'anterior', 'deep', 'muscles'), name);
  for (const name of ['Supinator.l', 'Extensor indicis.r', 'Abductor pollicis longus.l'])
    assert.ok(includes(name, 'forearm', 'posterior', 'deep', 'muscles'), name);
  assert.ok(includes('Brachioradialis muscle.l', 'forearm', 'posterior', 'superficial', 'muscles'));
  assert.ok(includes('Brachioradialis muscle.l', 'forearm', 'mobile-wad', 'muscles'));
  assert.equal(includes('Brachioradialis muscle.l', 'forearm', 'anterior'), false);
  assert.equal(includes('Antebrachial fascia.l', 'forearm', 'anterior', 'deep'), false, 'Outer fascia must not cover a deep-only layer');
  assert.ok(includes('Interosseous membrane of forearm.l', 'forearm', 'anterior', 'deep', 'joints-ligaments'));
});

test('wrist, carpal tunnel and intrinsic hand regions distinguish crossing whole muscles, sheaths and fused joint meshes', () => {
  assert.ok(includes('Flexor digitorum profundus.l', 'wrist', 'palmar', 'carpal-tunnel', 'muscles'));
  assert.ok(includes('Flexor retinaculum of wrist.l', 'wrist', 'palmar', 'carpal-tunnel', 'fasciae'));
  for (const name of ['Flexor carpi radialis.l', 'Palmaris longus muscle.r', 'Ulnar head of flexor carpi ulnaris.l'])
    assert.equal(includes(name, 'wrist', 'palmar', 'carpal-tunnel'), false, name);
  assert.ok(includes('Tendon sheath of extensor carpi ulnaris.l', 'wrist', 'dorsal', 'fasciae'));
  assert.equal(includes('Tendon sheath of extensor carpi ulnaris.l', 'wrist', 'dorsal', 'muscles'), false);
  assert.ok(includes('Abductor pollicis brevis.l', 'hand', 'thenar', 'muscles'));
  assert.ok(includes('Opponens digiti minimi muscle of hand.r', 'hand', 'hypothenar', 'muscles'));
  assert.ok(includes('Transverse head of adductor pollicis.l', 'hand', 'adductor', 'muscles'));
  assert.ok(includes('Lumbrical muscles of hand.r', 'hand', 'central', 'muscles'));
  assert.ok(includes('Palmar interossei muscles.l', 'hand', 'interosseous', 'muscles'));
  assert.equal(includes('Fifth metacarpal bone.l', 'hand', 'thenar'), false);
  assert.ok(includes('First metacarpal bone.l', 'hand', 'thenar', 'bones'));
  assert.ok(includes('Articular capsules of metacarpophalangeal joints.l', 'hand', 'joints-ligaments'));
  assert.equal(includes('Articular capsules of metacarpophalangeal joints.l', 'hand', 'thenar'), false);
});

test('topographic attachments follow named muscles, survive deselection, and respect side filters', () => {
  const armPath = [...base, 'arm', 'anterior'];
  const armSites = scene.filter(item => entries[item.instanceID - 1].category === 'attachments' && pathFor(item, armPath));
  assert.ok(armSites.length);
  for (const item of armSites) assert.match(item.rawName, /biceps brachii|brachialis|coracobrachialis/i);
  assert.deepEqual(previousAttachmentSitesToHide(armSites.map(n => n.instanceID), scene, armPath), []);
  const mixed = [...armSites.map(n => n.instanceID), scene.find(n => /Medial head of triceps brachii\.o.*l$/.test(n.rawName))!.instanceID];
  assert.equal(previousAttachmentSitesToHide(mixed, scene, armPath).length, 1);
  assert.deepEqual(previousAttachmentSitesToHide(armSites.map(n => n.instanceID), scene, [...armPath, 'muscles']), armSites.map(n => n.instanceID));
  for (const side of ['left', 'right']) {
    const p = [...base, 'shoulder', `@side-${side}`];
    const isolated = plan(p);
    assert.ok(isolated.show.length);
    assert.ok(isolated.show.every(id => !/\.(?:[oe]\d*)?[lr]$/i.test(scene[id - 1].rawName)
      || scene[id - 1].rawName.toLowerCase().endsWith(side === 'left' ? 'l' : 'r')));
    assert.ok(pathFor(node('Manubrium of sternum'), p), 'Midline skeletal context remains on both sides');
  }
  assert.ok(includes('Long head of biceps brachii.l.001_42', 'arm', 'anterior', 'muscles'));
});

test('tissue filtering, visibility editing and restore preserve the exact preceding topographic view', () => {
  const combined = [...base, 'arm', 'posterior'];
  const isolation = plan(combined);
  const composed = scene.map(item => ({ ...item, visible: isolation.show.includes(item.instanceID) }));
  const snapshot = captureRegionIsolation(composed, [...combined, 'muscles'], Promise.resolve(null));
  for (const item of composed) assert.equal(snapshot.visibility.get(item.instanceID), item.visible);
  for (const id of plan([...combined, 'muscles']).show) assert.equal(upperLimbTissue(entries[id - 1]), 'muscles');
  for (const id of plan([...combined, 'fasciae']).show) assert.equal(upperLimbTissue(entries[id - 1]), 'fasciae');
  for (const id of plan([...combined, 'attachments']).show) assert.equal(entries[id - 1].category, 'attachments');
});
