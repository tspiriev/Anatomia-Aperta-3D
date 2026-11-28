import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup, cranialNerveContextIds, cranialNerveForegroundIds } from './cranialNerveTaxonomy';
import { systemForMeshName } from './anatomicalSystems';
import { CRANIAL_NERVES_VIEW, ATLAS_VIEWS, isNodeAllowedInAtlasView } from './atlasViews';
import { advancedNeuroanatomyPathForGroup, ADVANCED_NEUROANATOMY_ROOT } from './advancedNeuroanatomy';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import { CranialNerveMenu } from '../components/CranialNerveMenu';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';
import { BASAL_FOREBRAIN_GROUP, basalForebrainPathForGroup, isBasalForebrainContext } from './basalForebrainTaxonomy';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import { OLFACTORY_BASAL_FOREBRAIN_GROUP, olfactoryBasalForebrainPath, isOlfactoryBrainContext, OLFACTORY_BRAIN_CONTEXT_NAME } from './olfactoryBasalForebrain';
import { basalWholeBrainDisplay, expandWholeBrainIds } from '../lib/basalWholeBrain';
import { isOpticOccipitalContext, OPTIC_OCCIPITAL_CONTEXT_NAME } from './opticVisualContext';
import { TRIGEMINAL_MOTOR_NUCLEUS_NAMES } from './trigeminalMotorNucleus';

const csvNames = (file: string) => readFileSync(new URL(`../../../../attached_assets/${file}`, import.meta.url), 'utf8')
  .trim().split(/\r?\n/).filter(line => line.startsWith('OBJECT,')).map(line => line.split(',')[4]);
const names = [...new Set([...csvNames('Nervous_system_CLean_1791612986964.csv'), ...csvNames('0_Final_Muscles_fused__1791947151699.csv'),
  'Sphenoid bone', 'Ethmoid bone', 'Frontal bone', 'Temporal bone.l', 'Temporal bone.r', 'Occipital bone', 'Parietal bone.l'])];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
  systemId: systemForMeshName(rawName) ?? 'nervous', visible: true,
}));
nodes.push({ instanceID: 9000, rawName: 'Unknown mesh', name: 'Unknown mesh', systemId: 'nervous', type: 'Geometry', visible: true });
const path = (id: string) => [ADVANCED_NEUROANATOMY_ROOT, 'cranial-nerves', id];
const object = (name: string) => { const node = nodes.find(node => node.rawName === name); assert.ok(node, name); return node; };

test('V includes both requested nasociliary communicating branches, original export labels and duplicate aliases as recognized nerves', () => {
  const nerves = [...path('v'), 'nerves'];
  for (const stem of [
    'Communicating branch of  nasociliary nerve to cilliary ganglion',
    'Communicating branch of nasociliary nerve to ciliary ganglion',
    'Communicating branch of right nasociliary nerve to cilliary ganglion',
    'Communicating branch of left nasociliary nerve to ciliary ganglion',
  ]) for (const side of ['l', 'r']) for (const suffix of ['', '.001_123']) {
    const rawName = `${stem}.${side}${suffix}`;
    const node: SceneNode = { instanceID: 99999, rawName, name: rawName,
      systemId: systemForMeshName(rawName), type: 'MatrixTransform', visible: false };
    assert.equal(node.systemId, 'nervous', rawName);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), rawName);
    assert.deepEqual(cranialNervePathForGroup(node, path('v')), nerves, rawName);
    const plan = planRegionIsolation([...nodes, node], 'nervous', nerves,
      item => advancedNeuroanatomyPathForGroup(item, nerves))!;
    assert.ok(plan.show.includes(node.instanceID), rawName);
    assert.ok(cranialNerveForegroundIds([node], path('v')).includes(node.instanceID), 'nerve stays opaque');
  }
  for (const side of ['l', 'r']) {
    const node = object(`Communicating branch of right nasociliary nerve to cilliary ganglion.${side}`);
    assert.deepEqual(cranialNervePathForGroup(node, path('v')), nerves);
    assert.ok(node.rawName.endsWith(`.${side}`), 'keep original source laterality');
  }
  assert.ok(CRANIAL_NERVE_GROUPS.find(group => group.id === path('v').join('/'))!
    .children!.some(group => group.id === nerves.join('/')), 'existing shared nerve menu exposes these branches');
});

test('V retains bilateral postcentral gyri and central sulci as semitransparent context, but excludes transverse temporal gyri', () => {
  const scope = path('v');
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  const nervesPath = [...scope, 'nerves'];
  const plan = planRegionIsolation(nodes, 'nervous', nervesPath,
    node => advancedNeuroanatomyPathForGroup(node, nervesPath))!;
  const group = CRANIAL_NERVE_GROUPS.find(group => group.id === scope.join('/'))!;
  for (const [stem, role] of [
    ['Postcentral gyrus', 'sensory-cortex'],
    ['Central sulcus', 'central-sulcus'],
  ]) for (const side of ['l', 'r']) {
    const source = object(`${stem}.${side}`);
    assert.ok(context.has(source.instanceID), source.rawName);
    assert.ok(!foreground.has(source.instanceID), 'landmark must not be forced opaque');
    assert.ok(plan.show.includes(source.instanceID), 'retain landmark during nerve isolation');
    assert.ok(group.children!.some(child => child.id === [...scope, role].join('/')
      && child.label.includes('semitransparent')), 'shared menu labels match transparency');
    for (const suffix of ['', '.001_123']) {
      const rawName = `${stem}.${side}${suffix}`;
      const node = { ...source, rawName, systemId: systemForMeshName(rawName), visible: false };
      assert.equal(node.systemId, 'nervous', rawName);
      assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), rawName);
      assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, role]);
      assert.ok(cranialNerveContextIds([node], scope).includes(node.instanceID));
    }
  }
  for (const side of ['l', 'r']) {
    const rawName = `Transverse temporal gyrus.${side}.001_123`;
    const node = { ...object(`Transverse temporal gyri.${side}`), rawName, systemId: systemForMeshName(rawName) };
    assert.equal(cranialNervePathForGroup(node, scope), null);
    const source = object(`Transverse temporal gyri.${side}`);
    assert.equal(cranialNervePathForGroup(source, scope), null);
    assert.ok(!context.has(source.instanceID));
    assert.ok(plan.hide.includes(source.instanceID), 'auditory cortex must not remain visible in V');
  }
  assert.ok(!group.children!.some(child => child.id.endsWith('/transverse-temporal')));
  const nerve = object('Trigeminal nerve root.l');
  assert.ok(foreground.has(nerve.instanceID));
  assert.ok(!context.has(nerve.instanceID), 'V nerve remains opaque');
  assert.equal(cranialNervePathForGroup(object('Precentral gyrus.l'), scope), null,
    'do not expand V to unrelated cortical regions');
});

