import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AUTONOMIC_GROUPS, AUTONOMIC_ROOT_PATH, AUTONOMIC_SOURCE_OBJECTS,
  autonomicPathForGroup, isAutonomicNervousName, autonomicContextIds, autonomicForegroundIds } from './autonomicTaxonomy';
import { ATLAS_VIEWS, AUTONOMIC_NERVOUS_SYSTEM_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { systemForMeshName } from './anatomicalSystems';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import { AutonomicNerveMenu } from '../components/AutonomicNerveMenu';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import { cranialNervePathForGroup } from './cranialNerveTaxonomy';
import type { SceneNode } from '../types/sketchfab';

const names = [...new Set(AUTONOMIC_SOURCE_OBJECTS.map(row => row.object_name.trim()))];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true,
  systemId: systemForMeshName(rawName),
}));
const object = (name: string) => {
  const node = nodes.find(node => node.rawName === name);
  assert.ok(node, `Source object missing: ${name}`);
  return node;
};
const path = (...parts: string[]) => [...AUTONOMIC_ROOT_PATH, ...parts];
const matches = (node: SceneNode, scope: readonly string[]) =>
  autonomicPathForGroup(node, scope)?.join('/') === scope.join('/');

test('Explore Atlas registers the supplied model with five exact autonomic categories and all requested subgroups', () => {
  assert.equal(ATLAS_VIEWS.filter(view => view.id === 'autonomic-nervous-system').length, 1);
  assert.equal(AUTONOMIC_NERVOUS_SYSTEM_VIEW.modelUid, '2b5e229dd6994f67869e73d6e2466f29');
  assert.equal(AUTONOMIC_NERVOUS_SYSTEM_VIEW.href, '/atlas/autonomic-nervous-system');
  assert.equal(AUTONOMIC_NERVOUS_SYSTEM_VIEW.cranialNerves, undefined);
  assert.equal(AUTONOMIC_NERVOUS_SYSTEM_VIEW.autonomicNerves, true);
  assert.deepEqual(AUTONOMIC_GROUPS.map(group => group.label), [
    'Sympathetic Nervous System', 'Parasympathetic Nervous System', 'Head and Neck Autonomic Pathways',
    'Thoracic and Abdominal Autonomic Plexuses', 'Enteric Nervous System',
  ]);
  assert.deepEqual(AUTONOMIC_GROUPS.map(group => group.children?.length ?? 0), [6, 4, 5, 5, 1]);
});

test('bilateral sympathetic chain follows cervical, thoracic, lumbar and sacral source collections', () => {
  for (const side of ['l', 'r']) {
    for (const [name, subgroup] of [
      [`Superior cervical sympathetic ganglion.${side}`, 'cervical'],
      [`Sympathetic ganglia Thoracic region.${side}`, 'thoracic'],
      [`Sympathetic gangion lumbar region.${side}`, 'abdominal'],
      [`Sympathetic ganglia sacral region.${side}`, 'pelvic'],
      [`Lumbar splanchnic nerves.${side}`, 'abdominal'],
      [`Greater splanchnic nerves.${side}`, 'thoracic'],
      [`Lesser splanchinc nerves.${side}`, 'thoracic'],
      [`Least splanchnic nerve.${side}`, side === 'l' ? 'abdominal' : 'thoracic'],
    ]) assert.ok(matches(object(name), path('sympathetic', subgroup)), name);
  }
  assert.ok(matches(object('Ganglion Impar'), path('sympathetic', 'pelvic')));
  assert.ok(matches(object('Sympathetic trunk.r'), path('sympathetic')));
  assert.equal(autonomicPathForGroup(object('Sympathetic trunk.r'), path('sympathetic', 'cervical')), null);
});

