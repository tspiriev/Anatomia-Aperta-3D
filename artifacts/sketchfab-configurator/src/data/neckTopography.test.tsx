import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  NECK_SOURCE_OBJECTS as rows, NECK_TOPOGRAPHY_GROUPS as groups, NECK_TOPOGRAPHY_ROOT as ROOT,
  NECK_TOPOGRAPHY_MODEL_UID, neckTopographyPathForGroup as pathFor, neckTopographyPaths,
  neckTopographyCataloguePathForGroup,
  neckTopographySystemForNode, neckTopographySettings, neckBoneContextIds, NECK_SOURCE_NOTE,
} from './neckTopography';
import { NECK_TOPOGRAPHY_VIEW as view, HEAD_NECK_TOPOGRAPHY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { ATLAS_NAVIGATION_MENUS } from './atlasNavigation';
import { NeckTopographyMenu } from '../components/NeckTopographyMenu';
import { menuCollectionNodeIds } from '../components/NervousSystemMenu';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { headNeckBoneContextIds } from '../lib/headNeckBoneContext';
import { refractionContextOpacity } from '../lib/materialTransparency';
import { headNeckContextArguments } from './headNeckPetrosalSettings';
import { headNeckCervicalNerveFamily, cervicalNerveName } from './headNeckCervicalNerves';
import { searchAnatomy } from './anatomySearch';
import type { SceneNode, SketchfabMaterial } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { neckAnteriorHiddenLayerIds } from './neckAnteriorTriangle';
import { neckMemberships } from './neckTopographyRules';

const p = (...parts: string[]) => [...ROOT, ...parts];
const nodes: SceneNode[] = rows.map((row, i) => ({
  rawName: row.rawName, name: row.rawName, instanceID: i + 1, type: 'MatrixTransform',
  systemId: neckTopographySystemForNode({ rawName: row.rawName, systemId: null }), visible: true,
}));
const flatten = (items: readonly NervousGroup[]): NervousGroup[] =>
  items.flatMap(group => [group, ...flatten(group.children ?? [])]);
const tree = flatten(groups);
const n = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, `Source mesh: ${name}`);
  return node;
};
const isolate = (path: string[]) => planRegionIsolation(nodes, 'nervous', path, node => pathFor(node, path))!;
const menu = (path: string[]) => {
  const group = tree.find(group => group.id === path.join('/'))!;
  assert.ok(group, `Source-backed menu: ${path.join('/')}`);
  return menuCollectionNodeIds(nodes, [group], node => pathFor(node, ROOT), pathFor);
};
const noop = () => {};

test('Neck is separate from Head, uses the supplied model and only the supplied mesh/curve export', () => {
  assert.equal(rows.length, 546);
  assert.equal(view.modelUid, 'aa82b18a747748669d3100bc7aaf1926');
  assert.equal(view.href, '/atlas/neck');
  assert.equal(HEAD_NECK_TOPOGRAPHY_VIEW.modelUid, '29052deaffee44c0997dfbcfea4eb219');
  const topographic = ATLAS_NAVIGATION_MENUS.find(menu => menu.id === 'topographic-anatomy')!;
  assert.deepEqual(topographic.views.map(view => view.label), ['Head', 'Neck', 'Upper limb', 'Lower limb']);
  assert.ok(!ATLAS_NAVIGATION_MENUS.find(menu => menu.id === 'nervous-system')!.views.includes(view));
  assert.equal(groups.length, 7);
  for (const path of [
    p('anterior-triangle', 'submental'), p('anterior-triangle', 'submandibular'),
    p('anterior-triangle', 'carotid'), p('anterior-triangle', 'muscular'),
    p('posterior-triangle', 'occipital'), p('posterior-triangle', 'omoclavicular'),
    p('sternocleidomastoid'), p('deep-neck', 'prevertebral'),
    p('deep-neck', 'root-of-neck'), p('deep-neck', 'pharyngeal'), p('posterior-neck'),
    p('foramen-magnum', 'suboccipital'), p('cervical-plexus', 'brachial-plexus'),
  ]) assert.ok(menu(path).length);
});

test('Every admitted neck source has registered tissue paths; normal and imported SDK names agree', () => {
  const registered = new Set(tree.map(group => group.id));
  for (const node of nodes) {
    for (const path of neckTopographyPaths(node)) {
      assert.ok(registered.has(path.join('/')), `${node.rawName}/${path.join('/')}`);
      assert.ok(pathFor(node, path));
      assert.ok(isNodeInRegion(node, path, () => null));
    }
    assert.deepEqual(pathFor({ rawName: `${node.rawName.replace(/ /g, '_')}_987` }, ROOT), pathFor(node, ROOT));
    assert.equal(isNodeAllowedInAtlasView(node, view), Boolean(pathFor(node, ROOT)));
  }
  for (const rawName of ['Unknown neck muscle.l', 'Femoral artery.l', 'Median nerve.l.999', 'Camera', 'C1 anterior root.l.999'])
    assert.equal(pathFor({ rawName }, ROOT), null, rawName);
});