test('VIII auditory pathway exposes bilateral transverse temporal gyri as retained semitransparent auditory cortex, with source and live aliases', () => {
  const scope = [...path('viii'), 'cochlear'];
  const role = 'transverse-temporal-context';
  const group = CRANIAL_NERVE_GROUPS.find(group => group.id === path('viii').join('/'))!
    .children!.find(group => group.id === scope.join('/'))!;
  assert.ok(group.children!.some(child => child.id === [...scope, role].join('/')
    && child.label.includes('semitransparent')));
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  const nervesPath = [...scope, 'nerves'];
  const plan = planRegionIsolation(nodes, 'nervous', nervesPath,
    node => advancedNeuroanatomyPathForGroup(node, nervesPath))!;
  for (const side of ['l', 'r']) {
    const source = object(`Transverse temporal gyri.${side}`);
    assert.ok(context.has(source.instanceID));
    assert.ok(!foreground.has(source.instanceID));
    assert.ok(plan.show.includes(source.instanceID), 'retain auditory cortex when isolating auditory nerves');
    for (const stem of ['Transverse temporal gyri', 'Transverse temporal gyrus'])
      for (const suffix of ['', '.001_123']) {
        const rawName = `${stem}.${side}${suffix}`;
        const node = { ...source, rawName, systemId: systemForMeshName(rawName), visible: false };
        assert.equal(node.systemId, 'nervous', rawName);
        assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW));
        assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, role]);
        assert.ok(cranialNerveContextIds([node], scope).includes(node.instanceID));
        assert.equal(cranialNervePathForGroup(node, path('v')), null);
        assert.equal(cranialNervePathForGroup(node, [...path('viii'), 'vestibular']), null);
      }
  }
  const nerve = object('Cochlear nerve.l');
  assert.ok(foreground.has(nerve.instanceID));
  assert.ok(!context.has(nerve.instanceID), 'cochlear nerve stays opaque');
});

test('V explicitly includes the mislabeled motor tract as a nucleus, independent of CSV folders or source laterality', () => {
  for (const name of TRIGEMINAL_MOTOR_NUCLEUS_NAMES) for (const suffix of ['', '.l', '.r', '.r.001_123']) {
    const node: SceneNode = { instanceID: 99999, rawName: `${name}${suffix}`, name: `${name}${suffix}`,
      systemId: null, type: 'MatrixTransform', visible: false };
    const p = [...path('v'), 'nuclei'];
    assert.deepEqual(cranialNervePathForGroup(node, path('v')), p);
    assert.equal(isNodeInRegion(node, [...path('v'), 'tracts'], () => null), false);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW));
    const plan = planRegionIsolation([...nodes, node], 'nervous', p,
      n => advancedNeuroanatomyPathForGroup(n, p))!;
    assert.ok(plan.show.includes(node.instanceID), node.rawName);
    assert.equal(cranialNervePathForGroup(node, path('vii')), null, 'not a facial nucleus');
    assert.equal(node.rawName, `${name}${suffix}`);
  }
  assert.equal(isNodeInRegion(object('Motor root of trigeminal nerve.l'), [...path('v'), 'nuclei'], () => null), false,
    'the genuine motor root remains distinct');
});

test('II includes bilateral optic tracts with translucent brainstem/thalamus and occipital-only cortical context', () => {
  const scope = path('ii');
  for (const name of ['Retina.l', 'Sclera.r', 'Cornea.l', 'Lens.r', 'Vitreous body.l',
    'Optic nerve (II).l', 'Optic chiasm.r', 'Optic tract.l', 'Optic tract.r', 'Optic radiation.r',
    'Lateral geniculate body.l', 'Thalamus.r', '00_Thalamic_background_core.l',
    'Pons.r', 'Midbrain.l', 'Medulla oblongata.r', 'Cuneus.r']) {
    const node = object(name);
    assert.ok(isNodeInRegion(node, scope, () => null), name);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), name);
    assert.deepEqual(cranialNervePathForGroup({ ...node, rawName: `${name}.001_123` }, scope),
      cranialNervePathForGroup(node, scope), name);
  }
  const semi = new Set(cranialNerveContextIds(nodes, scope));
  const opaque = new Set(cranialNerveForegroundIds(nodes, scope));
  for (const line of readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8').split(/\r?\n/)) {
    if (line.startsWith('OBJECT,Eye,')) {
      const node = object(line.split(',')[4]);
      assert.equal(cranialNervePathForGroup(node, scope)?.[3], 'eyes', node.rawName);
      assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), node.rawName);
    }
  }
  for (const node of nodes) {
    const brain = classifyBrainGrossAnatomy(node.rawName);
    if (brain?.[2] === 'brainstem' || isOpticOccipitalContext(node)) {
      assert.ok(semi.has(node.instanceID), node.rawName);
      assert.ok(!opaque.has(node.instanceID), node.rawName);
    }
  }
  assert.ok(semi.has(object('Thalamus.r').instanceID));
  assert.ok(opaque.has(object('Lateral geniculate body.r').instanceID));
  assert.ok(!semi.has(object('Lateral geniculate body.r').instanceID));
  for (const side of ['l', 'r']) {
    const tract = object(`Optic tract.${side}`);
    assert.ok(opaque.has(tract.instanceID));
    assert.ok(!semi.has(tract.instanceID));
    assert.deepEqual(cranialNervePathForGroup(tract, scope), [...scope, 'tracts']);
  }
  const tractPath = [...scope, 'tracts'];
  const plan = planRegionIsolation(nodes, 'nervous', tractPath, node => cranialNervePathForGroup(node, tractPath))!;
  assert.ok(plan.show.includes(object('Optic radiation.r').instanceID));
  assert.ok(plan.show.includes(object('Cuneus.r').instanceID), 'Keep the radiation’s semitransparent cortical endpoint');
  assert.ok(!cranialNerveForegroundIds(nodes, tractPath).includes(object('Cuneus.r').instanceID));
  assert.ok(plan.show.includes(object('Optic tract.r').instanceID));
  assert.ok(plan.show.includes(object('Pons.r').instanceID));
  assert.ok(plan.hide.includes(object('Facial nerve (VII).l').instanceID));
  assert.ok(plan.hide.includes(object('Medial geniculate body.r').instanceID));
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[1]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of ['Eye structures', 'Occipital lobe structures (semitransparent)',
    'Brainstem (semitransparent)', 'Lateral and third ventricles', 'Thalamus (semitransparent)']) assert.ok(html.includes(label));
});

