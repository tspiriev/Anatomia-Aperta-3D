import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AUTONOMIC_SOURCE_OBJECTS } from './autonomicTaxonomy';
import { classifyBrainstemObject } from './brainstemTaxonomy';
import { classifyFocusedBrainstem, focusedBrainstemGroup } from './brainstemFocusedTaxonomy';
import { BRAINSTEM_CEREBELLUM_ROOT as ROOT, brainstemCerebellumPathForGroup as pathFor,
  brainstemCerebellumContextIds as contextIds, brainstemCerebellumGroupsForNodes } from './brainstemCerebellumAtlas';
import { BrainstemCerebellumMenu } from '../components/BrainstemCerebellumMenu';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';
import { systemForMeshName } from './anatomicalSystems';
import { BRAINSTEM_CEREBELLUM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS } from './brainstemCerebellumSourceRows';
import { formatAnatomicalName } from '../lib/anatomicalDisplayName';

const node = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: rawName, type: 'MatrixTransform', systemId: 'nervous', visible: true,
});
const scene = AUTONOMIC_SOURCE_OBJECTS.map((row, i) => node(row.object_name, i + 1));
const p = (...parts: string[]) => [...ROOT, 'brainstem', ...parts];
const names = (path: readonly string[]) => new Set(scene.filter(n => pathFor(n, path)).map(n => n.rawName));

// Content checks explicitly open the shared tree; the actual atlas must start closed.
function renderExpandedMenu(nodes: SceneNode[]) {
  const groups = brainstemCerebellumGroupsForNodes(nodes);
  const paths = (items: typeof groups): string[] => items.flatMap(g => [g.id, ...paths(g.children ?? [])]);
  return renderToStaticMarkup(createElement(NervousSystemMenu, {
    nodes, groups, initialExpanded: new Set(paths(groups)), layout: 'stacked',
    pathForNode: n => pathFor(n, ROOT), pathForGroup: pathFor, showUnassigned: false,
    isolatedPath: null, fadedNodeIds: new Set<number>(), disableFade: true,
    onSetVisibility: () => {}, onIsolate: () => {}, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {},
  }));
}

test('requested gaze, tectal, reticular, monoaminergic and tectospinal source meshes have exact functional menus and scope', () => {
  const actual = BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS.map((row, i) => ({
    ...node(row.object_name, 10000 + i), systemId: systemForMeshName(row.object_name),
  }));
  const cases: [string, string[], number][] = [
    ['Interstitial nucleus of Cajal', ['nuclei', 'gaze-related', 'cajal'], 2],
    ['Nucleus of Darkschewitsch', ['nuclei', 'gaze-related', 'darkschewitsch'], 2],
    ['Superior colliculus', ['nuclei', 'midbrain-tectum', 'superior-colliculus'], 2],
    ['Inferior colliculus', ['nuclei', 'midbrain-tectum', 'inferior-colliculus'], 2],
    ['Tectospinal tract', ['white-matter', 'descending-motor', 'tectospinal'], 2],
    ['Reticular formation brainstem', ['nuclei', 'reticular-neuromodulatory', 'reticular-formation'], 1],
    ['Medial forebrain bundle serotonin', ['nuclei', 'reticular-neuromodulatory', 'serotonergic', 'ascending-serotonergic'], 2],
    ['Ventral tegmental area', ['nuclei', 'reticular-neuromodulatory', 'dopaminergic', 'ventral-tegmental-area'], 2],
    ['Medial forebrain bundle dopamine', ['nuclei', 'reticular-neuromodulatory', 'dopaminergic', 'medial-forebrain-bundle'], 2],
  ];
  const pairedIds = new Set<number>();
  for (const [stem, parts, count] of cases) {
    const members = actual.filter(n => n.rawName === stem || n.rawName === `${stem}.l` || n.rawName === `${stem}.r`);
    assert.equal(members.length, count, `${stem}: exact supplied source inventory`);
    const path = p(...parts);
    for (const n of members) {
      pairedIds.add(n.instanceID);
      assert.ok(isNodeAllowedInAtlasView(n, BRAINSTEM_CEREBELLUM_VIEW), n.rawName);
      assert.deepEqual(pathFor(n, path), path, n.rawName);
      assert.ok(pathFor(n, ROOT), n.rawName);
    }
    const plan = planRegionIsolation(actual, 'nervous', path, n => pathFor(n, path))!;
    assert.deepEqual(new Set(plan.show), new Set([
      ...members.map(n => n.instanceID), ...contextIds(actual, path),
    ]), `${stem}: only requested meshes and established transparent orientation`);
  }
  assert.equal(pairedIds.size, 17);
  for (const [parts, count] of [
    [['nuclei', 'gaze-related'], 4],
    [['nuclei', 'midbrain-tectum'], 4],
    [['nuclei', 'reticular-neuromodulatory'], 7],
  ] as [string[], number][]) {
    const path = p(...parts);
    const members = actual.filter(n => {
      const found = pathFor(n, path);
      return found && path.every((part, i) => found[i] === part);
    });
    assert.equal(members.length, count);
    assert.deepEqual(new Set(planRegionIsolation(actual, 'nervous', path, n => pathFor(n, path))!.show),
      new Set([...members.map(n => n.instanceID), ...contextIds(actual, path)]));
  }
  const nuclei = focusedBrainstemGroup().children!.find(g => g.id.endsWith('/nuclei'))!;
  const tectum = nuclei.children!.find(g => g.id.endsWith('/midbrain-tectum'))!;
  assert.deepEqual(tectum.children!.map(g => g.label), ['Superior colliculus', 'Inferior colliculus'],
    'No additional tectal nuclei are present in this CSV');
  const html = renderExpandedMenu(actual);
  for (const label of ['Oculomotor and gaze-related nuclei', 'Midbrain tectum', 'Reticular formation and neuromodulatory systems'])
    assert.ok(html.includes(label), label);
});

