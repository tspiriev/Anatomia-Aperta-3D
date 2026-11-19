import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LONG_TRACT_GROUPS, LONG_TRACT_ROOT_PATH, longTractPathForGroup, longTractMenuGroups } from '../data/longTractTaxonomy';
import { LongTractMenu } from './LongTractMenu';
import { MIDBRAIN_GAZE_ID } from '../data/midbrainGazeDefinition';
import { NervousSystemMenu } from './NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';

const props = {
  nodes: [], activeNerveId: null, onActivateNerve: () => {}, isolatedRegionPath: null,
  onIsolateRegion: () => {}, onRestoreRegion: () => {}, onSetRegionVisibility: () => {}, selectedNodeId: null,
};
const labels = ['Descending motor systems', 'Ascending sensory systems', 'Cerebellar systems',
  'Vestibular and oculomotor systems', 'Brainstem connections', 'Midbrain Gaze Centers and Tectospinal Pathway'];

test('long tract menu renders all six groups in all variants without opacity or muscle controls', () => {
  assert.deepEqual(LONG_TRACT_GROUPS.map(g => g.label), labels);
  for (const variant of ['strip', 'sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(LongTractMenu, { ...props, variant }));
    for (const l of labels) assert.ok(html.includes(l), `${variant}: ${l}`);
    for (const bad of ['Opacity', 'button-long-tracts-muscles', 'disc-controls']) assert.ok(!html.includes(bad));
  }
  const sidebar = renderToStaticMarkup(createElement(LongTractMenu, { ...props, variant: 'sidebar' as const }));
  assert.ok(sidebar.includes('LONG TRACTS AND BRAINSTEM–CEREBELLAR PATHWAYS'));
  assert.ok(sidebar.includes('input-long-tracts-search'));
});

test('new gaze collection presents three expandable submenus in sidebar and fullscreen with orientation guidance', () => {
  const activeNerveId = [...LONG_TRACT_ROOT_PATH, MIDBRAIN_GAZE_ID].join('/');
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(LongTractMenu, { ...props, variant, activeNerveId }));
    for (const label of ['Medial Longitudinal Fasciculus', 'Midbrain Gaze Centers', 'Tectospinal System'])
      assert.ok(html.includes(label), `${variant}: ${label}`);
    assert.ok(html.includes('gray-matter horns'));
    assert.ok(!html.includes('Orientation anatomy'), 'orientation is automatic, not a fourth submenu');
  }
});

test('expanded MLF exposes vestibular and ocular nuclei with consolidated MLF and internuclear entries', () => {
  const group = longTractMenuGroups([]).find(g => g.id.endsWith(`/${MIDBRAIN_GAZE_ID}`))!.children!
    .find(g => g.id.endsWith('/medial-longitudinal-fasciculus'))!;
  const nodes: SceneNode[] = ['Vestibular nuclei.l', 'Vestibular nuclei.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
      visible: true, systemId: 'nervous' }));
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [group], nodes, initialExpanded: new Set([group.id]), fadedNodeIds: new Set<number>(),
    pathForNode: node => longTractPathForGroup(node, LONG_TRACT_ROOT_PATH),
    pathForGroup: longTractPathForGroup, isolatedPath: null, disableFade: true,
    onSetVisibility: () => {}, onIsolate: () => {}, onRestore: () => {}, onSelect: () => {},
    toggleVisibility: () => {}, onToggleFade: () => {},
  }));
  for (const label of ['Medial longitudinal fasciculus (MLF)', 'Vestibular nuclei', 'Oculomotor nucleus (III)',
    'Trochlear nucleus (IV)', 'Abducens nucleus (VI)', 'MLF internuclear connections']) assert.ok(html.includes(label));
  assert.ok(html.includes('vestibular-nuclei'));
});

test('expanded gaze centers expose periaqueductal gray and vestibular nuclei but no ocular nuclear entries', () => {
  const group = longTractMenuGroups([]).find(g => g.id.endsWith(`/${MIDBRAIN_GAZE_ID}`))!.children!
    .find(g => g.id.endsWith('/gaze-centers'))!;
  const nodes: SceneNode[] = ['Periaqueductal gray matter', 'Superior colliculus.l',
    'Interstitial nucleus of Cajal.l', 'Nucleus of Darkschewitsch.r', 'Vestibular nuclei.l', 'Vestibular nuclei.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
      visible: true, systemId: 'nervous' }));
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [group], nodes, initialExpanded: new Set([group.id]), fadedNodeIds: new Set<number>(),
    pathForNode: node => longTractPathForGroup(node, LONG_TRACT_ROOT_PATH),
    pathForGroup: longTractPathForGroup, isolatedPath: null, disableFade: true,
    onSetVisibility: () => {}, onIsolate: () => {}, onRestore: () => {}, onSelect: () => {},
    toggleVisibility: () => {}, onToggleFade: () => {},
  }));
  for (const entry of group.children!) assert.ok(html.includes(entry.label));
  assert.ok(html.includes('Vestibular nuclei'));
  for (const label of ['Oculomotor nucleus', 'Trochlear nucleus', 'Abducens nucleus'])
    assert.ok(!html.includes(label));
});

