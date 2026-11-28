import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import inventory from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import { csvRows, systemForMeshName } from './anatomicalSystems';
import { THALAMUS_CAPSULE_VIEW, ATLAS_VIEWS, FULL_ANATOMY_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { THALAMUS_CAPSULE_GROUPS as groups, THALAMUS_CAPSULE_ROOT_PATH as root,
  thalamusCapsulePathForGroup, thalamusCapsuleContextIds, thalamusCapsuleMissingComponents } from './thalamusCapsuleTaxonomy';
import { THALAMUS_COMPONENTS, THALAMIC_NUCLEUS_IDS } from './thalamusCapsuleDefinition';
import gross from './brainGrossAnatomyMemberships.json';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { normalizeAdvancedObjectName } from './advancedCollection';
import { planRegionIsolation } from '../lib/regionIsolation';
import { ThalamusCapsuleMenu } from '../components/ThalamusCapsuleMenu';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const names = [...new Set(csvRows(inventory).filter(row => row[0] === 'OBJECT' && row[5] === 'MESH').map(row => row[4]))];
const node = (rawName: string, i = 0): SceneNode => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: systemForMeshName(rawName),
});
const nodes = names.map(node);
const get = (name: string) => { const n = nodes.find(n => n.rawName === name); assert.ok(n, name); return n; };
const path = (...parts: string[]) => [...root, ...parts];
const flattenGroups = (group: typeof groups[number]): typeof groups =>
  [group, ...group.children?.flatMap(flattenGroups) ?? []];
const allNuclearGroups = groups[1].children!.flatMap(flattenGroups);
function plan(...parts: string[]) {
  const p = path(...parts);
  const result = planRegionIsolation(nodes, 'nervous', p, n => advancedNeuroanatomyPathForGroup(n, p));
  assert.ok(result, parts.join('/'));
  return result;
}
function included(parts: string[], ...wanted: string[]) {
  const shown = plan(...parts).show;
  for (const name of wanted) assert.ok(shown.includes(get(name).instanceID), `${parts.join('/')}: ${name}`);
}

test('new Explore Atlas entry uses the supplied model, keeps previous atlases and exposes exact requested groups', () => {
  assert.equal(ATLAS_VIEWS[0], FULL_ANATOMY_VIEW);
  assert.ok(ATLAS_VIEWS.includes(THALAMUS_CAPSULE_VIEW));
  assert.equal(THALAMUS_CAPSULE_VIEW.modelUid, '8abdb885c8c146068ca1c801a16f2b9f');
  assert.equal(THALAMUS_CAPSULE_VIEW.href, '/atlas/thalamus-internal-capsule');
  assert.equal(THALAMUS_CAPSULE_VIEW.label, 'Thalamus and internal capsule');
  assert.deepEqual(groups.map(g => g.label), ['Internal capsule', 'Thalamic nuclei', 'Thalamocortical pathways']);
  assert.deepEqual(groups.map(g => g.children!.length), [5, 8, 7]);
  assert.deepEqual(groups[0].children!.map(g => g.label),
    ['Anterior Limb', 'Genu', 'Posterior Limb', 'Retrolenticular Part', 'Sublenticular Part']);
  assert.deepEqual(groups[1].children!.map(g => g.label),
    ['Anterior', 'Mediodorsal', 'Ventral anterior — VA, VL', 'Ventral posterior — VPL, VPM',
      'Lateral', 'Posterior', 'Intralaminar and Midline', 'Metathalamus']);
  assert.deepEqual(groups[1].children!.map(g => g.children!.length), [3, 1, 2, 2, 2, 3, 3, 2]);
  const ventral = groups[1].children!.filter(g => g.id.includes('/ventral-'));
  assert.deepEqual(ventral.map(g => g.children!.map(n => n.label)), [['VA', 'VL'], ['VPL', 'VPM']]);
  assert.ok(!groups[1].children!.some(g => g.id.endsWith('/ventral')));
  assert.deepEqual(groups[2].children!.map(g => g.label),
    ['Motor', 'Somatosensory', 'Prefrontal', 'Limbic', 'Parietal Association', 'Visual', 'Auditory']);
});

test('capsule subdivisions show corresponding fibers, nuclei and cortical regions, hiding unrelated source anatomy', () => {
  included(['internal-capsule', 'anterior-limb'], 'Fronto pontine fibers.l', 'Mediodorsal thalamic fibers.r',
    '01_Anterior_ventral_AV', '04_Mediodorsal_MD.l', 'Middle frontal gyrus.l');
  included(['internal-capsule', 'genu'], 'Corticospinal tract face.l', 'Precentral gyrus.r', 'Motor nucleus of facial nerve.l');
  included(['internal-capsule', 'posterior-limb'], 'Corticospinal tract arm.l', 'Corticospinal tract trunk.r',
    'Corticospinal tract legs.l', 'Somatosensory tract arm.r', 'Somatosensory tract trunk.l', 'Somatosensory tract legs.r',
    '10_Ventral_anterior_VA', '11_Ventral_lateral_VL', '12_Ventral_posterolateral_VPL', '13_Ventral_posteromedial_VPM',
    'Precentral gyrus.l', 'Postcentral gyrus.r');
  included(['internal-capsule', 'retrolenticular'], 'Optic radiation.l', 'Pulvinar fibers.r', 'Lateral geniculate body.r', '14_Pulvinar_medial_PuM');
  included(['internal-capsule', 'sublenticular'], 'Auditory fibers.r', 'Medial geniculate body.l', 'Transverse temporal gyri.r');
  assert.ok(plan('internal-capsule', 'sublenticular').hide.includes(get('Optic radiation.l').instanceID),
    'do not relabel the whole optic radiation as a separate temporal segment');
  for (const section of groups[0].children!) {
    const result = plan('internal-capsule', section.id.split('/').at(-1)!);
    assert.ok(result.hide.includes(get('Ulnar nerve.l').instanceID));
  }
});

