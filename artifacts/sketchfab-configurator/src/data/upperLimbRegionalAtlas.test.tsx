import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  UPPER_LIMB_SOURCE_OBJECTS as rows, UPPER_LIMB_TOPOGRAPHY_GROUPS as groups,
  UPPER_LIMB_TOPOGRAPHY_ROOT as ROOT, upperLimbPathForGroup as pathFor,
  upperLimbSettings, upperLimbSide, upperLimbSystemForNode,
} from './upperLimbRegionalAtlas';
import { UPPER_LIMB_TOPOGRAPHY_VIEW as view, isNodeAllowedInAtlasView } from './atlasViews';
import { ATLAS_NAVIGATION_MENUS } from './atlasNavigation';
import { UpperLimbTopographyMenu } from '../components/UpperLimbTopographyMenu';
import { NervousSystemMenu, menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { planRegionIsolation, captureRegionIsolation } from '../lib/regionIsolation';
import { searchAnatomy } from './anatomySearch';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import { classifyMusculoskeletalNode } from './musculoskeletalTaxonomy';
import { upperLimbTopographicPaths } from './upperLimbTopography';
import { upperLimbDistalPath } from './upperLimbHandWrist';

const p = (...parts: string[]) => [...ROOT, ...upperLimbDistalPath(parts)];
const nodes: SceneNode[] = rows.map((r, i) => ({
  rawName: r.rawName, name: r.rawName, instanceID: i + 1, type: 'MatrixTransform',
  systemId: upperLimbSystemForNode({ rawName: r.rawName, systemId: null }), visible: true,
}));
const n = (rawName: string) => nodes.find(node => node.rawName === rawName)!;
const member = (rawName: string, ...parts: string[]) => pathFor(n(rawName), p(...parts));
const flatten = (items: readonly NervousGroup[]): NervousGroup[] => items.flatMap(g => [g, ...flatten(g.children ?? [])]);
const noop = () => {};

test('Posterior elbow contains both ulnar and radial nerves and the source-backed elbow arterial network', () => {
  const path = p('elbow', 'posterior');
  const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
  const arteries = ['Brachial artery', 'Deep brachial artery', 'Superior ulnar collateral artery',
    'Inferior ulnar collateral artery', 'Radial collateral artery', 'Middle collateral artery',
    'Recurrent interosseous artery', '(Ulnar recurrent artery)'];
  const groupsById = new Map(flatten(groups).map(group => [group.id, group]));
  for (const [tissue, names] of [['nerves', ['Ulnar nerve', 'Radial nerve']], ['arteries', arteries]] as const) {
    const tissuePath = [...path, tissue];
    const group = groupsById.get(tissuePath.join('/'))!;
    assert.ok(group, tissue);
    const menuIds = menuCollectionNodeIds(nodes, [group], node => pathFor(node, ROOT), pathFor);
    for (const side of ['l', 'r']) for (const name of names) {
      const rawName = `${name}.${side}`, node = n(rawName);
      assert.ok(node, rawName);
      assert.ok(pathFor(node, tissuePath), rawName);
      assert.ok(plan.show.includes(node.instanceID), rawName);
      assert.ok(menuIds.includes(node.instanceID), rawName);
      assert.ok(pathFor({ rawName: `${rawName.replace(/ /g, '_')}_456` }, tissuePath), rawName);
    }
  }
  assert.equal(pathFor({ rawName: 'Femoral artery.l' }, p('elbow', 'posterior', 'arteries')), null);
});

test('Deltoid includes axillary vessels, all three plexus cords and the posterior-cord to axillary-nerve relationship', () => {
  const path = p('shoulder', 'deltoid');
  const link = [...path, 'nerves', 'posterior-cord-axillary-nerve'];
  const cords = ['Posterior cord brachial plexus.r', 'Posterior cord of brachial plexus.l',
    'Lateral cord of brachial plexus.l.', 'Lateral cord of brachial plexus.r',
    'Medial cord of brachial plexus.l', 'Medial cord of brachial plexus.r'];
  const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
  for (const name of cords) {
    assert.ok(member(name, 'shoulder', 'deltoid', 'nerves'), name);
    assert.ok(plan.show.includes(n(name).instanceID), name);
  }
  for (const side of ['l', 'r'])
    for (const [structure, tissue] of [['Axillary artery', 'arteries'], ['Axillary vein', 'veins'], ['Axillary nerve', 'nerves']]) {
      const name = `${structure}.${side}`;
      assert.ok(member(name, 'shoulder', 'deltoid', tissue), name);
      assert.ok(plan.show.includes(n(name).instanceID), name);
    }
  const branch = flatten(groups).find(group => group.id === link.join('/'));
  assert.equal(branch?.label, 'Posterior cord → axillary nerve');
  const linked = planRegionIsolation(nodes, 'nervous', link, node => pathFor(node, link))!;
  assert.deepEqual(new Set(linked.show), new Set([
    'Posterior cord brachial plexus.r', 'Posterior cord of brachial plexus.l', 'Axillary nerve.l', 'Axillary nerve.r',
  ].map(name => n(name).instanceID)));
  assert.ok(!linked.show.includes(n('Lateral cord of brachial plexus.r').instanceID));
});

test('All arm compartments retain the requested proximal arteries and veins, with median anatomy in anterior arm', () => {
  const vessels = [
    ['Left subclavian artery', 'arteries'], ['Right subclavian artery', 'arteries'],
    ['Left subclavian vein', 'veins'], ['Right subclavian vein', 'veins'],
    ...['l', 'r'].flatMap(side => [
      [`Axillary artery.${side}`, 'arteries'], [`Brachial artery.${side}`, 'arteries'],
      [`Axillary vein.${side}`, 'veins'], [`Brachial veins.${side}`, 'veins'],
    ]),
  ];
  const registered = new Set(flatten(groups).map(group => group.id));
  for (const region of ['anterior', 'posterior', 'medial']) {
    const path = p('arm', region);
    const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
    for (const [name, tissue] of vessels) {
      assert.ok(n(name), name);
      assert.ok(member(name, 'arm', region, tissue), `${region}/${name}`);
      assert.ok(plan.show.includes(n(name).instanceID), `${region} isolation must show ${name}`);
      assert.ok(registered.has([...path, tissue].join('/')));
      const live = { ...n(name), rawName: `${name.replace(/ /g, '_')}_321` };
      assert.ok(pathFor(live, [...path, tissue]), `Imported ${name}`);
    }
  }
  for (const side of ['l', 'r']) {
    assert.ok(member(`Median nerve.${side}`, 'arm', 'anterior', 'nerves'));
    for (const vein of ['Median cubital vein', 'Median antebrachial vein'])
      assert.ok(member(`${vein}.${side}`, 'arm', 'anterior', 'veins'));
  }
  const anterior = groups.find(group => group.id === p('arm').join('/'))!.children!
    .find(group => group.id === p('arm', 'anterior').join('/'))!;
  const menuIds = menuCollectionNodeIds(nodes, [anterior], node => pathFor(node, ROOT), pathFor);
  for (const name of ['Median nerve.l', 'Median nerve.r', 'Median cubital vein.l', 'Median antebrachial vein.r'])
    assert.ok(menuIds.includes(n(name).instanceID), name);
});

test('Shoulder subregions include the requested shared bones, proximal vessels, scapular muscles and complete proximal plexus', () => {
  const registered = new Set(flatten(groups).map(group => group.id));
  for (const region of ['clavicular', 'deltoid', 'scapular'])
    for (const bone of ['Scapula', 'Humerus', 'Clavicle']) for (const side of ['l', 'r']) {
      assert.ok(member(`${bone}.${side}`, 'shoulder', region, 'bones'));
      assert.ok(registered.has(p('shoulder', region, 'bones').join('/')));
    }
  for (const region of ['clavicular', 'deltoid'])
    for (const side of ['Left', 'Right']) {
      for (const vessel of ['brachiocephalic vein', 'subclavian vein'])
        assert.ok(member(`${side} ${vessel}`, 'shoulder', region, 'veins'), `${region}/${side} ${vessel}`);
      assert.ok(member(`${side} subclavian artery`, 'shoulder', region, 'arteries'));
    }
  for (const muscle of ['Supraspinatus muscle', 'Infraspinatus muscle', 'Teres major muscle', 'Teres minor muscle'])
    for (const side of ['l', 'r']) assert.ok(member(`${muscle}.${side}`, 'shoulder', 'scapular', 'muscles'));
  assert.ok(member('Levator scapulae.l', 'shoulder', 'scapular', 'muscles'));
  assert.ok(!n('Levator scapulae.r') && !nodes.some(node => /omohyoid/i.test(node.rawName)),
    'Missing geometry must not be fabricated');
  for (const [name, stage] of [
    ['Roots of brachial plexus.l', 'roots'], ['Superior trunk of brachial plexus.r', 'trunks'],
    ['Posterior division of superior trunk of brachial plexus.l.003', 'divisions'],
    ['Lateral cord of brachial plexus.l.', 'cords'], ['Suprascapular nerve.l', 'collateral'],
    ['Median nerve.r', 'terminal'], ['Ulnar nerve.l', 'terminal'], ['Radial nerve.l', 'terminal'],
  ]) {
    assert.ok(member(name, 'shoulder', 'scapular', 'nerves', stage), name);
    assert.ok(registered.has(p('shoulder', 'scapular', 'nerves', stage).join('/')));
  }
});

test('Combined deltoid region makes its muscles transparent without making bone-only selections import muscles', () => {
  const path = p('shoulder', 'deltoid');
  const ids = nodes.filter(node => pathFor(node, path)).map(node => node.instanceID);
  const settings = upperLimbSettings(nodes, ids, path);
  assert.ok(settings.contextIds.length > 0);
  for (const id of settings.contextIds) {
    assert.equal(upperLimbSystemForNode(nodes[id - 1]), 'muscular');
    assert.ok(ids.includes(id), 'Selected regional muscles also receive the mandatory transparency');
  }
  const bonePath = [...path, 'bones'];
  const bones = nodes.filter(node => pathFor(node, bonePath)).map(node => node.instanceID);
  assert.deepEqual(upperLimbSettings(nodes, bones, bonePath), { supportIds: [], contextIds: [] });
  assert.deepEqual(upperLimbSettings(nodes, ids, p('shoulder', 'scapular')),
    { supportIds: [], contextIds: [] }, 'Do not fade muscles in unrelated regions');
});

test('Shared musculoskeletal topography is preserved and combined regions include vessels, nerves, muscles and bones', () => {
  const registered = new Set(flatten(groups).map(group => group.id));
  for (const node of nodes) for (const entry of classifyMusculoskeletalNode(node.rawName))
    for (const path of upperLimbTopographicPaths(entry)) {
      const expected = [...ROOT, ...upperLimbDistalPath(path)];
      const excludedFascia = /^Antebrachial fascia\.[lr]$/.test(node.rawName)
        && ((path[0] === 'forearm' && path.length > 2) || ['hand', 'wrist'].includes(path[0]));
      const excludedAponeurosis = /^Palmar aponeurosis\.[lr]$/.test(node.rawName)
        && ['hand', 'wrist'].includes(path[0]) && !(path[0] === 'hand' && path.length === 2 && path[1] === 'fasciae');
      if (excludedFascia || excludedAponeurosis) {
        assert.equal(pathFor(node, expected), null, 'Creator excluded antebrachial fascia from forearm compartments');
        continue;
      }
      assert.ok(pathFor(node, expected), `${node.rawName}: ${path.join('/')}`);
      assert.ok(registered.has(expected.join('/')), expected.join('/'));
    }
  for (const region of ['arm', 'elbow', 'forearm', 'wrist', 'hand']) {
    const path = p(region);
    const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
    const systems = new Set(plan.show.map(id => nodes[id - 1].systemId));
    for (const system of ['muscular', 'skeletal', 'nervous', 'vascular'] as const)
      assert.ok(systems.has(system), `${region} must include ${system}, not nerves alone`);
  }
  for (const path of [
    p('forearm', 'anterior', 'superficial'), p('forearm', 'anterior', 'intermediate'),
    p('forearm', 'anterior', 'deep'), p('forearm', 'posterior', 'superficial'),
    p('forearm', 'posterior', 'deep'), p('forearm', 'mobile-wad'),
    p('hand', 'adductor'), p('hand', 'interosseous'),
  ]) assert.ok(registered.has(path.join('/')), path.join('/'));
  const imported = nodes.map(node => ({ ...node, rawName: `${node.rawName.replace(/ /g, '_')}_987` }));
  for (let index = 0; index < nodes.length; index++)
    assert.deepEqual(pathFor(imported[index], ROOT), pathFor(nodes[index], ROOT), nodes[index].rawName);
});

test('Sketchfab runtime suffixes retain CSV memberships, tissue and laterality without changing source identifiers', () => {
  for (const original of nodes) {
    const live = { ...original, rawName: `${original.rawName}_${original.instanceID + 100}` };
    assert.deepEqual(pathFor(live, ROOT), pathFor(original, ROOT), original.rawName);
    assert.equal(upperLimbSystemForNode(live), upperLimbSystemForNode(original), original.rawName);
    assert.equal(upperLimbSide(live.rawName), upperLimbSide(original.rawName), original.rawName);
    assert.equal(isNodeAllowedInAtlasView(live, view), isNodeAllowedInAtlasView(original, view), original.rawName);
    for (const side of ['left', 'right'] as const)
      assert.deepEqual(pathFor(live, ROOT, side), pathFor(original, ROOT, side), `${original.rawName}/${side}`);
    assert.equal(original.rawName, rows[original.instanceID - 1].rawName);
  }
  for (const rawName of ['Unknown anatomy.l_42', 'Median nerve.extra_42', 'Median nerve.l.999_42'])
    assert.equal(pathFor({ rawName }, ROOT), null, rawName);
});

test('Regional isolation and menus remain populated with live import names', () => {
  const live = nodes.map(original => ({ ...original, rawName: `${original.rawName}_${original.instanceID}` }));
  for (const group of groups) {
    const path = group.id.split('/');
    const plan = planRegionIsolation(live, 'nervous', path, node => pathFor(node, path));
    assert.ok(plan && plan.show.length > 0, group.label);
    assert.deepEqual(plan.show, planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!.show);
    assert.deepEqual(menuCollectionNodeIds(live, [group], node => pathFor(node, ROOT), pathFor),
      menuCollectionNodeIds(nodes, [group], node => pathFor(node, ROOT), pathFor));
  }
});

test('Dedicated upper limb uses exactly the supplied model, seven source-backed regions and separate topographic navigation', () => {
  assert.equal(rows.length, 1130);
  assert.equal(view.modelUid, '06234afee22a4685bab2cee6303a3c56');
  assert.equal(view.href, '/atlas/upper-limb');
  assert.deepEqual(groups.map(g => g.label), ['Shoulder and shoulder girdle', 'Axillary region', 'Arm', 'Elbow region', 'Forearm', 'Hand and wrist']);
  assert.ok(ATLAS_NAVIGATION_MENUS.find(m => m.id === 'topographic-anatomy')!.views.includes(view));
  assert.ok(!ATLAS_NAVIGATION_MENUS.find(m => m.id === 'nervous-system')!.views.includes(view));
  for (const g of flatten(groups))
    assert.ok(nodes.some(node => pathFor(node, g.id.split('/'))), `${g.label}: no selectable CSV-empty categories`);
});

test('Every admitted CSV mesh has a registered exact path, correct tissue and unchanged raw name; unknown geometry is excluded', () => {
  const registered = new Set(flatten(groups).map(g => g.id));
  let included = 0;
  for (const node of nodes) {
    const path = pathFor(node, ROOT);
    if (!path) { assert.ok(!isNodeAllowedInAtlasView(node, view)); continue; }
    included++;
    assert.ok(registered.has(path.join('/')), `${node.rawName}: ${path.join('/')}`);
    assert.ok(isNodeAllowedInAtlasView(node, view));
    assert.equal(node.rawName, rows[node.instanceID - 1].rawName);
    for (const m of rows[node.instanceID - 1].memberships)
      assert.ok(registered.has(p(...m.region.split('/'), m.tissue, ...(m.part ? m.part.split('/') : [])).join('/')),
        `${node.rawName}: ${m.region}/${m.tissue}/${m.part ?? ''}`);
  }
  assert.ok(included > 500 && included < 600);
  for (const rawName of ['Femur.l', 'Invented flexor retinaculum.l', 'Median nerve.extra', 'Tendon of median nerve.l']) {
    const unknown = { ...nodes[0], rawName };
    assert.equal(pathFor(unknown, ROOT), null);
    assert.ok(!isNodeAllowedInAtlasView(unknown, view));
  }
  for (const name of ['Vertebra L1', 'Abdominal aorta', 'Hepatic portal vein', 'Nucleus proprius',
    'C1 anterior root.l', 'L3 anterior root.r', 'Internal jugular vein.r', '???????'])
    if (n(name)) assert.equal(pathFor(n(name), ROOT), null, name);
});

test('The plexus keeps all six stages and corrects source misfilings without renaming or duplicating meshes', () => {
  for (const [name, part] of [
    ['Roots of brachial plexus.l', 'roots'], ['Superior trunk of brachial plexus.r', 'trunks'],
    ['Posterior division of superior trunk of brachial plexus.l.003', 'divisions'],
    ['Lateral cord of brachial plexus.l.', 'cords'],
    ['Subclavian nerve.l', 'collateral'], ['Inferior subscapular nerve.r', 'collateral'],
    ['Ulnar nerve.l', 'terminal'], ['Median nerve.r', 'terminal'],
  ]) assert.deepEqual(member(name, 'axillary', 'brachial-plexus', 'nerves', part),
    p('axillary', 'brachial-plexus', 'nerves', part), name);
  assert.ok(member('Proper palmar digital branches of median nerve.r', 'axillary', 'brachial-plexus', 'nerves', 'terminal'));
  assert.ok(member('Median nerve.r', 'arm', 'medial', 'nerves'));
  assert.ok(member('Median nerve.r', 'forearm', 'anterior', 'nerves'));
  assert.ok(member('Median nerve.r', 'wrist', 'palmar', 'carpal-tunnel', 'nerves'));
  assert.ok(member('Median nerve.r', 'hand', 'central', 'nerves'));
});

test('Cubital fossa combines actual boundaries, vessels, bones and nerves; carpal tunnel excludes structures outside the tunnel', () => {
  for (const name of ['Brachialis muscle.l', 'Brachioradialis muscle.l', 'Superficial head of pronator teres.l',
    'Brachial artery.l', 'Median nerve.l', 'Humerus.l', 'Radius.l', 'Ulna.l'])
    assert.ok(member(name, 'elbow', 'cubital-fossa'), name);
  for (const name of ['Flexor retinaculum of wrist.l.001', 'Common flexor tendon sheath.l',
    'Flexor digitorum profundus.l', 'Flexor pollicis longus.l', 'Median nerve.l', 'Scaphoid bone.l'])
    assert.ok(member(name, 'wrist', 'palmar', 'carpal-tunnel'), name);
  for (const name of ['Ulnar nerve.l', 'Palmar branch of median nerve.l', 'Flexor carpi radialis.l', 'Palmaris longus muscle.l'])
    assert.equal(member(name, 'wrist', 'palmar', 'carpal-tunnel'), null, name);
  for (const name of ['Tendon sheath - abd. pollicis longus - ext. pollicis brevis.l.001', 'Coracobrachial bursa.r.001'])
    assert.ok(pathFor(n(name), ROOT), name);
  for (const name of ['Medial intermuscular septum of arm.l', 'Lateral intermuscular septum of arm.r'])
    for (const region of ['anterior', 'posterior'])
      assert.ok(member(name, 'arm', region, 'fasciae'), name);
  assert.ok(member('Intertubercular tendon sheath.l', 'shoulder'));
});

test('Left, right and bilateral selections share memberships; ambiguous .l.r is never silently assigned a side', () => {
  const path = p('axillary', 'brachial-plexus');
  for (const side of ['left', 'right', 'both'] as const) {
    const plan = planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path, side))!;
    assert.ok(plan.show.length);
    for (const id of plan.show) {
      const actual = upperLimbSide(nodes[id - 1].rawName);
      assert.ok(side === 'both' || actual === 'both' || actual === side, nodes[id - 1].rawName);
    }
    const plexus = groups[1].children!.find(group => group.id === path.join('/'))!;
    assert.deepEqual(new Set(plan.show), new Set(menuCollectionNodeIds(nodes, [plexus],
      node => pathFor(node, ROOT, side), (node, requested) => pathFor(node, requested, side))));
    assert.ok(plan.hide.includes(n('Abdominal aorta').instanceID));
  }
  assert.equal(upperLimbSide('Subclavian nerve.l.r'), 'ambiguous');
  assert.equal(upperLimbSide('Lateral cord of brachial plexus.l.'), 'left');
  assert.ok(pathFor(n('Subclavian nerve.l.r'), path, 'both'));
  assert.equal(pathFor(n('Subclavian nerve.l.r'), path, 'left'), null);
  assert.equal(pathFor(n('Subclavian nerve.l.r'), path, 'right'), null);
});