test('GSA visually contains all six sensory meshes in one group, with shared scope excluding motor nuclei', () => {
  const actual = BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS.map((row, i) => ({
    ...node(row.object_name, 11000 + i), systemId: systemForMeshName(row.object_name),
  }));
  const gsa = p('nuclei', 'gsa');
  const plan = planRegionIsolation(actual, 'nervous', gsa, n => pathFor(n, gsa))!;
  const members = actual.filter(n => {
    const found = pathFor(n, gsa);
    return found && gsa.every((part, i) => found[i] === part);
  });
  assert.equal(members.length, 6);
  assert.deepEqual(new Set(plan.show), new Set([...members.map(n => n.instanceID), ...contextIds(actual, gsa)]));
  const html = renderExpandedMenu(actual);
  const start = html.indexOf('<div role="group" aria-label="Somatic sensory nuclei (GSA)"');
  assert.ok(start >= 0);
  let depth = 0, end = 0;
  for (const tag of html.slice(start).matchAll(/<\/?div\b[^>]*>/g)) {
    depth += tag[0].startsWith('</') ? -1 : 1;
    if (depth === 0) { end = start + tag.index! + tag[0].length; break; }
  }
  const groupHtml = html.slice(start, end);
  assert.ok(groupHtml.includes(`data-collection-path="${gsa.join('/')}"`));
  for (const n of members) assert.ok(groupHtml.includes(n.rawName), n.rawName);
  assert.ok(!groupHtml.includes('Motor root of trigeminal nerve'));
  assert.ok(!groupHtml.includes('Motor nucleus of trigeminal nerve'));
});

