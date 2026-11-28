import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BASAL_FOREBRAIN_GROUP, classifyBasalForebrainObject, isBasalForebrainContext, isBasalForebrainOpaqueNucleus, isBasalForebrainOpaqueStructure } from './basalForebrainTaxonomy';
import { advancedNeuroanatomyPathForGroup } from './advancedNeuroanatomy';
import { systemForMeshName } from './anatomicalSystems';
import { BRAIN_VIEW, isNodeAllowedInAtlasView } from './atlasViews';
import { isNodeInRegion, planRegionIsolation } from '../lib/regionIsolation';
import { NervousSystemMenu } from '../components/NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';
import { basalWholeBrainDisplay } from '../lib/basalWholeBrain';

function csvFields(line: string): string[] {
  const fields: string[] = [];
  let quoted = false, field = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (line[i] === ',' && !quoted) { fields.push(field); field = ''; } else field += line[i];
  }
  return [...fields, field];
}
const rows = readFileSync(new URL('../../../../attached_assets/Nervous_system_CLean_1791612986964.csv', import.meta.url), 'utf8')
  .trim().split(/\r?\n/).map(csvFields);
const header = rows.shift()!;
const names = [...new Set(rows.filter(row => row[header.indexOf('row_type')] === 'OBJECT')
  .map(row => row[header.indexOf('object_name')]))];
const nodes: SceneNode[] = names.map((rawName, i) => ({
  instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform', visible: true, systemId: systemForMeshName(rawName),
}));
const root = BASAL_FOREBRAIN_GROUP.id.split('/');
const core = nodes.filter(node => classifyBasalForebrainObject(node.rawName));
const context = nodes.filter(isBasalForebrainContext);
const ignore = () => {};

test('both striae are excluded only from Basal forebrain menus, context and isolation, with Limbic and White matter access preserved', () => {
  const plan = planRegionIsolation(nodes, 'nervous', root, node => advancedNeuroanatomyPathForGroup(node, root))!;
  const white = BASAL_FOREBRAIN_GROUP.children!.find(group => group.id.endsWith('/white-matter'))!;
  assert.ok(white.children!.every(child => !child.id.endsWith('/stria-terminalis') && !child.id.endsWith('/stria-medullaris')));
  const striae = nodes.filter(node => /^stria (terminalis|medullaris thalami)\.[lr]$/i.test(node.rawName));
  assert.equal(striae.length, 4);
  for (const node of striae) {
    assert.ok(plan.hide.includes(node.instanceID));
    assert.ok(!plan.show.includes(node.instanceID));
    for (const rawName of [node.rawName, `${node.rawName}.001_123`]) {
      const alias = { ...node, rawName };
      assert.equal(classifyBasalForebrainObject(rawName), null);
      assert.equal(isBasalForebrainContext(alias), false);
      assert.equal(isBasalForebrainOpaqueStructure(alias), false);
      assert.equal(advancedNeuroanatomyPathForGroup(alias, root), null);
      assert.equal(isNodeInRegion(alias, root, () => null), false);
      for (const category of ['limbic-system', 'white-matter']) {
        const path = ['advanced-neuroanatomy', category];
        assert.ok(isNodeInRegion(alias, path, () => null));
        assert.equal(advancedNeuroanatomyPathForGroup(alias, path)?.[1], category);
      }
    }
  }
});

