import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AUTONOMIC_ROOT_PATH, AUTONOMIC_GROUPS, AUTONOMIC_SOURCE_OBJECTS, normalizeAutonomicName,
  autonomicPathForGroup, autonomicContextIds, autonomicForegroundIds } from './autonomicTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { planRegionIsolation } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const scope = [...AUTONOMIC_ROOT_PATH, 'parasympathetic', 'cranial'];
const node = (rawName: string, instanceID = 1): SceneNode => ({
  rawName, name: rawName, instanceID, systemId: systemForMeshName(rawName),
  type: 'MatrixTransform', visible: false,
});
// Independent anatomical checklist, using the creator's actual source names.
const pathways = {
  ciliary: ['Ciliary ganglion', 'Oculomotor nerve (cisternal and cavernous part)',
    'Inferior branch of right oculomotor nerve', 'Nasociliary nerve',
    'Communicating branch of right nasociliary nerve to cilliary ganglion', 'Short ciliary nerves'],
  pterygopalatine: ['Pterygopalatine ganglion', 'Facial nerve (VII)',
    'Vidian nerve (nerve of the pterygoid canal)', 'Ganglionic branch of maxillary nerve',
    'Zygomatic nerve', 'Zygomaticotemporal nerve', 'Lacrimal nerve', 'Greater palatine nerve',
    'Nasopalatine nerve', 'Lateral posterior superior nasal nerve', 'Lateral posterior inferior nasal nerve', 'Pharyngeal nerve'],
  submandibular: ['Submandibular ganglion', 'Facial nerve (VII)', 'Chorda tympani',
    'Lingual nerve', 'Submadinular ganglia nerves'],
  otic: ['Otic ganglion', 'Glossopharyngeal nerve (IX)', 'Tympanic nerve (Jacobson)',
    'Tympanic plexus', 'Lesser petrosal nerve', 'Auriculotemporal nerve'],
};
const source = [...new Set(AUTONOMIC_SOURCE_OBJECTS.map(row => row.object_name.trim()))];
const wanted = new Set(Object.values(pathways).flat().map(normalizeAutonomicName));
const nerves = source.filter(name => wanted.has(normalizeAutonomicName(name))).map((name, i) => node(name, i + 1));

test('all four head-ganglion pathways include every reviewed bilateral CSV connection', () => {
  for (const [ganglion, names] of Object.entries(pathways)) for (const name of names) {
    const matched = nerves.filter(n => normalizeAutonomicName(n.rawName) === normalizeAutonomicName(name));
    assert.ok(matched.length >= 2, `${ganglion}: actual bilateral source meshes for ${name}`);
    for (const original of matched) for (const suffix of ['', '_123', '.001_123']) {
      const n = node(original.rawName + suffix, original.instanceID);
      assert.equal(n.systemId, 'nervous', n.rawName);
      assert.ok(isNodeAllowedInAtlasView(n, AUTONOMIC_NERVOUS_SYSTEM_VIEW), n.rawName);
      for (const parent of [AUTONOMIC_ROOT_PATH, [...AUTONOMIC_ROOT_PATH, 'parasympathetic'], scope])
        assert.ok(autonomicPathForGroup(n, parent), n.rawName);
      assert.deepEqual(autonomicPathForGroup(n, scope), scope, n.rawName);
      assert.deepEqual(autonomicContextIds([n], scope), [], 'Nerves and ganglia must not fade');
      assert.deepEqual(autonomicForegroundIds([n], scope), [n.instanceID]);
    }
  }
});

test('cranial isolation restores hidden connections, retains transparent landmarks and excludes unrelated motor anatomy', () => {
  const context = ['Midbrain.l', 'Pons.r', 'Medulla oblongata.l', 'Temporal bone.l', 'Sphenoid bone.r']
    .map((name, i) => node(name, 10000 + i));
  const excluded = ['Motor root of trigeminal nerve.r', 'Motor root of trigeminal nerve.l',
    'Oculomotor nerve (branch to levator palpebrae muscle).r', 'Masseter muscle.r',
    'Zygomaticofacial nerve.r', 'Pharyngeal branch of the vagus nerve.r', 'Femur.r'].map((name, i) => node(name, 20000 + i));
  const scene = [...nerves, ...context, ...excluded];
  const plan = planRegionIsolation(scene, 'nervous', scope, n => autonomicPathForGroup(n, scope))!;
  assert.deepEqual(plan.show, [...nerves, ...context].map(n => n.instanceID));
  assert.deepEqual(plan.hide, excluded.map(n => n.instanceID));
  assert.deepEqual(autonomicContextIds(scene, scope), context.map(n => n.instanceID));
  assert.deepEqual(autonomicForegroundIds(scene, scope), nerves.map(n => n.instanceID));
  assert.ok(plan.affected.every(n => !n.visible), 'Restore retains the initially hidden state');
});

test('reviewed live aliases work without substituting a different fiber pathway or inventing geometry', () => {
  for (const name of ['Greater petrosal nerve', 'Greater superficial petrosal nerve',
    'Intermediate nerve', 'Nervus intermedius', 'Nerve of the pterygoid canal',
    'Lesser palatine nerve', 'Inferior branch of left oculomotor nerve',
    'Communicating branch of left nasociliary nerve to ciliary ganglion',
    'Submandibular ganglion nerves', 'Branches from submandibular ganglion']) {
    for (const side of ['l', 'r']) {
      const n = node(`${name}.${side}.001_123`);
      assert.deepEqual(autonomicPathForGroup(n, scope), scope, n.rawName);
      assert.deepEqual(autonomicForegroundIds([n], scope), [1]);
    }
  }
  // Long ciliary nerves bypass the ciliary ganglion; deep petrosal is a
  // sympathetic contributor, not a parasympathetic ganglionic relay.
  for (const name of ['Long cilliary nerve.r', 'Deep petrosal nerve.r',
    'Superior cervical cardiac sympathetic nerve.r'])
    assert.equal(autonomicPathForGroup(node(name), scope), null, name);
  for (const n of nerves)
    assert.equal(autonomicPathForGroup(n, [...AUTONOMIC_ROOT_PATH, 'enteric']), null, n.rawName);
});

test('the existing cranial menu exposes the corrected source nerves with shared controls and no custom layout', () => {
  const group = AUTONOMIC_GROUPS.find(g => g.id === [...AUTONOMIC_ROOT_PATH, 'parasympathetic'].join('/'))!;
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [group], nodes: nerves, initialExpanded: new Set([group.id, scope.join('/')]),
    pathForNode: n => autonomicPathForGroup(n, scope), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: scope, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const name of ['Submadinular ganglia nerves', 'Auriculotemporal nerve',
    'Lacrimal nerve', 'Greater palatine nerve', 'Nasopalatine nerve'])
    assert.ok(html.toLowerCase().includes(name.toLowerCase()), name);
});