test('capsule subdivisions include descending corticopontine systems without replacing existing projections', () => {
  const sides = (names: string[]) => names.flatMap(name => [`${name}.l`, `${name}.r`]);
  const cases = [
    { id: 'anterior-limb', fibers: ['Fronto pontine fibers', 'Pontocerebellar fibers'],
      cortex: ['Superior frontal gyrus', 'Middle frontal gyrus'], retain: ['Mediodorsal thalamic fibers'] },
    { id: 'retrolenticular', fibers: ['Parietopontine fibers', 'Occipitopontine fibers', 'Pontocerebellar fibers'],
      cortex: ['Superior parietal lobule', 'Cuneus'], retain: ['Optic radiation', 'Pulvinar fibers'] },
    { id: 'sublenticular', fibers: ['Temporoponne fibers', 'Pontocerebellar fibers'],
      cortex: ['Middle temporal gyrus', 'Superior temporal gyrus (Lateral part)', 'Transverse temporal gyri'], retain: ['Auditory fibers'] },
  ];
  for (const c of cases) {
    const p = path('internal-capsule', c.id);
    included(['internal-capsule', c.id], ...sides([...c.fibers, ...c.cortex, ...c.retain]));
    const context = thalamusCapsuleContextIds(nodes, p);
    for (const name of sides([...c.fibers, ...c.retain])) {
      assert.ok(!context.includes(get(name).instanceID), `${c.id}: preserve ${name}`);
      assert.ok(thalamusCapsulePathForGroup(node(`${name}.001_123`), p), name);
    }
    for (const name of sides(c.cortex)) assert.ok(context.includes(get(name).instanceID), name);
    for (const other of cases.filter(other => other.id !== c.id))
      for (const name of sides(other.fibers.filter(name => !c.fibers.includes(name))))
        assert.ok(plan('internal-capsule', c.id).hide.includes(get(name).instanceID), `${c.id}: exclude ${name}`);
  }
  assert.ok(plan('internal-capsule', 'sublenticular').hide.includes(get('Lateral occipitotemporal gyrus.l.001').instanceID));
  const anterior = path('internal-capsule', 'anterior-limb');
  assert.ok(thalamusCapsuleMissingComponents(nodes, anterior).includes('Pontine nuclei'));
  const pontine = node('Pontine nuclei.l', 99000);
  assert.ok(thalamusCapsulePathForGroup(pontine, anterior));
  assert.ok(!thalamusCapsuleMissingComponents([...nodes, pontine], anterior).includes('Pontine nuclei'));
  assert.deepEqual(thalamusCapsuleContextIds([pontine], anterior), []);
  assert.equal(thalamusCapsulePathForGroup(node('Principal (pontine) nucleus of trigeminal nerve.l'), anterior), null);
});

test('posterior limb shows the complete preceding cerebellothalamic connections and motor thalamocortical continuation', () => {
  const parts = ['internal-capsule', 'posterior-limb'];
  const p = path(...parts);
  const sourceNames = ['Dentate_nucleus', 'Nucleus_globosus', 'Nucleus_emboliformis',
    'Dentatorubrothalamic tract', 'Interpositothalamic tract',
    'Red nucleus', 'Thalamocortical fibers to VL and VA'];
  const foreground = sourceNames.flatMap(name => [`${name}.l`, `${name}.r`])
    .concat(['10_Ventral_anterior_VA', '11_Ventral_lateral_VL']);
  included(parts, ...foreground, 'Precentral gyrus.l', 'Precentral gyrus.r',
    'Superior cerebellar peduncle.l', 'Superior cerebellar peduncle.r',
    'Superior frontal gyrus.l', 'Superior frontal gyrus.r',
    'Corticospinal tract arm.l', 'Somatosensory tract legs.r');
  const context = thalamusCapsuleContextIds(nodes, p);
  for (const name of foreground) {
    assert.ok(!context.includes(get(name).instanceID), `preserve ${name}`);
    const alias = node(`${name}.001_123`);
    assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), []);
  }
  for (const name of ['Precentral gyrus.l', 'Superior frontal gyrus.r', 'Pons.l', 'Thalamus.r',
    'Superior cerebellar peduncle.l', 'Superior cerebellar peduncle.r'])
    assert.ok(context.includes(get(name).instanceID), name);
  for (const id of ['dentatorubrothalamic', 'interpositothalamic', 'superiorPeduncle'] as const)
    assert.equal(THALAMUS_COMPONENTS[id].role, 'preceding-connection');
  assert.equal(THALAMUS_COMPONENTS.redNucleus.role, 'associated-structure');
  for (const name of ['Dentate Gyrus.l', 'Rubrospinal tract.r', 'Pontocerebellar fibers.l'])
    assert.ok(plan(...parts).hide.includes(get(name).instanceID), `do not substitute ${name}`);
  for (const other of ['anterior-limb', 'genu', 'retrolenticular', 'sublenticular'])
    for (const name of foreground)
      assert.ok(plan('internal-capsule', other).hide.includes(get(name).instanceID), `${other}: ${name}`);
});