test('II groups exactly the CSV occipital collection at 18% context and excludes other lobes from scene and menu', () => {
  const scope = path('ii');
  const source = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8');
  const occipital = source.split(/\r?\n/).filter(line => line.startsWith('OBJECT,NS_04_OCCIPITAL_LOBE,'))
    .map(line => object(line.split(',')[4]));
  assert.equal(occipital.length, 20);
  const plan = planRegionIsolation(nodes, 'nervous', scope, n => cranialNervePathForGroup(n, scope))!;
  const display = basalWholeBrainDisplay(nodes, true, isOpticOccipitalContext, OPTIC_OCCIPITAL_CONTEXT_NAME);
  assert.deepEqual(new Set(display.memberIds), new Set(occipital.map(n => n.instanceID)));
  assert.equal(display.nodes.filter(n => n.name === OPTIC_OCCIPITAL_CONTEXT_NAME).length, 1);
  for (const node of occipital) {
    assert.ok(plan.show.includes(node.instanceID), node.rawName);
    assert.ok(cranialNerveContextIds(nodes, scope).includes(node.instanceID), node.rawName);
    assert.ok(!cranialNerveForegroundIds(nodes, scope).includes(node.instanceID), node.rawName);
    const alias = { ...node, rawName: `${node.rawName}.001_123` };
    assert.ok(isOpticOccipitalContext(alias), alias.rawName);
    assert.deepEqual(cranialNervePathForGroup(alias, scope), [...scope, 'visual-cortex']);
  }
  for (const node of nodes.filter(n => {
    const brain = classifyBrainGrossAnatomy(n.rawName);
    return brain?.[2] === 'brain-lobes' && !isOpticOccipitalContext(n);
  })) {
    assert.equal(cranialNervePathForGroup(node, scope), null, node.rawName);
    assert.ok(plan.hide.includes(node.instanceID), node.rawName);
    assert.ok(!isOpticOccipitalContext(node));
  }
  assert.equal(cranialNervePathForGroup(object('Precentral gyrus.l'), scope), null);
  assert.equal(cranialNervePathForGroup(object('Middle temporal gyrus.r'), scope), null);
  assert.ok(!CRANIAL_NERVE_GROUPS[1].children?.some(g => g.id.endsWith('/temporal-context')));
});

test('II adds only lateral/third ventricles and bilateral peduncular bases, retaining landmarks while isolating visual fibers', () => {
  const scope = path('ii');
  const tractPath = [...scope, 'tracts'];
  const plan = planRegionIsolation(nodes, 'nervous', tractPath, node => cranialNervePathForGroup(node, tractPath))!;
  const semi = new Set(cranialNerveContextIds(nodes, scope));
  const opaque = new Set(cranialNerveForegroundIds(nodes, tractPath));
  for (const name of ['Lateral ventricle.l', 'Lateral ventricle.r', 'Third ventricle']) {
    const node = object(name);
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'ventricles']);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW));
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(opaque.has(node.instanceID), name);
    assert.ok(!semi.has(node.instanceID), name);
    assert.ok(isNodeInRegion({ ...node, rawName: `${name}.001_123` }, scope, () => null), name);
  }
  for (const side of ['l', 'r']) {
    const node = object(`Base of cerebral peduncle (Midbrain).${side}`);
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'brain']);
    assert.ok(plan.show.includes(node.instanceID));
    assert.ok(semi.has(node.instanceID));
    assert.ok(!opaque.has(node.instanceID));
    assert.ok(isNodeInRegion({ ...node, rawName: `${node.rawName}.001_123` }, scope, () => null));
    const temporal = object(`Medial occipitotemporal gyrus (Parahippocampal*).${side}`);
    assert.ok(plan.hide.includes(temporal.instanceID));
    assert.ok(!semi.has(temporal.instanceID));
  }
  for (const name of ['Fourth ventricle', 'Aqueduct of midbrain', 'Choroid plexus.l', 'Septum pellucidum']) {
    assert.equal(cranialNervePathForGroup(object(name), scope), null, name);
    assert.ok(plan.hide.includes(object(name).instanceID));
  }
});

test('I excludes somatosensory cortex and transverse temporal gyri without changing Basal forebrain, V or VIII', () => {
  const scope = path('i');
  const scopes = [scope, [...scope, 'basal-forebrain'],
    [...scope, 'basal-forebrain', 'context'], [...scope, 'basal-forebrain', 'nuclei', 'septal']];
  const display = basalWholeBrainDisplay(nodes, true, isOlfactoryBrainContext, OLFACTORY_BRAIN_CONTEXT_NAME, OLFACTORY_BRAIN_CONTEXT_NAME);
  for (const sourceStem of ['Postcentral gyrus', 'Transverse temporal gyri']) {
    const stems = sourceStem === 'Postcentral gyrus'
      ? ['Postcentral gyrus', 'Postcentral gyri', 'Somatosensory cortex', 'Primary somatosensory cortex']
      : ['Transverse temporal gyri', 'Transverse temporal gyrus'];
    for (const side of ['l', 'r']) {
      const source = object(`${sourceStem}.${side}`);
      assert.ok(!display.memberIds.includes(source.instanceID), 'exclude from grouped brain selection, fade and focus');
      assert.ok(basalForebrainPathForGroup(source.rawName), 'preserve the original Brain collection');
      for (const stem of stems) for (const suffix of ['', '.001_123']) {
        const node = { ...source, rawName: `${stem}.${side}${suffix}` };
        assert.equal(olfactoryBasalForebrainPath(node.rawName), null, node.rawName);
        assert.equal(isOlfactoryBrainContext(node), false, node.rawName);
        for (const p of scopes) {
          assert.equal(cranialNervePathForGroup(node, p), null, node.rawName);
          assert.deepEqual(cranialNerveContextIds([node], p), [], node.rawName);
          assert.deepEqual(cranialNerveForegroundIds([node], p), [], node.rawName);
        }
      }
      for (const p of scopes) {
        const plan = planRegionIsolation(nodes, 'nervous', p,
          node => cranialNervePathForGroup(node, p))!;
        assert.ok(plan.hide.includes(source.instanceID), `${p.join('/')}: ${source.rawName}`);
        assert.ok(!plan.show.includes(source.instanceID));
      }
      const retainedScope = sourceStem === 'Postcentral gyrus' ? path('v') : [...path('viii'), 'cochlear'];
      assert.ok(cranialNervePathForGroup(source, retainedScope));
      assert.ok(cranialNerveContextIds(nodes, retainedScope).includes(source.instanceID));
    }
  }
  for (const name of ['Olfactory nerve (I).l', 'Amygdaloid body.r', 'Thalamus.l']) {
    const node = object(name);
    assert.ok(cranialNervePathForGroup(node, scope), name);
  }
});

