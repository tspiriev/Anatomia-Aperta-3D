import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LOWER_LIMB_SOURCE_OBJECTS as rows, LOWER_LIMB_TOPOGRAPHY_ROOT as ROOT,
  LOWER_LIMB_TOPOGRAPHY_GROUPS as groups, lowerLimbPathForGroup as pathFor,
  lowerLimbCataloguePathForGroup, lowerLimbSettings, lowerLimbSystemForNode,
  withLowerLimbRootContributions,
} from './lowerLimbTopography';
import { lowerLimbNerveRoots } from './lowerLimbRootContributions';
import { lowerLimbName } from './lowerLimbNames';
import { LOWER_LIMB_TOPOGRAPHY_VIEW as view, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation } from '../lib/regionIsolation';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { LowerLimbTopographyMenu } from '../components/LowerLimbTopographyMenu';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const p = (...parts: string[]) => [...ROOT, 'lumbar-pelvic', ...parts];
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
const noop = () => {};

test('First Lower limb menu is Lumbar and pelvic region, not approach', () => {
  assert.equal(groups[0].label, 'Lumbar and pelvic region');
  assert.ok(view.description.includes('lumbar and pelvic region'));
  assert.ok(!view.description.includes('approach'));
});

test('All named lower-limb nerves display reviewed root contributions without changing source identities', () => {
  const decorated = withLowerLimbRootContributions(nodes);
  for (const [rawName, roots] of [
    ['Lateral femoral cutaneous nerve.l', 'L2–L3'],
    ['Iliohypogastric nerve.r.', 'T12–L1'],
    ['Ilio-inguinal nerve.r', 'L1'],
    ['Superior cluneal nerves.l', 'L1–L3'],
    ['Medial clluneal nerves.r', 'S1–S3'],
  ]) {
    const original = n(rawName), labeled = decorated.find(node => node.instanceID === original.instanceID)!;
    assert.equal(lowerLimbNerveRoots(rawName), roots);
    assert.equal(labeled.name, `${original.name} (${roots})`);
    assert.equal(labeled.rawName, original.rawName);
    assert.equal(labeled.visible, original.visible);
    assert.deepEqual(pathFor(labeled, ROOT), pathFor(original, ROOT));
  }
  for (const node of decorated.filter(node => isNodeAllowedInAtlasView(node, view) && node.systemId === 'nervous'
    && /nerve/.test(lowerLimbName(node.rawName)) && !/\b(?:th?12|l[1-5]|s[1-4])\b/.test(lowerLimbName(node.rawName))))
    assert.ok(lowerLimbNerveRoots(node.rawName), `Root annotation: ${node.rawName}`);
  assert.deepEqual(withLowerLimbRootContributions(decorated), decorated);
  for (const node of nodes.filter(node => node.systemId !== 'nervous'))
    assert.equal(decorated.find(labeled => labeled.instanceID === node.instanceID), node);
});

test('Superior cluneal teaching view contains actual L1–L3 dorsal rami, roots and ganglia on both sides', () => {
  for (const section of ['lumbar-plexus', 'sacral-plexus']) {
    const path = p(section, 'nerves');
    const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
    for (const side of ['l', 'r']) {
      assert.ok(plan.show.includes(n(`Superior cluneal nerves.${side}`).instanceID));
      for (const level of [1, 2, 3]) {
        assert.ok(plan.show.includes(n(`Dorsal ramus L${level}.${side}`).instanceID));
        const components = nodes.filter(node => new RegExp(`^l${level} .*?(?:root|gangli)`).test(lowerLimbName(node.rawName))
          && new RegExp(`\\.${side}(?:\\.\\d+)?$`).test(node.rawName));
        assert.ok(components.length >= 3);
        for (const node of components) assert.ok(plan.show.includes(node.instanceID), node.rawName);
      }
    }
  }
});

