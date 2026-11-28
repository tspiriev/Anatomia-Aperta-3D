import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import nervousCsv from '@assets/Nervous_system_CLean_1791612986964.csv?raw';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { BRACHIAL_GROUPS, BRACHIAL_ROOT_PATH, brachialPathForGroup, brachialContextIds, brachialForegroundIds, brachialCordColorNodes } from './brachialPlexusTaxonomy';
import { BRACHIAL_TRUNK_LIGHT_PURPLE } from './brachialTrunkContext';
import { planRegionIsolation } from '../lib/regionIsolation';
import { BrachialPlexusMenu } from '../components/BrachialPlexusMenu';
import type { SceneNode } from '../types/sketchfab';

const [header, ...rows] = [...csvRows(nervousCsv)];
const sourceNames = rows.filter(row => row[header.indexOf('row_type')] === 'OBJECT'
  && row[header.indexOf('object_type')] === 'MESH').map(row => row[header.indexOf('object_name')]);
const names = [...new Set([...sourceNames, ...[
  'Lateral root of median nerve', 'Medial root of median nerve',
  'Lateral cord of brachial plexus', 'Medial cord of brachial plexus', 'Posterior cord brachial plexus',
  'Scapula', 'Clavicle', 'Clavicular head of pectoralis major muscle',
  'Sternocostal head of pectoralis major muscle', '(Abdominal part of pectoralis major muscle)',
  'Pectoralis minor muscle', 'Subscapularis muscle', 'Teres major muscle', 'Latissimus dorsi muscle',
  'Long head of biceps brachii', 'Acromial part of deltoid muscle', 'Long head of triceps brachii',
  'Flexor digitorum profundus', 'Lumbrical muscles of hand',
].flatMap(name => [`${name}.l`, `${name}.r`]),
  ...Array.from({ length: 7 }, (_, i) => `Vertebra C${i + 1}`), 'Vertebra T1', 'Vertebra T2', 'Vertebra T3', 'First rib.l'])];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, name: rawName, rawName, type: 'MatrixTransform', visible: true, systemId: systemForMeshName(rawName),
}));
const path = (...segments: string[]) => [...BRACHIAL_ROOT_PATH, 'cords', ...segments];
const node = (name: string) => { const n = nodes.find(n => n.rawName === name); assert.ok(n, name); return n; };