test('I curates Basal forebrain while preserving its shared controls and thalamus capsule subgroup context', () => {
  const basalPath = [...path('i'), 'basal-forebrain'];
  const group = CRANIAL_NERVE_GROUPS[0].children!.find(group => group.id === basalPath.join('/'))!;
  assert.ok(group);
  const rebase = (value: typeof BASAL_FOREBRAIN_GROUP): typeof BASAL_FOREBRAIN_GROUP => ({
    ...value, id: value.id.replace('advanced-neuroanatomy/', `${path('i').join('/')}/`),
    ...(value.children ? { children: value.children.map(rebase) } : {}),
  });
  assert.deepEqual(group, rebase(OLFACTORY_BASAL_FOREBRAIN_GROUP));
  for (const node of nodes) {
    const brainMember = node.systemId === 'nervous' ? olfactoryBasalForebrainPath(node.rawName) : null;
    const nerveMember = cranialNervePathForGroup(node, basalPath);
    if (brainMember) assert.deepEqual(nerveMember, [...path('i'), ...brainMember.slice(1)], node.rawName);
    else assert.notEqual(nerveMember?.[3], 'basal-forebrain', node.rawName);
  }
  for (const suffix of [[], ['nuclei', 'septal'], ['white-matter', 'medial-forebrain-bundle', 'dopamine'], ['context']]) {
    const brainPath = ['advanced-neuroanatomy', 'basal-forebrain', ...suffix];
    const nervePath = [...basalPath, ...suffix];
    const nervePlan = planRegionIsolation(nodes, 'nervous', nervePath, node => cranialNervePathForGroup(node, nervePath))!;
    assert.ok(nervePlan);
    const expected = nodes.filter(node => {
      if (node.systemId !== 'nervous') return false;
      const path = olfactoryBasalForebrainPath(node.rawName);
      return path && (path[2] === 'context' || brainPath.every((part, i) => path[i] === part));
    }).map(node => node.instanceID);
    assert.deepEqual(new Set(nervePlan.show), new Set(expected), suffix.join('/'));
    assert.deepEqual(new Set(cranialNerveContextIds(nodes, nervePath)), new Set(nodes.filter(isOlfactoryBrainContext).map(node => node.instanceID)));
    assert.ok(cranialNerveForegroundIds(nodes, nervePath).every(id =>
      !isOlfactoryBrainContext(nodes.find(node => node.instanceID === id)!)));
  }
  const rootPlan = planRegionIsolation(nodes, 'nervous', path('i'), node => cranialNervePathForGroup(node, path('i')))!;
  assert.ok(rootPlan.show.includes(object('Olfactory nerve (I).l').instanceID));
  for (const name of ['Stria terminalis.l', 'Stria medullaris thalami.r', 'Fornix.l.001', 'Uncinate fascicle.l']) {
    assert.ok(rootPlan.hide.includes(object(name).instanceID), name);
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[0]], nodes, initialExpanded: new Set([path('i').join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, path('i')), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  assert.ok(html.includes('Basal forebrain'));
});

test('I keeps bilateral amygdalae and only anteroventral thalamic nuclei, excluding other thalamic nuclei and caudal brain without changing Brain', () => {
  const scope = path('i');
  const plan = planRegionIsolation(nodes, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
  const foreground = cranialNerveForegroundIds(nodes, scope);
  for (const base of ['Amygdaloid body', '01_Anterior_ventral_AV']) {
    // The thalamic export uses an unsuffixed right object and a .l object.
    const pair = base === 'Amygdaloid body' ? [`${base}.l`, `${base}.r`] : [base, `${base}.l`];
    for (const name of pair) {
      const node = object(name);
      assert.ok(plan.show.includes(node.instanceID), name);
      assert.ok(foreground.includes(node.instanceID), name);
      assert.ok(isNodeInRegion({ ...node, rawName: `${name}.001_123` }, scope, () => null), name);
    }
  }
  for (const name of ['Pons.l', 'Midbrain.r', 'Medulla oblongata.l', 'Reticular formation brainstem',
    'Ventral tegmental area.r', 'Substantia nigra pars compacta.l',
    '04_Mediodorsal_MD', '05_Midline_nuclei', '14_Pulvinar_medial_PuM',
    '07_Centromedian_parafascicular_CM_Pf.l', '12_Ventral_posterolateral_VPL',
    '13_Ventral_posteromedial_VPM.l', '15_Pulvinar_lateral_PuL', 'Lateral geniculate body.l']) {
    const node = object(name);
    assert.equal(cranialNervePathForGroup(node, scope), null, name);
    assert.ok(plan.hide.includes(node.instanceID), name);
    assert.ok(basalForebrainPathForGroup(name), `Keep ${name} in the original Brain collection`);
  }
  for (const node of nodes) {
    const originalPath = basalForebrainPathForGroup(node.rawName);
    if (originalPath?.[2] === 'thalamus') {
      const isAv = originalPath[3] === 'anterior' && originalPath[4] === 'av';
      assert.equal(plan.show.includes(node.instanceID), isAv, node.rawName);
      assert.equal(plan.hide.includes(node.instanceID), !isAv, node.rawName);
      const rawName = `${node.rawName}.001_123`;
      const systemId = systemForMeshName(rawName);
      assert.ok(systemId, rawName);
      const alias = { ...node, rawName, systemId };
      assert.equal(cranialNervePathForGroup(alias, scope) !== null, isAv, rawName);
      if (isAv) assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW));
    }
    const gross = classifyBrainGrossAnatomy(node.rawName);
    if (gross?.[2] === 'brainstem' || gross?.[2] === 'cerebellum') {
      assert.ok(plan.hide.includes(node.instanceID), node.rawName);
    }
  }
  const text = JSON.stringify(CRANIAL_NERVE_GROUPS[0]);
  assert.ok(!text.includes('brainstem-nuclei'));
  assert.ok(!text.includes('Reticular formation'));
  assert.ok(!text.includes('Ventral posteromedial'));
  assert.ok(text.includes('Amygdaloid bodies'));
  assert.ok(text.includes(OLFACTORY_BRAIN_CONTEXT_NAME));
  assert.ok(JSON.stringify(BASAL_FOREBRAIN_GROUP).includes('Reticular formation'));
});

test('I thalamic menu contains AV only, without altering the original Brain taxonomy', () => {
  const thalamus = OLFACTORY_BASAL_FOREBRAIN_GROUP.children!.find(group => group.id.endsWith('/thalamus'))!;
  assert.equal(thalamus.children!.length, 1);
  assert.ok(thalamus.children![0].id.endsWith('/anterior'));
  assert.deepEqual(thalamus.children![0].children!.map(group => group.label), ['Anteroventral nucleus (AV)']);
  const original = BASAL_FOREBRAIN_GROUP.children!.find(group => group.id.endsWith('/thalamus'))!;
  assert.ok(original.children!.some(group => group.id.endsWith('/mediodorsal')));
  assert.ok(original.children!.some(group => group.id.endsWith('/pulvinar')));
});