test('Standard neck regions isolate muscles, nerves, arteries and veins together, hiding unrelated geometry', () => {
  for (const path of [p('anterior-triangle'), p('posterior-triangle'), p('deep-neck'), p('foramen-magnum')]) {
    const plan = isolate(path);
    const systems = new Set(plan.show.map(id => nodes[id - 1].systemId));
    for (const system of ['muscular', 'nervous', 'vascular', 'skeletal'])
      assert.ok(systems.has(system as SceneNode['systemId']), `${path.join('/')}/${system}`);
    assert.ok(plan.hide.includes(n('Articular capsules of metacarpophalangeal joints.r').instanceID));
    assert.equal(plan.affected.length, nodes.length);
  }
  for (const name of ['HCS_RV_Purkinje_05', 'Superior lobar artery of right lung',
    'Nucleus of hypoglossal nerve.r', 'Tympanic membrane.r'])
    assert.equal(pathFor(n(name), ROOT), null, name);
  assert.ok(pathFor(n('Carotid artery Sympathetic plexus.r'), p('anterior-triangle', 'carotid', 'nerves')));
});

test('Cervical plexus contains every available cutaneous branch, phrenic nerve, ansa component and proximal cervical component', () => {
  const cervical = nodes.filter(node => headNeckCervicalNerveFamily(node.rawName) === 'cervical-plexus');
  assert.ok(cervical.length > 10);
  for (const node of cervical) assert.ok(pathFor(node, p('cervical-plexus')), node.rawName);
  for (const [branch, name] of [
    ['lesser-occipital', /lesser occipital nerve/], ['great-auricular', /great auricular nerve/],
    ['transverse-cervical', /transverse cervical nerve/], ['supraclavicular', /supraclavicular nerve/],
  ] as const) {
    const branchNodes = cervical.filter(node => name.test(cervicalNerveName(node.rawName)));
    assert.equal(branchNodes.length, 2, branch);
    const path = p('cervical-plexus', 'plexus', branch, 'nerves');
    const ids = menu(path);
    for (const node of branchNodes) assert.ok(ids.includes(node.instanceID));
  }
  const phrenic = cervical.filter(node => /phrenic/.test(cervicalNerveName(node.rawName)));
  assert.equal(phrenic.length, 2);
  for (const node of phrenic) assert.ok(pathFor(node, p('cervical-plexus', 'phrenic', 'nerves')));
  assert.ok(menu(p('cervical-plexus', 'ansa', 'superior-root', 'nerves')).length);
  assert.equal(menu(p('cervical-plexus', 'ansa', 'inferior-root', 'nerves')).length, 2);
  assert.match(NECK_SOURCE_NOTE, /only the right superior ansa root/);
  assert.ok(pathFor(n('Thyrohyoid muscle.l'), p('cervical-plexus', 'c1-via-xii', 'muscles')));
  assert.equal(pathFor(n('Thyrohyoid muscle.l'), p('cervical-plexus', 'ansa')), null);
});

test('The announced live C1 nerves join Cervical plexus without broadening the old CSV scope', () => {
  const requested = p('cervical-plexus', 'plexus', 'nerves');
  const added = ['l', 'r'].map((side, i) => ({
    ...nodes[0], instanceID: 10000 + i, rawName: `C1 nerve.${side}_9876`, name: `C1 nerve.${side}`,
    systemId: 'nervous' as const,
  }));
  for (const node of added) {
    assert.ok(isNodeAllowedInAtlasView(node, view));
    assert.ok(pathFor(node, requested));
    assert.equal(neckTopographySystemForNode(node), 'nervous');
    assert.equal(neckTopographyCataloguePathForGroup(node, requested), null);
  }
  const all = [...nodes, ...added];
  const group = tree.find(group => group.id === requested.join('/'))!;
  const ids = menuCollectionNodeIds(all, [group], () => null, pathFor);
  const plan = planRegionIsolation(all, 'nervous', requested, node => pathFor(node, requested))!;
  for (const node of added) {
    assert.ok(ids.includes(node.instanceID), 'C1 appears in the existing shared menu');
    assert.ok(plan.show.includes(node.instanceID), 'C1 survives scene isolation');
  }
  for (const rawName of ['C1 nerve', 'C1 anterior root.l.999', 'C6 nerve.l', 'Unknown neck nerve.r'])
    assert.equal(pathFor({ rawName }, ROOT), null, rawName);
});