test('Cords exposes collateral nerves and separate median roots under the correct cord, never complete terminal nerves', () => {
  for (const [name, cord] of [
    ['Lateral pectoral nerve.l', 'lateral'], ['Lateral root of median nerve.l', 'lateral'],
    ['Medial pectoral nerve.l', 'medial'], ['Medial brachial cutaneous nerve.l', 'medial'],
    ['Medial antebrachial cutaneous nerve.l', 'medial'], ['Medial root of median nerve.l', 'medial'],
    ['Superior subscapular nerve.l', 'posterior'], ['Thoracodorsal nerve.l', 'posterior'],
    ['Inferior subscapular nerve.l', 'posterior'],
  ]) {
    assert.ok(brachialPathForGroup(node(name), path(cord)), name);
  }
  const terminalNames = ['Median nerve', 'Ulnar nerve', 'Radial nerve', 'Axillary nerve', 'Musculocutaneous nerve',
    'Muscular branches of median nerve', 'Lateral antebrachial cutaneous nerve', 'Muscular branches of axillary nerve',
    'Deep branch of ulnar nerve', 'Posterior interosseous nerve of forearm', 'Anterior interosseous nerve of forearm'];
  for (const name of terminalNames) for (const side of ['l', 'r']) {
    assert.equal(brachialPathForGroup(node(`${name}.${side}`), path('with-muscles')), null, name);
    if (terminalNames.indexOf(name) < 5) {
      assert.ok(brachialPathForGroup(node(`${name}.${side}`), [...BRACHIAL_ROOT_PATH, 'terminal']), name);
    } else {
      assert.ok(brachialPathForGroup(node(`${name}.${side}`), [...BRACHIAL_ROOT_PATH, 'terminal']), name);
      assert.ok(brachialPathForGroup(node(`${name}.${side}`), [...BRACHIAL_ROOT_PATH, 'overview', 'plexus']), name);
    }
  }
  const cords = BRACHIAL_GROUPS.find(group => group.id.endsWith('/cords'))!;
  for (const cord of cords.children!.filter(group => !group.id.endsWith('/context'))) {
    assert.ok(!cord.children!.some(group => /\/(?:median|ulnar|radial|axillary|musculocutaneous)$/.test(group.id)));
  }
  assert.ok(!sourceNames.some(name => /(?:lateral|medial) root of (?:the )?median nerve/i.test(name)),
    'The supplied export has no separate median-root meshes; synthetic aliases must not stand in for real geometry');
});
test('optional cord muscle context contains only direct collateral targets, not terminal muscle territories', () => {
  const muscles = ['Clavicular head of pectoralis major muscle.l', 'Pectoralis minor muscle.l',
    'Subscapularis muscle.l', 'Teres major muscle.l', 'Latissimus dorsi muscle.l'];
  for (const name of muscles) {
    assert.equal(brachialPathForGroup(node(name), path()), null, name);
    assert.ok(brachialPathForGroup(node(name), path('with-muscles')), name);
    assert.ok(brachialContextIds(nodes, path('with-muscles')).includes(node(name).instanceID), name);
  }
  for (const name of ['Long head of biceps brachii.l', 'Acromial part of deltoid muscle.l',
    'Long head of triceps brachii.l', 'Flexor digitorum profundus.l', 'Lumbrical muscles of hand.l']) {
    assert.equal(brachialPathForGroup(node(name), path('with-muscles')), null, name);
  }
});
test('cord subgroups retain same-side transparent plexus/bones and midline C1–C7/Th1–Th2, excluding unrelated anatomy', () => {
  const p = path('posterior', 'left', 'with-muscles');
  const plan = planRegionIsolation(nodes, 'nervous', p, n => brachialPathForGroup(n, p))!;
  assert.ok(plan);
  const context = brachialContextIds(nodes, p);
  for (const name of ['Roots of brachial plexus.l', 'Superior trunk of brachial plexus.l',
    'Anterior division of superior trunk of brachial plexus.l', 'Scapula.l', 'Clavicle.l',
    ...Array.from({ length: 7 }, (_, i) => `Vertebra C${i + 1}`), 'Vertebra T1', 'Vertebra T2',
    'Subscapularis muscle.l', 'Teres major muscle.l', 'Latissimus dorsi muscle.l']) {
    assert.ok(plan.show.includes(node(name).instanceID), name);
    assert.ok(context.includes(node(name).instanceID), name);
    assert.ok(!brachialForegroundIds(nodes, p).includes(node(name).instanceID), name);
  }
  for (const name of ['Scapula.r', 'Roots of brachial plexus.r', 'Median nerve.l',
    'Radial nerve.l', 'First rib.l', 'Vertebra T3', 'Pectoralis minor muscle.l']) {
    assert.ok(plan.hide.includes(node(name).instanceID), name);
  }
  for (const name of ['Posterior cord brachial plexus.l', 'Thoracodorsal nerve.l']) {
    assert.ok(plan.show.includes(node(name).instanceID), name);
    assert.ok(brachialForegroundIds(nodes, p).includes(node(name).instanceID), name);
  }
});
test('only actual side-matched cords receive purple in Cords, including hidden siblings during subgroup navigation', () => {
  const colors = brachialCordColorNodes(nodes, path('posterior', 'left'));
  assert.ok(colors.length >= 3);
  for (const item of colors) {
    assert.deepEqual(item.color, BRACHIAL_TRUNK_LIGHT_PURPLE);
    assert.match(nodes.find(n => n.instanceID === item.instanceID)!.rawName, /^(?:Lateral|Medial|Posterior) cord (?:of )?brachial plexus\.l/i);
  }
  for (const category of ['overview', 'roots', 'trunks', 'divisions', 'terminal']) {
    assert.deepEqual(brachialCordColorNodes(nodes, [...BRACHIAL_ROOT_PATH, category]), []);
  }
  const html = renderToStaticMarkup(createElement(BrachialPlexusMenu, {
    variant: 'sidebar', nodes, activeNerveId: path().join('/'), onActivateNerve: () => {},
    isolatedRegionPath: null, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: null,
  }));
  assert.ok(!html.includes('Cords are light purple'), 'Redundant explanatory paragraph is removed');
  assert.ok(!html.includes('separate root meshes are not listed'));
  assert.ok(html.includes('Surrounding anatomy'));
});
test('cord muscle context starts on and remains switchable off', () => {
  const props = {
    variant: 'sidebar' as const, nodes, activeNerveId: path().join('/'), onActivateNerve: () => {},
    isolatedRegionPath: null, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: null,
  };
  const initial = renderToStaticMarkup(createElement(BrachialPlexusMenu, props));
  assert.ok(initial.includes('Cords: muscle context on'));
  const off = renderToStaticMarkup(createElement(BrachialPlexusMenu, { ...props, brachialCordMuscles: false }));
  assert.ok(off.includes('Cords: muscle context off'));
});