test('I presents only thalamus capsules as one shared-model row, expanding visibility/fade/focus without cortex or opaque nuclei', () => {
  const display = basalWholeBrainDisplay(nodes, true, isOlfactoryBrainContext, OLFACTORY_BRAIN_CONTEXT_NAME, OLFACTORY_BRAIN_CONTEXT_NAME);
  assert.deepEqual(new Set(display.memberIds), new Set(['Thalamus.l', 'Thalamus.r', '00_Thalamic_background_core.l']
    .map(name => object(name).instanceID)));
  const row = display.nodes.find(node => node.instanceID === display.representativeId)!;
  assert.equal(row.name, OLFACTORY_BRAIN_CONTEXT_NAME);
  assert.deepEqual(cranialNervePathForGroup(row, path('i')), [...path('i'), 'basal-forebrain', 'context']);
  assert.equal(display.nodes.filter(isOlfactoryBrainContext).length, 1);
  assert.deepEqual(expandWholeBrainIds([row.instanceID], display.memberIds), display.memberIds);
  for (const name of ['Amygdaloid body.l', 'Amygdaloid body.r', 'Pons.l', 'Reticular formation brainstem',
    '01_Anterior_ventral_AV', '01_Anterior_ventral_AV.l', 'Precentral gyrus.l']) {
    assert.ok(!display.memberIds.includes(object(name).instanceID), name);
  }
  assert.ok(display.memberIds.includes(object('Thalamus.l').instanceID));
  for (const lobe of ['frontal', 'temporal', 'occipital', 'parietal']) {
    for (const side of ['l', 'r']) {
      const surfaces = nodes.filter(node => classifyBrainGrossAnatomy(node.rawName)?.[3] === lobe
        && node.rawName.endsWith(`.${side}`));
      assert.ok(surfaces.length > 0, `${lobe}.${side} source surfaces`);
      for (const node of surfaces) {
        assert.ok(!display.memberIds.includes(node.instanceID), `${lobe}.${side}: ${node.rawName}`);
        assert.equal(cranialNervePathForGroup(node, path('i')), null, node.rawName);
      }
    }
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[0]], nodes: display.nodes,
    initialExpanded: new Set([path('i').join('/'), [...path('i'), 'basal-forebrain'].join('/'),
      [...path('i'), 'basal-forebrain', 'context'].join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, path('i')), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  assert.ok(html.includes(`data-testid="button-select-mesh-${row.instanceID}"`));
  assert.ok(!html.includes('Precentral gyrus.l'));
  assert.ok(html.includes('Thalamus capsule (semitransparent)'));
  assert.ok(!html.includes('Whole supratentorial brain'));
});

test('I admits live thalamus capsule and AV aliases while hiding whole lobes and keeping amygdalae and AV opaque', () => {
  const rawNames = ['Right amygdala', 'Amygdala.l.001_123', 'Amygdaloid body.r.001_123',
    'Frontal lobe.l', 'Frontal lobe.r', 'Temporal lobe.l', 'Temporal lobe.r.001_123',
    'Left occipital lobe', 'Right occipital lobe', 'Parietal lobe.l', 'Parietal lobe.r',
    'Cerebral hemispheres', 'Olfactory nerve (I).l',
    'Thalamus.l', 'Thalamus.r.001_123', 'Left thalamus', 'Right thalamus capsule',
    'Thalamic capsule.l', '00_Thalamic_background_core.r',
    '01_Anterior_ventral_AV', '01_Anterior_ventral_AV.l.001_123',
    'Anterior_ventral_AV.r', 'Anterior ventral nucleus.l', 'Right anteroventral nucleus',
    'Anteroventral nucleus (AV).r', 'Anterior ventral (AV) nucleus.l'];
  const scene: SceneNode[] = rawNames.map((rawName, i) => ({
    instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: false,
    systemId: systemForMeshName(rawName) ?? undefined,
  }));
  const scope = path('i');
  const context = new Set(cranialNerveContextIds(scene, scope));
  const foreground = new Set(cranialNerveForegroundIds(scene, scope));
  const plan = planRegionIsolation(scene, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
  for (const node of scene) {
    assert.equal(node.systemId, 'nervous', node.rawName);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), node.rawName);
    const amygdala = node.rawName.includes('amygdala') || node.rawName.includes('Amygdala') || node.rawName.includes('Amygdaloid');
    const nerve = node.rawName.includes('Olfactory nerve');
    const av = /ventral|anteroventral/i.test(node.rawName);
    const capsule = /thalam/i.test(node.rawName) && !av;
    assert.equal(plan.show.includes(node.instanceID), amygdala || nerve || av || capsule, node.rawName);
    assert.equal(plan.hide.includes(node.instanceID), !amygdala && !nerve && !av && !capsule, node.rawName);
    assert.equal(context.has(node.instanceID), capsule, node.rawName);
    assert.equal(foreground.has(node.instanceID), amygdala || nerve || av, node.rawName);
    if (av) assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'basal-forebrain', 'thalamus', 'anterior', 'av']);
  }
  const display = basalWholeBrainDisplay(scene, true, isOlfactoryBrainContext, OLFACTORY_BRAIN_CONTEXT_NAME, OLFACTORY_BRAIN_CONTEXT_NAME);
  assert.equal(display.memberIds.length, 6);
  assert.equal(display.nodes.filter(isOlfactoryBrainContext).length, 1);
  assert.equal(display.nodes.filter(node => node.name === OLFACTORY_BRAIN_CONTEXT_NAME).length, 1);
  assert.ok(display.nodes.some(node => node.rawName === 'Right amygdala'));
  assert.ok(display.nodes.some(node => node.rawName === 'Amygdala.l.001_123'));
  assert.deepEqual(expandWholeBrainIds([display.representativeId!], display.memberIds), display.memberIds);
  const nervePath = [...scope, 'nerves'];
  const nervePlan = planRegionIsolation(scene, 'nervous', nervePath, node => cranialNervePathForGroup(node, nervePath))!;
  assert.ok(display.memberIds.every(id => nervePlan.show.includes(id)), 'Keep the thalamus capsule context during nerve isolation');
});

test('cranial model has twelve detailed nerve categories plus Overview and its own Explore Atlas route', () => {
  assert.equal(CRANIAL_NERVES_VIEW.modelUid, '320acf193b8f484c88f4bac7624fed37');
  assert.equal(CRANIAL_NERVES_VIEW.href, '/atlas/cranial-nerves');
  assert.ok(ATLAS_VIEWS.includes(CRANIAL_NERVES_VIEW));
  assert.equal(CRANIAL_NERVE_GROUPS.length, 13);
  assert.deepEqual(CRANIAL_NERVE_GROUPS.map(group => group.id.split('/').at(-1)),
    ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'overview']);
  for (const group of CRANIAL_NERVE_GROUPS) {
    const scope = group.id.split('/');
    const plan = planRegionIsolation(nodes, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
    assert.ok(plan && plan.show.length > 0, group.label);
    assert.ok(plan.hide.includes(9000));
    assert.deepEqual(new Set(plan.show), new Set(nodes.filter(node => isNodeInRegion(node, scope, () => null)).map(node => node.instanceID)));
    for (const id of plan.show) assert.ok(isNodeAllowedInAtlasView(nodes.find(node => node.instanceID === id)!, CRANIAL_NERVES_VIEW));
  }
});

