import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AUTONOMIC_GROUPS, AUTONOMIC_ROOT_PATH, AUTONOMIC_SOURCE_OBJECTS,
  autonomicPathForGroup, autonomicContextIds, autonomicForegroundIds } from './autonomicTaxonomy';
import { vagusContextSystem } from './vagusTargets';
import { systemForMeshName } from './anatomicalSystems';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { headNeckLandmarkSystem } from './headNeckAutonomicLandmarks';
import { isEntericVisceralName } from './entericVisceralContext';
import { planRegionIsolation, isNodeInRegion } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const root = [...AUTONOMIC_ROOT_PATH, 'head-neck'];
const bones = ['Atlas (C1)', 'Axis (C2)', ...Array.from({ length: 5 }, (_, i) => `Vertebra C${i + 3}`),
  'Temporal bone.l', 'Temporal bone.r', 'Sphenoid bone'];
const brainstem = ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r', 'Medulla oblongata.l', 'Medulla oblongata.r'];
const vessels = ['Left common carotid artery', 'Right common carotid artery',
  'External carotid artery.l', 'External carotid artery.r', 'Internal carotid artery.l', 'Internal carotid artery.r',
  'Left subclavian artery', 'Right subclavian artery', 'Aortic arch', 'Brachiocephalic trunk'];
const glands = ['Parotid gland.l', 'Parotid gland.r', 'Submandibular gland.l', 'Submandibular gland.r',
  'Sublingual gland.l', 'Sublingual gland.r', '(Accessory parotid gland).l', '(Accessory parotid gland).r'];
const names = [...new Set([...AUTONOMIC_SOURCE_OBJECTS.map(row => row.object_name.trim()),
  ...bones, ...vessels, ...glands, 'Vertebra T1', 'Vertebra L1', 'Occipital bone', 'Stomach', 'Aorta',
  'Submandibular ganglia nerves.l', 'Submandibular ganglia nerves.r',
  // The creator confirmed this live mesh name; the older CSV omits it.
  'C4 spinal nerve.r'])];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName),
}));
const object = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, `Missing source ${name}`);
  return node;
};

