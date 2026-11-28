import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOWER_LIMB_SOURCE_OBJECTS as rows, LOWER_LIMB_TOPOGRAPHY_ROOT as ROOT,
  LOWER_LIMB_TOPOGRAPHY_GROUPS as groups, lowerLimbPathForGroup as pathFor,
  lowerLimbCataloguePathForGroup, lowerLimbSettings, lowerLimbSide, lowerLimbSystemForNode,
} from './lowerLimbTopography';
import { lowerLimbName } from './lowerLimbNames';
import { isLowerLimbCaudaComponent } from './lowerLimbHipGluteal';
import { planRegionIsolation } from '../lib/regionIsolation';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const p = (...parts: string[]) => [...ROOT, 'hip-gluteal', ...parts];
const nodes: SceneNode[] = rows.map((row, i) => ({
  rawName: row.rawName, name: row.rawName, instanceID: i + 1, type: 'MatrixTransform',
  systemId: lowerLimbSystemForNode({ rawName: row.rawName, systemId: null }), visible: true,
}));
const n = (rawName: string) => {
  const node = nodes.find(node => node.rawName === rawName);
  assert.ok(node, `Actual source object ${rawName}`);
  return node;
};
const flatten = (items: readonly NervousGroup[]): NervousGroup[] =>
  items.flatMap(item => [item, ...flatten(item.children ?? [])]);
const tree = flatten(groups);
const landmarks = ['Vertebra L1', 'Vertebra L2', 'Vertebra L3', 'Vertebra L4', 'Vertebra L5', 'Sacrum'];

test('Anterior hip/iliopsoas excludes inferior and superficial epigastric vessels without removing them elsewhere', () => {
  const epigastrics = nodes.filter(node => /epigastric/i.test(node.rawName));
  assert.equal(epigastrics.length, 8);
  for (const node of epigastrics) {
    assert.equal(pathFor(node, p('iliopsoas')), null, node.rawName);
    assert.equal(pathFor(node, p()), null, node.rawName);
    assert.ok(pathFor(node, [...ROOT, 'lumbar-pelvic']));
    assert.ok(pathFor(node, [...ROOT, 'thigh', 'femoral-triangle']));
  }
});

test('Anterior hip and gluteal combined views show lumbar vertebrae and sacrum as transparent references', () => {
  for (const section of ['iliopsoas', 'gluteal']) {
    const path = p(section);
    const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
    const settings = lowerLimbSettings(nodes, plan.show, path);
    for (const rawName of landmarks) {
      const id = n(rawName).instanceID;
      assert.ok(plan.show.includes(id), rawName);
      assert.ok(settings.contextIds.includes(id), rawName);
      assert.ok(settings.supportIds.includes(id), rawName);
      for (const side of ['left', 'right'] as const) assert.ok(pathFor(n(rawName), path, side));
    }
    const bonePath = p(section, 'bones');
    const boneIds = nodes.filter(node => pathFor(node, bonePath)).map(node => node.instanceID);
    assert.deepEqual(lowerLimbSettings(nodes, boneIds, bonePath).contextIds, [],
      'Bone-only inspection retains original opaque materials');
  }
});

test('Gluteal roots and cauda equina use actual spinal roots, not substituted plexus rami or ganglia', () => {
  const caudaPath = p('gluteal', 'cauda-equina', 'nerves');
  const group = tree.find(group => group.id === caudaPath.join('/'))!;
  assert.ok(group, 'Source-backed Cauda equina collection');
  const menuIds = menuCollectionNodeIds(nodes, [group], () => null, pathFor);
  const spinalRoots = nodes.filter(node => isLowerLimbCaudaComponent(node.rawName));
  assert.ok(spinalRoots.length >= 37, 'Bilateral lumbar/sacral anterior and posterior roots plus filum');
  for (const node of spinalRoots) {
    assert.ok(menuIds.includes(node.instanceID), node.rawName);
    assert.ok(pathFor(node, p('gluteal', 'nerves')), node.rawName);
  }
  for (const rawName of ['L2 root.l', 'L1 Dorsal root ganglion.l', 'Dorsal ramus L1.l']) {
    assert.ok(pathFor(n(rawName), p('gluteal', 'nerves')));
    assert.equal(pathFor(n(rawName), caudaPath), null, 'Not a cauda equina root mesh');
  }
  assert.ok(pathFor(n('Anterior horn of spinal cord'), p('gluteal', 'nerves')));
  assert.equal(n('Anterior horn of spinal cord').name, 'Anterior horn of spinal cord');
});