test('both least splanchnic nerves enter abdominal sympathetic while retaining the right thoracic and both plexus memberships', () => {
  const left = object('Least splanchnic nerve.l');
  const right = object('Least splanchnic nerve.r');
  const abdominal = path('sympathetic', 'abdominal');
  const thoracic = path('sympathetic', 'thoracic');
  const plan = planRegionIsolation(nodes, 'nervous', abdominal,
    node => autonomicPathForGroup(node, abdominal))!;
  assert.ok(plan.show.includes(left.instanceID));
  assert.ok(plan.show.includes(right.instanceID));
  for (const stem of ['Least splanchnic nerve', 'Least splanchnic nerves'])
    for (const suffix of ['', '_123', '.001', '.001_123']) {
      const rawName = `${stem}.l${suffix}`;
      const node = { ...left, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      assert.deepEqual(autonomicPathForGroup(node, AUTONOMIC_ROOT_PATH), abdominal, rawName);
      assert.deepEqual(autonomicPathForGroup(node, path('sympathetic')), abdominal, rawName);
      assert.ok(isNodeInRegion(node, abdominal, () => null), rawName);
      assert.equal(autonomicPathForGroup(node, thoracic), null, rawName);
      assert.deepEqual(autonomicForegroundIds([node], abdominal), [node.instanceID], rawName);
      assert.deepEqual(autonomicContextIds([node], abdominal), [], rawName);
      assert.ok(autonomicPathForGroup(node, path('plexuses', 'abdominal')), rawName);
    }
  assert.deepEqual(autonomicPathForGroup(right, thoracic), thoracic);
  assert.deepEqual(autonomicPathForGroup(right, abdominal), abdominal);
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [AUTONOMIC_GROUPS[0]], nodes,
    initialExpanded: new Set([AUTONOMIC_GROUPS[0].id, abdominal.join('/')]),
    pathForNode: node => autonomicPathForGroup(node, path('sympathetic')), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: abdominal, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  assert.ok(html.includes(left.name));
});

test('cranial parasympathetic pathways and ganglia overlap without relabelling deep petrosal as parasympathetic', () => {
  for (const side of ['l', 'r']) {
    for (const stem of ['Ciliary ganglion', 'Submandibular ganglion', 'Otic ganglion', 'Pterygopalatine ganglion']) {
      const node = object(`${stem}.${side}`);
      assert.ok(matches(node, path('parasympathetic', 'cranial')));
      assert.ok(matches(node, path('head-neck', 'ganglia')));
    }
    const vidian = object(`Vidian nerve (nerve of the pterygoid canal).${side}`);
    assert.ok(matches(vidian, path('parasympathetic', 'cranial')));
    assert.ok(matches(vidian, path('head-neck', 'pterygopalatine')));
    const deep = object(`Deep petrosal nerve.${side}`);
    assert.ok(matches(deep, path('head-neck', 'pterygopalatine')));
    assert.ok(matches(deep, path('sympathetic', 'cervical')));
    assert.equal(autonomicPathForGroup(deep, path('parasympathetic')), null);
    assert.ok(matches(object(`Vagus nerve (X).${side}`), path('parasympathetic', 'vagus')));
    assert.ok(matches(object(`Posterior nucleus of vagus nerve.${side}`), path('parasympathetic', 'vagus')));
    assert.ok(matches(object(`Nucleus of solitary tract.${side}`), path('parasympathetic', 'vagus')));
    assert.ok(matches(object(`Oculomotor nerve (cisternal and cavernous part).${side}`), path('parasympathetic', 'cranial')));
    assert.ok(matches(object(`Accessory nucleus of oculomotor nerve.${side}`), path('parasympathetic', 'cranial')));
    assert.ok(matches(object(`Tympanic nerve (Jacobson).${side}`), path('parasympathetic', 'cranial')));
    assert.ok(matches(object(`Chorda tympani.${side}`), path('parasympathetic', 'cranial')));
  }
  assert.ok(matches(object('Carotid artery Sympathetic plexus.r'), path('head-neck', 'carotid')));
  assert.ok(matches(object('Internal carotid artery sympathetic plexus.l'), path('head-neck', 'ocular')));
  assert.ok(matches(object('Ciliary ganglion.l'), path('head-neck', 'ocular')));
});

test('both trigeminal motor roots are excluded from every parasympathetic scope, including export and display-name aliases', () => {
  const scopes = [path('parasympathetic'),
    ...AUTONOMIC_GROUPS[1].children!.map(group => group.id.split('/'))];
  for (const side of ['l', 'r']) {
    const source = object(`Motor root of trigeminal nerve.${side}`);
    for (const rawName of [source.rawName, `${source.rawName}_123`, `${source.rawName}.001_123`,
      `Motor root of trigeminal nerve (${side === 'l' ? 'Left' : 'Right'})`,
      `Trigeminal nerve motor root.${side}`]) {
      const node = { ...source, rawName, instanceID: -1 };
      for (const scope of scopes) {
        assert.equal(autonomicPathForGroup(node, scope), null, rawName);
        assert.equal(isNodeInRegion(node, scope, () => null), false, rawName);
        assert.deepEqual(autonomicContextIds([node], scope), [], rawName);
        assert.deepEqual(autonomicForegroundIds([node], scope), [], rawName);
        const plan = planRegionIsolation([...nodes, node], 'nervous', scope,
          n => autonomicPathForGroup(n, scope))!;
        if (scope[3] === 'sacral') {
          // No sacral parasympathetic meshes exist in the supplied model;
          // this unavailable category deliberately has no isolation plan.
          assert.equal(plan, null);
          continue;
        }
        assert.ok(plan.hide.includes(-1), rawName);
        assert.ok(!plan.show.includes(-1), rawName);
      }
    }
    assert.equal(systemForMeshName(source.rawName), 'nervous');
    assert.ok(isNodeAllowedInAtlasView(source, AUTONOMIC_NERVOUS_SYSTEM_VIEW));
    assert.ok(cranialNervePathForGroup(source, ['advanced-neuroanatomy', 'cranial-nerves', 'v']));
    for (const name of ['Trigeminal nerve root', 'Trigeminal nerve (Gasserian) ganglion',
      'Oculomotor nerve (cisternal and cavernous part)']) {
      assert.ok(autonomicPathForGroup(object(`${name}.${side}`), path('parasympathetic', 'cranial')));
    }
  }
});

test('parasympathetic menu omits both trigeminal motor roots but retains the main trigeminal roots', () => {
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [AUTONOMIC_GROUPS[1]], nodes,
    initialExpanded: new Set([AUTONOMIC_GROUPS[1].id, ...AUTONOMIC_GROUPS[1].children!.map(group => group.id)]),
    pathForNode: node => autonomicPathForGroup(node, path('parasympathetic')),
    pathForGroup: autonomicPathForGroup, onSetVisibility: () => {}, onIsolate: () => {},
    isolatedPath: path('parasympathetic'), onRestore: () => {}, onSelect: () => {},
    toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const side of ['l', 'r']) {
    assert.ok(!html.includes(`Motor root of trigeminal nerve.${side}`));
    assert.ok(html.includes(`aria-label="Hide Trigeminal nerve root.${side}"`));
  }
});