test('III includes full brainstem, III/IV/VI nuclei and MLF, bilateral annuli and translucent sphenoid while keeping only its own ocular muscles', () => {
  const scope = path('iii');
  for (const name of ['Nucleus of oculomotor nerve.l', 'Accessory nucleus of oculomotor nerve.r',
    'Medial longitudinal fascicle - Internuclear fibers', 'Oculomotr nerve - branch to superior rectus m.r',
    'Superior rectus muscle.l', 'Inferior rectus muscle.r', 'Medial rectus muscle.l',
    'Inferior oblique muscle.r', 'Levator palpebrae superioris.l']) {
    const node = object(name);
    for (const rawName of [name, `${name}.001_123`]) {
      const alias = { ...node, rawName, systemId: systemForMeshName(rawName) ?? 'nervous' };
      assert.ok(isNodeInRegion(alias, scope, () => null), rawName);
    }
  }
  assert.equal(cranialNervePathForGroup(object('Lateral rectus muscle.r'), scope), null);
  assert.equal(cranialNervePathForGroup(object('Superior oblique muscle.l'), scope), null);
  assert.equal(cranialNervePathForGroup(object('Oculomotr nerve - branch to superior rectus m.r'), path('v')), null);
  const muscles = nodes.filter(node => cranialNervePathForGroup(node, scope)?.[3] === 'muscles');
  assert.equal(muscles.length, 10);
  assert.ok(muscles.every(node => node.systemId === 'muscular'));
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  assert.equal(context.size, 7);
  const sphenoid = object('Sphenoid bone');
  assert.equal(sphenoid.systemId, 'skeletal');
  assert.ok(context.has(sphenoid.instanceID));
  assert.ok(!foreground.has(sphenoid.instanceID));
  assert.ok(isNodeAllowedInAtlasView(sphenoid, CRANIAL_NERVES_VIEW));
  assert.ok(!isNodeAllowedInAtlasView(object('Parietal bone.l'), CRANIAL_NERVES_VIEW));
  for (const side of ['l', 'r']) {
    const ring = object(`Common tendinous ring.${side}`);
    assert.deepEqual(cranialNervePathForGroup(ring, scope), [...scope, 'annulus']);
    assert.ok(foreground.has(ring.instanceID));
    assert.ok(isNodeAllowedInAtlasView(ring, CRANIAL_NERVES_VIEW));
    assert.equal(cranialNervePathForGroup(ring, path('v')), null);
    assert.ok(isNodeInRegion({ ...ring, rawName: `${ring.rawName}.001_123` }, scope, () => null));
  }
  for (const rawName of ['Sphenoid bone.001_123', 'Sphenoid bone_456']) {
    const alias = { ...sphenoid, rawName, systemId: systemForMeshName(rawName) };
    assert.equal(alias.systemId, 'skeletal');
    assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW));
    assert.deepEqual(cranialNervePathForGroup(alias, scope), [...scope, 'bone-context']);
    assert.equal(cranialNervePathForGroup(alias, path('ii')), null);
  }
  for (const base of ['Midbrain', 'Pons', 'Medulla oblongata']) for (const side of ['l', 'r']) {
    const node = object(`${base}.${side}`);
    assert.ok(context.has(node.instanceID));
    assert.ok(!foreground.has(node.instanceID));
    assert.ok(isNodeInRegion({ ...node, rawName: `${node.rawName}.001_123` }, scope, () => null));
  }
  const nucleiPath = [...scope, 'nuclei'];
  const nucleiPlan = planRegionIsolation(nodes, 'nervous', nucleiPath, node => cranialNervePathForGroup(node, nucleiPath))!;
  assert.equal(nucleiPlan.show.length, 15, 'Eight III/IV/VI nuclei plus six brainstem meshes and the sphenoid');
  for (const nerve of ['trochlear', 'abducens']) for (const side of ['l', 'r']) {
    const node = object(`Nucleus of ${nerve} nerve.${side}`);
    assert.deepEqual(cranialNervePathForGroup(node, scope), nucleiPath);
    assert.ok(foreground.has(node.instanceID));
    assert.ok(!context.has(node.instanceID));
    assert.ok(isNodeInRegion({ ...node, rawName: `${node.rawName}.001_123` }, scope, () => null));
    assert.ok(isNodeInRegion(node, path(nerve === 'trochlear' ? 'iv' : 'vi'), () => null), 'Keep original nerve membership too');
  }
  const tractPath = [...scope, 'tracts'];
  const tractPlan = planRegionIsolation(nodes, 'nervous', tractPath, node => cranialNervePathForGroup(node, tractPath))!;
  for (const id of context) assert.ok(tractPlan.show.includes(id));
  assert.ok(foreground.has(object('Medial longitudinal fascicle - Internuclear fibers').instanceID));
  assert.ok(tractPlan.show.includes(object('Medial longitudinal fascicle - Internuclear fibers').instanceID));
  assert.ok(tractPlan.hide.includes(object('Trochlear nerve (IV).l').instanceID));
  assert.ok(tractPlan.hide.includes(object('Abducens nerve (VI).r').instanceID));
  const annulusPath = [...scope, 'annulus'];
  const annulusPlan = planRegionIsolation(nodes, 'nervous', annulusPath, node => cranialNervePathForGroup(node, annulusPath))!;
  for (const side of ['l', 'r']) assert.ok(annulusPlan.show.includes(object(`Common tendinous ring.${side}`).instanceID));
  assert.ok(annulusPlan.show.includes(sphenoid.instanceID));
  assert.ok(annulusPlan.hide.includes(object('Parietal bone.l').instanceID));
});

test('IV adds bilateral superior obliques, annuli, eyes, full brainstem and MLF with III/IV/VI nuclei, without adding other muscles or nerve branches', () => {
  const scope = path('iv');
  for (const name of ['Trochlear nerve (IV).l', 'Trochlear nerve (IV).r',
    'Superior oblique muscle.l', 'Superior oblique muscle.r',
    'Common tendinous ring.l', 'Common tendinous ring.r',
    'Retina.l', 'Sclera.r', 'Cornea.l', 'Lens.r', 'Iris.l', 'Vitreous body.r',
    'Medial longitudinal fascicle - Internuclear fibers', 'Medial longitudinal fascicle - Fibers to trochlear nerve.l',
    'Nucleus of oculomotor nerve.l', 'Nucleus of trochlear nerve.r', 'Nucleus of abducens nerve.l',
    'Accessory nucleus of oculomotor nerve.r']) {
    const node = object(name);
    assert.ok(isNodeInRegion(node, scope, () => null), name);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), name);
    assert.ok(isNodeInRegion({ ...node, rawName: `${name}.001_123` }, scope, () => null), name);
  }
  assert.deepEqual(nodes.filter(node => cranialNervePathForGroup(node, scope)?.[3] === 'muscles')
    .map(node => node.rawName).sort(), ['Superior oblique muscle.l', 'Superior oblique muscle.r']);
  assert.deepEqual(nodes.filter(node => cranialNervePathForGroup(node, scope)?.[3] === 'annulus')
    .map(node => node.rawName).sort(), ['Common tendinous ring.l', 'Common tendinous ring.r']);
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  assert.equal(context.size, 9);
  for (const base of ['Midbrain', 'Pons', 'Medulla oblongata']) for (const side of ['l', 'r']) {
    const id = object(`${base}.${side}`).instanceID;
    assert.ok(context.has(id));
    assert.ok(!foreground.has(id));
  }
  const nucleiPath = [...scope, 'nuclei'];
  const nucleiPlan = planRegionIsolation(nodes, 'nervous', nucleiPath, node => cranialNervePathForGroup(node, nucleiPath))!;
  assert.equal(nucleiPlan.show.length, 17);
  for (const node of nodes.filter(node => cranialNervePathForGroup(node, scope)?.[3] === 'nuclei')) {
    assert.ok(foreground.has(node.instanceID));
    assert.ok(!context.has(node.instanceID));
    assert.ok(isNodeInRegion(node, path(node.rawName.includes('abducens') ? 'vi' : 'iii'), () => null));
  }
  const tractPath = [...scope, 'tracts'];
  const tractPlan = planRegionIsolation(nodes, 'nervous', tractPath, node => cranialNervePathForGroup(node, tractPath))!;
  for (const id of context) assert.ok(tractPlan.show.includes(id));
  const mlf = nodes.filter(node => cranialNervePathForGroup(node, scope)?.[3] === 'tracts');
  assert.equal(mlf.length, 11);
  assert.ok(mlf.every(node => foreground.has(node.instanceID) && tractPlan.show.includes(node.instanceID)));
  const rootPlan = planRegionIsolation(nodes, 'nervous', scope, node => cranialNervePathForGroup(node, scope))!;
  for (const name of ['Superior rectus muscle.l', 'Lateral rectus muscle.r',
    'Abducens nerve (VI).r', 'Oculomotor nerve (cisternal and cavernous part).l', 'Optic tract.r']) {
    assert.ok(rootPlan.hide.includes(object(name).instanceID), name);
  }
  const eyeMembers = (nerve: string) => nodes.filter(node => cranialNervePathForGroup(node, path(nerve))?.[3] === 'eyes').map(node => node.instanceID);
  assert.deepEqual(eyeMembers('iv'), eyeMembers('ii'), 'Reuse the complete source eye collection');
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[3]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of ['Brainstem (semitransparent)', 'Eye structures', 'Annulus of Zinn', 'Innervated muscles', 'Fiber tracts', 'Nuclei']) {
    assert.ok(html.includes(label), label);
  }
  assert.ok(html.includes('Orbital bones (semitransparent)'));
});