test('central tegmental menu exposes VPM and face somatosensory fibers alongside existing tract controls', () => {
  const group = longTractMenuGroups([]).find(g => g.id.endsWith('/brainstem-connections'))!.children!
    .find(g => g.id.endsWith('/central-tegmental'))!;
  const nodes: SceneNode[] = ['13_Ventral_posteromedial_VPM', 'Somatosensory tract face.l',
    'Central tegmental tract (nucleus tractus solitarii).r', 'Nucleus of solitary tract.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
      visible: true, systemId: 'nervous' }));
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [group], nodes, initialExpanded: new Set([group.id]), fadedNodeIds: new Set<number>(),
    pathForNode: node => longTractPathForGroup(node, LONG_TRACT_ROOT_PATH),
    pathForGroup: longTractPathForGroup, isolatedPath: null, disableFade: true,
    onSetVisibility: () => {}, onIsolate: () => {}, onRestore: () => {}, onSelect: () => {},
    toggleVisibility: () => {}, onToggleFade: () => {},
  }));
  for (const label of ['Central tegmental tract', 'Ventral posteromedial nucleus (VPM)',
    'Somatosensory fibers — face', 'Rubro-olivary connections']) assert.ok(html.includes(label));
});

test('extrapyramidal renders all six expandable pathway submenus using the shared collection controls', () => {
  const group = LONG_TRACT_GROUPS.find(g => g.id.endsWith('/descending-motor'))!.children!
    .find(g => g.id.endsWith('/extrapyramidal'))!;
  const nodes: SceneNode[] = ['Red nucleus.l', 'Rubrospinal tract', 'Superior colliculus.l', 'Tectospinal tract',
    'Reticular formation brainstem', 'Medial (pontine) reticulospinal tract.l', 'Medial reticulospinal tract',
    'Lateral (medullary) reticulospinal tract.r', 'Lateral reticulospinal tract',
    'Vestibular nuclei.l', 'Medial vestibulospinal tract', 'Medial longitudinal fascicle.l', 'Lateral vestibulospinal tract']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
      visible: true, systemId: 'nervous' }));
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [group], nodes, initialExpanded: new Set([group.id]), namespace: 'extrapyramidal-test', fadedNodeIds: new Set<number>(),
    pathForNode: node => longTractPathForGroup(node, LONG_TRACT_ROOT_PATH),
    pathForGroup: longTractPathForGroup, isolatedPath: null,
    onSetVisibility: () => {}, onIsolate: () => {}, onRestore: () => {}, onSelect: () => {},
    toggleVisibility: () => {}, onToggleFade: () => {},
  }));
  for (const child of group.children!) {
    assert.ok(html.includes(child.label), child.label);
    assert.ok(html.includes(`aria-controls="extrapyramidal-test-children-${child.id.replace(/[^a-z0-9-]/gi, '-')}`), child.label);
  }
});

test('spinocerebellar renders three expandable pathways and available components without unavailable optional rows', () => {
  const nodes: SceneNode[] = ["Dorsal nucleus Clarke's nucleus", 'Posterior spinocerebellar tract',
    'Posterior spinocerebellar tract.l', 'Posterior spinocerebellar tract.r', 'Anterior spinocerebellar tract',
    'Anterior spinocerebellar tract (Gowers).l', 'Anterior spinocerebellar tract (Gowers).r',
    'Superior cerebellar peduncle.l', 'Superior cerebellar peduncle.r', 'Lateral intermediate substance',
    'Accessory Cuneate nucleus.l.', 'Accessory Cuneate nucleus.r']
    .map((rawName, i) => ({ instanceID: i + 1, rawName, name: rawName, type: 'MatrixTransform',
      visible: true, systemId: 'nervous' }));
  const group = longTractMenuGroups(nodes).find(g => g.id.endsWith('/cerebellar'))!.children!
    .find(g => g.id.endsWith('/spinocerebellar'))!;
  const html = renderToStaticMarkup(createElement(NervousSystemMenu, {
    groups: [group], nodes, initialExpanded: new Set([group.id, ...group.children!.map(g => g.id)]),
    namespace: 'spinocerebellar-test', disableFade: true, fadedNodeIds: new Set<number>(),
    pathForNode: node => longTractPathForGroup(node, LONG_TRACT_ROOT_PATH),
    pathForGroup: longTractPathForGroup, isolatedPath: null,
    onSetVisibility: () => {}, onIsolate: () => {}, onRestore: () => {}, onSelect: () => {},
    toggleVisibility: () => {}, onToggleFade: () => {},
  }));
  for (const child of group.children!) {
    assert.ok(html.includes(child.label));
    assert.ok(html.includes(`aria-controls="spinocerebellar-test-children-${child.id.replace(/[^a-z0-9-]/gi, '-')}`));
    for (const entry of child.children!) assert.ok(html.includes(entry.label), entry.label);
  }
  assert.ok(!html.includes('Inferior cerebellar peduncle'));
  assert.ok(!html.includes('Cuneocerebellar fibers'));
});