test('parasympathetic submandibular ganglion nerves and lingual communicating branches are opaque cranial members', () => {
  const scope = path('parasympathetic');
  const cranial = path('parasympathetic', 'cranial');
  const stems = ['Submandibular ganglion nerve', 'Submandibular ganglion nerves',
    'Submandibular ganglia nerve', 'Submandibular ganglia nerves',
    'Nerves of submandibular ganglion', 'Nerves to submandibular ganglion', 'Nerves to submandibular ganglia',
    'Ganglionic branch of lingual nerve', 'Ganglionic branches of lingual nerve',
    'Communicating branch of lingual nerve to submandibular ganglion',
    'Communicating branches of lingual nerve to submandibular ganglion'];
  const nerveNodes: SceneNode[] = [];
  for (const side of ['l', 'r']) for (const stem of stems) for (const suffix of ['', '_123', '.001_123']) {
    const rawName = `${stem}.${side}${suffix}`;
    const node = { ...nodes[0], instanceID: -nerveNodes.length - 1, rawName, name: rawName, systemId: systemForMeshName(rawName) };
    nerveNodes.push(node);
    assert.equal(node.systemId, 'nervous', rawName);
    assert.ok(matches(node, cranial), rawName);
    assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
    assert.ok(isNodeInRegion(node, scope, () => null), rawName);
    assert.deepEqual(autonomicContextIds([node], scope), [], rawName);
    assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID], rawName);
    for (const category of ['sympathetic', 'plexuses', 'enteric']) {
      assert.equal(autonomicPathForGroup(node, path(category)), null, rawName);
    }
  }
  const scene = [...nodes, ...nerveNodes];
  for (const active of [scope, cranial]) {
    const plan = planRegionIsolation(scene, 'nervous', active, node => autonomicPathForGroup(node, active))!;
    for (const node of nerveNodes) assert.ok(plan.show.includes(node.instanceID), node.rawName);
    for (const side of ['l', 'r']) for (const stem of ['Submandibular ganglion', 'Chorda tympani', 'Lingual nerve',
      'Facial nerve (VII)', 'Superior salivatory nucleus']) {
      assert.ok(plan.show.includes(object(`${stem}.${side}`).instanceID), `${stem}.${side}`);
    }
  }
  const display = nerveNodes.filter(node => /^Submandibular ganglia nerves\.[lr]$/.test(node.rawName));
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [AUTONOMIC_GROUPS[1]], nodes: display,
    initialExpanded: new Set([scope.join('/'), cranial.join('/')]),
    pathForNode: node => autonomicPathForGroup(node, scope), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: scope, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const node of display) assert.ok(html.includes(node.name), node.name);
  for (const rawName of ['Submandibular gland.l', 'Submandibular duct.r', 'Sublingual gland.l']) {
    assert.equal(autonomicPathForGroup({ ...nodes[0], rawName, systemId: systemForMeshName(rawName) }, scope), null, rawName);
  }
});