test('Optional transparency adds only same-side regional muscle context and never fades selected nerve geometry', () => {
  const path = p('elbow', 'cubital-fossa', 'nerves');
  const ids = nodes.filter(node => pathFor(node, path, 'left')).map(node => node.instanceID);
  assert.deepEqual(upperLimbSettings(nodes, ids, path, 'left', false), { supportIds: [], contextIds: [] });
  const enabled = upperLimbSettings(nodes, ids, path, 'left', true);
  assert.ok(enabled.contextIds.includes(n('Brachialis muscle.l').instanceID));
  assert.ok(!enabled.contextIds.includes(n('Brachialis muscle.r').instanceID));
  assert.ok(!enabled.contextIds.includes(n('Median nerve.l').instanceID));
  assert.ok(!enabled.contextIds.includes(n('Abductor pollicis brevis.l').instanceID));
  assert.deepEqual(enabled.supportIds, enabled.contextIds);
  const snapshot = captureRegionIsolation(nodes, path, null, null);
  assert.equal(snapshot.visibility.size, nodes.length);
  assert.ok([...snapshot.visibility.values()].every(Boolean));
});

test('Desktop strip, sidebar and fullscreen all use the existing focused menu and controls', () => {
  const props = {
    nodes, activeNerveId: p('axillary').join('/'), isolatedRegionPath: p('axillary'),
    selectedNodeId: null, onActivateNerve: noop, onIsolateRegion: noop, onRestoreRegion: noop,
    onSetRegionVisibility: noop, onUpperLimbSideChange: noop, onUpperLimbMusclesChange: noop,
  };
  for (const variant of ['strip', 'sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(UpperLimbTopographyMenu, { ...props, variant }));
    if (variant === 'strip') for (const g of groups) assert.ok(html.includes(g.label));
    else {
      for (const text of ['Bilateral', 'Left', 'Right', 'Transparent surrounding muscles', 'Show all', 'Restore previous view'])
        assert.ok(html.includes(text), `${variant}: ${text}`);
    }
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    nodes, groups, initialExpanded: new Set(flatten(groups).map(g => g.id)),
    pathForNode: node => pathFor(node, ROOT), pathForGroup: pathFor, fadedNodeIds: new Set<number>(),
    isolatedPath: null, showUnassigned: false, onSetVisibility: noop, onIsolate: noop,
    onRestore: noop, onSelect: noop, toggleVisibility: noop, onToggleFade: noop,
  }));
  assert.ok(html.includes('Median nerve.l') && html.includes('Subclavian nerve.l.r'));
  assert.ok(!html.includes('Abdominal aorta'));
  assert.ok(html.includes('Fade mesh'), 'The shared transparency control remains available');
});

test('Global structure search discovers only actual upper-limb memberships and links to this atlas', async () => {
  const results = (await searchAnatomy('median nerve')).results;
  const destination = results.flatMap(result => result.destinations).find(d => d.atlasId === view.id);
  assert.ok(destination);
  assert.equal(destination.href, '/atlas/upper-limb');
  assert.ok(destination.collections.some(label => label.includes('Carpal tunnel')));
  assert.ok(!(await searchAnatomy('hepatic portal vein')).results.flatMap(r => r.destinations).some(d => d.atlasId === view.id));
});