test('Phrenic nerve views include both sides of C3–C5 roots in menu, scene and retained support', () => {
  const requested = p('cervical-plexus', 'phrenic', 'nerves');
  const ids = menu(requested);
  const plan = isolate(requested);
  const phrenicIds = nodes.filter(node => /phrenic nerve/.test(cervicalNerveName(node.rawName)))
    .map(node => node.instanceID);
  assert.equal(phrenicIds.length, 2);
  const support = neckTopographySettings(nodes, phrenicIds, requested).supportIds;
  for (const level of [3, 4, 5]) for (const side of ['l', 'r'])
    for (const component of ['anterior root', ' posterior root', 'Dorsal root ganglion']) {
      const node = n(`C${level} ${component}.${side}`);
      assert.ok(pathFor(node, requested), node.rawName);
      assert.ok(ids.includes(node.instanceID), `Menu: ${node.rawName}`);
      assert.ok(plan.show.includes(node.instanceID), `Scene: ${node.rawName}`);
      assert.ok(support.includes(node.instanceID), `Phrenic support: ${node.rawName}`);
    }
  assert.equal(pathFor(n('C6 anterior root.l'), requested), null);
});

test('The cervical plexus submenu contains only actual brachial roots and trunks, never spinal anterior roots or later plexus stages', () => {
  const path = p('cervical-plexus', 'brachial-plexus');
  const plan = isolate(path);
  assert.equal(plan.show.length, 8);
  for (const side of ['l', 'r']) {
    assert.ok(pathFor(n(`Roots of brachial plexus.${side}`), [...path, 'roots', 'nerves']));
    for (const level of ['Superior', 'Middle', 'Inferior'])
      assert.ok(pathFor(n(`${level} trunk of brachial plexus.${side}`), [...path, 'trunks', level.toLowerCase(), 'nerves']));
    assert.equal(pathFor(n(`C5 anterior root.${side}`), path), null);
    assert.ok(pathFor(n(`C5 anterior root.${side}`), p('cervical-plexus', 'spinal-context')));
  }
  assert.ok(!tree.some(group => group.id.startsWith(path.join('/')) && /\/(?:cords|divisions|terminal)/.test(group.id)));
});

test('Suboccipital view contains all four paired muscles, vertebral arteries, venous plexus and craniovertebral bones', () => {
  const path = p('foramen-magnum', 'suboccipital'), plan = isolate(path);
  for (const side of ['l', 'r']) for (const name of [
    'Obliquus superior capitis muscle', 'Obliquus inferior capitis muscle',
    'Rectus posterior major capitis muscle', 'Rectus posterior minor capitis muscle', 'Vertebral artery',
  ]) assert.ok(plan.show.includes(n(`${name}.${side}`).instanceID), `${name}.${side}`);
  for (const name of ['Cervical vertebral venous pleus', 'Atlas (C1)', 'Axis (C2)', 'Occipital bone.001'])
    assert.ok(plan.show.includes(n(name).instanceID), name);
  const settings = neckTopographySettings(nodes, plan.show, path);
  assert.equal(settings.contextIds.length, 4);
  assert.deepEqual(settings.supportIds, settings.contextIds);
  assert.ok(settings.contextIds.every(id => /^(?:Pons|Medulla oblongata)\./.test(nodes[id - 1].rawName)));
  const args = headNeckContextArguments(settings, plan.show, false);
  assert.equal(args[6], true, 'Allow the brainstem context with protected source materials');
  assert.deepEqual(args[7], [], 'Brainstem uses normal semitransparency; bones use the sphenoid refraction preset');
  assert.deepEqual(neckTopographySettings(nodes, [], p('anterior-triangle')).contextIds, []);
});

test('Every neck bone uses exactly the Head sphenoid refraction context, in every menu including bones-only', () => {
  const boneIds = neckBoneContextIds(NECK_TOPOGRAPHY_MODEL_UID, nodes);
  assert.ok(boneIds.includes(n('Sphenoid bone').instanceID));
  assert.ok(boneIds.includes(n('Vertebra C7').instanceID));
  assert.ok(boneIds.length >= 15);
  assert.deepEqual(headNeckBoneContextIds(NECK_TOPOGRAPHY_MODEL_UID, nodes), boneIds);
  assert.deepEqual(neckBoneContextIds('unrelated-model', nodes), []);
  const opacity = refractionContextOpacity({ channels: {} } as SketchfabMaterial);
  assert.deepEqual(opacity, {
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false, useNormalOffset: false,
    ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  });
  for (const id of boneIds) assert.equal(nodes[id - 1].systemId, 'skeletal');
});