test('parasympathetic view adds translucent brainstem and skull landmarks with opaque trigeminal and tympanic pathways', () => {
  const scope = path('parasympathetic');
  const scene = [...nodes, ...['Temporal bone.l', 'Temporal bone.r', 'Sphenoid bone', 'Occipital bone'].map((rawName, i) => ({
    ...nodes[0], instanceID: -i - 1, rawName, name: rawName, systemId: 'skeletal' as const,
  }))];
  const plan = planRegionIsolation(scene, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
  const context = autonomicContextIds(scene, scope);
  const foreground = autonomicForegroundIds(scene, scope);
  const contextualNames = ['Temporal bone.l', 'Temporal bone.r', 'Sphenoid bone',
    'Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r', 'Medulla oblongata.l', 'Medulla oblongata.r'];
  for (const name of contextualNames) {
    const node = scene.find(node => node.rawName === name)!;
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(context.includes(node.instanceID), name);
    assert.ok(!foreground.includes(node.instanceID), name);
    for (const suffix of ['', '_123', '.001_123']) {
      const alias = { ...node, rawName: name + suffix, systemId: systemForMeshName(name + suffix) };
      assert.ok(isNodeAllowedInAtlasView(alias, AUTONOMIC_NERVOUS_SYSTEM_VIEW), alias.rawName);
      assert.ok(isNodeInRegion(alias, scope, () => null), alias.rawName);
      assert.deepEqual(autonomicContextIds([alias], scope), [node.instanceID], alias.rawName);
    }
    for (const subgroup of ['cranial', 'vagus']) {
      const region = planRegionIsolation(scene, 'nervous', path('parasympathetic', subgroup),
        node => autonomicPathForGroup(node, path('parasympathetic', subgroup)))!;
      assert.ok(region.show.includes(node.instanceID), `${subgroup}: ${name}`);
    }
    assert.deepEqual(autonomicPathForGroup(node, path('sympathetic')),
      node.systemId === 'nervous' ? path('sympathetic', 'brainstem') : null, name);
    assert.equal(autonomicPathForGroup(node, path('parasympathetic', 'sacral')), null, name);
  }
  for (const side of ['l', 'r']) {
    for (const stem of ['Trigeminal nerve root',
      'Trigeminal nerve (Gasserian) ganglion', 'Ophthalmic nerve', 'Trigeminal nerve maxillary n (V)', 'Maxillary nerve',
      'Anterior division of mandibular nerve', 'Posterior division of mandibular nerve', 'Lingual nerve',
      'Ganglionic branch of maxillary nerve', 'Zygomatic nerve', 'Pterygopalatine ganglion',
      'Tympanic membrane', 'Tympanic plexus', 'Tympanic nerve (Jacobson)', 'Lesser petrosal nerve', 'Otic ganglion']) {
      const node = object(`${stem}.${side}`);
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
      assert.ok(foreground.includes(node.instanceID), node.rawName);
      assert.ok(!context.includes(node.instanceID), node.rawName);
      assert.ok(matches(node, path('parasympathetic', 'cranial')), node.rawName);
    }
    for (const stem of ['Trigeminal nerve', 'Trigeminal nerve (cisternal part)', 'Gasserian ganglion',
      'Ophthalmic nerve (V1)', 'Maxillary nerve (V2)', 'Mandibular nerve', 'Mandibular nerve (V3)']) {
      const rawName = `${stem}.${side}.001_123`;
      const alias = { ...nodes[0], rawName, systemId: systemForMeshName(rawName) };
      assert.ok(matches(alias, path('parasympathetic', 'cranial')), rawName);
      assert.deepEqual(autonomicForegroundIds([alias], scope), [alias.instanceID], rawName);
    }
  }
  for (const name of ['Spinal dura', 'Dura mater brain', 'Vertebra C3', 'Occipital bone', 'Lingual gyrus.l',
    'Spinal trigeminal tract.l', 'Principal (pontine) neucleus of trigeminal nerve.l']) {
    const node = scene.find(node => node.rawName === name)
      ?? { ...nodes[0], rawName: name, systemId: systemForMeshName(name) };
    assert.equal(autonomicPathForGroup(node, scope), null, name);
  }
});

test('mixed visceral plexuses are not treated as sacral parasympathetic or intrinsic enteric anatomy', () => {
  const hypogastric = object('Inferior hypogastric nerves and plexus');
  assert.ok(matches(hypogastric, path('plexuses', 'pelvic')));
  assert.ok(matches(hypogastric, path('sympathetic', 'pelvic')));
  assert.equal(autonomicPathForGroup(hypogastric, path('parasympathetic', 'sacral')), null);
  assert.equal(nodes.filter(node => autonomicPathForGroup(node, path('parasympathetic', 'sacral'))).length, 0);
  for (const name of ['Cardiac plexus', 'Cardiac plexus nerves', 'Ascending aorta nerve Plexus']) {
    assert.ok(matches(object(name), path('plexuses', 'cardiac')));
  }
  for (const name of ['Oesophagus Nerve Plexus', 'Oesophagus_Enteric_Plexus_Fine', 'Right pulmonary artery nerve Plexus']) {
    assert.ok(matches(object(name), path('plexuses', 'pulmonary-esophageal')));
  }
  for (const name of ['Coeliac ganglia', 'Superior mesenteric ganglia',
    'Abdominal aorta_Enteric_Plexus_Fine', 'Right renal arteryNerve Plexus']) {
    assert.ok(matches(object(name), path('plexuses', 'abdominal')));
    assert.equal(autonomicPathForGroup(object(name), path('enteric')), null, name);
  }
  for (const name of ['Duodenum_Enteric_Plexus_Fine', 'Duodenum_Enteric_Plexus_Fine.001',
    'Stomach_Enteric_Plexus_Fine', 'Transverse colon.001_Enteric_Plexus_Fine',
    'Jejunum_Enteric_Plexus_Fine', 'Sigmoid colon.Nerve Plexus']) {
    assert.ok(matches(object(name), path('enteric')), name);
  }
});

test('urinary bladder and prostate plexuses overlap the enteric and pelvic views as opaque nerves with export aliases', () => {
  const scope = path('enteric');
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
  for (const name of ['Urinary bladder Nerve Plexus', 'Prostate Nerve Plexus']) {
    const source = object(name);
    assert.ok(plan.show.includes(source.instanceID), name);
    for (const suffix of ['', '_123', '.001_123']) {
      const rawName = name + suffix;
      const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      assert.ok(isNodeInRegion(node, scope, () => null), rawName);
      assert.deepEqual(autonomicPathForGroup(node, scope), scope, rawName);
      assert.ok(autonomicPathForGroup(node, path('plexuses', 'pelvic')), rawName);
      assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID], rawName);
      assert.deepEqual(autonomicContextIds([node], scope), [], rawName);
      assert.equal(autonomicPathForGroup(node, path('enteric', 'organs')), null, rawName);
      assert.equal(autonomicPathForGroup(node, path('parasympathetic', 'sacral')), null, rawName);
    }
  }
  for (const name of ['Right renal arteryNerve Plexus', 'Inferior hypogastric nerves and plexus']) {
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
});

test('unrelated nervous structures and misfiled laryngeal connective tissues do not enter autonomic categories', () => {
  for (const name of ['Thyrohyoid membrane.g', 'Synovial joints of larynx.g',
    'Choroid plexus.l', 'Tensor tympani nerve.r']) {
    const node = nodes.find(node => node.rawName === name)
      ?? { ...object('Cardiac plexus'), rawName: name };
    assert.equal(autonomicPathForGroup(node, AUTONOMIC_ROOT_PATH), null, name);
    assert.equal(isAutonomicNervousName(name), false, name);
  }
  assert.equal(autonomicPathForGroup({ ...object('Cardiac plexus'), systemId: 'vascular' }, path('plexuses', 'cardiac')), null);
});