test('superior cerebellar peduncles fade bilaterally, including aliases, without fading connecting tracts', () => {
  for (const parts of [['internal-capsule', 'posterior-limb'], ['internal-capsule'], []]) {
    const p = path(...parts);
    const context = thalamusCapsuleContextIds(nodes, p);
    for (const side of ['l', 'r']) {
      const name = `Superior cerebellar peduncle.${side}`;
      included(parts, name);
      assert.ok(context.includes(get(name).instanceID), name);
      const alias = node(`${name}.001_123`);
      assert.deepEqual(thalamusCapsuleContextIds([alias], p), [alias.instanceID]);
      for (const tract of ['Dentatorubrothalamic tract', 'Interpositothalamic tract', 'Thalamocortical fibers to VL and VA'])
        assert.ok(!context.includes(get(`${tract}.${side}`).instanceID), tract);
    }
  }
  assert.equal(THALAMUS_COMPONENTS.superiorPeduncle.role, 'preceding-connection');
});

test('redundant explanatory paragraphs are absent from sidebar and fullscreen without removing controls', () => {
  const required: Record<string, string[]> = {
    'anterior-limb': ['Descending frontopontocerebellar pathway', 'Pontine nuclei', 'Not separately identified in this model'],
    'posterior-limb': ['Deep cerebellar nuclei → Superior cerebellar peduncle → Contralateral motor thalamus (VL/VA)',
      'Posterior limb of internal capsule → Motor/premotor cortex', 'not fibers within the internal capsule',
      'red nucleus is an associated structure'],
    retrolenticular: ['Parietopontine and occipitopontine fibers'],
    sublenticular: ['Descending temporopontine pathway', 'Temporoponne fibers'],
  };
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    for (const [subdivision, snippets] of Object.entries(required)) {
      const html = renderToStaticMarkup(createElement(ThalamusCapsuleMenu, {
        nodes, variant, activeNerveId: groups[0].id, isolatedRegionPath: path('internal-capsule', subdivision),
        onActivateNerve: () => {}, onIsolateRegion: () => {}, onRestoreRegion: () => {},
        onSetRegionVisibility: () => {}, selectedNodeId: null,
      }));
      for (const snippet of snippets) assert.ok(!html.includes(snippet), `${variant}/${subdivision}: removed ${snippet}`);
      assert.ok(!html.includes('Selecting an entry shows its available nucleus'));
      assert.ok(!html.includes('Corresponding cortical regions are drawn translucent'));
      assert.ok(html.includes('THALAMUS, INTERNAL CAPSULE AND THALAMOCORTICAL PATHWAYS'));
      assert.ok(html.includes('Show all'));
      assert.ok(html.includes('Restore previous view'));
    }
  }
});

test('internal capsule includes the complete parietal-association pathway without changing its five subdivisions', () => {
  const p = path('internal-capsule');
  const source = path('thalamocortical-pathways', 'parietal-association');
  const shown = plan('internal-capsule').show;
  const context = thalamusCapsuleContextIds(nodes, p);
  const associationContext = thalamusCapsuleContextIds(nodes, source);
  for (const n of nodes.filter(n => thalamusCapsulePathForGroup(n, source))) {
    assert.ok(shown.includes(n.instanceID), n.rawName);
    assert.equal(context.includes(n.instanceID), associationContext.includes(n.instanceID), n.rawName);
    const alias = node(`${n.rawName}.001_123`);
    assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
  }
  const fibers = ['Thalamocortical from lateral LD and LP', 'Thalamocortical from lateral pulvinar to parietal cortex'];
  for (const name of fibers.flatMap(name => [`${name}.l`, `${name}.r`])) {
    assert.ok(shown.includes(get(name).instanceID), name);
    assert.ok(!context.includes(get(name).instanceID), `preserve ${name}`);
  }
  for (const side of ['l', 'r'])
    assert.ok(context.includes(get(`Superior parietal lobule.${side}`).instanceID));
  assert.ok(plan('internal-capsule', 'anterior-limb').hide.includes(get(`${fibers[0]}.l`).instanceID));
  assert.ok(!shown.includes(get('Ulnar nerve.l').instanceID));
  assert.equal(groups[0].children!.length, 5);
});

test('all frontal collections exclude temporal lateral occipitotemporal gyri and export aliases', () => {
  const p = path('internal-capsule', 'anterior-limb');
  const result = plan('internal-capsule', 'anterior-limb');
  const cortex = thalamusCapsuleContextIds(nodes, p);
  for (const name of ['Lateral occipitotemporal gyrus.l', 'Lateral occipitotemporal gyrus.r',
    'Lateral occipitotemporal gyrus.l.001']) {
    const n = get(name);
    assert.ok(result.hide.includes(n.instanceID), name);
    assert.equal(thalamusCapsulePathForGroup(n, p), null);
    assert.ok(!cortex.includes(n.instanceID), name);
    const alias = node(`${name}_123`);
    assert.equal(thalamusCapsulePathForGroup(alias, p), null);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), []);
    for (const parts of [['thalamocortical-pathways', 'prefrontal'], ['thalamic-nuclei', 'mediodorsal', 'md']]) {
      const requested = path(...parts);
      assert.equal(thalamusCapsulePathForGroup(n, requested), null);
      assert.equal(thalamusCapsulePathForGroup(alias, requested), null);
      assert.ok(!thalamusCapsuleContextIds(nodes, requested).includes(n.instanceID));
      assert.ok(plan(...parts).hide.includes(n.instanceID));
    }
  }
  included(['internal-capsule', 'anterior-limb'], 'Middle frontal gyrus.l', 'Mediodorsal thalamic fibers.r');
});