test('Sidebar and fullscreen share source-backed Neck menus and recovery controls; strip has seven regional cards', () => {
  const props = {
    nodes, activeNerveId: p('anterior-triangle').join('/'), isolatedRegionPath: p('anterior-triangle'),
    onActivateNerve: noop, onSetRegionVisibility: noop, selectedNodeId: null,
    toggleVisibility: noop, onSelect: noop, onIsolateRegion: noop, onRestoreRegion: noop,
  };
  for (const variant of ['sidebar', 'fullscreen', 'strip'] as const) {
    const html = renderToStaticMarkup(createElement(NeckTopographyMenu, { ...props, variant }));
    assert.ok(!html.includes('Uses only this neck model'), 'Do not repeat the source note in Neck menus');
    assert.ok(!html.includes(NECK_SOURCE_NOTE));
    if (variant === 'strip') {
      assert.match(html, /Anterior triangle of neck/);
      assert.match(html, /Neck peripheral nerve and plexuses/);
    } else {
      assert.match(html, /Show all/);
      assert.match(html, /Restore previous view/);
    }
  }
});

test('Neck overview, every region and its submenus omit the redundant explanatory paragraph', () => {
  const activeIds = [null, ...groups.map(group => group.id),
    p('anterior-triangle', 'submental').join('/'), p('cervical-plexus', 'plexus').join('/')];
  for (const activeNerveId of activeIds) for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(NeckTopographyMenu, {
      variant, nodes, activeNerveId, isolatedRegionPath: null, selectedNodeId: null,
      onActivateNerve: noop, onIsolateRegion: noop, onRestoreRegion: noop, onSetRegionVisibility: noop,
    }));
    assert.ok(!html.includes('Uses only this neck model'), `${variant}/${activeNerveId}`);
    assert.ok(!html.includes('Whole source meshes may cross regional boundaries'));
  }
});

test('Homepage search resolves Neck destinations through actual regional memberships', async () => {
  const result = await searchAnatomy('obliquus superior capitis', 10);
  const destination = result.results.flatMap(row => row.destinations).find(destination => destination.atlasId === view.id);
  assert.ok(destination);
  assert.equal(destination.href, '/atlas/neck');
  assert.equal(destination.menuLabel, 'Topographic anatomy');
  assert.ok(destination.collections.some(label => label.includes('Suboccipital triangle')));
});

test('Anterior triangle opens without platysma or superficial investing fascia, including mixed-view cleanup', () => {
  const path = p('anterior-triangle'), plan = isolate(path);
  const hidden = neckAnteriorHiddenLayerIds(nodes, path);
  for (const side of ['l', 'r']) for (const name of ['Platysma', 'Superficial investing cervical fascia']) {
    const node = n(`${name}.${side}`);
    assert.equal(pathFor(node, path), null);
    assert.ok(plan.hide.includes(node.instanceID));
    assert.ok(!menu(path).includes(node.instanceID));
    assert.ok(hidden.includes(node.instanceID), 'Remove an already-visible layer in mixed views too');
    assert.equal(pathFor({ rawName: `${node.rawName.replace(/ /g, '_')}_987` }, path), null);
  }
});

test('Submental submenus never include platysma; muscular triangle retains platysma and its fascia', () => {
  const submental = p('anterior-triangle', 'submental');
  for (const side of ['l', 'r']) {
    const muscle = n(`Platysma.${side}`), fascia = n(`Superficial investing cervical fascia.${side}`);
    for (const group of tree.filter(group => group.id.startsWith(submental.join('/')))) {
      const path = group.id.split('/');
      assert.equal(pathFor(muscle, path), null);
      assert.ok(!menu(path).includes(muscle.instanceID));
    }
    for (const region of ['submental', 'submandibular', 'carotid']) {
      const path = p('anterior-triangle', region);
      assert.equal(pathFor(fascia, path), null, region);
      assert.ok(neckAnteriorHiddenLayerIds(nodes, path).includes(fascia.instanceID));
    }
    assert.ok(pathFor(muscle, p('anterior-triangle', 'muscular', 'muscles')));
    assert.ok(pathFor(fascia, p('anterior-triangle', 'muscular', 'fasciae')));
    assert.ok(isolate(p('anterior-triangle', 'muscular')).show.includes(muscle.instanceID));
    assert.ok(menu(p('anterior-triangle', 'muscular', 'fasciae')).includes(fascia.instanceID));
  }
  assert.deepEqual(neckAnteriorHiddenLayerIds(nodes, p('anterior-triangle', 'muscular')), []);
  assert.deepEqual(neckAnteriorHiddenLayerIds(nodes, p('posterior-triangle')), []);
});