test('IV adds only sphenoid, ethmoid and frontal bones as retained 18% context without extending III bone membership', () => {
  const scope = path('iv');
  const musclesPath = [...scope, 'muscles'];
  const plan = planRegionIsolation(nodes, 'nervous', musclesPath, node => cranialNervePathForGroup(node, musclesPath))!;
  const context = cranialNerveContextIds(nodes, scope);
  const foreground = cranialNerveForegroundIds(nodes, scope);
  for (const name of ['Sphenoid bone', 'Ethmoid bone', 'Frontal bone']) {
    const node = object(name);
    assert.equal(node.systemId, 'skeletal');
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW));
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'bone-context']);
    assert.ok(context.includes(node.instanceID));
    assert.ok(!foreground.includes(node.instanceID));
    assert.ok(plan.show.includes(node.instanceID));
    const rawName = `${name}.001_123`;
    assert.equal(systemForMeshName(rawName), 'skeletal');
    assert.ok(isNodeInRegion({ ...node, rawName }, scope, () => null));
    assert.equal(cranialNervePathForGroup(node, path('ii')), null);
    if (name !== 'Sphenoid bone') assert.equal(cranialNervePathForGroup(node, path('iii')), null);
  }
  assert.ok(plan.hide.includes(object('Parietal bone.l').instanceID));
});

test('VI includes bilateral globes, annuli and lateral rectus with retained semitransparent brainstem and sphenoid, but no other ocular muscles or bones', () => {
  const scope = path('vi');
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  const musclePath = [...scope, 'muscles'];
  const plan = planRegionIsolation(nodes, 'nervous', musclePath, node => cranialNervePathForGroup(node, musclePath))!;
  for (const name of ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r', 'Medulla oblongata.l', 'Medulla oblongata.r', 'Sphenoid bone']) {
    const node = object(name);
    assert.ok(context.has(node.instanceID), name);
    assert.ok(!foreground.has(node.instanceID), name);
    assert.ok(plan.show.includes(node.instanceID), name);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW), name);
  }
  assert.equal(context.size, 7);
  for (const side of ['l', 'r']) {
    for (const [base, role] of [['Abducens nerve (VI)', 'nerves'], ['Nucleus of abducens nerve', 'nuclei'],
      ['Common tendinous ring', 'annulus'], ['Lateral rectus muscle', 'muscles']]) {
      const node = object(`${base}.${side}`);
      assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, role]);
      assert.ok(foreground.has(node.instanceID), node.rawName);
      assert.ok(!context.has(node.instanceID), node.rawName);
      const rawName = `${node.rawName}.001_123`;
      const systemId = systemForMeshName(rawName);
      assert.ok(systemId, rawName);
      const alias = { ...node, rawName, systemId };
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW), rawName);
      assert.ok(isNodeInRegion(alias, scope, () => null), rawName);
      if (role === 'muscles') assert.ok(plan.show.includes(node.instanceID), node.rawName);
    }
  }
  let eyeCount = 0;
  for (const line of readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('OBJECT,Eye,')) continue;
    const node = object(line.split(',')[4]);
    assert.deepEqual(cranialNervePathForGroup(node, scope), [...scope, 'eyes'], node.rawName);
    assert.ok(foreground.has(node.instanceID), node.rawName);
    assert.ok(isNodeAllowedInAtlasView(node, CRANIAL_NERVES_VIEW));
    eyeCount++;
  }
  assert.ok(eyeCount > 0);
  for (const name of ['Ethmoid bone', 'Frontal bone', 'Parietal bone.l', 'Superior oblique muscle.l',
    'Superior rectus muscle.r', 'Medial rectus muscle.l', 'Inferior rectus muscle.r',
    'Oculomotor nerve (cisternal and cavernous part).l', 'Optic tract.r', 'Nucleus of trochlear nerve.l']) {
    const node = object(name);
    assert.equal(cranialNervePathForGroup(node, scope), null, name);
    assert.ok(plan.hide.includes(node.instanceID), name);
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[5]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  for (const label of ['Brainstem (semitransparent)', 'Sphenoid bone (semitransparent)',
    'Eye structures', 'Annulus of Zinn', 'Innervated muscles']) assert.ok(html.includes(label), label);
});

test('VII has precentral gyri, corticopontine fibers, translucent pons, facial nuclei, nerve and source-confirmed muscles; XI has SCM and trapezius', () => {
  for (const name of ['Precentral gyrus.l', 'Pons.r', 'Fronto pontine fibers.r',
    'Motor nucleus of facial nerve.l', 'Facial nerve (VII).r',
    'Orbicularis oris muscle.l', 'Orbital part of orbicularis oculi.r',
    'Posterior belly of digastric muscle.r', 'Stylohyoid muscle.l', 'Platysma.r']) {
    assert.ok(isNodeInRegion(object(name), path('vii'), () => null), name);
  }
  assert.ok(cranialNerveContextIds(nodes, path('vii')).includes(object('Midbrain.r').instanceID));
  assert.ok(cranialNerveContextIds(nodes, path('vii')).includes(object('Temporal bone.l').instanceID));
  assert.equal(cranialNervePathForGroup(object('Anterior belly of digastric muscle.r'), path('vii')), null);
  for (const name of ['Nucleus of accessory nerve.l', 'Accessory nerve (XI).r',
    'Sternocleidomastoid muscle.l', 'Descending part of trapezius muscle.r']) {
    assert.ok(isNodeInRegion(object(name), path('xi'), () => null));
  }
  assert.equal(nodes.filter(node => cranialNervePathForGroup(node, path('xi'))?.[3] === 'muscles').length, 8);
  const nucleusPath = [...path('vii'), 'nuclei'];
  const plan = planRegionIsolation(nodes, 'nervous', nucleusPath, node => cranialNervePathForGroup(node, nucleusPath))!;
  assert.ok(plan.show.includes(object('Superior salivatory nucleus.r').instanceID));
  assert.ok(plan.show.includes(object('Orbicularis oris muscle.l').instanceID));
});