test('anterior limb retains pontocerebellar continuation and transparent gross brainstem and cerebellum', () => {
  const p = path('internal-capsule', 'anterior-limb');
  const grossNames = ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r', 'Medulla oblongata.l',
    'Medulla oblongata.r', 'Biventral lobule.l', 'Biventral lobule.r', 'Declive'];
  included(['internal-capsule', 'anterior-limb'], 'Pontocerebellar fibers.l', 'Pontocerebellar fibers.r', ...grossNames);
  const context = thalamusCapsuleContextIds(nodes, p);
  for (const name of grossNames) {
    assert.ok(context.includes(get(name).instanceID), name);
    const alias = node(`${name}.001_123`);
    assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), [alias.instanceID]);
    if (!/^(Midbrain|Pons|Medulla oblongata)\./.test(name))
      assert.ok(plan('internal-capsule', 'posterior-limb').hide.includes(get(name).instanceID));
  }
  for (const name of ['Fronto pontine fibers.l', 'Pontocerebellar fibers.l', 'Pontocerebellar fibers.r', '04_Mediodorsal_MD'])
    assert.ok(!context.includes(get(name).instanceID), name);
  assert.ok(plan('internal-capsule', 'posterior-limb').hide.includes(get('Pontocerebellar fibers.l').instanceID));
});

test('genu retains translucent thalamic capsule, basal ganglia and gross brainstem while motor nuclei and fibers keep source materials', () => {
  const p = path('internal-capsule', 'genu');
  const context = thalamusCapsuleContextIds(nodes, p);
  const wanted = ['Thalamus.l', 'Thalamus.r', '00_Thalamic_background_core.l',
    'Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r', 'Medulla oblongata.l', 'Medulla oblongata.r'];
  for (const name of ['Caudate nucleus', 'Putamen', 'Globus pallidus externus', 'Globus pallidus internus',
    'Nucleus accumbens', 'Subthalamic nucleus', 'Substantia nigra pars compacta'])
    for (const side of ['l', 'r']) wanted.push(`${name}.${side}`);
  wanted.push('Substantia nigra pars reticularis..l', 'Substantia nigra pars reticularis..r');
  included(['internal-capsule', 'genu'], ...wanted);
  for (const name of wanted) {
    assert.ok(context.includes(get(name).instanceID), name);
    const alias = node(`${name}.001_123`);
    assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), [alias.instanceID]);
  }
  for (const name of ['Corticospinal tract face.l', 'Motor nucleus of facial nerve.r', 'Nucleus of hypoglossal nerve.l']) {
    included(['internal-capsule', 'genu'], name);
    assert.ok(!context.includes(get(name).instanceID), name);
  }
  for (const category of ['anterior-limb'])
    assert.ok(plan('internal-capsule', category).hide.includes(get('Putamen.l').instanceID), category);
  assert.ok(plan('internal-capsule', 'genu').hide.includes(get('Biventral lobule.l').instanceID));
});

test('posterior limb shows translucent bilateral basal ganglia and brainstem without fading pathway fibers or nuclei', () => {
  const p = path('internal-capsule', 'posterior-limb');
  const wanted = ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r', 'Medulla oblongata.l', 'Medulla oblongata.r'];
  for (const name of ['Caudate nucleus', 'Putamen', 'Globus pallidus externus', 'Globus pallidus internus',
    'Nucleus accumbens', 'Subthalamic nucleus', 'Substantia nigra pars compacta'])
    for (const side of ['l', 'r']) wanted.push(`${name}.${side}`);
  wanted.push('Substantia nigra pars reticularis..l', 'Substantia nigra pars reticularis..r');
  included(['internal-capsule', 'posterior-limb'], ...wanted);
  const context = thalamusCapsuleContextIds(nodes, p);
  for (const name of wanted) {
    assert.ok(context.includes(get(name).instanceID), name);
    const alias = node(`${name}.001_123`);
    assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), [alias.instanceID]);
  }
  for (const name of ['Corticospinal tract arm.l', 'Somatosensory tract legs.r', '12_Ventral_posterolateral_VPL',
    'Dentate_nucleus.l', 'Nucleus_globosus.r', 'Nucleus_emboliformis.l', 'Red nucleus.r',
    'Dentatorubrothalamic tract.l', 'Interpositothalamic tract.r',
    'Thalamocortical fibers to VL and VA.r', '10_Ventral_anterior_VA', '11_Ventral_lateral_VL']) {
    included(['internal-capsule', 'posterior-limb'], name);
    assert.ok(!context.includes(get(name).instanceID), name);
  }
  for (const name of ['Biventral lobule.l', 'Pontocerebellar fibers.l'])
    assert.ok(plan('internal-capsule', 'posterior-limb').hide.includes(get(name).instanceID), name);
});

