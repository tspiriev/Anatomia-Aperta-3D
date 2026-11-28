import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SceneNode } from '../types/sketchfab';
import { SKULL_BASE_GROUPS, SKULL_BASE_ROOT_PATH, skullBasePathForGroup,
  skullBaseContextIds, skullBaseSystemForNode } from './skullBaseTaxonomy';
import { planRegionIsolation } from '../lib/regionIsolation';
import { skullBaseCerebellumDisplay } from '../lib/skullBaseCerebellumDisplay';
import { expandWholeBrainIds } from '../lib/basalWholeBrain';
import { SkullBaseMenu } from '../components/SkullBaseMenu';
import vascularCsv from '@assets/Cardiovascular_system_1792359799661.csv?raw';
import muscleCsv from '@assets/Final_Muscles_fused__1792221386788.csv?raw';

const p = (...parts: string[]) => [...SKULL_BASE_ROOT_PATH, 'posterior-fossa', ...parts];
const scene = (names: readonly string[]): SceneNode[] => names.map((rawName, i) => ({
  instanceID: i + 1, name: rawName, rawName, type: 'MatrixTransform', visible: false, systemId: null,
}));
const isolate = (nodes: SceneNode[], path: readonly string[]) =>
  planRegionIsolation(nodes, 'nervous', path, node => skullBasePathForGroup(node, path))!;
const bilateral = (names: readonly string[]) => names.flatMap(name => [`${name}.l`, `${name}.r`]);

test('CPA retains caudal IX–XII and a single independently hideable transparent cerebellar surface', () => {
  const nerves = bilateral(['Glossopharyngeal nerve (IX)', 'Vagus nerve (X)', 'Accessory nerve (XI)', 'Hypoglossal nerve (XII)']);
  const nodes = scene([...nerves, 'Declive', 'Culmen', 'Biventral lobule.l', 'Pons',
    'Dentate_nucleus.r', 'Nucleus of hypoglossal nerve.r', 'Tensor tympani muscle.l']);
  assert.deepEqual(isolate(nodes, p('cpa')).show, Array.from({ length: 12 }, (_, i) => i + 1));
  assert.deepEqual(skullBaseContextIds(nodes, p('cpa')), [9, 10, 11, 12]);
  const display = skullBaseCerebellumDisplay(nodes, p(), p('cpa'));
  assert.equal(display.memberIds.length, 3);
  assert.deepEqual(expandWholeBrainIds([display.representativeId!], display.memberIds), [9, 10, 11]);
  assert.equal(display.nodes.filter(node => display.memberIds.includes(node.instanceID)).length, 1);
  assert.deepEqual(isolate(nodes, p('cpa', 'cerebellum')).show, [9, 10, 11]);
  const group = SKULL_BASE_GROUPS.find(group => group.id === p().join('/'))!;
  const cpa = group.children!.find(group => group.id === p('cpa').join('/'))!;
  assert.equal(cpa.children!.filter(group => group.id.endsWith('/cerebellum')).length, 1);
  const snapshot = isolate(nodes, p('cpa'));
  assert.ok(snapshot.affected.every(node => !node.visible), 'Restore retains the actual previous scene');
});