test('XI adds bilateral semitransparent brainstem and temporal bones while preserving opaque accessory nerves, nuclei and muscle targets', () => {
  const scope = path('xi');
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  const musclePath = [...scope, 'muscles'];
  const plan = planRegionIsolation(nodes, 'nervous', musclePath, node => cranialNervePathForGroup(node, musclePath))!;
  assert.equal(context.size, 8);
  for (const side of ['l', 'r']) {
    for (const base of ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone']) {
      const node = object(`${base}.${side}`);
      assert.ok(context.has(node.instanceID), node.rawName);
      assert.ok(!foreground.has(node.instanceID), node.rawName);
      assert.ok(plan.show.includes(node.instanceID), node.rawName);
      const rawName = `${node.rawName}.001_123`;
      const systemId = systemForMeshName(rawName);
      assert.ok(systemId, rawName);
      const alias = { ...node, rawName, systemId };
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW));
      assert.deepEqual(cranialNervePathForGroup(alias, scope), cranialNervePathForGroup(node, scope));
    }
    for (const base of ['Accessory nerve (XI)', 'Nucleus of accessory nerve', 'Sternocleidomastoid muscle',
      'Descending part of trapezius muscle', 'Transverse part of trapezius muscle', 'Ascending part of trapezius muscle']) {
      const node = object(`${base}.${side}`);
      assert.ok(foreground.has(node.instanceID), node.rawName);
      assert.ok(!context.has(node.instanceID), node.rawName);
    }
  }
  for (const name of ['Sphenoid bone', 'Ethmoid bone', 'Frontal bone', 'Stylopharyngeus muscle.l', 'Nucleus ambiguus.r']) {
    assert.equal(cranialNervePathForGroup(object(name), scope), null, name);
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[10]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  assert.ok(html.includes('Brainstem (semitransparent)'));
  assert.ok(html.includes('Temporal bones (semitransparent)'));
});

test('XII retains nine brainstem and bone context meshes, with opaque hypoglossal nerves, nuclei and four exported tongue muscle meshes', () => {
  const scope = path('xii');
  const context = new Set(cranialNerveContextIds(nodes, scope));
  const foreground = new Set(cranialNerveForegroundIds(nodes, scope));
  const musclePath = [...scope, 'muscles'];
  const plan = planRegionIsolation(nodes, 'nervous', musclePath, node => cranialNervePathForGroup(node, musclePath))!;
  assert.equal(context.size, 9);
  const contextNodes = nodes.filter(node => context.has(node.instanceID));
  assert.ok(context.has(object('Occipital bone').instanceID));
  for (const node of contextNodes) {
    assert.ok(plan.show.includes(node.instanceID), node.rawName);
    assert.ok(!foreground.has(node.instanceID));
    const rawName = `${node.rawName}.001_123`;
    const systemId = systemForMeshName(rawName);
    assert.ok(systemId, rawName);
    const alias = { ...node, rawName, systemId };
    assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW));
    assert.deepEqual(cranialNervePathForGroup(alias, scope), cranialNervePathForGroup(node, scope));
    if (node.rawName === 'Occipital bone') {
      assert.equal(systemId, 'skeletal');
      assert.equal(cranialNervePathForGroup(alias, path('xi')), null);
    }
  }
  for (const side of ['l', 'r']) {
    for (const base of ['Midbrain', 'Pons', 'Medulla oblongata', 'Temporal bone']) {
      assert.ok(context.has(object(`${base}.${side}`).instanceID));
    }
    for (const base of ['Hypoglossal nerve (XII)', 'Nucleus of hypoglossal nerve', 'Genioglossus muscle', 'Hyoglossus muscle']) {
      const node = object(`${base}.${side}`);
      assert.ok(foreground.has(node.instanceID), node.rawName);
      assert.ok(!context.has(node.instanceID));
      const rawName = `${node.rawName}.001_123`;
      const systemId = systemForMeshName(rawName);
      assert.ok(systemId, rawName);
      const alias = { ...node, rawName, systemId };
      assert.ok(isNodeAllowedInAtlasView(alias, CRANIAL_NERVES_VIEW));
      assert.deepEqual(cranialNervePathForGroup(alias, scope), cranialNervePathForGroup(node, scope));
      if (base.endsWith('muscle')) {
        assert.equal(node.systemId, 'muscular');
        assert.ok(plan.show.includes(node.instanceID));
      }
    }
  }
  assert.equal(nodes.filter(node => cranialNervePathForGroup(node, scope)?.[3] === 'muscles').length, 4);
  for (const name of ['Geniohyoid muscle.l', 'Thyrohyoid muscle.r', 'Palatopharyngeus muscle.l',
    'Stylopharyngeus muscle.r', 'Sternocleidomastoid muscle.l', 'Sphenoid bone', 'Frontal bone']) {
    assert.equal(cranialNervePathForGroup(object(name), scope), null, name);
    assert.ok(plan.hide.includes(object(name).instanceID), name);
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [CRANIAL_NERVE_GROUPS[11]], nodes, initialExpanded: new Set([scope.join('/')]),
    pathForNode: node => cranialNervePathForGroup(node, scope), pathForGroup: cranialNervePathForGroup,
    onSetVisibility: () => {}, onIsolate: () => {}, isolatedPath: null, onRestore: () => {},
    onSelect: () => {}, toggleVisibility: () => {}, onToggleFade: () => {}, fadedNodeIds: new Set(),
  }));
  assert.ok(html.includes('Brainstem (semitransparent)'));
  assert.ok(html.includes('Temporal and occipital bones (semitransparent)'));
  assert.ok(html.includes('Innervated muscles'));
});

test('cranial strip, sidebar and collections-only fullscreen keep muscle names and reuse region controls without generic Brain category cards', () => {
  const noop = () => {};
  for (const variant of ['strip', 'sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(CranialNerveMenu, {
      variant, nodes, activeNerveId: path('xi').join('/'), selectedNodeId: object('Sternocleidomastoid muscle.l').instanceID,
      onActivateNerve: noop, isolatedRegionPath: null, onIsolateRegion: noop, onRestoreRegion: noop, onSetRegionVisibility: noop,
    }));
    assert.ok(html.includes(variant === 'strip' ? 'XII' : 'Sternocleidomastoid muscle.l'));
    if (variant !== 'strip') assert.ok(html.includes('Muscular system'));
    if (variant === 'fullscreen') assert.ok(!html.includes('data-testid="mesh-row-'));
    assert.ok(!html.includes('Brain gross anatomy'));
  }
});