test('retrolenticular includes translucent gross brainstem and cerebellum with opaque pontocerebellar fibers', () => {
  const parts = ['internal-capsule', 'retrolenticular'];
  const p = path(...parts);
  const gross = ['Midbrain.l', 'Midbrain.r', 'Pons.l', 'Pons.r', 'Medulla oblongata.l', 'Medulla oblongata.r',
    'Biventral lobule.l', 'Biventral lobule.r', 'Declive'];
  included(parts, ...gross, 'Pontocerebellar fibers.l', 'Pontocerebellar fibers.r');
  const context = thalamusCapsuleContextIds(nodes, p);
  for (const name of gross) {
    assert.ok(context.includes(get(name).instanceID), name);
    const alias = node(`${name}.001_123`);
    assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), [alias.instanceID]);
  }
  for (const name of ['Pontocerebellar fibers.l', 'Pontocerebellar fibers.r', 'Parietopontine fibers.l',
    'Occipitopontine fibers.r', 'Optic radiation.l', 'Pulvinar fibers.r', 'Lateral geniculate body.r']) {
    included(parts, name);
    assert.ok(!context.includes(get(name).instanceID), `preserve ${name}`);
    const alias = node(`${name}.001_123`);
    assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), []);
  }
  for (const name of ['Dentate_nucleus.l', 'Superior cerebellar peduncle.r', 'Dentatorubrothalamic tract.l'])
    assert.ok(plan(...parts).hide.includes(get(name).instanceID), name);
});

test('sublenticular limits temporal cortex to three gyri and includes gross context, pontocerebellar fibers and auditory nuclei', () => {
  const parts = ['internal-capsule', 'sublenticular'];
  const p = path(...parts);
  const result = plan(...parts);
  const context = thalamusCapsuleContextIds(nodes, p);
  const allowed = new Set(['Middle temporal gyrus', 'Superior temporal gyrus (Lateral part)', 'Transverse temporal gyri']
    .flatMap(name => [`${name}.l`, `${name}.r`]));
  for (const name of gross.temporal.filter(name => names.includes(name))) {
    const n = get(name);
    assert.equal(result.show.includes(n.instanceID), allowed.has(name), name);
    assert.equal(context.includes(n.instanceID), allowed.has(name), name);
    const alias = node(`${name}.001_123`);
    assert.equal(Boolean(thalamusCapsulePathForGroup(alias, p)), allowed.has(name), alias.rawName);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), allowed.has(name) ? [alias.instanceID] : []);
  }
  for (const name of ['Midbrain', 'Pons', 'Medulla oblongata', 'Biventral lobule'])
    for (const side of ['l', 'r']) {
      included(parts, `${name}.${side}`);
      assert.ok(context.includes(get(`${name}.${side}`).instanceID), name);
    }
  included(parts, 'Declive');
  assert.ok(context.includes(get('Declive').instanceID));
  for (const name of ['Pontocerebellar fibers', 'Temporoponne fibers', 'Auditory fibers',
    'Anterior cochlear nucleus', 'Posterior cochlear nucleus', 'Superior olivary complex',
    'N. of the lateral lemniscus', 'Inferior colliculus', 'Medial geniculate body'])
    for (const side of ['l', 'r']) {
      const rawName = `${name}.${side}`;
      included(parts, rawName);
      assert.ok(!context.includes(get(rawName).instanceID), `preserve ${rawName}`);
      const alias = node(`${rawName}.001_123`);
      assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
      assert.deepEqual(thalamusCapsuleContextIds([alias], p), []);
    }
  for (const name of ['Red nucleus.l', 'Dentate_nucleus.l', 'Optic radiation.l'])
    assert.ok(result.hide.includes(get(name).instanceID), `do not add unrelated ${name}`);
});

test('retro- and sublenticular views retain requested translucent caudate, putamen and pallidal orientation', () => {
  const wanted = ['Caudate nucleus', 'Putamen', 'Globus pallidus externus', 'Globus pallidus internus']
    .flatMap(name => [`${name}.l`, `${name}.r`]);
  for (const subdivision of ['retrolenticular', 'sublenticular']) {
    const p = path('internal-capsule', subdivision);
    included(['internal-capsule', subdivision], ...wanted);
    const context = thalamusCapsuleContextIds(nodes, p);
    for (const name of wanted) {
      assert.ok(context.includes(get(name).instanceID), `${subdivision}: ${name}`);
      const alias = node(`${name}.001_123`);
      assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
      assert.deepEqual(thalamusCapsuleContextIds([alias], p), [alias.instanceID]);
    }
    const foreground = subdivision === 'retrolenticular'
      ? ['Optic radiation.l', 'Lateral geniculate body.r', '14_Pulvinar_medial_PuM']
      : ['Auditory fibers.r', 'Medial geniculate body.l'];
    included(['internal-capsule', subdivision], ...foreground);
    for (const name of foreground)
      assert.ok(!context.includes(get(name).instanceID), `${subdivision}: preserve ${name}`);
    const excluded = ['Nucleus accumbens.l', 'Subthalamic nucleus.r'];
    for (const name of excluded)
      assert.ok(plan('internal-capsule', subdivision).hide.includes(get(name).instanceID), `${subdivision}: ${name}`);
  }
});