test('creator-confirmed mislabeled motor-root meshes are paired SVE motor nuclei with corrected model-local display names', () => {
  const rows = BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS.filter(row =>
    row.collection_name === 'NS_CN05_TRIGEMINAL' && /^Motor root of trigeminal nerve\.[lr]$/.test(row.object_name));
  assert.equal(rows.length, 2);
  const actual = rows.map((row, i) => ({
    ...node(row.object_name, 9800 + i),
    name: formatAnatomicalName(row.object_name, BRAINSTEM_CEREBELLUM_VIEW.modelUid),
    systemId: systemForMeshName(row.object_name),
  }));
  const path = p('nuclei', 'sve', 'motor-trigeminal');
  for (const n of actual) {
    assert.ok(isNodeAllowedInAtlasView(n, BRAINSTEM_CEREBELLUM_VIEW), n.rawName);
    assert.deepEqual(pathFor(n, path), path);
    assert.equal(pathFor(n, p('nuclei', 'gsa')), null);
    assert.equal(pathFor(n, p('white-matter')), null);
    assert.ok(n.rawName.startsWith('Motor root'), 'SDK identifiers retain exact source names');
    assert.match(n.name, /^Motor nucleus of trigeminal nerve \((Left|Right)\)$/);
    assert.match(formatAnatomicalName(n.rawName, 'another-model'), /^Motor root of trigeminal nerve/);
  }
  const isolated = planRegionIsolation(actual, 'nervous', path, n => pathFor(n, path))!;
  assert.deepEqual(new Set(isolated.show), new Set(actual.map(n => n.instanceID)));
  const html = renderExpandedMenu(actual);
  assert.ok(html.includes('Motor nucleus of trigeminal nerve (Left)'));
  assert.ok(html.includes('Motor nucleus of trigeminal nerve (Right)'));
});

test('the dedicated model CSV supplies the complete represented brainstem/cerebellum inventory independently of Brain', () => {
  assert.equal(BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS.length, 311);
  const collections = new Set([
    'NS_01_CEREBELLUM', 'NS_02_BRAINSTEM_GROSS_ANATOMY', 'NS_03_BRAINSTEM_NUCLEI',
    'Brainstem fibers', 'Auditory', 'Ascending cerebellar', 'Trigeminal',
    'Ascending sensory', 'Medial longitudinal fascicle',
  ]);
  const relevant = BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS.filter(row =>
    collections.has(row.collection_name) || /corticopontine/i.test(row.collection_name)
    || (row.collection_name.startsWith('NS_CN') && /nucl|neucle/i.test(row.object_name)));
  assert.ok(relevant.length > 120);
  for (const row of relevant) {
    const n = { ...node(row.object_name), systemId: systemForMeshName(row.object_name) };
    assert.ok(isNodeAllowedInAtlasView(n, BRAINSTEM_CEREBELLUM_VIEW), row.object_name);
    assert.ok(pathFor(n, ROOT), row.object_name);
  }
});

test('all six exact NS_CN05 sensory nucleus meshes pass real system/scope filters and appear in the opened GSA menu', () => {
  const rows = BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS.filter(row => row.collection_name === 'NS_CN05_TRIGEMINAL'
    && /^(Mesencephalic nucleus|Principal \(pontine\) neucleus|Spinal nucleus) of trigeminal nerve\.[lr]$/.test(row.object_name));
  assert.equal(rows.length, 6);
  const actual = rows.map((row, i) => ({
    ...node(row.object_name, 9000 + i), systemId: systemForMeshName(row.object_name), visible: false,
  }));
  const gsa = p('nuclei', 'gsa');
  for (const n of actual) {
    assert.ok(isNodeAllowedInAtlasView(n, BRAINSTEM_CEREBELLUM_VIEW), n.rawName);
    assert.deepEqual(classifyBrainstemObject(n.rawName)?.slice(0, 4),
      ['advanced-neuroanatomy', 'brainstem', 'nuclei', 'gsa']);
    assert.ok(pathFor(n, gsa), n.rawName);
    const nucleusPath = pathFor(n, gsa)!;
    const isolated = planRegionIsolation(actual, 'nervous', nucleusPath, n => pathFor(n, nucleusPath))!;
    assert.equal(isolated.show.length, 2, 'Each subgroup controls both actual source sides');
    assert.ok(isolated.show.includes(n.instanceID));
  }
  const html = renderExpandedMenu(actual);
  for (const n of actual) assert.ok(html.includes(n.rawName), `Actual menu renders ${n.rawName}`);
});