test('Gluteal and parent nerve views retain cord, cauda and transparent lumbar/sacral landmarks with correct sides', () => {
  for (const path of [p('gluteal', 'nerves'), p('nerves'), p('gluteal', 'cauda-equina', 'nerves')]) {
    for (const side of ['both', 'left', 'right'] as const) {
      const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path, side))!;
      const settings = lowerLimbSettings(nodes, plan.show, path, side);
      const shown = new Set([...plan.show, ...settings.supportIds]);
      for (const rawName of [...landmarks, 'Anterior horn of spinal cord', 'Filum terminale'])
        assert.ok(shown.has(n(rawName).instanceID), `${side}: ${rawName}`);
      for (const rawName of landmarks) assert.ok(settings.contextIds.includes(n(rawName).instanceID));
      assert.ok(!settings.contextIds.includes(n('Anterior horn of spinal cord').instanceID));
      assert.ok(!settings.contextIds.includes(n('Filum terminale').instanceID));
      for (const node of nodes.filter(node => isLowerLimbCaudaComponent(node.rawName))) {
        const lateral = lowerLimbSide(node.rawName);
        assert.equal(shown.has(node.instanceID), side === 'both' || lateral === 'both' || lateral === side,
          `${side}: ${node.rawName}`);
      }
      assert.deepEqual(lowerLimbSettings(nodes, [], path, side).supportIds, []);
    }
  }
  for (const tissue of ['muscles', 'arteries', 'veins', 'fasciae', 'joints', 'bursae']) {
    const path = p('gluteal', tissue);
    const ids = nodes.filter(node => pathFor(node, path)).map(node => node.instanceID);
    assert.deepEqual(lowerLimbSettings(nodes, ids, path).supportIds, [],
      `No forced neural/bone geometry in ${tissue}-only view`);
  }
});

test('Anterior hip and gluteal arterial and venous collections include complete available proximal pathways', () => {
  for (const section of ['iliopsoas', 'gluteal']) {
    for (const [tissue, rawNames] of [
      ['arteries', ['Abdominal aorta', 'Common iliac artery.r', 'External iliac artery.l',
        'Internal iliac artery.r', 'Anterior division of internal iliac artery.l',
        'Posterior division of internal iliac artery.r', 'Femoral artery.r', 'Deep femoral artery.l',
        'Medial circumflex femoral artery.r', 'Lateral circumflex femoral artery.l']],
      ['veins', ['Inferior vena cava (abdominal part)', 'Common iliac vein.r', 'External iliac vein.l',
        'Internal iliac vein.r', 'Femoral vein.l', 'Deep femoral vein.r',
        'Medial circumflex femoral veins.l', 'Lateral circumflex femoral veins.r']],
    ] as const) {
      const path = p(section, tissue);
      const group = tree.find(group => group.id === path.join('/'))!;
      const menuIds = menuCollectionNodeIds(nodes, [group], () => null, pathFor);
      const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
      for (const rawName of rawNames) {
        const node = n(rawName);
        assert.ok(menuIds.includes(node.instanceID), `Menu: ${section}: ${rawName}`);
        assert.ok(plan.show.includes(node.instanceID), `Scene: ${section}: ${rawName}`);
        assert.equal(node.systemId, 'vascular');
      }
      assert.ok(!plan.show.includes(n('Inferior epigastric artery.r').instanceID));
      assert.ok(!plan.show.includes(n('Inferior epigastric vein.r').instanceID));
    }
  }
});

test('Only requested live aggregate cauda geometry is admitted, without inventing catalogue presence', () => {
  const cauda = { rawName: 'Cauda_equina_12345' };
  assert.ok(pathFor(cauda, p('gluteal', 'nerves')));
  assert.ok(pathFor(cauda, p('gluteal', 'cauda-equina')));
  assert.equal(lowerLimbCataloguePathForGroup(cauda, ROOT), null);
  assert.equal(pathFor(cauda, [...ROOT, 'foot']), null);
  assert.equal(pathFor({ rawName: 'Unknown cauda equina reference' }, ROOT), null);
  assert.equal(lowerLimbName(n('L2 root.l').rawName), 'l2 root');
});