test('sympathetic head reference pathways, eyes and lacrimal glands are bilateral opaque cervical members', () => {
  const scope = path('sympathetic');
  const cervical = path('sympathetic', 'cervical');
  const stems = ['Vidian nerve (nerve of the pterygoid canal)', 'Deep petrosal nerve', 'Pterygopalatine ganglion',
    'Trigeminal nerve root', 'Trigeminal nerve (Gasserian) ganglion', 'Ophthalmic nerve', 'Nasociliary nerve',
    'Lacrimal nerve', 'Maxillary nerve', 'Trigeminal nerve maxillary n (V)', 'Ganglionic branch of maxillary nerve',
    'Zygomatic nerve', 'Ciliary ganglion', 'Short ciliary nerves',
    'Communicating branch of right nasociliary nerve to cilliary ganglion',
    'Lacrimal gland', 'Anterior segment of eyeball', 'Posterior segment of eyeball', 'Anterior chamber of eyeball',
    'Cornea', 'Sclera', 'Iris', 'Retina', 'Vitreous body', 'Lens'];
  for (const active of [scope, cervical]) {
    const plan = planRegionIsolation(nodes, 'nervous', active, node => autonomicPathForGroup(node, active))!;
    for (const side of ['l', 'r']) for (const stem of stems) {
      const source = object(`${stem}.${side}`);
      assert.ok(plan.show.includes(source.instanceID), source.rawName);
      assert.ok(matches(source, cervical), source.rawName);
      for (const suffix of ['', '_123', '.001_123']) {
        const rawName = source.rawName + suffix;
        const alias = { ...source, rawName, systemId: systemForMeshName(rawName) };
        assert.equal(alias.systemId, 'nervous', rawName);
        assert.ok(isNodeAllowedInAtlasView(alias, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
        assert.ok(isNodeInRegion(alias, active, () => null), rawName);
        assert.deepEqual(autonomicContextIds([alias], active), [], rawName);
        assert.deepEqual(autonomicForegroundIds([alias], active), [source.instanceID], rawName);
      }
    }
    for (const name of ['Superior cervical sympathetic ganglion.l', 'Superior cervical sympathetic ganglion.r',
      'Carotid artery Sympathetic plexus.r', 'Internal carotid artery sympathetic plexus.l']) {
      assert.ok(plan.show.includes(object(name).instanceID), name);
    }
    for (const name of ['Spinal dura', 'Dura mater brain', 'Lacrimal sac.l', 'Nasolacrimal duct.r',
      'Intermediolateral nucleus']) {
      if (active === scope && name === 'Intermediolateral nucleus') continue;
      assert.ok(plan.hide.includes(object(name).instanceID), name);
    }
  }
  for (const name of ['Long ciliary nerve.l', 'Sympathetic root to the ciliary ganglion.r',
    'Iris dilator muscle.l', 'Superior tarsal muscle.r', 'Internal axis of eyeball.r']) {
    assert.equal(autonomicPathForGroup({ ...nodes[0], rawName: name }, scope), null, name);
  }
  for (const stem of ['Pterygopalatine ganglion', 'Vidian nerve (nerve of the pterygoid canal)',
    'Ganglionic branch of maxillary nerve']) {
    assert.ok(matches(object(`${stem}.l`), path('parasympathetic', 'cranial')), stem);
    assert.ok(matches(object(`${stem}.l`), path('head-neck', 'pterygopalatine')), stem);
  }
  assert.ok(matches(object('Ciliary ganglion.l'), path('head-neck', 'ocular')));
  const html = renderToStaticMarkup(createElement(AutonomicNerveMenu, {
    variant: 'sidebar', nodes, activeNerveId: scope.join('/'), onActivateNerve: () => {},
    isolatedRegionPath: scope, onIsolateRegion: () => {}, onRestoreRegion: () => {},
    onSetRegionVisibility: () => {}, selectedNodeId: null,
  }));
  for (const text of ['without synapsing there', 'no separately named long ciliary nerve']) assert.ok(html.includes(text), text);
  const displayedNames = ['Vidian nerve (nerve of the pterygoid canal).l', 'Pterygopalatine ganglion.r',
    'Lacrimal gland.l', 'Lacrimal nerve.r', 'Nasociliary nerve.l'];
  const tree = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [AUTONOMIC_GROUPS[0]], nodes: displayedNames.map(object),
    initialExpanded: new Set([scope.join('/'), cervical.join('/')]),
    pathForNode: node => autonomicPathForGroup(node, scope), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: scope, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const name of displayedNames) assert.ok(tree.includes(name), name);
});

test('sympathetic view excludes oculomotor branches, trigeminal motor nuclei and trigeminal motor roots without changing other views', () => {
  const excludedSource = nodes.filter(node => /oculomot(?:or|r)|motor root of trigeminal nerve/i.test(node.rawName));
  const extra: SceneNode[] = ['Motor nucleus of trigeminal nerve.l', 'Motor nucleus of trigeminal nerve.r',
    'Trigeminal motor nucleus.l', 'Trigeminal motor neucleus.r', 'Nucleus motorius nervi trigemini.l']
    .map((rawName, i) => ({ ...nodes[0], instanceID: -i - 1, rawName, name: rawName, systemId: 'nervous' }));
  const scene = [...nodes, ...extra];
  for (const scope of [path('sympathetic'), path('sympathetic', 'cervical')]) {
    const plan = planRegionIsolation(scene, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    for (const node of [...excludedSource, ...extra]) {
      assert.ok(plan.hide.includes(node.instanceID), node.rawName);
      for (const suffix of ['', '_123', '.001_123']) {
        const alias = { ...node, rawName: node.rawName + suffix };
        assert.equal(autonomicPathForGroup(alias, scope), null, alias.rawName);
        assert.equal(isNodeInRegion(alias, scope, () => null), false, alias.rawName);
        assert.deepEqual(autonomicForegroundIds([alias], scope), []);
        assert.deepEqual(autonomicContextIds([alias], scope), []);
      }
    }
    for (const side of ['l', 'r']) {
      assert.ok(plan.hide.includes(object(`Motor root of trigeminal nerve.${side}`).instanceID));
      assert.ok(plan.show.includes(object(`Trigeminal nerve root.${side}`).instanceID));
    }
  }
  for (const side of ['l', 'r']) {
    const motorRoot = object(`Motor root of trigeminal nerve.${side}`);
    assert.equal(autonomicPathForGroup(motorRoot, path('parasympathetic', 'cranial')), null);
    assert.equal(autonomicPathForGroup(motorRoot, path('head-neck', 'ganglia')), null);
    const main = object(`Oculomotor nerve (cisternal and cavernous part).${side}`);
    assert.ok(matches(main, path('parasympathetic', 'cranial')));
    assert.ok(matches(main, path('head-neck', 'ocular')));
    assert.ok(cranialNervePathForGroup(main, ['advanced-neuroanatomy', 'cranial-nerves', 'iii']));
    assert.ok(matches(object(`Superior branch of the oculomotor nerve.${side}`), path('head-neck', 'ocular')));
  }
});

test('sympathetic view includes opaque spinal cord white matter without changing other categories', () => {
  const scope = path('sympathetic');
  const source = object('White matter of spinal cord');
  assert.ok(matches(source, scope));
  assert.ok(isNodeInRegion(source, scope, () => null));
  assert.ok(isNodeAllowedInAtlasView(source, AUTONOMIC_NERVOUS_SYSTEM_VIEW));
  assert.deepEqual(autonomicContextIds([source], scope), []);
  assert.deepEqual(autonomicForegroundIds([source], scope), [source.instanceID]);
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
  assert.ok(plan.show.includes(source.instanceID));
  for (const suffix of ['_123', '.001_123']) {
    const rawName = source.rawName + suffix;
    const alias = { ...source, rawName, systemId: systemForMeshName(rawName) };
    assert.equal(alias.systemId, 'nervous');
    assert.ok(matches(alias, scope), rawName);
    assert.deepEqual(autonomicForegroundIds([alias], scope), [source.instanceID]);
  }
  for (const category of ['parasympathetic', 'head-neck', 'enteric']) {
    assert.equal(autonomicPathForGroup(source, path(category)), null, category);
  }
  for (const rawName of ['Anterior horn', 'Posterior horn', 'Lateral horn', 'Central canal', 'Spinal dura']) {
    assert.equal(autonomicPathForGroup({ ...source, rawName }, scope), null, rawName);
  }
});

test('sympathetic view includes bilateral C1-C4 dorsal roots including C1/C2 anterior-posterior export names', () => {
  const scope = path('sympathetic');
  const cervical = path('sympathetic', 'cervical');
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
  for (const level of [1, 2, 3, 4]) {
    for (const side of ['l', 'r']) {
      const source = object(level <= 2 ? `C${level} anterior posterior.${side}` : `C${level}  posterior root.${side}`);
      assert.ok(plan.show.includes(source.instanceID), source.rawName);
      for (const stem of [`C${level} dorsal root`, `C${level} posterior root`,
        ...(level <= 2 ? [`C${level} anterior posterior`] : [])]) {
        for (const suffix of ['', '_123', '.001_123']) {
          const rawName = `${stem}.${side}${suffix}`;
          const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
          assert.equal(node.systemId, 'nervous', rawName);
          assert.ok(matches(node, cervical), rawName);
          assert.ok(isNodeInRegion(node, scope, () => null), rawName);
          assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID], rawName);
          assert.deepEqual(autonomicContextIds([node], scope), [], rawName);
          const isolated = planRegionIsolation([node], 'nervous', cervical, n => autonomicPathForGroup(n, cervical))!;
          assert.deepEqual(isolated.show, [node.instanceID], rawName);
          assert.ok(autonomicPathForGroup(node, path('plexuses')), rawName);
          for (const category of ['parasympathetic', 'enteric']) {
            assert.equal(autonomicPathForGroup(node, path(category)), null, rawName);
          }
        }
      }
    }
  }
});