test('all originally mapped nuclear meshes remain mapped, with dorsal-column and auditory relays in Other rather than cranial functional groups', () => {
  const nuclear = scene.filter(n => classifyBrainstemObject(n.rawName)?.[2] === 'nuclei');
  assert.ok(nuclear.length >= 64);
  for (const n of nuclear) assert.equal(classifyFocusedBrainstem(n.rawName)?.[2], 'nuclei', n.rawName);
  for (const n of ['Cuneate nucleus.l', 'Gracile nucleus.r', 'Accessory Cuneate nucleus.l',
    'N. of the lateral lemniscus.r', 'Superior olivary complex.l'])
    assert.equal(classifyFocusedBrainstem(n)?.[3], 'other', n);
  assert.equal(classifyFocusedBrainstem('Vestibular nerve fibers to nuclei.l')?.[2], 'white-matter');
});

test('trigeminal aliases and real subdivisions enter the correct functional nuclear groups, never the spinal tract', () => {
  for (const side of ['l', 'r']) for (const [name, group, leaf] of [
    ['Principal (pontine) neucleus of trigeminal nerve', 'gsa', 'principal-trigeminal'],
    ['Principal sensory nucleus of trigeminal nerve', 'gsa', 'principal-trigeminal'],
    ['Motor nucleus of trigeminal nerve', 'sve', 'motor-trigeminal'],
    ['Trigeminal motor nucleus', 'sve', 'motor-trigeminal'],
    ['Mesencephalic nucleus of trigeminal nerve', 'gsa', 'mesencephalic-trigeminal'],
    ['Spinal nucleus of trigeminal nerve', 'gsa', 'spinal-trigeminal'],
  ]) {
    const n = node(`${name}.${side}.001`);
    assert.deepEqual(pathFor(n, p('nuclei', group, leaf)), p('nuclei', group, leaf), n.rawName);
    assert.equal(pathFor(n, p('white-matter', 'ascending-sensory', 'trigeminal')), null, n.rawName);
  }
  for (const part of ['oralis', 'interpolaris', 'caudalis']) {
    const n = node(`Spinal nucleus of trigeminal nerve (pars ${part}).r`);
    assert.deepEqual(pathFor(n, p('nuclei', 'gsa')), p('nuclei', 'gsa', 'spinal-trigeminal', part));
  }
});

test('white matter has exactly six teaching groups, preserves CSV fibers, excludes gray matter and unsided whole-cord substitutes', () => {
  const group = focusedBrainstemGroup().children!.find(g => g.id.endsWith('/white-matter'))!;
  assert.deepEqual(group.children!.map(g => g.id.split('/').at(-1)), [
    'descending-motor', 'ascending-sensory', 'cerebellar-connections', 'auditory', 'vestibular-oculomotor', 'intrinsic',
  ]);
  const oldFibers = scene.filter(n => classifyBrainstemObject(n.rawName)?.[2] === 'white-matter');
  for (const n of oldFibers) assert.equal(classifyFocusedBrainstem(n.rawName)?.[2], 'white-matter', n.rawName);
  for (const raw of ['Rubrospinal tract', 'Medial vestibulospinal tract', 'Posterior spinocerebellar tract', 'Spinotectal tract'])
    assert.equal(classifyFocusedBrainstem(raw), null, raw);
  for (const raw of ['Spinal trigeminal tract.l', 'Spinal tract of trigeminal nerve.r'])
    assert.ok(pathFor(node(raw), p('white-matter', 'ascending-sensory', 'trigeminal', 'spinal-tract')), raw);
  assert.equal(pathFor(node('Spinal nucleus of trigeminal nerve.r'), p('white-matter')), null);
  assert.equal(pathFor(node('Dentate_nucleus.r'), p('white-matter', 'auditory')), null);
});