test('ventral anterior group retains bilateral superior frontal gyri with VA and VL', () => {
  const p = path('thalamic-nuclei', 'ventral-anterior');
  included(['thalamic-nuclei', 'ventral-anterior'], 'Superior frontal gyrus.l', 'Superior frontal gyrus.r',
    '10_Ventral_anterior_VA', '11_Ventral_lateral_VL', 'Thalamocortical fibers to VL and VA.l', 'Thalamus.l');
  const context = thalamusCapsuleContextIds(nodes, p);
  for (const name of ['Superior frontal gyrus.l', 'Superior frontal gyrus.r']) {
    assert.ok(context.includes(get(name).instanceID), name);
    const alias = node(`${name}.001_123`);
    assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), [alias.instanceID]);
  }
  for (const name of ['10_Ventral_anterior_VA', '11_Ventral_lateral_VL', '12_Ventral_posterolateral_VPL',
    '13_Ventral_posteromedial_VPM', 'Thalamocortical fibers to VL and VA.l'])
    assert.ok(!context.includes(get(name).instanceID), name);
  for (const id of ['va', 'vl'])
    included(['thalamic-nuclei', 'ventral-anterior', id], 'Superior frontal gyrus.l', 'Superior frontal gyrus.r');
  for (const id of ['vpl', 'vpm'])
    assert.ok(plan('thalamic-nuclei', 'ventral-posterior', id).hide.includes(get('Superior frontal gyrus.l').instanceID));
});

test('ventral extrapyramidal and sensory categories keep distinct nuclei, fibers and cortical targets', () => {
  const motorParts = ['thalamic-nuclei', 'ventral-anterior'];
  const sensoryParts = ['thalamic-nuclei', 'ventral-posterior'];
  const motorNames = ['10_Ventral_anterior_VA', '11_Ventral_lateral_VL',
    'Thalamocortical fibers to VL and VA.l', 'Thalamocortical fibers to VL and VA.r',
    'Superior frontal gyrus.l', 'Superior frontal gyrus.r'];
  const sensoryNames = ['12_Ventral_posterolateral_VPL', '13_Ventral_posteromedial_VPM',
    'Somatosensory tract arm.l', 'Somatosensory tract trunk.r', 'Somatosensory tract legs.l',
    'Somatosensory tract face.r', 'Postcentral gyrus.l', 'Postcentral gyrus.r'];
  included(motorParts, ...motorNames, 'Thalamus.l', 'Thalamus.r');
  included(sensoryParts, ...sensoryNames, 'Thalamus.l', 'Thalamus.r');
  const motorView = plan(...motorParts), sensoryView = plan(...sensoryParts);
  for (const name of sensoryNames) assert.ok(motorView.hide.includes(get(name).instanceID), name);
  for (const name of motorNames) assert.ok(sensoryView.hide.includes(get(name).instanceID), name);
  const context = thalamusCapsuleContextIds(nodes, path(...motorParts));
  assert.ok(context.includes(get('Superior frontal gyrus.l').instanceID));
  assert.ok(!context.includes(get('Thalamocortical fibers to VL and VA.l').instanceID));
});

test('each nuclear group shows every available nucleus, and each nucleus has an independent view', () => {
  for (const group of groups[1].children!) {
    const parts = group.id.split('/').slice(2);
    for (const nucleus of flattenGroups(group).filter(g => !g.children)) {
      const id = nucleus.id.split('/').at(-1)! as keyof typeof THALAMUS_COMPONENTS;
      const primary = THALAMUS_COMPONENTS[id].names[0];
      const source = names.find(name => name === primary || name === `${primary}.l`)!;
      assert.ok(source, primary);
      const matching = nodes.filter(n => thalamusCapsulePathForGroup(n, nucleus.id.split('/')));
      assert.ok(matching.length, nucleus.label);
      included(parts, source);
      included(nucleus.id.split('/').slice(2), source);
      const alias = node(`${primary}.l.001_123`);
      assert.ok(thalamusCapsulePathForGroup(alias, nucleus.id.split('/')), alias.rawName);
    }
  }
  included(['thalamic-nuclei', 'ventral-posterior', 'vpl'], 'Somatosensory tract arm.l', 'Postcentral gyrus.l');
  included(['thalamic-nuclei', 'ventral-posterior', 'vpm'], 'Somatosensory tract face.r', 'Postcentral gyrus.r');
  assert.ok(plan('thalamic-nuclei', 'ventral-posterior', 'vpm').hide.includes(get('12_Ventral_posterolateral_VPL').instanceID));
  included(['thalamic-nuclei', 'ventral-anterior', 'va'], 'Thalamocortical fibers to VL and VA.l', 'Superior frontal gyrus.l');
  included(['thalamic-nuclei', 'mediodorsal', 'md'], 'Mediodorsal thalamic fibers.r', 'Middle frontal gyrus.r');
  included(['thalamic-nuclei', 'anterior', 'av'], "bundle of Vicq d'Azyr tractus mamillothalamicus.l", 'Fibers from anterior thalamic nuclei.r');
  included(['thalamic-nuclei', 'lateral', 'ld'], 'Thalamocortical from lateral LD and LP.r');
  included(['thalamic-nuclei', 'metathalamus', 'lgb'], 'Optic radiation.l');
});