test('basal forebrain includes all source nuclei, perforated substance, amygdala and associated fibers, with complete lobe/brainstem context', () => {
  assert.equal(core.length, 99);
  assert.ok(context.length > 100);
  for (const node of [...core, ...context]) {
    assert.equal(node.systemId, 'nervous', node.rawName);
    assert.ok(isNodeAllowedInAtlasView(node, BRAIN_VIEW), node.rawName);
  }
  for (const name of ['Substantia perforata anterior.l', 'Substantia perforata anterior.r',
    'Amygdaloid body.l', 'Amygdaloid body.r', 'Anterior commissure',
    'Basal nucleus of Maynert.l', 'Septal nucleus.r', 'Nucleus accumbens.r',
    'Ansa peduncularis Amygdalothalamic fibers.l',
    'Ansa peduncularis Amygdalohypothalamic fibers.r', 'Ansa peduncularis Amygdaloseptal fibers.r',
    'Medial forebrain bundle dopamine.l', 'Medial forebrain bundle dopamine.r',
    'Medial forebrain bundle serotonin.l', 'Medial forebrain bundle serotonin.r',
    'Ventral tegmental area.l', 'Ventral tegmental area.r', 'Reticular formation brainstem',
    'Substantia nigra pars compacta.l', 'Substantia nigra pars compacta.r',
    'Anterior_hypothalamic_nucleus.l', '01_Anterior_ventral_AV']) {
    assert.ok(core.some(node => node.rawName === name), name);
  }
  for (const name of ['Midbrain', 'Pons', 'Medulla oblongata']) for (const side of ['l', 'r']) {
    assert.ok(context.some(node => node.rawName === `${name}.${side}`), `${name}.${side}`);
  }
  assert.ok(core.every(node => !isBasalForebrainContext(node)));
  assert.ok(core.every(isBasalForebrainOpaqueStructure));
  const plan = planRegionIsolation(nodes, 'nervous', root, node => advancedNeuroanatomyPathForGroup(node, root))!;
  assert.equal(plan.show.length, core.length + context.length);
  assert.equal(plan.hide.length, nodes.length - plan.show.length);
});

test('hypothalamus and thalamus capsules are semitransparent context, while fornix and dentate gyri are excluded only from basal forebrain', () => {
  for (const name of ['Hypothalamus', 'Thalamus.l', 'Thalamus.r', '00_Thalamic_background_core.l']) {
    const node = nodes.find(node => node.rawName === name)!;
    assert.ok(node, name);
    assert.equal(isBasalForebrainContext(node), true, name);
    assert.equal(isBasalForebrainOpaqueStructure(node), false, name);
    assert.equal(advancedNeuroanatomyPathForGroup(node, root)?.at(-1), 'context');
  }
  const plan = planRegionIsolation(nodes, 'nervous', root, node => advancedNeuroanatomyPathForGroup(node, root))!;
  for (const name of ['Fornix.l.001', 'Dentate Gyrus.l', 'Dentate Gyrus.r']) {
    const node = nodes.find(node => node.rawName === name)!;
    assert.ok(node, name);
    for (const alias of [name, `${name}_123`, `${name}.001`]) {
      assert.equal(advancedNeuroanatomyPathForGroup({ ...node, rawName: alias }, root), null, alias);
    }
    assert.ok(plan.hide.includes(node.instanceID), name);
    assert.ok(!plan.show.includes(node.instanceID), name);
    assert.ok(advancedNeuroanatomyPathForGroup(node, ['advanced', 'limbic-system']), name);
  }
});

test('both accumbens and septal nuclei are protected from context transparency, including export aliases', () => {
  const protectedNodes = nodes.filter(isBasalForebrainOpaqueNucleus);
  assert.deepEqual(protectedNodes.map(node => node.rawName).sort(), [
    'Nucleus accumbens.l', 'Nucleus accumbens.r', 'Septal nucleus.l', 'Septal nucleus.r',
  ]);
  for (const node of protectedNodes) {
    assert.equal(isBasalForebrainContext(node), false);
    assert.equal(isBasalForebrainOpaqueNucleus({ ...node, rawName: `${node.rawName}.001_123` }), true);
  }
});

test('uncinate fascicles are excluded from basal forebrain menus and isolation, but retain white-matter membership', () => {
  const plan = planRegionIsolation(nodes, 'nervous', root, node => advancedNeuroanatomyPathForGroup(node, root))!;
  for (const name of ['Uncinate fascicle.l', 'Uncinate fascicle.r']) {
    const node = nodes.find(node => node.rawName === name)!;
    assert.ok(node, name);
    for (const rawName of [name, `${name}_123`, `${name}.001`]) {
      const alias = { ...node, rawName };
      assert.equal(advancedNeuroanatomyPathForGroup(alias, root), null);
      assert.equal(isBasalForebrainContext(alias), false);
      assert.equal(isBasalForebrainOpaqueStructure(alias), false);
    }
    assert.ok(plan.hide.includes(node.instanceID));
    assert.ok(!plan.show.includes(node.instanceID));
    assert.ok(advancedNeuroanatomyPathForGroup(node, [root[0], 'white-matter']));
  }
});

