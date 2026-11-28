import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneNode } from '../types/sketchfab';
import { brachialCameraTargets } from './brachialCameraFocus';
import { BRACHIAL_ROOT_PATH } from './brachialPlexusTaxonomy';
import { focusVisibleSubset } from '../lib/focusVisibleSubset';

const names = ['Anterior division of superior trunk of brachial plexus.l',
  'Posterior division of superior trunk of brachial plexus.r',
  'Anterior division of inferior trunk of brachial plexus.l',
  'Lateral cord of brachial plexus.l.', 'Medial cord of brachial plexus.l',
  'Posterior cord of brachial plexus.r', 'Lateral pectoral nerve.l',
  'Roots of brachial plexus.l', 'Scapula.l', 'Vertebra C3', 'Pectoralis minor muscle.l'];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  rawName, name: rawName, instanceID: i + 1, type: 'MatrixTransform', visible: true,
  systemId: /Vertebra|Scapula/.test(rawName) ? 'skeletal' : /muscle/.test(rawName) ? 'muscular' : 'nervous',
}));
const path = (...parts: string[]) => [...BRACHIAL_ROOT_PATH, ...parts];

test('Divisions frames only matching divisions, not surrounding plexus segments or vertebrae', () => {
  assert.deepEqual(brachialCameraTargets(nodes, path('divisions')), [1, 2, 3]);
  assert.deepEqual(brachialCameraTargets(nodes, path('divisions', 'left')), [1, 3]);
  assert.deepEqual(brachialCameraTargets(nodes, path('divisions', 'superior')), [1, 2]);
  assert.deepEqual(brachialCameraTargets(nodes, path('divisions', 'superior', 'anterior', 'left')), [1]);
});
test('Cords frames actual cords and individual lateral/medial/posterior cord submenus', () => {
  assert.deepEqual(brachialCameraTargets(nodes, path('cords', 'with-muscles')), [4, 5, 6]);
  assert.deepEqual(brachialCameraTargets(nodes, path('cords', 'left', 'with-muscles')), [4, 5]);
  assert.deepEqual(brachialCameraTargets(nodes, path('cords', 'lateral', 'left', 'with-muscles')), [4]);
  assert.deepEqual(brachialCameraTargets(nodes, path('cords', 'medial', 'left', 'with-muscles')), [5]);
  assert.deepEqual(brachialCameraTargets(nodes, path('cords', 'posterior', 'right', 'with-muscles')), [6]);
});
test('Other atlases, context controls and absent subjects retain ordinary framing', () => {
  for (const p of [path('overview'), path('trunks'), path('terminal'), path('divisions', 'context'),
    path('cords', 'context', 'bones'), path('cords', 'posterior', 'left'),
    ['advanced-neuroanatomy', 'skull-base', 'cords']]) {
    assert.equal(brachialCameraTargets(nodes, p), null);
  }
});
test('SDK subset fit masks only nontarget geometry and restores context without changing visibility state', async () => {
  const visible = [1, 2, 3, 4];
  const displayed = new Set(visible);
  const calls: string[] = [];
  const api = {
    hide: (id: number) => { displayed.delete(id); calls.push(`hide:${id}`); },
    show: (id: number) => { displayed.add(id); calls.push(`show:${id}`); },
    focusOnVisibleGeometries: (callback: (err: Error | null) => void) => {
      assert.deepEqual([...displayed], [2, 3]);
      calls.push('focus');
      callback(null);
    },
  };
  await focusVisibleSubset(api, [2, 3], () => visible, () => true);
  assert.deepEqual(new Set(displayed), new Set(visible));
  assert.deepEqual(calls, ['hide:1', 'hide:4', 'focus', 'show:1', 'show:4']);
  assert.deepEqual(visible, [1, 2, 3, 4]);
});
test('A hide or category change during SDK fit cannot be undone by context restoration', async () => {
  let visible = [1, 2, 3];
  const restored: number[] = [];
  await focusVisibleSubset({
    hide: () => {},
    show: id => { restored.push(id); },
    focusOnVisibleGeometries: callback => { visible = [2, 3]; callback(null); },
  }, [2], () => visible, () => true);
  assert.deepEqual(restored, [3]);
});
test('SDK error restores context; stale requests and empty targets never alter the scene', async () => {
  const restored: number[] = [];
  let calls = 0;
  const api = {
    hide: () => { calls++; },
    show: (id: number) => { restored.push(id); },
    focusOnVisibleGeometries: (callback: (err: Error | null) => void) => callback(new Error('Unavailable')),
  };
  await assert.rejects(focusVisibleSubset(api, [1], () => [1, 2, 3], () => true), /Unavailable/);
  assert.deepEqual(restored, [2, 3]);
  assert.equal(calls, 2);
  await focusVisibleSubset(api, [1], () => [1, 2, 3], () => false);
  await focusVisibleSubset(api, [], () => [1, 2, 3], () => true);
  assert.equal(calls, 2);
});
test('Missing SDK callback fails explicitly and restores all context', async () => {
  const restored: number[] = [];
  await assert.rejects(focusVisibleSubset({
    hide: () => {}, show: id => { restored.push(id); },
    focusOnVisibleGeometries: () => {},
  }, [1], () => [1, 2, 3], () => true, 5), /timed out/);
  assert.deepEqual(restored, [2, 3]);
});