test('all categories with thalamic nuclei retain semitransparent outer surfaces without fading nuclei', () => {
  const surfaces = ['Thalamus.l', 'Thalamus.r', '00_Thalamic_background_core.l'];
  const visit = (group: typeof groups[number]) => {
    const p = group.id.split('/');
    const containsNucleus = [...THALAMIC_NUCLEUS_IDS].some(id => nodes.some(n =>
      n.rawName === THALAMUS_COMPONENTS[id].names[0] && thalamusCapsulePathForGroup(n, p))
      || nodes.some(n => n.rawName === `${THALAMUS_COMPONENTS[id].names[0]}.l` && thalamusCapsulePathForGroup(n, p)));
    const showCapsule = containsNucleus || group.id.endsWith('/internal-capsule/genu');
    const result = plan(...p.slice(2));
    const context = thalamusCapsuleContextIds(nodes, p);
    for (const name of surfaces) {
      const n = get(name);
      assert.equal(result.show.includes(n.instanceID), showCapsule, `${group.label}: ${name}`);
      assert.equal(context.includes(n.instanceID), showCapsule, `${group.label}: ${name} opacity`);
      assert.equal(Boolean(thalamusCapsulePathForGroup(node(`${name}.001_123`), p)), showCapsule);
    }
    for (const id of THALAMIC_NUCLEUS_IDS) {
      const rawName = THALAMUS_COMPONENTS[id].names[0];
      for (const n of nodes.filter(n => n.rawName === rawName || n.rawName === `${rawName}.l`))
        assert.ok(!context.includes(n.instanceID), `${group.label}: preserve ${n.rawName}`);
    }
    group.children?.forEach(visit);
  };
  groups.forEach(visit);
});

test('motor pathway adds translucent superior frontal gyri and basal ganglia without fading VA/VL or motor fibers', () => {
  const parts = ['thalamocortical-pathways', 'motor'];
  const p = path(...parts);
  const context = thalamusCapsuleContextIds(nodes, p);
  const wanted = ['Superior frontal gyrus.l', 'Superior frontal gyrus.r'];
  for (const name of ['Caudate nucleus', 'Putamen', 'Globus pallidus externus', 'Globus pallidus internus',
    'Nucleus accumbens', 'Subthalamic nucleus', 'Substantia nigra pars compacta'])
    for (const side of ['l', 'r']) wanted.push(`${name}.${side}`);
  wanted.push('Substantia nigra pars reticularis..l', 'Substantia nigra pars reticularis..r');
  included(parts, ...wanted, 'Precentral gyrus.l', 'Precentral gyrus.r',
    '10_Ventral_anterior_VA', '11_Ventral_lateral_VL',
    'Thalamocortical fibers to VL and VA.l', 'Thalamocortical fibers to VL and VA.r');
  for (const name of wanted) {
    assert.ok(context.includes(get(name).instanceID), name);
    const alias = node(`${name}.001_123`);
    assert.ok(thalamusCapsulePathForGroup(alias, p), alias.rawName);
    assert.deepEqual(thalamusCapsuleContextIds([alias], p), [alias.instanceID]);
    assert.equal(thalamusCapsulePathForGroup(get(name), path('thalamocortical-pathways', 'somatosensory')), null);
  }
  for (const name of ['10_Ventral_anterior_VA', '11_Ventral_lateral_VL',
    'Thalamocortical fibers to VL and VA.l', 'Thalamocortical fibers to VL and VA.r'])
    assert.ok(!context.includes(get(name).instanceID), `preserve ${name}`);
});

test('functional pathways include their nuclei/projections and fade only explicitly requested context meshes', () => {
  for (const group of groups[2].children!) {
    const parts = group.id.split('/').slice(2);
    const result = plan(...parts);
    const faded = thalamusCapsuleContextIds(nodes, group.id.split('/'));
    assert.ok(faded.length, group.label);
    for (const id of faded) {
      assert.ok(result.show.includes(id), group.label);
      const name = nodes.find(n => n.instanceID === id)!.rawName;
      assert.ok(name.startsWith('00_Thalamic_background_core')
        || (group.id.endsWith('/motor') && THALAMUS_COMPONENTS.basalGangliaOutline.names
          .some(base => normalizeAdvancedObjectName(base) === normalizeAdvancedObjectName(name)))
        || !/tract|fibers|radiation|nucle|geniculate|^\d\d_/i.test(name));
    }
  }
  const motor = thalamusCapsuleContextIds(nodes, path('thalamocortical-pathways', 'motor'));
  assert.ok(motor.includes(get('Precentral gyrus.l').instanceID));
  assert.ok(!motor.includes(get('Postcentral gyrus.l').instanceID));
  const sensory = thalamusCapsuleContextIds(nodes, path('thalamocortical-pathways', 'somatosensory'));
  assert.deepEqual(sensory, nodes.filter(n => /^Postcentral gyrus\.[lr]$/.test(n.rawName)
    || thalamusCapsuleContextIds([n], path('thalamic-nuclei', 'ventral-posterior')).length > 0
    || /^Thalamus\.[lr]$/.test(n.rawName) || n.rawName.startsWith('00_Thalamic_background_core')).map(n => n.instanceID));
  assert.ok(!isNodeAllowedInAtlasView(get('Ulnar nerve.l'), THALAMUS_CAPSULE_VIEW));
  assert.ok(isNodeAllowedInAtlasView(get('Optic radiation.l'), THALAMUS_CAPSULE_VIEW));
  assert.deepEqual(thalamusCapsuleContextIds(nodes, ['another-atlas']), []);
});