test('Jugular foramen includes semitransparent gross brainstem without adding unrelated nuclei', () => {
  const nodes = scene(['Midbrain.l', 'Pons.r', 'Medulla oblongata.l',
    'Glossopharyngeal nerve (IX).l', 'Vagus nerve (X).r', 'Accessory nerve (XI).l',
    'Nucleus of hypoglossal nerve.r', 'Tensor tympani muscle.l']);
  assert.deepEqual(isolate(nodes, p('jugular-foramen')).show, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(skullBaseContextIds(nodes, p('jugular-foramen')), [1, 2, 3]);
  assert.deepEqual(isolate(nodes, p('jugular-foramen', 'brainstem')).show, [1, 2, 3]);
});

test('Foramen magnum includes source cervical plexus, four suboccipital muscles, venous drainage and IX–XI', () => {
  const muscles = bilateral(['Obliquus superior capitis muscle', 'Obliquus inferior capitis muscle',
    'Rectus posterior major capitis muscle', 'Rectus posterior minor capitis muscle']);
  for (const name of muscles) assert.ok(muscleCsv.includes(name), name);
  assert.ok(vascularCsv.includes('Cervical vertebral venous pleus'));
  const vessels = ['Cervical vertebral venous pleus', ...bilateral(['Sigmoid sinus', 'Jugular bulb'])];
  const nerves = bilateral(['Glossopharyngeal nerve (IX)', 'Vagus nerve (X)', 'Accessory nerve (XI)', 'Hypoglossal nerve (XII)']);
  const included = [...muscles, ...vessels, ...nerves];
  const nodes = scene([...included, 'Superior oblique muscle.r', 'Inferior oblique muscle.l',
    'Lumbar vertebral venous plexus', 'Thoracic vertebral venosu plexus',
    'Tensor tympani muscle.l', 'Motor nucleus of facial nerve.r']);
  assert.deepEqual(isolate(nodes, p('foramen-magnum')).show, included.map((_, i) => i + 1));
  assert.deepEqual(skullBaseContextIds(nodes, p('foramen-magnum')), muscles.map((_, i) => i + 1));
  for (const node of nodes.slice(0, muscles.length)) assert.equal(skullBaseSystemForNode(node), 'muscular');
  for (const node of nodes.slice(muscles.length, muscles.length + vessels.length))
    assert.equal(skullBaseSystemForNode(node), 'vascular');
  for (const alias of ['Cervical vertebral venous plexus', 'Cervical vertebral venosu plexus']) {
    const node = scene([`${alias}.001_123`])[0];
    assert.ok(skullBasePathForGroup(node, p('foramen-magnum', 'cervicalVenousPlexus')));
    assert.equal(skullBaseSystemForNode(node), 'vascular');
  }
  for (const other of ['middle-fossa', 'petrous-temporal', 'sella-cavernous-sinus'])
    for (const node of nodes.slice(0, muscles.length + 1))
      assert.equal(skullBasePathForGroup(node, [...SKULL_BASE_ROOT_PATH, other]), null);
});

test('Tensor tympani stays in the opening model and whole-view Show/Hide, not a separate advanced menu entity', () => {
  const nodes = scene(['Tensor typmani muscle.l', 'Tensor tympani muscle.r', 'Pons']);
  assert.deepEqual(isolate(nodes, p()).show, [1, 2, 3]);
  assert.deepEqual(skullBaseContextIds(nodes, p()), [1, 2, 3]);
  const calls: { ids: number[]; visible: boolean }[] = [];
  const props = {
    nodes, activeNerveId: p().join('/'), onActivateNerve: () => {},
    isolatedRegionPath: p(), onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: (ids: number[], visible: boolean) => { calls.push({ ids, visible }); },
    selectedNodeId: null,
  };
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const element = SkullBaseMenu({ ...props, variant });
    const html = renderToStaticMarkup(element);
    assert.ok(!/Tensor ty(?:mpani|pmani)/i.test(html));
    assert.ok(html.toLowerCase().includes('show all'));
    element.props.onSetRegionVisibility([3], true, p());
    assert.deepEqual(new Set(calls.at(-1)!.ids), new Set([1, 2, 3]));
    element.props.onSetRegionVisibility([3], false, p());
    assert.equal(calls.at(-1)!.visible, false);
    assert.deepEqual(new Set(calls.at(-1)!.ids), new Set([1, 2, 3]));
    element.props.onSetRegionVisibility([3], true, p('cpa'));
    assert.deepEqual(calls.at(-1)!.ids, [3], 'Do not add tensor tympani to CPA');
  }
});