test('gross orientation submenus are absent across all collections in sidebar and fullscreen while pathways remain', () => {
  for (const group of LONG_TRACT_GROUPS) {
    const context = group.children?.find(child => child.id.endsWith('/context'));
    for (const variant of ['sidebar', 'fullscreen'] as const) {
      for (const isolatedRegionPath of [null, ...(context ? [context.id.split('/')] : [])]) {
        const html = renderToStaticMarkup(createElement(LongTractMenu, {
          ...props, variant, activeNerveId: group.id, isolatedRegionPath,
        }));
        assert.ok(!html.includes('orientation</'), `${variant}: ${group.label}`);
        if (context) assert.ok(!html.includes(context.label), `${variant}: ${context.label}`);
        for (const pathway of group.children ?? []) {
          if (pathway !== context) assert.ok(html.includes(pathway.label), `${variant}: ${pathway.label}`);
        }
      }
    }
  }
  const activeNerveId = [...LONG_TRACT_ROOT_PATH, 'descending-motor'].join('/');
  const context = LONG_TRACT_GROUPS.find(group => group.id === activeNerveId)!.children!
    .find(group => group.id.endsWith('/context'))!;
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    for (const isolatedRegionPath of [null, context.id.split('/')]) {
      const html = renderToStaticMarkup(createElement(LongTractMenu, {
        ...props, variant, activeNerveId, isolatedRegionPath,
      }));
      assert.ok(!html.includes(context.label), `${variant}: orientation submenu removed`);
      for (const label of ['Corticospinal', 'Corticobulbar', 'Extrapyramidal']) assert.ok(html.includes(label));
    }
  }
  assert.ok(context.children?.some(group => group.id.endsWith('/basal-ganglia')));
  assert.ok(context.children?.some(group => group.id.endsWith('/spinal-gray-matter')));
  for (const rawName of ['Midbrain.l', 'White matter of spinal cord', 'Putamen.r']) {
    const node: SceneNode = { instanceID: 1, rawName, name: rawName, systemId: 'nervous',
      type: 'MatrixTransform', visible: true };
    assert.ok(longTractPathForGroup(node, context.id.split('/')), rawName);
  }
});

test('active sidebar view renders without crashing', () => {
  const activeNerveId = `${LONG_TRACT_ROOT_PATH.join('/')}/${LONG_TRACT_GROUPS[0].id.split('/').at(-1)}`;
  const html = renderToStaticMarkup(createElement(LongTractMenu, { ...props, variant: 'sidebar' as const, activeNerveId }));
  assert.ok(html.includes(labels[0]));
});

test('availability explanatory block stays absent for every active system in sidebar and fullscreen', () => {
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    for (const group of LONG_TRACT_GROUPS) {
      const html = renderToStaticMarkup(createElement(LongTractMenu, {
        ...props, variant, activeNerveId: group.id, isolatedRegionPath: group.id.split('/'),
      }));
      for (const removed of ['long-tracts-availability', 'Availability in this model', 'No separately exported mesh'])
        assert.ok(!html.includes(removed), `${variant}: ${group.label}: ${removed}`);
    }
  }
});

test('preserveMaterials suppresses Fade/Unfade and Isolate with context for selected node and mesh rows only here', async () => {
  const { systemForMeshName } = await import('../data/anatomicalSystems');
  const { longTractPathForGroup } = await import('../data/longTractTaxonomy');
  const { AutonomicNerveMenu } = await import('./AutonomicNerveMenu');
  const names = ['Red nucleus.l', 'Corticospinal tract.l', 'Pons', 'Cerebellum', 'Medulla oblongata', 'Thalamus.l'];
  const nodes = names.map((rawName, i) => ({ rawName, name: rawName, instanceID: i + 1, type: 'MatrixTransform', visible: true,
    systemId: systemForMeshName(rawName) ?? 'nervous' }));
  const member = nodes.find(n => LONG_TRACT_GROUPS.some(g => longTractPathForGroup(n, g.id.split('/')))) ?? nodes[0];
  const group = LONG_TRACT_GROUPS.find(g => longTractPathForGroup(member, g.id.split('/'))) ?? LONG_TRACT_GROUPS[0];
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(LongTractMenu, { ...props, nodes, variant,
      activeNerveId: group.id, selectedNodeId: member.instanceID }));
    for (const bad of ['Unfade', '>Fade', 'Fade ', 'button-fade-mesh-', 'Isolate with context', 'isolate-with-context'])
      assert.ok(!html.includes(bad), `${variant} must omit ${bad}`);
    assert.ok(html.includes(member.name));
    if (variant === 'sidebar') {
      assert.ok(html.includes('Show only selected'));
      assert.ok(html.includes('Hide'));
      assert.ok(html.includes('Back to structures'));
    } else assert.ok(html.includes('fullscreen-isolate-selected'));
  }
  const other = renderToStaticMarkup(createElement(AutonomicNerveMenu, { ...props, nodes, variant: 'sidebar' as const, selectedNodeId: 1 }));
  assert.ok(other.includes('Isolate with context'), 'other atlases unchanged');
});