test('Submandibular veins and facial artery retain carotid origins and internal jugular drainage', () => {
  const trunks = ['Right common carotid artery', 'Left common carotid artery',
    'External carotid artery.r', 'External carotid artery.l',
    'Internal carotid artery.r', 'Internal carotid artery.l',
    'Internal jugular vein.r', 'Internal jugular vein.l'].map(name => n(name).instanceID);
  const path = p('anterior-triangle', 'submandibular');
  for (const id of trunks) {
    const tissue = nodes[id - 1].rawName.includes('vein') ? 'veins' : 'arteries';
    assert.ok(pathFor(nodes[id - 1], [...path, tissue]));
    assert.ok(isolate(path).show.includes(id));
    assert.ok(pathFor(nodes[id - 1], p('anterior-triangle', 'carotid', tissue)),
      'Keep the established carotid-triangle membership');
  }
  for (const name of ['Lingual vein.r', 'Common facial vein.r', 'Facial artery.r']) {
    const ids = [n(name).instanceID], settings = neckTopographySettings(nodes, ids, path);
    assert.deepEqual(new Set(settings.supportIds), new Set(trunks), name);
    assert.deepEqual(settings.contextIds, [], 'Keep the vascular trunks at their original opacity');
  }
  for (const tissue of ['arteries', 'veins']) {
    const selected = isolate([...path, tissue]).show;
    const support = neckTopographySettings(nodes, selected, [...path, tissue]).supportIds;
    assert.ok(trunks.every(id => selected.includes(id) || support.includes(id)), tissue);
  }
  assert.deepEqual(neckTopographySettings(nodes, [], path).supportIds, [], 'Hide must not reintroduce support');
});

test('Homepage discovery still finds muscular-triangle platysma despite its exclusion from the opening view', async () => {
  const results = await searchAnatomy('platysma', 10);
  const destinations = results.results.flatMap(result => result.destinations).filter(destination => destination.atlasId === view.id);
  assert.ok(destinations.some(destination => destination.collections.some(label => label.includes('Muscular triangle'))));
  assert.ok(destinations.every(destination => destination.collections.every(label => !label.includes('Submental'))));
});

test('Posterior and occipital triangles include the requested available deep and short capitis muscles', () => {
  for (const path of [p('posterior-triangle'), p('posterior-triangle', 'occipital')]) {
    const plan = isolate(path);
    for (const side of ['l', 'r']) for (const name of [
      'Semispinalis colli muscle', 'Longissimus capitis muscle', 'Splenius capitis muscle',
      'Obliquus superior capitis muscle', 'Rectus posterior minor capitis muscle',
      'Rectus posterior major capitis muscle', 'Rectus lateralis capitis muscle',
    ]) {
      const node = n(`${name}.${side}`);
      assert.ok(plan.show.includes(node.instanceID), `${path.join('/')}/${node.rawName}`);
      assert.ok(menu([...path, 'muscles']).includes(node.instanceID));
      assert.ok(pathFor({ rawName: `${node.rawName.replace(/ /g, '_')}_987` }, [...path, 'muscles']));
    }
  }
  for (const rawName of ['Semispinalis capitis muscle.l', 'Splenius cervicis muscle.r'])
    assert.equal(Boolean(pathFor({ rawName }, p('posterior-triangle'))),
      rows.some(row => row.rawName === rawName), 'Do not borrow or invent absent source geometry');
});

test('Posterior and occipital triangles show occipital bone and all seven cervical vertebrae with existing bone refraction', () => {
  const cervical = ['Atlas (C1)', 'Axis (C2)', ...[3, 4, 5, 6, 7].map(level => `Vertebra C${level}`)];
  const bones = neckBoneContextIds(NECK_TOPOGRAPHY_MODEL_UID, nodes);
  for (const path of [p('posterior-triangle'), p('posterior-triangle', 'occipital')])
    for (const name of ['Occipital bone.001', ...cervical]) {
      const node = n(name);
      assert.ok(isolate(path).show.includes(node.instanceID), name);
      assert.ok(menu([...path, 'bones']).includes(node.instanceID), name);
      assert.ok(bones.includes(node.instanceID), 'Use the shared neck/sphenoid refraction preset');
    }
  const supraclavicular = p('posterior-triangle', 'omoclavicular');
  for (const name of cervical)
    assert.ok(menu([...supraclavicular, 'bones']).includes(n(name).instanceID), name);
  for (const name of ['Clavicle.l', 'Clavicle.r', 'Scalenus anterior muscle.l', 'Scalenus anterior muscle.r'])
    assert.ok(isolate(supraclavicular).show.includes(n(name).instanceID), 'Keep the existing supraclavicular arrangement');
});

