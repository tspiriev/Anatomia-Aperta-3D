import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionVisibilityCommands } from './collectionVisibility';

test('explicit collection Show enables a source-hidden disc geometry and all masked ancestors, even when the panel already says visible', () => {
  const raw = {
    root: { instanceID: 1, nodeMask: 0, children: [2] },
    discs: { instanceID: 2, nodeMask: 0, children: ['3', 7] },
    disc: { instanceID: 3, nodeMask: -1, children: [{ instanceID: 4, children: [5] }] },
    geometry: { instanceID: 5, nodeMask: 0 },
    muscle: { instanceID: 7, nodeMask: 0, children: [8] },
    muscleGeometry: { instanceID: 8, nodeMask: 0 },
  };
  const parents = new Map([[2, 1], [3, 2], [4, 3], [5, 4], [7, 2], [8, 7]]);
  const commands = collectionVisibilityCommands([3], raw, parents, new Set([3, 7]));
  assert.deepEqual(commands, [1, 2, 3, 4, 5]);
  const mask = new Map(Object.values(raw).map(node => [node.instanceID, 'nodeMask' in node ? node.nodeMask : -1]));
  commands.forEach(id => mask.set(id, -1)); // Actual SDK show calls, not panel flags.
  for (const id of [1, 2, 3, 4, 5]) assert.equal(mask.get(id), -1);
  for (const id of [7, 8]) assert.equal(mask.get(id), 0, 'excluded muscle stays hidden');
});

test('showing a container never enables excluded selectable children, but includes requested children', () => {
  const raw = {
    parent: { instanceID: 1, children: [2, 3] },
    disc: { instanceID: 2, children: [4] },
    muscle: { instanceID: 3, children: [5] },
    discGeometry: { instanceID: 4 }, muscleGeometry: { instanceID: 5 },
  };
  const parents = new Map([[2, 1], [3, 1], [4, 2], [5, 3]]);
  assert.deepEqual(collectionVisibilityCommands([1, 2], raw, parents, new Set([1, 2, 3])), [1, 2, 4]);
});

test('embedded geometry leaves absent from the flat node map are shown; malformed and cyclic children terminate safely', () => {
  const raw = { disc: { instanceID: 2, children: [
    null, {}, 'bad', { instanceID: 3, children: [2, { instanceID: 4 }] },
  ] } };
  assert.deepEqual(collectionVisibilityCommands([2], raw, new Map([[2, 1], [1, 2]]), new Set([2])), [2, 1, 3, 4]);
});

test('Bones and joints shows masked joint parents and geometry without enabling excluded muscular siblings', () => {
  const raw = {
    root: { instanceID: 1, nodeMask: -1, children: [2, 10] },
    joints: { instanceID: 2, nodeMask: 0, children: [3, 6] },
    ligament: { instanceID: 3, nodeMask: -1, children: [4] },
    ligamentGeometry: { instanceID: 4, nodeMask: 0 },
    capsule: { instanceID: 6, nodeMask: -1, children: [7] },
    capsuleGeometry: { instanceID: 7, nodeMask: 0 },
    muscle: { instanceID: 10, nodeMask: 0, children: [11] },
    muscleGeometry: { instanceID: 11, nodeMask: 0 },
  };
  const parents = new Map([[2, 1], [3, 2], [4, 3], [6, 2], [7, 6], [10, 1], [11, 10]]);
  const commands = collectionVisibilityCommands([3, 6], raw, parents, new Set([2, 3, 6, 10]));
  assert.deepEqual(commands, [1, 2, 3, 4, 6, 7]);
  const masks = new Map(Object.values(raw).map(node => [node.instanceID, node.nodeMask]));
  commands.forEach(id => masks.set(id, -1));
  for (const id of [1, 2, 3, 4, 6, 7]) assert.equal(masks.get(id), -1);
  for (const id of [10, 11]) assert.equal(masks.get(id), 0);
  assert.deepEqual(collectionVisibilityCommands([3], raw, parents, new Set([2, 3, 6, 10])), [1, 2, 3, 4]);
});