test('basal nuclei and amygdala fibers retain context in subgroup isolation, without adding unrelated nuclei or spinal anatomy', () => {
  for (const suffix of [['nuclei', 'meynert'], ['structures', 'amygdala'], ['white-matter', 'amygdalothalamic'],
    ['white-matter', 'medial-forebrain-bundle', 'dopamine'], ['brainstem-nuclei', 'vta'],
    ['hypothalamus', 'anterior', 'anterior'], ['thalamus', 'anterior', 'av']]) {
    const path = [...root, ...suffix];
    const plan = planRegionIsolation(nodes, 'nervous', path, node => advancedNeuroanatomyPathForGroup(node, path))!;
    assert.equal(plan.show.length, context.length + 2);
    for (const node of context) assert.ok(isNodeInRegion(node, path, () => null), node.rawName);
    for (const node of core.filter(node => classifyBasalForebrainObject(node.rawName)?.at(-1) !== suffix.at(-1))) {
      assert.ok(plan.hide.includes(node.instanceID), node.rawName);
    }
  }
  const frontal = [...root, 'context'];
  assert.equal(advancedNeuroanatomyPathForGroup({
    ...nodes[0], rawName: 'Lateral occipitotemporal gyrus.l.001_123', systemId: 'nervous',
  }, frontal)?.at(-1), 'context');
  assert.equal(advancedNeuroanatomyPathForGroup({
    ...nodes[0], rawName: 'Lateral occipitotemporal gyrus.l_123', systemId: 'nervous',
  }, frontal)?.at(-1), 'context');
});

test('basal submenu renders nuclei, amygdala, fiber connections and separately controllable semitransparent context', () => {
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    nodes: basalWholeBrainDisplay(nodes, true).nodes, groups: [BASAL_FOREBRAIN_GROUP], namespace: 'basal',
    pathForNode: (node: SceneNode) => advancedNeuroanatomyPathForGroup(node, root),
    pathForGroup: advancedNeuroanatomyPathForGroup, onSetVisibility: ignore,
    onIsolate: ignore, isolatedPath: null, onRestore: ignore, onSelect: ignore,
    toggleVisibility: ignore, onToggleFade: ignore, fadedNodeIds: new Set(context.map(node => node.instanceID)),
    browseState: { expanded: new Set([BASAL_FOREBRAIN_GROUP.id,
      ...['nuclei', 'structures', 'white-matter', 'context', 'hypothalamus', 'thalamus', 'brainstem-nuclei',
        'white-matter/medial-forebrain-bundle'].map(id => [...root, id].join('/'))]),
      showUnassigned: false }, onBrowseStateChange: ignore,
  }));
  for (const label of ['Basal nuclei of Meynert', 'Septal nuclei', 'Nuclei accumbens',
    'Anterior perforated substance', 'Amygdaloid bodies (amygdala)', 'Anterior commissure',
    'Amygdaloseptal fibers', 'Amygdalohypothalamic fibers', 'Amygdalothalamic fibers',
    'Whole brain (semitransparent)', 'Medial forebrain bundle',
    'Dopaminergic fibers', 'Serotonergic fibers', 'Hypothalamus', 'Thalamus',
    'Reticular formation (combined)', 'Ventral tegmental areas', 'Substantia nigra pars compacta']) {
    assert.ok(html.includes(label), label);
    for (const action of ['Show', 'Hide', 'Isolate']) assert.ok(html.includes(`${action} ${label}`));
  }
  const nucleusPath = [...root, 'nuclei', 'meynert'];
  const nucleusMembers = nodes.filter(node => {
    const path = advancedNeuroanatomyPathForGroup(node, nucleusPath);
    return path && nucleusPath.every((part, index) => path[index] === part);
  });
  assert.equal(nucleusMembers.length, 2, 'Menu membership must not duplicate cortex under each nucleus');
  assert.ok(!html.includes('Fornix'));
  assert.ok(!html.includes('Dentate Gyrus'));
  assert.ok(!html.includes('Uncinate'));
});