test('Posterior-triangle fascia uses semitransparent context without fading muscles, adding hidden fascia or changing anterior views', () => {
  const path = p('posterior-triangle'), plan = isolate(path);
  const fasciaIds = nodes.filter(node => /fascia/i.test(node.rawName)
    && plan.show.includes(node.instanceID)).map(node => node.instanceID);
  assert.ok(fasciaIds.length > 0);
  const settings = neckTopographySettings(nodes, plan.show, path);
  assert.deepEqual(new Set(settings.contextIds), new Set(fasciaIds));
  assert.deepEqual(settings.supportIds, settings.contextIds);
  const args = headNeckContextArguments(settings, plan.show, false);
  assert.equal(args[2], true, 'Use normal semitransparent context');
  assert.equal(args[6], true, 'Allow fascia context while preserving source materials');
  assert.deepEqual(args[7], [], 'Leave exact refraction to the existing neck-bone handler');
  assert.ok(!settings.contextIds.includes(n('Semispinalis colli muscle.l').instanceID));
  assert.deepEqual(neckTopographySettings(nodes, [], path).contextIds, [], 'Hide must not resurrect fascia');
  const bones = isolate([...path, 'bones']).show;
  assert.deepEqual(neckTopographySettings(nodes, bones, [...path, 'bones']).contextIds, []);
  for (const side of ['l', 'r']) {
    const id = n(`Superficial investing cervical fascia.${side}`).instanceID;
    assert.deepEqual(neckTopographySettings(nodes, [id], [...path, 'fasciae']).contextIds, [id]);
    assert.deepEqual(neckTopographySettings(nodes, [id], p('anterior-triangle', 'muscular', 'fasciae')).contextIds, []);
  }
});