test('MLF includes both sides and fasciculus/fascicle aliases, with its associated source connection fibers', () => {
  const path = p('white-matter', 'vestibular-oculomotor', 'medial-longitudinal-fascicle');
  const selected = names(path);
  for (const side of ['l', 'r']) {
    assert.ok(selected.has(`Medial longitudinal fascicle.${side}`));
    assert.ok(selected.has(`Medial longitudinal fascicle - Fibers to oculomotor nerve.${side}`));
    assert.ok(pathFor(node(`Medial longitudinal fasciculus.${side}.001`), path));
  }
  assert.ok(selected.has('Medial longitudinal fascicle - Internuclear fibers'));
});

test('exact left/right source MLF meshes are both in the visible menu and collection isolation resynchronizes hidden SDK geometry', () => {
  const pair = BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS.filter(row => row.collection_name === 'Medial longitudinal fascicle'
    && row.parent_collection === 'Brainstem fibers'
    && /^Medial longitudinal fascicle\.[lr]$/.test(row.object_name));
  assert.equal(pair.length, 2);
  const actual = pair.map((row, i) => ({
    ...node(row.object_name, 9900 + i), systemId: systemForMeshName(row.object_name),
    // Reproduce a panel that reports visible while source SDK geometry is masked.
    visible: true,
  }));
  const mlf = p('white-matter', 'vestibular-oculomotor', 'medial-longitudinal-fascicle');
  for (const requested of [p('white-matter', 'vestibular-oculomotor'), mlf]) {
    const plan = planRegionIsolation(actual, 'nervous', requested, n => pathFor(n, requested))!;
    assert.deepEqual(new Set(plan.show), new Set(actual.map(n => n.instanceID)));
    assert.ok(!plan.hide.length);
  }
  for (const n of actual) {
    assert.ok(isNodeAllowedInAtlasView(n, BRAINSTEM_CEREBELLUM_VIEW));
    assert.ok(pathFor(n, mlf));
  }
  const html = renderExpandedMenu(actual);
  assert.ok(html.includes('Medial longitudinal fascicle.l'));
  assert.ok(html.includes('Medial longitudinal fascicle.r'));
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const isolateShow = app.match(/setNodesVisibility\(plan\.show,[\s\S]*?;/)?.[0] ?? '';
  assert.ok(isolateShow.includes("'brainstem-and-cerebellum'"), 'Isolation must force renderer Show even when panel flags are already visible');
  assert.match(app, /setNodesVisibility\(shownIds, visible, true, Boolean\([^\n]*view\.brainstemCerebellum/, 'Collection Show must also resynchronize the SDK');
});

test('gross branches are nonempty and selectively hideable without hiding nuclei, tracts or other surfaces', () => {
  for (const [part, raw] of [
    ['midbrain', 'Midbrain.l'], ['pons', 'Pons.r'], ['medulla-oblongata', 'Medulla oblongata.l'],
    ['cerebral-crus', 'Base of cerebral peduncle (Midbrain).r'],
  ]) {
    const path = p('gross-anatomy', part), selected = names(path);
    assert.ok(selected.has(raw), part);
    assert.ok(!selected.has('Red nucleus.l'), 'No nuclear tissue hidden by gross controls');
    assert.ok(!selected.has('Medial longitudinal fascicle.r'), 'No white matter hidden by gross controls');
    for (const [other, otherRaw] of [['midbrain', 'Midbrain.l'], ['pons', 'Pons.r']])
      if (part !== other) assert.ok(!selected.has(otherRaw));
    const plan = planRegionIsolation(scene, 'nervous', path, n => pathFor(n, path))!;
    assert.ok(plan.show.length > 0);
    assert.ok(plan.hide.includes(scene.find(n => n.rawName === 'Red nucleus.l')!.instanceID));
  }
});

test('medial lemniscus retains dorsal-column nuclei; ascending cerebellar pathways retain accessory cuneate and all deep cerebellar nuclei, opaque', () => {
  const medial = p('white-matter', 'ascending-sensory', 'medial-lemniscus');
  const cerebellar = p('white-matter', 'cerebellar-connections', 'ascending-cerebellar');
  for (const [path, required] of [
    [medial, ['Gracile nucleus', 'Cuneate nucleus']],
    [cerebellar, ['Accessory Cuneate nucleus', 'Dentate nucleus', 'Nucleus fastigii', 'Nucleus globosus', 'Nucleus emboliformis']],
  ] as const) for (const stem of required) {
    const matches = scene.filter(n => n.rawName.replaceAll('_', ' ').startsWith(stem));
    assert.ok(matches.length, `${stem} actually exists in the source`);
    for (const n of matches) {
      assert.ok(pathFor(n, path), n.rawName);
      assert.ok(!contextIds(scene, path).includes(n.instanceID), `${n.rawName} stays opaque`);
      assert.ok(!pathFor(n, path)!.join('/').includes('/white-matter/'), 'A contextual nucleus is not reclassified as a fiber');
    }
  }
});

test('all four colliculi use the existing semitransparency context in overview, tectal nuclei and gross views', () => {
  const colliculi = scene.filter(n => /^(Superior|Inferior) colliculus\.[lr]$/.test(n.rawName));
  assert.equal(colliculi.length, 4);
  for (const path of [ROOT, [...ROOT, 'gross-anatomy'], p('gross-anatomy', 'midbrain'), p('nuclei', 'midbrain-tectum')]) {
    const faded = contextIds(scene, path);
    for (const n of colliculi) assert.ok(faded.includes(n.instanceID), `${path.join('/')}: ${n.rawName}`);
  }
});

test('optional nuclear subdivisions and raphe are hidden when absent and activated from actual live nodes', () => {
  const flatten = (groups: readonly { id: string; children?: readonly any[] }[]): string[] =>
    groups.flatMap(g => [g.id, ...flatten(g.children ?? [])]);
  const initial = flatten(brainstemCerebellumGroupsForNodes(scene));
  assert.ok(!initial.some(id => id.endsWith('/raphe') || id.endsWith('/spinal-trigeminal/oralis')));
  const expanded = flatten(brainstemCerebellumGroupsForNodes([
    ...scene, node('Nucleus raphe magnus.r'), node('Spinal nucleus of trigeminal nerve pars oralis.r'),
  ]));
  assert.ok(expanded.some(id => id.endsWith('/raphe')));
  assert.ok(expanded.some(id => id.endsWith('/spinal-trigeminal/oralis')));
});

test('all atlas trees start collapsed across categories, with nested content still available on expansion', () => {
  for (const activeNerveId of [null, p().join('/'), [...ROOT, 'cerebellum'].join('/'), [...ROOT, 'gross-anatomy'].join('/')])
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(BrainstemCerebellumMenu, {
      variant, nodes: scene, activeNerveId, isolatedRegionPath: p(), selectedNodeId: null,
      onActivateNerve: () => {}, onIsolateRegion: () => {}, onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    assert.ok(!html.includes('aria-expanded="true"'), `${variant}: no branch starts open`);
    assert.ok(html.includes('aria-expanded="false"'), `${variant}: branches can be opened`);
    for (const label of ['Show all', 'Restore previous view'])
      assert.ok(html.includes(label), `${variant}: ${label}`);
    assert.ok(!html.includes('Motor nucleus of trigeminal nerve (Left)'));
    assert.ok(!html.includes('Principal (pontine) neucleus of trigeminal nerve.l'));
  }
  const opened = renderExpandedMenu(scene);
  for (const label of ['Gross anatomy', 'Brainstem nuclei', 'Brainstem white matter fibers'])
    assert.ok(opened.includes(label), `${label} appears when opened`);
  const labels = (groups: readonly { label: string; children?: readonly any[] }[]): string[] =>
    groups.flatMap(g => [g.label, ...labels(g.children ?? [])]);
  const available = labels(brainstemCerebellumGroupsForNodes(scene));
  for (const label of ['Cerebral crus', 'Motor trigeminal nucleus', 'Principal sensory trigeminal nucleus',
    'Descending motor pathways', 'Ascending sensory pathways', 'Cerebellar connections',
    'Auditory pathways', 'Vestibular and oculomotor connections', 'Intrinsic brainstem connections', 'Spinal trigeminal tract'])
    assert.ok(available.includes(label), `${label} is reachable through the existing expandable hierarchy`);
});