test('sympathetic spinal cord includes both horns, lateral intermediate substance and both intermediate nuclei opaque', () => {
  const scope = path('sympathetic');
  const names = ['Anterior horn of spinal cord', 'Posterior horn of spinal cord',
    'Lateral intermediate substance', 'Intermediolateral nucleus', 'Intermediomedial nucleus'];
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
  for (const name of names) {
    const source = object(name);
    assert.ok(plan.show.includes(source.instanceID), name);
    for (const suffix of ['', '_123', '.001_123']) {
      const rawName = name + suffix;
      const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(matches(node, scope), rawName);
      assert.ok(isNodeInRegion(node, scope, () => null), rawName);
      assert.deepEqual(autonomicContextIds([node], scope), [], rawName);
      assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID], rawName);
      for (const category of ['parasympathetic', 'head-neck', 'enteric']) {
        assert.equal(autonomicPathForGroup(node, path(category)), null, rawName);
      }
    }
  }
  assert.ok(plan.show.includes(object('White matter of spinal cord').instanceID));
  assert.ok(plan.hide.includes(object('Spinal dura').instanceID));
});

test('sympathetic whole and cervical views include opaque C1–C4 spinal nerves without substituting dorsal roots', () => {
  const spinalNerves: SceneNode[] = [1, 2, 3, 4].flatMap(level => ['l', 'r'].map((side, index) => ({
    ...nodes[0], rawName: `C${level} spinal nerve.${side}`, name: `C${level} spinal nerve.${side}`,
    instanceID: 100000 + level * 2 + index, systemId: systemForMeshName(`C${level} spinal nerve.${side}`),
  })));
  const scene = [...nodes, ...spinalNerves];
  for (const scope of [path('sympathetic'), path('sympathetic', 'cervical')]) {
    const plan = planRegionIsolation(scene, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    for (const source of spinalNerves) for (const suffix of ['', '_123', '.001', '.001_123']) {
      const rawName = source.rawName + suffix;
      const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      assert.deepEqual(autonomicPathForGroup(node, scope), path('sympathetic', 'cervical'), rawName);
      assert.ok(isNodeInRegion(node, scope, () => null), rawName);
      assert.ok(plan.show.includes(node.instanceID), rawName);
      assert.deepEqual(autonomicForegroundIds([node], scope), [node.instanceID], rawName);
      assert.deepEqual(autonomicContextIds([node], scope), [], rawName);
      assert.ok(autonomicPathForGroup(node, path('head-neck')), rawName);
      for (const category of ['parasympathetic', 'plexuses', 'enteric'])
        assert.equal(autonomicPathForGroup(node, path(category)), null, rawName);
    }
  }
  for (const source of nodes.filter(node => /^C[1-4] spinal nerve\./.test(node.rawName))) {
    assert.ok(autonomicPathForGroup(source, path('sympathetic', 'cervical')), source.rawName);
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [AUTONOMIC_GROUPS[0]], nodes: scene,
    initialExpanded: new Set([AUTONOMIC_GROUPS[0].id, path('sympathetic', 'cervical').join('/')]),
    pathForNode: node => autonomicPathForGroup(node, path('sympathetic')), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: path('sympathetic'), onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const node of spinalNerves) assert.ok(html.includes(node.name), node.name);
});

test('sympathetic view includes bilateral gross brainstem surfaces as semitransparent context with shared menu controls', () => {
  const parent = path('sympathetic');
  const subgroup = path('sympathetic', 'brainstem');
  const brainstem = ['Midbrain', 'Pons', 'Medulla oblongata'].flatMap(stem =>
    ['l', 'r'].map(side => object(`${stem}.${side}`)));
  for (const scope of [parent, subgroup]) {
    const plan = planRegionIsolation(nodes, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    for (const source of brainstem) for (const suffix of ['', '_123', '.001_123']) {
      const rawName = source.rawName + suffix;
      const node = { ...source, rawName, systemId: systemForMeshName(rawName) };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(isNodeAllowedInAtlasView(node, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      assert.deepEqual(autonomicPathForGroup(node, scope), subgroup, rawName);
      assert.ok(isNodeInRegion(node, scope, () => null), rawName);
      assert.ok(plan.show.includes(source.instanceID), rawName);
      assert.deepEqual(autonomicContextIds([node], scope), [node.instanceID], rawName);
      assert.deepEqual(autonomicForegroundIds([node], scope), [], rawName);
      assert.ok(autonomicPathForGroup(node, path('parasympathetic')), 'preserve existing parasympathetic context');
      assert.ok(autonomicPathForGroup(node, path('head-neck')), 'preserve existing head/neck context');
      for (const category of ['plexuses', 'enteric'])
        assert.equal(autonomicPathForGroup(node, path(category)), null, rawName);
    }
  }
  for (const rawName of ['Anterior horn of spinal cord', 'Intermediolateral nucleus', 'C1 spinal nerve.r']) {
    const node = object(rawName);
    assert.deepEqual(autonomicForegroundIds([node], parent), [node.instanceID], rawName);
    assert.deepEqual(autonomicContextIds([node], parent), [], rawName);
    assert.equal(autonomicPathForGroup(node, subgroup), null, rawName);
  }
  const group = AUTONOMIC_GROUPS[0];
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [group], nodes, initialExpanded: new Set([group.id, subgroup.join('/')]),
    pathForNode: node => autonomicPathForGroup(node, parent), pathForGroup: autonomicPathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: parent, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  assert.ok(html.includes('Brainstem gross anatomy (semitransparent)'));
  for (const node of brainstem) assert.ok(html.includes(node.name), node.name);
});

test('sympathetic view retains opaque spinal roots, plexus roots and intercostal nerves with translucent vertebrae, not dura', () => {
  const scope = path('sympathetic');
  const bones = ['Atlas (C1)', 'Axis (C2)', ...Array.from({ length: 5 }, (_, i) => `Vertebra C${i + 3}`),
    ...Array.from({ length: 12 }, (_, i) => `Vertebra T${i + 1}`),
    ...Array.from({ length: 5 }, (_, i) => `Vertebra L${i + 1}`), 'Sacrum', 'Coccyx'];
  const scene = [...nodes, ...bones.map((rawName, i) => ({
    ...nodes[0], instanceID: -i - 1, rawName, name: rawName, systemId: 'skeletal' as const,
  }))];
  const plan = planRegionIsolation(scene, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
  const context = autonomicContextIds(scene, scope);
  const foreground = autonomicForegroundIds(scene, scope);
  for (const rawName of bones) {
    const bone = scene.find(node => node.rawName === rawName)!;
    assert.ok(context.includes(bone.instanceID), rawName);
    assert.ok(plan.show.includes(bone.instanceID), rawName);
    assert.ok(isNodeInRegion(bone, scope, () => null), rawName);
    assert.ok(isNodeAllowedInAtlasView(bone, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
    assert.ok(!foreground.includes(bone.instanceID), rawName);
    assert.equal(autonomicPathForGroup(bone, path('parasympathetic')), null);
    for (const suffix of ['_123', '.001_123']) {
      assert.deepEqual(autonomicPathForGroup({ ...bone, rawName: rawName + suffix }, scope), autonomicPathForGroup(bone, scope));
    }
  }
  const roots = nodes.filter(node => /^(?:C|Th|L|S|Co)\d+\s*(?:(?:anterior|posterior|dorsal|ventral)\s+root|Dorsal root ganglion|root)\b/i.test(node.rawName)
    || /^Intercostal nerve|Roots of brachial plexus|Lumbar plexus|root.*ansa cervical/i.test(node.rawName));
  assert.ok(roots.length > 180);
  for (const node of roots) {
    assert.ok(plan.show.includes(node.instanceID), node.rawName);
    assert.ok(foreground.includes(node.instanceID), node.rawName);
    assert.ok(!context.includes(node.instanceID), node.rawName);
  }
  for (const name of ['Spinal dura', 'Dura mater brain']) {
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
  assert.equal(isNodeAllowedInAtlasView({ ...scene[0], rawName: 'Femur.r', systemId: 'skeletal' }, AUTONOMIC_NERVOUS_SYSTEM_VIEW), false);
});

test('every mapped source name and Sketchfab alias retains nervous ownership and admission, respecting view exclusions', () => {
  for (const node of nodes.filter(node => isAutonomicNervousName(node.rawName))) {
    const membership = autonomicPathForGroup(node, AUTONOMIC_ROOT_PATH)!;
    for (const rawName of [node.rawName, `${node.rawName}_123`, `${node.rawName}.001_123`]) {
      const systemId = systemForMeshName(rawName);
      assert.equal(systemId, 'nervous', rawName);
      const alias = { ...node, rawName, systemId };
      assert.ok(isNodeAllowedInAtlasView(alias, AUTONOMIC_NERVOUS_SYSTEM_VIEW), rawName);
      if (membership) {
        assert.deepEqual(autonomicPathForGroup(alias, membership), membership, rawName);
        assert.ok(isNodeInRegion(alias, membership, () => null), rawName);
      } else {
        assert.match(rawName, /motor root of trigeminal nerve/i);
        assert.equal(autonomicPathForGroup(alias, AUTONOMIC_ROOT_PATH), null, rawName);
      }
    }
  }
});

test('isolation scopes shared structures to each chosen group and hides every out-of-group mesh', () => {
  const scene = [...nodes, { instanceID: -1, rawName: 'Unmapped model object', name: 'Unmapped model object',
    visible: true, type: 'MatrixTransform', systemId: null } as SceneNode,
    { instanceID: -2, rawName: 'Stomach', name: 'Stomach', visible: true,
      type: 'MatrixTransform', systemId: 'organs' } as SceneNode];
  for (const scope of [path('sympathetic', 'cervical'), path('head-neck', 'ganglia'),
    path('plexuses', 'abdominal'), path('enteric')]) {
    const plan = planRegionIsolation(scene, 'nervous', scope, node => autonomicPathForGroup(node, scope))!;
    assert.ok(plan);
    assert.ok(plan.hide.includes(-1));
    assert.ok((scope[2] === 'enteric' ? plan.show : plan.hide).includes(-2));
    assert.equal(plan.affected.length, scene.length);
    assert.deepEqual(new Set(plan.show), new Set(scene.filter(node => autonomicPathForGroup(node, scope)).map(node => node.instanceID)));
    for (const id of plan.show) assert.ok(isNodeInRegion(scene.find(node => node.instanceID === id)!, scope, () => null));
  }
  const ganglion = object('Pterygopalatine ganglion.r');
  assert.ok(cranialNervePathForGroup(ganglion, ['advanced-neuroanatomy', 'cranial-nerves', 'vii']));
  assert.ok(cranialNervePathForGroup(ganglion, ['advanced-neuroanatomy', 'cranial-nerves', 'v']));
});

const menuProps = {
  nodes, activeNerveId: null, onActivateNerve: () => {}, isolatedRegionPath: null,
  onIsolateRegion: () => {}, onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
  selectedNodeId: null,
};
test('autonomic strip, sidebar and fullscreen expose all five categories without cranial labels', () => {
  for (const variant of ['strip', 'sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(AutonomicNerveMenu, { ...menuProps, variant }));
    for (const group of AUTONOMIC_GROUPS) assert.ok(html.includes(group.label), `${variant}: ${group.label}`);
    assert.ok(!html.includes('CRANIAL NERVES'));
    assert.ok(!html.includes('Browse cranial nerves'));
    if (variant !== 'strip') {
      for (const group of AUTONOMIC_GROUPS) for (const child of group.children ?? []) {
        assert.ok(html.includes(child.label), `${variant}: ${child.label}`);
      }
      assert.ok(html.includes('Sacral parasympathetic system'));
      assert.ok(html.includes('Not represented in this model'));
    }
    if (variant === 'fullscreen') assert.ok(!html.includes('Pterygopalatine ganglion.r'));
  }
});

test('all autonomic advanced menus omit redundant introductory paragraphs while keeping headings and recovery controls', () => {
  for (const variant of ['sidebar', 'fullscreen'] as const)
    for (const activeNerveId of [null, ...AUTONOMIC_GROUPS.map(group => group.id)]) {
      const html = renderToStaticMarkup(createElement(AutonomicNerveMenu, {
        ...menuProps, variant, activeNerveId, isolatedRegionPath: activeNerveId?.split('/') ?? null,
      }));
      for (const text of ['The full model is shown.', 'Choose a category, then show, hide',
        'Browse the represented autonomic pathways', 'Shared structures remain accessible',
        'Brainstem gross anatomy, hypothalamus and vertebrae are semitransparent',
        'The source has no separately named long ciliary nerves',
        'Choose a region to control the view.'])
        assert.ok(!html.includes(text), `${variant}/${activeNerveId}: ${text}`);
      assert.ok(html.includes('AUTONOMIC NERVOUS SYSTEM'));
      assert.ok(html.includes('Show all'));
      if (activeNerveId) {
        assert.ok(html.includes('Restore previous view'));
        assert.ok(html.includes(AUTONOMIC_GROUPS.find(group => group.id === activeNerveId)!.label));
      }
    }
});

test('shared collection tree preserves all requested child labels including the unavailable sacral group', () => {
  const expanded = new Set(AUTONOMIC_GROUPS.map(group => group.id));
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [...AUTONOMIC_GROUPS], nodes, initialExpanded: expanded,
    pathForNode: node => autonomicPathForGroup(node, AUTONOMIC_ROOT_PATH),
    pathForGroup: autonomicPathForGroup, onSetVisibility: () => {}, onIsolate: () => {},
    isolatedPath: null, onRestore: () => {}, onSelect: () => {},
    toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const group of AUTONOMIC_GROUPS) for (const child of group.children ?? []) assert.ok(html.includes(child.label));
});
