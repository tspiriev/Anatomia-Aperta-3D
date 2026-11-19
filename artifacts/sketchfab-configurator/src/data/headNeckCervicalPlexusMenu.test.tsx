import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import headNeckCsv from '@assets/Head_and_neck_1792571981066.csv?raw';
import nervousCsv from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import { csvRows } from './anatomicalSystems';
import { HEAD_NECK_TOPOGRAPHY_ROOT as ROOT, HEAD_NECK_TOPOGRAPHY_GROUPS,
  headNeckTopographyPathForGroup as pathFor } from './headNeckTopography';
import { HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isHeadTopographyNode } from './headTopography';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import { planRegionIsolation } from '../lib/regionIsolation';

const node = (rawName: string, instanceID = 1): SceneNode => ({
  instanceID, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: null,
});
const path = (...parts: string[]) => [...ROOT, 'cervical-plexus', ...parts];
const entries = (csv: string) => [...csvRows(csv)].filter(r => r[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(r[5]));
const supplied = entries(headNeckCsv).map((r, i) => node(r[4], i + 1));
const ids = (groups: readonly NervousGroup[]): string[] => groups.flatMap(g => [g.id, ...ids(g.children ?? [])]);

test('Supplied Head and neck geometry is reachable from the existing cervical menu with raw identifiers intact', () => {
  for (const [name, parts] of [
    ['Hypoglossal nerve (XII).r', ['relations', 'nerves']],
    ['Hypoglossal nerve (XII).l', ['relations', 'nerves']],
    ['Superior root ansa cervicalis.r', ['ansa', 'nerves']],
    ['Superior root ansa cervicali.l', ['ansa', 'nerves']],
    ['FJ4263_BP29309_FMA7007_Trunk of C4 nerve.l.001', ['roots', 'nerves']],
    ['Atlas (C1)', ['relations', 'bones']],
    ['Axis (C2)', ['relations', 'bones']],
    ['Vertebra C3', ['relations', 'bones']],
    ['Intervertebral disc C2-C3', ['relations', 'joints']],
    ['Nucleus pulposus C3-C4', ['relations', 'joints']],
  ] as [string, string[]][]) {
    const n = supplied.find(n => n.rawName === name);
    assert.ok(n, `Exact supplied mesh: ${name}`);
    assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n), name);
    assert.ok(pathFor(n, path(...parts)), name);
    assert.equal(n.rawName, name);
  }
  for (const n of supplied.filter(n => /^Hypoglossal nerve \(XII\)/.test(n.rawName))) {
    assert.equal(pathFor(n, path('roots')), null, 'CN XII is related, not a cervical-plexus constituent');
    assert.equal(pathFor(n, path('ansa')), null);
  }
});

test('Existing nervous source C1–C4 spinal components, anterior rami, ansa roots and phrenic nerves enter the same menu when loaded', () => {
  let spinal = 0, plexus = 0;
  for (const row of entries(nervousCsv)) {
    const n = node(row[4]);
    if (/^C[1-4]$/.test(row[1])) {
      assert.ok(pathFor(n, path('spinal-context')), n.rawName); spinal++;
      assert.equal(pathFor(n, path('roots')), null, 'Spinal roots are not anterior rami');
    }
    if (['NS_01_CERVICAL_PLEXUS', 'NS_03_ANSA_CERVICALIS', 'NS_04_PHRENIC_NERVE'].includes(row[1])
      && !/mylohyoid/i.test(row[4])) {
      assert.ok(pathFor(n, path()), n.rawName); plexus++;
    }
  }
  assert.ok(spinal >= 25);
  assert.ok(plexus >= 10);
});

test('Recognize explicit live cervical context without including face nerves or claiming whole-cord segments', () => {
  for (const name of ['Cervical spinal cord', 'Spinal cord segment C1', 'C4 spinal cord segment',
    'Sternocleidomastoid.l', 'Scalenus anterior.r', 'Scalenus medius.l', 'Scalenus posterior.r',
    'Longus colli.l', 'Vertebral artery.r', 'Subclavian vein.l',
    'C1 fibers accompanying the hypoglossal nerve.l', 'Muscular branches of cervical plexus.r']) {
    const n = node(name), found = pathFor(n, path());
    assert.ok(found, name);
    assert.equal(isNodeAllowedInAtlasView(n, HEAD_NECK_TOPOGRAPHY_VIEW), isHeadTopographyNode(n), name);
    assert.ok(ids(HEAD_NECK_TOPOGRAPHY_GROUPS).includes(found.join('/')), found.join('/'));
  }
  for (const name of ['Trigeminal nerve.l', 'Ophthalmic nerve.r', 'Facial nerve.l',
    'Nerve to mylohyoid muscle.l', 'Nucleus of hypoglossal nerve.r',
    'Spinal cord', 'C1', 'C5 anterior root.l', 'L3 spinal nerve.r'])
    assert.equal(pathFor(node(name), path()), null, name);
});

test('Shared expanded menu renders only supplied nodes and retains scoped isolation controls', () => {
  const group = HEAD_NECK_TOPOGRAPHY_GROUPS.find(g => g.id === path().join('/'))!;
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [group], nodes: supplied, initialExpanded: new Set(ids([group])),
    pathForNode: n => pathFor(n, path()), pathForGroup: pathFor, isolatedPath: null,
    fadedNodeIds: new Set<number>(), showUnassigned: false,
    onSetVisibility: () => {}, onIsolate: () => {}, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {},
  }));
  for (const name of ['Hypoglossal nerve (XII).r', 'Hypoglossal nerve (XII).l',
    'Superior root ansa cervicali.l', 'Atlas (C1)', 'Intervertebral disc C2-C3'])
    assert.ok(html.includes(name), name);
  assert.ok(html.includes('Show all') && html.includes('Isolate'));
  assert.ok(!html.includes('C3 anterior root.l'), 'A source inventory must never create a missing scene node');
  const selected = path('relations', 'nerves');
  const plan = planRegionIsolation(supplied, 'nervous', selected, n => pathFor(n, selected))!;
  assert.deepEqual(new Set(plan.show), new Set(supplied.filter(n =>
    /^Hypoglossal nerve \(XII\)\.[lr]$/.test(n.rawName)).map(n => n.instanceID)));
  assert.ok(plan.hide.length > 0);
});