test('head/neck whole view includes translucent cervical and skull landmarks, opaque eyes, glands, carotids, bodies and C1-C4 roots', () => {
  const plan = planRegionIsolation(nodes, 'nervous', root, node => autonomicPathForGroup(node, root))!;
  const context = autonomicContextIds(nodes, root);
  const foreground = autonomicForegroundIds(nodes, root);
  for (const name of bones) {
    const node = object(name);
    assert.equal(node.systemId, 'skeletal', name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(context.includes(node.instanceID), name);
    assert.ok(!foreground.includes(node.instanceID), name);
  }
  for (const name of brainstem) {
    const node = object(name);
    assert.equal(node.systemId, 'nervous', name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(context.includes(node.instanceID), name);
    assert.ok(!foreground.includes(node.instanceID), name);
  }
  for (const name of [...vessels, ...glands, 'Lacrimal gland.l', 'Lacrimal gland.r', 'Iris.l', 'Iris.r',
    'Anterior segment of eyeball.l', 'Posterior segment of eyeball.r', 'Carotid body left.l', 'Carotid body right.r',
    'C1 anterior posterior.l', 'C1 anterior posterior.r', 'C2 anterior posterior.l', 'C2 anterior posterior.r',
    'C3  posterior root.l', 'C3  posterior root.r', 'C4  posterior root.l', 'C4  posterior root.r']) {
    const node = object(name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(foreground.includes(node.instanceID), name);
    assert.ok(!context.includes(node.instanceID), name);
    assert.ok(isNodeInRegion(node, root, () => null), name);
  }
  for (const name of ['Vertebra T1', 'Vertebra L1', 'Occipital bone', 'Stomach', 'Aorta',
    'Spinal dura', 'Dura mater brain', 'Internal axis of eyeball.r', 'Lumbar plexus.r']) {
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
});

test('head/neck subgroup isolation retains all translucent bones while respecting specific pathways and target ownership', () => {
  for (const child of AUTONOMIC_GROUPS[2].children!) {
    const scope = child.id.split('/');
    const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    for (const name of [...bones, ...brainstem]) {
      const node = object(name);
      assert.ok(plan.show.includes(node.instanceID), `${child.label}: ${name}`);
      assert.ok(isNodeInRegion(node, scope, () => null), name);
      assert.ok(autonomicContextIds(nodes, scope).includes(node.instanceID), name);
    }
  }
  for (const name of vessels) {
    const node = object(name);
    assert.equal(node.systemId, 'vascular', name);
    assert.ok(autonomicPathForGroup(node, [...root, 'carotid']), name);
    assert.equal(autonomicPathForGroup(node, [...root, 'ganglia']), null, name);
  }
  for (const name of glands) {
    const node = object(name);
    assert.equal(node.systemId, 'organs', name);
    assert.ok(autonomicPathForGroup(node, [...root, 'ganglia']), name);
    assert.equal(autonomicPathForGroup(node, [...root, 'ocular']), null, name);
  }
  for (const name of [...vessels, ...glands]) {
    for (const category of ['sympathetic', 'parasympathetic', 'plexuses', 'enteric']) {
      if (category === 'enteric' && isEntericVisceralName(name)) {
        assert.ok(autonomicPathForGroup(object(name), [...AUTONOMIC_ROOT_PATH, category]));
        continue;
      }
      // Reviewed thoracic great vessels are also vagus context (parasympatheticVisceralContext.ts).
      if (category === 'parasympathetic' && vagusContextSystem(name) === 'vascular') {
        assert.deepEqual(autonomicPathForGroup(object(name), [...AUTONOMIC_ROOT_PATH, category]), [...AUTONOMIC_ROOT_PATH, 'parasympathetic', 'vagus', 'thoracic-vessels'], name);
        continue;
      }
      if (name === 'Aortic arch' && category === 'plexuses') {
        assert.ok(autonomicPathForGroup(object(name), [...AUTONOMIC_ROOT_PATH, category]));
        continue;
      }
      assert.equal(autonomicPathForGroup(object(name), [...AUTONOMIC_ROOT_PATH, category]), null, name);
    }
  }
});

test('head/neck reference nerves and salivary carriers are admitted bilaterally without confusing nerve plexuses with vessels', () => {
  const stems = ['Superior cervical sympathetic ganglion', 'Vidian nerve (nerve of the pterygoid canal)',
    'Deep petrosal nerve', 'Pterygopalatine ganglion', 'Trigeminal nerve (Gasserian) ganglion',
    'Trigeminal nerve root', 'Ophthalmic nerve', 'Maxillary nerve', 'Nasociliary nerve', 'Lacrimal nerve',
    'Zygomatic nerve', 'Ganglionic branch of maxillary nerve', 'Ciliary ganglion', 'Short ciliary nerves',
    'Superior branch of the oculomotor nerve', 'Chorda tympani', 'Lingual nerve', 'Auriculotemporal nerve',
    'Submandibular ganglion', 'Submandibular ganglia nerves', 'Otic ganglion', 'Glossopharyngeal nerve (IX)',
    'Tympanic nerve (Jacobson)', 'Lesser petrosal nerve', 'Tympanic membrane', 'Tympanic plexus',
    'Superior salivatory nucleus', 'Inferior salivatory nucleus', 'Middle cervical sympathetic ganglion',
    'Cervicothoracic Ganglion (Stellatum)'];
  for (const side of ['l', 'r']) for (const stem of stems) {
    const node = object(`${stem}.${side}`);
    assert.ok(autonomicPathForGroup(node, root), node.rawName);
    assert.deepEqual(autonomicForegroundIds([node], root), [node.instanceID], node.rawName);
  }
  for (const name of [...bones, ...brainstem, ...vessels, ...glands, 'Lacrimal gland.l', 'Iris.r',
    'Carotid body left.l', 'Carotid body right.r', 'Carotid artery Sympathetic plexus.r',
    'Internal carotid artery sympathetic plexus.l', 'C1 dorsal root.l', 'C4 dorsal root.r']) {
    for (const suffix of ['', '_123', '.001_123']) {
      const rawName = name + suffix;
      const node: SceneNode = { ...nodes[0], rawName, systemId: systemForMeshName(rawName) };
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      assert.ok(isNodeInRegion(node, root, () => null), rawName);
      if (headNeckLandmarkSystem(rawName)) assert.equal(node.systemId, headNeckLandmarkSystem(rawName), rawName);
    }
  }
  assert.equal(headNeckLandmarkSystem('Internal carotid artery sympathetic plexus.l'), null);
  assert.equal(object('Internal carotid artery sympathetic plexus.l').systemId, 'nervous');
  assert.equal(isNodeAllowedInAtlasView({ ...nodes[0], rawName: 'Aorta', systemId: 'vascular' }, AUTONOMIC_NERVOUS_SYSTEM_VIEW), false);
  const stomach = { ...nodes[0], rawName: 'Stomach', systemId: 'organs' as const };
  assert.equal(isNodeAllowedInAtlasView(stomach, AUTONOMIC_NERVOUS_SYSTEM_VIEW), true);
  assert.equal(autonomicPathForGroup(stomach, root), null);
});

test('head/neck cervical ganglia and ansa subclavia accompany the subclavian arteries while salivatory nuclei and tympanic pathways stay in the cranial pathway', () => {
  const cervical = [...root, 'carotid'];
  const cranial = [...root, 'ganglia'];
  for (const scope of [root, cervical]) {
    const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    for (const name of ['Middle cervical sympathetic ganglion.l', 'Middle cervical sympathetic ganglion.r',
      'Cervicothoracic Ganglion (Stellatum).l', 'Cervicothoracic Ganglion (Stellatum).r',
      'Ansa Subclavia.r', 'Left subclavian artery', 'Right subclavian artery', 'Aortic arch']) {
      const node = object(name);
      assert.ok(plan.show.includes(node.instanceID), name);
      assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID], name);
      assert.deepEqual(autonomicContextIds([node], scope), [], name);
    }
  }
  const plan = planRegionIsolation(nodes, 'nervous', cranial, node => autonomicPathForGroup(node, cranial))!;
  for (const side of ['l', 'r']) {
    for (const stem of ['Superior salivatory nucleus', 'Inferior salivatory nucleus', 'Tympanic plexus',
      'Tympanic membrane', 'Lesser petrosal nerve']) {
      assert.ok(plan.show.includes(object(`${stem}.${side}`).instanceID), stem);
    }
    for (const stem of ['Inferior cervical sympathetic ganglion', 'Inferior cervical ganglion',
      'Middle cervical ganglion', 'Cervicothoracic ganglion', 'Stellate ganglion', 'Ansa subclavia']) {
      const rawName = `${stem}.${side}.001_123`;
      const node = { ...nodes[0], rawName, systemId: systemForMeshName(rawName) };
      assert.ok(autonomicPathForGroup(node, cervical), rawName);
      assert.deepEqual(autonomicForegroundIds([node], root), [node.instanceID], rawName);
    }
  }
});

test('trigeminal motor nuclei and motor roots are excluded from every head/neck subgroup', () => {
  for (const stem of ['Motor nucleus of trigeminal nerve', 'Trigeminal motor nucleus',
    'Trigeminal motor neucleus', 'Nucleus motorius nervi trigemini', 'Motor root of trigeminal nerve',
    'Trigeminal nerve motor root']) {
    for (const side of ['l', 'r']) {
      const rawName = `${stem}.${side}.001_123`;
      const node = { ...nodes[0], instanceID: -1, rawName, systemId: 'nervous' as const };
      for (const scope of [root, ...AUTONOMIC_GROUPS[2].children!.map(group => group.id.split('/'))]) {
        assert.equal(autonomicPathForGroup(node, scope), null, rawName);
        assert.equal(isNodeInRegion(node, scope, () => null), false, rawName);
        const plan = planRegionIsolation([...nodes, node], 'nervous', scope, n => autonomicPathForGroup(n, scope))!;
        assert.ok(!plan.show.includes(node.instanceID), rawName);
        assert.ok(plan.hide.includes(node.instanceID), rawName);
      }
    }
  }
  for (const side of ['l', 'r']) {
    assert.equal(autonomicPathForGroup(object(`Motor root of trigeminal nerve.${side}`), root), null);
    assert.ok(autonomicPathForGroup(object(`Trigeminal nerve root.${side}`), root));
    assert.equal(autonomicPathForGroup(object(`Motor root of trigeminal nerve.${side}`), [...AUTONOMIC_ROOT_PATH, 'parasympathetic']), null);
  }
});

test('head/neck retains translucent brainstem with opaque posterior vagal nuclei and submandibular ganglion nerves', () => {
  const scopes = [root, [...root, 'ganglia']];
  const stems = ['Posterior nucleus of vagus nerve', 'Submandibular ganglion nerve',
    'Submandibular ganglia nerves', 'Nerves of submandibular ganglion', 'Nerve of submandibular ganglion',
    'Submandibular ganglionic nerves'];
  for (const scope of scopes) {
    for (const side of ['l', 'r']) for (const stem of stems) {
      const rawName = `${stem}.${side}.001_123`;
      const node = { ...nodes[0], instanceID: -1, rawName, name: rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      assert.ok(isNodeInRegion(node, scope, () => null), rawName);
      assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID], rawName);
      assert.deepEqual(autonomicContextIds([node], scope), [], rawName);
      const plan = planRegionIsolation([...nodes, node], 'nervous', scope, n => autonomicPathForGroup(n, scope))!;
      assert.ok(plan.show.includes(node.instanceID), rawName);
      for (const name of brainstem) assert.ok(plan.show.includes(object(name).instanceID), name);
      assert.ok(plan.hide.includes(object(`Motor root of trigeminal nerve.${side}`).instanceID));
    }
  }
  for (const rawName of ['Brainstem', 'Brain stem.001_123']) {
    const node = { ...nodes[0], rawName, systemId: null };
    for (const scope of scopes) {
      assert.ok(isNodeInRegion(node, scope, () => null), rawName);
      assert.deepEqual(autonomicContextIds([node], scope), [node.instanceID], rawName);
      assert.deepEqual(autonomicForegroundIds([node], scope), [], rawName);
    }
  }
  for (const side of ['l', 'r']) {
    const nucleus = object(`Posterior nucleus of vagus nerve.${side}`);
    assert.ok(autonomicPathForGroup(nucleus, [...AUTONOMIC_ROOT_PATH, 'parasympathetic', 'vagus']));
    assert.equal(autonomicPathForGroup(nucleus, [...AUTONOMIC_ROOT_PATH, 'sympathetic']), null);
  }
});

test('C1–C4 spinal nerves, dorsal rami and brachial roots are bilateral opaque head/neck landmarks, with export aliases', () => {
  const stems = ['Roots of brachial plexus', ...[1, 2, 3, 4].flatMap(level => [
    `C${level} spinal nerve`,
    `Dorsal ramus C${level}`, `C${level} dorsal rami`, `Posterior ramus C${level}`,
  ])];
  for (const stem of stems) for (const side of ['l', 'r']) {
    for (const suffix of ['', '_123', '.001_123']) {
      const rawName = `${stem}.${side}${suffix}`;
      const node = { ...nodes[0], instanceID: -1, name: rawName, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.deepEqual(autonomicPathForGroup(node, root), root, rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      assert.ok(isNodeInRegion(node, root, () => null), rawName);
      assert.deepEqual(autonomicForegroundIds([node], root), [-1], rawName);
      assert.deepEqual(autonomicContextIds([node], root), [], rawName);
      const plan = planRegionIsolation([...nodes, node], 'nervous', root, n => autonomicPathForGroup(n, root))!;
      assert.ok(plan.show.includes(-1), rawName);
      for (const category of ['enteric', 'parasympathetic', 'plexuses']) {
        assert.equal(autonomicPathForGroup(node, [...AUTONOMIC_ROOT_PATH, category]), null, rawName);
      }
      if (stem === 'Roots of brachial plexus') {
        assert.ok(autonomicPathForGroup(node, [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'cervical']), rawName);
      }
    }
  }
  for (const side of ['l', 'r']) {
    for (const stem of ['Dorsal ramus C4', 'Roots of brachial plexus']) {
      assert.ok(AUTONOMIC_SOURCE_OBJECTS.some(row => row.object_name.trim() === `${stem}.${side}`));
      assert.deepEqual(autonomicForegroundIds([object(`${stem}.${side}`)], root), [object(`${stem}.${side}`).instanceID]);
    }
    for (const level of [5, 6, 7, 8]) {
      assert.equal(autonomicPathForGroup(object(`Dorsal ramus C${level}.${side}`), root), null);
    }
  }
  const sourceSpinalNerves = AUTONOMIC_SOURCE_OBJECTS.filter(row => /^C[1-4] spinal nerve\.[lr](?:\.\d+)?$/.test(row.object_name.trim()));
  assert.equal(sourceSpinalNerves.length, 7);
  const plan = planRegionIsolation(nodes, 'nervous', root, node => autonomicPathForGroup(node, root))!;
  for (const row of sourceSpinalNerves) {
    const node = object(row.object_name.trim());
    assert.ok(plan.show.includes(node.instanceID), node.rawName);
    assert.deepEqual(autonomicForegroundIds([node], root), [node.instanceID], node.rawName);
  }
  assert.ok(plan.show.includes(object('C4 spinal nerve.r').instanceID));
});

test('head/neck menus expose cross-system targets, bones and source limitations', () => {
  const display = ['Temporal bone.l', 'Left common carotid artery', 'Carotid body right.r',
    'Parotid gland.l', 'Submandibular gland.r', 'Sublingual gland.l', 'Lacrimal gland.r', 'Iris.l',
    'Vidian nerve (nerve of the pterygoid canal).l', 'C1 anterior posterior.r',
    'Dorsal ramus C4.l', 'Dorsal ramus C4.r', 'Roots of brachial plexus.l', 'Roots of brachial plexus.r',
    'C1 spinal nerve.l.001', 'C1 spinal nerve.r', 'C2 spinal nerve.l', 'C2 spinal nerve.r',
    'C3 spinal nerve.l', 'C3 spinal nerve.r', 'C4 spinal nerve.l', 'C4 spinal nerve.r'];
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [AUTONOMIC_GROUPS[2]], nodes: display.map(object),
    initialExpanded: new Set([AUTONOMIC_GROUPS[2].id, ...AUTONOMIC_GROUPS[2].children!.map(child => child.id)]),
    pathForNode: node => autonomicPathForGroup(node, root), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: root, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const name of display) assert.ok(html.includes(name), name);
  for (const name of display.slice(-12)) assert.ok(html.includes(`aria-label="Hide ${name}"`), name);
});