test('Sternocleidomastoid arterial menus include carotid trunks and the modeled regional branches', () => {
  const path = p('sternocleidomastoid', 'arteries');
  const ids = menu(path), plan = isolate(path);
  const expected = [
    'Right common carotid artery', 'Left common carotid artery',
    'External carotid artery.r', 'External carotid artery.l',
    'Internal carotid artery.r', 'Internal carotid artery.l',
    'Facial artery.r', 'Facial artery.l', 'Occipital artery.r', 'Occipital artery.l',
    'Ascending pharyngeal artery.r',
    'FJ5117_BP29142_FMA66447_Trunk of right lingual artery',
    'FJ5011_BP29192_FMA66472_Trunk of right superior thyroid artery',
    'FJ5072_BP29683_FMA49484_Right cricothyroid artery',
    'FJ5024_BP29706_FMA49489_Anterior glandular branch of right supe',
  ];
  for (const name of expected) {
    const node = n(name);
    assert.ok(ids.includes(node.instanceID), name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(isolate(p('sternocleidomastoid')).show.includes(node.instanceID), name);
    assert.equal(neckTopographySystemForNode(node), 'vascular');
    assert.ok(pathFor({ rawName: `${name.replace(/ /g, '_')}_987` }, path), name);
  }
  for (const name of ['Basilar artery', 'Axillary artery.r', 'Superior lobar artery of right lung'])
    assert.ok(!ids.includes(n(name).instanceID), `Do not add out-of-region vessels: ${name}`);
});

test('Sternocleidomastoid venous menus include both jugular systems and their modeled regional tributaries', () => {
  const path = p('sternocleidomastoid', 'veins'), ids = menu(path), plan = isolate(path);
  const families = ['Internal jugular vein', 'External jugular vein', 'Anterior jugular vein',
    'Common facial vein', 'Superior thyroid vein', 'Retromandibular vein',
    'Anterior division of retromandibular vein', 'Posterior division of retromandibular vein',
    'Occipital vein', 'Submental vein', 'Suprascapular vein'];
  const expected = families.flatMap(name => ['r', 'l'].map(side => `${name}.${side}`));
  expected.push('Lingual vein.r', 'FJ4996_BP28866_FMA52565_Right lingual vein',
    'FJ5231_BP28831_FMA50808_Right superior thyroid vein');
  for (const name of expected) {
    const node = n(name);
    assert.ok(ids.includes(node.instanceID), name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(isolate(p('sternocleidomastoid')).show.includes(node.instanceID), name);
    assert.ok(!menu(p('sternocleidomastoid', 'arteries')).includes(node.instanceID), name);
  }
  assert.ok(!ids.includes(n('Basilar venous plexus clivus').instanceID));
});

test('Sternocleidomastoid landmarks add cervical spine and occipital bone with shared bone refraction', () => {
  const path = p('sternocleidomastoid', 'bones'), ids = menu(path);
  const context = neckBoneContextIds(NECK_TOPOGRAPHY_MODEL_UID, nodes);
  for (const name of ['Atlas (C1)', 'Axis (C2)', 'Occipital bone.001',
    ...[3, 4, 5, 6, 7].map(level => `Vertebra C${level}`)]) {
    const node = n(name);
    assert.ok(ids.includes(node.instanceID), name);
    assert.ok(isolate(p('sternocleidomastoid')).show.includes(node.instanceID), name);
    assert.ok(context.includes(node.instanceID), 'Use the existing semitransparent bone preset');
  }
  for (const rawName of ['Temporal bone.r', 'Temporal bone.l'])
    assert.equal(Boolean(pathFor({ rawName }, path)), rows.some(row => row.rawName === rawName),
      'Do not substitute another bone for absent source geometry');
});

test('Sternocleidomastoid fascia fades in overview and fascia-only views, without fading muscles or resurrecting hidden sheets', () => {
  for (const path of [p('sternocleidomastoid'), p('sternocleidomastoid', 'fasciae')]) {
    const shown = isolate(path).show;
    const fascia = ['r', 'l'].map(side => n(`Superficial investing cervical fascia.${side}`).instanceID);
    const settings = neckTopographySettings(nodes, shown, path);
    assert.deepEqual(new Set(settings.contextIds), new Set(fascia));
    assert.ok(fascia.every(id => shown.includes(id)));
    const args = headNeckContextArguments(settings, shown, false);
    assert.equal(args[2], true);
    assert.equal(args[6], true, 'Enable semitransparent fascia even while preserving other source materials');
    assert.ok(!settings.contextIds.includes(n('Sternocleidomastoid muscle.r').instanceID));
    assert.deepEqual(neckTopographySettings(nodes, [], path).contextIds, []);
    assert.deepEqual(neckTopographySettings(nodes, [fascia[0]], path).contextIds, [fascia[0]]);
  }
  for (const tissue of ['arteries', 'veins', 'bones']) {
    const path = p('sternocleidomastoid', tissue);
    assert.deepEqual(neckTopographySettings(nodes, isolate(path).show, path).contextIds, [],
      'Do not force hidden fascia into another tissue-only view');
  }
});

test('Deep neck overview, root and pharyngeal regions include recurrent laryngeal nerves on both sides', () => {
  for (const path of [p('deep-neck'), p('deep-neck', 'root-of-neck'), p('deep-neck', 'pharyngeal')]) {
    const plan = isolate(path);
    const tissuePath = path.length === ROOT.length + 1 ? path : [...path, 'nerves'];
    for (const name of ['Right recurrent laryngeal nerve.r', 'Left recurrent laryngeal nerve.l']) {
      const node = n(name);
      assert.ok(plan.show.includes(node.instanceID), `${path.join('/')}/${name}`);
      assert.ok(menu(tissuePath).includes(node.instanceID), name);
      assert.ok(pathFor({ rawName: `${name.replace(/ /g, '_')}_987` }, tissuePath));
    }
  }
});

test('Pharyngeal and parapharyngeal region retains both vagus nerves and their modeled local branches', () => {
  const path = p('deep-neck', 'pharyngeal', 'nerves'), ids = menu(path), plan = isolate(path);
  const vagusPieces = rows.filter(row => /^Vagus nerve \(X\)\./.test(row.rawName));
  assert.ok(vagusPieces.some(row => /\.l$/.test(row.rawName)));
  assert.ok(vagusPieces.some(row => /\.r(?:\.\d+)?$/.test(row.rawName)));
  for (const name of [...vagusPieces.map(row => row.rawName),
    'Pharyngeal branch of the vagus nerve.r', 'Pharyngeal branch of the vagus nerve.l',
    'Superior laryngeal nerve.r', 'Superior laryngeal nerve.l']) {
    assert.ok(ids.includes(n(name).instanceID), name);
    assert.ok(plan.show.includes(n(name).instanceID), name);
  }
  for (const name of ['Posterior nucleus of vagus nerve.r', 'Inferior cardiac nerve vagus.l'])
    assert.ok(!ids.includes(n(name).instanceID), 'Keep CNS nuclei and cardiac branches outside this local region');
});

test('Prevertebral/scalene and root-of-neck arterial submenus include the requested carotid trunks', () => {
  for (const region of ['prevertebral', 'root-of-neck']) {
    const path = p('deep-neck', region, 'arteries');
    const names = ['Internal carotid artery.r', 'Internal carotid artery.l',
      ...(region === 'root-of-neck' ? ['Right common carotid artery', 'Left common carotid artery'] : [])];
    for (const name of names) {
      const id = n(name).instanceID;
      assert.ok(menu(path).includes(id), `${region}/${name}`);
      assert.ok(isolate(path).show.includes(id), name);
      assert.ok(isolate(p('deep-neck', region)).show.includes(id), name);
    }
  }
  for (const name of ['Scalenus anterior muscle.r', 'Scalenus anterior muscle.l'])
    assert.ok(isolate(p('deep-neck', 'prevertebral')).show.includes(n(name).instanceID),
      'Preserve the existing scalene region');
});

test('Trachea is assigned to every deep-neck region when supplied, without inventing missing source geometry', () => {
  for (const region of ['prevertebral', 'root-of-neck', 'pharyngeal']) {
    assert.ok(neckMemberships('Trachea').some(m => m.region === `deep-neck/${region}` && m.tissue === 'organs'));
    assert.equal(Boolean(pathFor({ rawName: 'Trachea' }, p('deep-neck', region))),
      rows.some(row => row.rawName.toLowerCase() === 'trachea'),
      'A regional rule must not fabricate a tracheal mesh absent from this export');
  }
});

test('Posterior cervical arteries include supplying trunks and every available reviewed posterior branch', () => {
  const path = p('posterior-neck', 'arteries'), ids = menu(path), shown = isolate(path).show;
  const names = ['Right subclavian artery', 'Left subclavian artery',
    ...['Vertebral artery', 'Transverse cervical artery', 'Thyrocervical trunk',
      'Suprascapular artery', 'Occipital artery',
      '(Superficial branch of transverse cervical artery)',
      '(Deep branch of transverse cervical artery)']
      .flatMap(name => ['r', 'l'].map(side => `${name}.${side}`)),
    ...['Deep cervical artery', 'Costocervical trunk']
      .flatMap(name => ['r', 'l'].map(side => `${name}.${side}.001`))];
  assert.equal(names.length, 20);
  for (const name of names) {
    const node = n(name);
    assert.ok(ids.includes(node.instanceID), name);
    assert.ok(shown.includes(node.instanceID), name);
    assert.ok(isolate(p('posterior-neck')).show.includes(node.instanceID), name);
    assert.ok(pathFor({ rawName: `${name.replace(/ /g, '_')}_987` }, path), name);
    assert.ok(!menu(p('posterior-neck', 'veins')).includes(node.instanceID), name);
    assert.ok(!neckTopographySettings(nodes, shown, path).contextIds.includes(node.instanceID),
      'Keep the original arterial appearance');
  }
  for (const name of ['Basilar artery', 'Axillary artery.r', 'Superior lobar artery of right lung',
    'Circumflex scapular artery.l'])
    assert.ok(!ids.includes(n(name).instanceID), `Do not expand into brain, axilla or thorax: ${name}`);
});

test('Posterior cervical veins include jugular/subclavian drainage and modeled posterior tributaries', () => {
  const path = p('posterior-neck', 'veins'), ids = menu(path), shown = isolate(path).show;
  const names = ['Right subclavian vein', 'Left subclavian vein', 'Cervical vertebral venous pleus',
    ...['Internal jugular vein', 'External jugular vein', 'Occipital vein', 'Suprascapular vein']
      .flatMap(name => ['r', 'l'].map(side => `${name}.${side}`))];
  assert.equal(names.length, 11);
  for (const name of names) {
    const node = n(name);
    assert.ok(ids.includes(node.instanceID), name);
    assert.ok(shown.includes(node.instanceID), name);
    assert.ok(isolate(p('posterior-neck')).show.includes(node.instanceID), name);
    assert.ok(pathFor({ rawName: `${name.replace(/ /g, '_')}_987` }, path), name);
    assert.ok(!menu(p('posterior-neck', 'arteries')).includes(node.instanceID), name);
  }
  for (const name of ['Basilar venous plexus clivus', 'Common facial vein.r', 'Circumflex scapular vein.l'])
    assert.ok(!ids.includes(n(name).instanceID), `Keep nonregional venous systems outside the menu: ${name}`);
});

test('Posterior cervical dorsal-scapular rules preserve source identity rather than inventing an absent mesh', () => {
  const path = p('posterior-neck', 'arteries');
  for (const side of ['r', 'l']) {
    const rawName = `Dorsal scapular artery.${side}`;
    assert.ok(neckMemberships(rawName).some(m => m.region === 'posterior-neck' && m.tissue === 'arteries'));
    assert.equal(Boolean(pathFor({ rawName }, path)), rows.some(row => row.rawName === rawName));
    assert.ok(menu(path).includes(n(`(Deep branch of transverse cervical artery).${side}`).instanceID),
      'Include the actual deep transverse-cervical branch without relabeling its origin');
  }
  for (const name of ['Semispinalis colli muscle.r', 'Semispinalis colli muscle.l',
    'Splenius capitis muscle.r', 'Splenius capitis muscle.l'])
    assert.ok(isolate(p('posterior-neck')).show.includes(n(name).instanceID),
      'Preserve the existing posterior cervical muscles');
});
