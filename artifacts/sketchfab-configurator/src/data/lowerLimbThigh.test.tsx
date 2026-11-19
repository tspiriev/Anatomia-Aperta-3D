import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOWER_LIMB_SOURCE_OBJECTS as rows, LOWER_LIMB_TOPOGRAPHY_ROOT as ROOT,
  LOWER_LIMB_TOPOGRAPHY_GROUPS as groups, lowerLimbPathForGroup as pathFor,
  lowerLimbSettings, lowerLimbSystemForNode,
} from './lowerLimbTopography';
import { isLowerLimbCaudaComponent } from './lowerLimbHipGluteal';
import { planRegionIsolation } from '../lib/regionIsolation';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const p = (...parts: string[]) => [...ROOT, 'thigh', ...parts];
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
const planFor = (path: string[], side: 'both' | 'left' | 'right' = 'both') =>
  planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path, side))!;

test('Anterior thigh shows hip bones, every exported inguinal ligament and requested groin vessels/nerves', () => {
  const names = [
    'Hip bone', 'Inguinal ligament', 'Inferior epigastric artery', 'Inferior epigastric vein',
    'Superficial epigastric artery', 'Superficial epigastric vein',
    'Superficial external pudendal artery', 'Deep external pudendal artery', 'Great saphenous vein',
    'Femoral branch of genitofemoral nerve', 'Genitofemoral nerve', 'Ilio-inguinal nerve',
  ];
  for (const section of ['anterior', 'femoral-triangle']) {
    const path = p(section);
    const plan = planFor(path);
    const menuIds = menuCollectionNodeIds(nodes, [tree.find(group => group.id === path.join('/'))!],
      () => null, pathFor);
    for (const name of names) for (const side of ['l', 'r']) {
      const node = n(`${name}.${side}`);
      assert.ok(plan.show.includes(node.instanceID), `${section}: ${node.rawName}`);
      assert.ok(menuIds.includes(node.instanceID), `${section}: ${node.rawName}`);
    }
    for (const node of nodes.filter(node => /^Inguinal ligament\./.test(node.rawName)))
      assert.ok(plan.show.includes(node.instanceID), 'Do not omit repeated source ligament meshes');
  }
  assert.equal(pathFor(n('Superficial epigastric artery.r'), [...ROOT, 'hip-gluteal', 'iliopsoas']), null);
});

test('Thigh fasciae exist only in their dedicated menu, never in combined or compartment views', () => {
  const fasciaPath = p('fasciae');
  const fasciaNodes = nodes.filter(node => pathFor(node, fasciaPath));
  assert.ok(fasciaNodes.length >= 4);
  for (const path of [p(), p('anterior'), p('medial'), p('posterior'), p('femoral-triangle'),
    p('adductor-canal'), p('muscles'), p('nerves'), p('arteries'), p('veins'), p('bones'), p('joints')]) {
    const plan = planFor(path);
    const settings = lowerLimbSettings(nodes, plan.show, path);
    for (const node of fasciaNodes) {
      assert.equal(pathFor(node, path), null, `${path.join('/')}: ${node.rawName}`);
      assert.ok(!plan.show.includes(node.instanceID));
      assert.ok(!settings.supportIds.includes(node.instanceID));
    }
  }
  for (const section of ['anterior', 'medial', 'posterior', 'femoral-triangle', 'adductor-canal'])
    assert.ok(!tree.some(group => group.id === p(section, 'fasciae').join('/')));
  assert.ok(tree.some(group => group.id === fasciaPath.join('/')));
  assert.equal(groups.find(group => group.id === p().join('/'))?.children?.at(-1)?.id,
    fasciaPath.join('/'), 'Keep the dedicated fasciae menu last');
  assert.ok(pathFor(n('Iliotibial tract.r'), [...ROOT, 'hip-gluteal', 'gluteal']),
    'Preserve fascia in the separately approved hip/gluteal atlas views');
});