test('availability is based on live mesh names and never substitutes unrelated anatomy', () => {
  const p = path('internal-capsule', 'sublenticular');
  assert.ok(thalamusCapsuleMissingComponents(nodes, p).includes('Separately identifiable temporal optic radiations'));
  const live = [...nodes, node('Temporal optic radiation.r', 99999)];
  assert.ok(!thalamusCapsuleMissingComponents(live, p).includes('Separately identifiable temporal optic radiations'));
  assert.equal(thalamusCapsulePathForGroup(node('Auditory nerve.l'), p), null);
  assert.deepEqual(thalamusCapsuleMissingComponents(nodes, ['unrelated']), []);
});

test('retrolenticular posterior association radiations classify both pathways with independent left/right controls', () => {
  const parent = path('internal-capsule', 'retrolenticular', 'posterior-association-radiations');
  const retro = groups[0].children!.find(g => g.id.endsWith('/retrolenticular'))!;
  const association = retro.children!.find(g => g.id === parent.join('/'))!;
  assert.equal(association.label, 'Posterior Association Thalamic Radiations');
  assert.deepEqual(association.children!.map(g => g.label),
    ['LD/LP Thalamocortical Fibers', 'Pulvinar–Parietal Thalamocortical Fibers']);
  const allFiberIds: number[] = [];
  for (const [branch, stem] of [
    ['ld-lp', 'Thalamocortical from lateral LD and LP'],
    ['pulvinar-parietal', 'Thalamocortical from lateral pulvinar to parietal cortex'],
  ]) for (const [side, suffix, other] of [['left', 'l', 'r'], ['right', 'r', 'l']]) {
    const n = get(`${stem}.${suffix}`), opposite = get(`${stem}.${other}`);
    const sidePath = [...parent, branch, side];
    allFiberIds.push(n.instanceID);
    assert.deepEqual(thalamusCapsulePathForGroup(n, path('internal-capsule')), sidePath);
    assert.deepEqual(thalamusCapsulePathForGroup(n, parent), sidePath);
    assert.deepEqual(thalamusCapsulePathForGroup(n, [...parent, branch]), sidePath);
    assert.equal(thalamusCapsulePathForGroup(opposite, sidePath), null);
    for (const alias of [`${stem}.${suffix}.001_123`, `${stem} (${side === 'left' ? 'Left' : 'Right'})`])
      assert.deepEqual(thalamusCapsulePathForGroup(node(alias), sidePath), sidePath);
    const isolated = planRegionIsolation(nodes, 'nervous', sidePath, n => thalamusCapsulePathForGroup(n, sidePath))!;
    assert.deepEqual(isolated.show, [n.instanceID], 'Side controls address the complete original mesh, not clipped or fabricated segments');
    assert.ok(isolated.hide.includes(opposite.instanceID));
    assert.deepEqual(thalamusCapsuleContextIds(nodes, sidePath), [], 'Fiber keeps its source material');
    assert.deepEqual(thalamusCapsuleMissingComponents([opposite], sidePath), [THALAMUS_COMPONENTS[branch === 'ld-lp' ? 'lateralFibers' : 'parietalFibers'].label]);
  }
  const combined = planRegionIsolation(nodes, 'nervous', parent, n => thalamusCapsulePathForGroup(n, parent))!;
  assert.deepEqual(new Set(combined.show), new Set(allFiberIds));
  // A new child must not displace the retrolenticular parent's existing meshes.
  assert.deepEqual(thalamusCapsulePathForGroup(get('Optic radiation.l'), path('internal-capsule')),
    path('internal-capsule', 'retrolenticular'));
  assert.deepEqual(groups[0].children!.map(g => g.label),
    ['Anterior Limb', 'Genu', 'Posterior Limb', 'Retrolenticular Part', 'Sublenticular Part']);
});

test('menu reuses shared controls in strip, sidebar and fullscreen, with all nuclei independently exposed', () => {
  const props = { nodes: [], activeNerveId: null, onActivateNerve: () => {}, isolatedRegionPath: null,
    onIsolateRegion: () => {}, onRestoreRegion: () => {}, onSetRegionVisibility: () => {}, selectedNodeId: null };
  for (const variant of ['strip', 'sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(ThalamusCapsuleMenu, { ...props, variant }));
    for (const group of groups) assert.ok(html.includes(group.label), `${variant}: ${group.label}`);
    assert.ok(!html.includes('Fade/Unfade'));
  }
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: groups[1].children!, nodes, initialExpanded: new Set(allNuclearGroups.map(g => g.id)),
    fadedNodeIds: new Set<number>(), pathForNode: n => thalamusCapsulePathForGroup(n, root),
    pathForGroup: thalamusCapsulePathForGroup, isolatedPath: null, disableFade: true,
    onSetVisibility: () => {}, onIsolate: () => {}, onRestore: () => {}, onSelect: () => {},
    toggleVisibility: () => {}, onToggleFade: () => {},
  }));
  for (const group of allNuclearGroups) assert.ok(html.includes(group.label), group.label);
});