test('Cord source and dura are visible in both plexus menus and retained alongside isolated nerves', () => {
  for (const section of ['lumbar-plexus', 'sacral-plexus']) {
    const path = p(section, 'nerves');
    const group = tree.find(group => group.id === path.join('/'))!;
    const ids = menuCollectionNodeIds(nodes, [group], () => null, pathFor);
    const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
    for (const rawName of ['Anterior horn of spinal cord', 'Spinal dura']) {
      const node = n(rawName);
      assert.ok(ids.includes(node.instanceID), `Menu: ${rawName}`);
      assert.ok(plan.show.includes(node.instanceID), `Scene: ${rawName}`);
      for (const side of ['left', 'right'] as const) assert.ok(pathFor(node, path, side));
    }
    const settings = lowerLimbSettings(nodes, [n('Superior cluneal nerves.l').instanceID], path);
    assert.ok(settings.supportIds.includes(n('Anterior horn of spinal cord').instanceID));
    assert.ok(settings.supportIds.includes(n('Spinal dura').instanceID));
    assert.ok(settings.contextIds.includes(n('Spinal dura').instanceID));
    assert.ok(!settings.contextIds.includes(n('Anterior horn of spinal cord').instanceID));
    assert.equal(lowerLimbSettings(nodes, [], path).supportIds.length, 0);
    assert.equal(lowerLimbSettings(nodes, [n('Hip bone.l').instanceID], p(section, 'bones')).supportIds
      .includes(n('Spinal dura').instanceID), false);
  }
  assert.equal(pathFor(n('Anterior horn of spinal cord'), [...ROOT, 'thigh']), null);
});

test('A whole cord can be shown only when present in the live model, not claimed by the old CSV', () => {
  const cord: SceneNode = { ...nodes[0], instanceID: 9999, name: 'Spinal cord',
    rawName: 'Spinal_cord_23456', systemId: 'nervous' };
  assert.ok(isNodeAllowedInAtlasView(cord, view));
  assert.ok(pathFor(cord, p('lumbar-plexus')));
  assert.ok(pathFor(cord, p('sacral-plexus')));
  assert.equal(lowerLimbCataloguePathForGroup(cord, p()), null);
  assert.equal(pathFor({ rawName: 'Unknown spinal cord reference' }, ROOT), null);
  assert.equal(n('Anterior horn of spinal cord').name, 'Anterior horn of spinal cord');
});

test('Aorta and caval drainage appear in both plexus arterial and venous views', () => {
  for (const section of ['lumbar-plexus', 'sacral-plexus']) for (const [rawName, tissue] of [
    ['Abdominal aorta', 'arteries'], ['Inferior vena cava (abdominal part)', 'veins'],
  ]) {
    const path = p(section, tissue);
    const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
    assert.ok(plan.show.includes(n(rawName).instanceID), `${section}: ${rawName}`);
    assert.equal(lowerLimbSystemForNode(n(rawName)), 'vascular');
  }
});

test('Lumbar/renal/gonadal and pelvic iliac, pudendal and anorectal networks are source-backed', () => {
  for (const [pattern, section, tissue] of [
    [/renal artery/i, 'lumbar-plexus', 'arteries'],
    [/renal vein/i, 'lumbar-plexus', 'veins'],
    [/testicular artery/i, 'lumbar-plexus', 'arteries'],
    [/ascending lumbar vein/i, 'lumbar-plexus', 'veins'],
    [/internal pudendal artery/i, 'sacral-plexus', 'arteries'],
    [/internal pudendal vein/i, 'sacral-plexus', 'veins'],
    [/superior anorectal artery/i, 'sacral-plexus', 'arteries'],
    [/sigmoid veins/i, 'sacral-plexus', 'veins'],
    [/external iliac artery/i, 'sacral-plexus', 'arteries'],
    [/internal iliac vein/i, 'sacral-plexus', 'veins'],
  ] as const) {
    const matches = nodes.filter(node => pattern.test(node.rawName));
    assert.ok(matches.length, pattern.source);
    for (const node of matches) assert.ok(pathFor(node, p(section, tissue)), node.rawName);
  }
  for (const node of nodes.filter(node => /Proper hepatic artery|Splenic artery/.test(node.rawName)))
    assert.equal(pathFor(node, p()), null, 'Do not admit unrelated upper-abdominal branches');
});

test('Root annotations are rendered in the existing Lower limb selected-structure card', () => {
  const html = renderToStaticMarkup(createElement(LowerLimbTopographyMenu, {
    nodes: withLowerLimbRootContributions(nodes), variant: 'sidebar',
    activeNerveId: p().join('/'), isolatedRegionPath: p('lumbar-plexus', 'nerves'),
    selectedNodeId: n('Lateral femoral cutaneous nerve.l').instanceID, onActivateNerve: noop, onSetRegionVisibility: noop,
    toggleVisibility: noop, onSelect: noop, onIsolateRegion: noop, onRestoreRegion: noop,
  }));
  assert.match(html, /Lateral femoral cutaneous nerve.*L2–L3/);
});