test('Dedicated thigh fascia lata and iliotibial sheets are semitransparent, not muscle targets', () => {
  const path = p('fasciae');
  const plan = planFor(path);
  const settings = lowerLimbSettings(nodes, plan.show, path);
  for (const name of ['Fascia lata', 'Iliotibial tract']) for (const side of ['l', 'r']) {
    const id = n(`${name}.${side}`).instanceID;
    assert.ok(plan.show.includes(id));
    assert.ok(settings.contextIds.includes(id), `Semitransparent ${name}.${side}`);
  }
  const tensor = nodes.find(node => /^Tensor fasciae latae/i.test(node.rawName))!;
  assert.ok(tensor);
  assert.ok(!settings.contextIds.includes(tensor.instanceID));
  assert.equal(pathFor(tensor, path), null);
  assert.deepEqual(lowerLimbSettings(nodes, [], path).supportIds, []);
});

test('Anterior nerves and vessels retain the inguinal landmark and transparent hip bones, with side filtering', () => {
  for (const tissue of ['nerves', 'arteries', 'veins']) for (const side of ['left', 'right'] as const) {
    const path = p('anterior', tissue);
    const plan = planFor(path, side);
    const settings = lowerLimbSettings(nodes, plan.show, path, side);
    const suffix = side === 'left' ? 'l' : 'r', other = suffix === 'l' ? 'r' : 'l';
    assert.ok(settings.supportIds.includes(n(`Hip bone.${suffix}`).instanceID));
    assert.ok(settings.contextIds.includes(n(`Hip bone.${suffix}`).instanceID));
    assert.ok(settings.supportIds.includes(n(`Inguinal ligament.${suffix}`).instanceID));
    assert.ok(!settings.contextIds.includes(n(`Inguinal ligament.${suffix}`).instanceID));
    assert.ok(!settings.supportIds.includes(n(`Hip bone.${other}`).instanceID));
    assert.ok(!settings.supportIds.includes(n(`Inguinal ligament.${other}`).instanceID));
    assert.deepEqual(lowerLimbSettings(nodes, [], path, side).supportIds, []);
  }
});

test('All thigh compartments keep bone references semitransparent without changing muscle-only views', () => {
  for (const section of ['anterior', 'medial', 'posterior']) {
    const path = p(section), plan = planFor(path);
    const settings = lowerLimbSettings(nodes, plan.show, path);
    for (const side of ['l', 'r']) assert.ok(settings.contextIds.includes(n(`Femur.${side}`).instanceID));
    const bonePath = p(section, 'bones'), bonePlan = planFor(bonePath);
    assert.deepEqual(lowerLimbSettings(nodes, bonePlan.show, bonePath).contextIds, []);
    const musclePath = p(section, 'muscles'), musclePlan = planFor(musclePath);
    assert.deepEqual(lowerLimbSettings(nodes, musclePlan.show, musclePath).contextIds, []);
    assert.deepEqual(lowerLimbSettings(nodes, musclePlan.show, musclePath).supportIds, []);
  }
});

test('Thigh Nerves and ganglia includes actual cauda equina spinal roots and filum, not plexus substitutes', () => {
  const path = p('nerves'), plan = planFor(path);
  const group = tree.find(group => group.id === path.join('/'))!;
  const menuIds = menuCollectionNodeIds(nodes, [group], () => null, pathFor);
  const roots = nodes.filter(node => isLowerLimbCaudaComponent(node.rawName));
  assert.ok(roots.length >= 37);
  for (const node of roots) {
    assert.ok(plan.show.includes(node.instanceID), node.rawName);
    assert.ok(menuIds.includes(node.instanceID), node.rawName);
    assert.equal(node.systemId, 'nervous');
    assert.equal(pathFor(node, p('medial')), null);
    assert.equal(pathFor(node, p('posterior')), null);
  }
  assert.equal(pathFor(n('L2 root.l'), path), null, 'Plexus ramus is not a cauda equina root');
  assert.ok(pathFor({ rawName: 'Cauda_equina_12345' }, path), 'Use a named aggregate only if it loads');
});
