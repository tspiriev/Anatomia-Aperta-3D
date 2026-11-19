import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MusculoskeletalMenu } from './MusculoskeletalMenu';
import { MUSCULOSKELETAL_ROOT_PATH, MUSCULOSKELETAL_REGIONS, MUSCULOSKELETAL_SOURCE_ENTRIES } from '../data/musculoskeletalTaxonomy';
import { JOINT_SOURCE_ENTRIES } from '../data/musculoskeletalJoints';
import { UPPER_LIMB_BONE_GROUPS } from '../data/musculoskeletalSkeleton';
import { NECK_BONE_GROUPS } from '../data/musculoskeletalNeck';
import { menuCollectionNodeIds } from './NervousSystemMenu';
import { MUSCULOSKELETAL_GROUPS, musculoskeletalPathForGroup, musculoskeletalSide } from '../data/musculoskeletalTaxonomy';
import { BACK_ATTACHMENT_VIEW } from '../data/musculoskeletalBack';

test('Every category omits redundant descriptions in sidebar and fullscreen while preserving headings and controls', () => {
  const nodes = ['Sternocleidomastoid muscle.l', 'Vertebra C3', 'Rectus femoris muscle.r',
    'Splenius capitis muscle.l'].map((rawName, i) => ({
    rawName, name: rawName, instanceID: i + 1, systemId: null, visible: true, type: 'MatrixTransform',
  }));
  const paths = [
    ...MUSCULOSKELETAL_GROUPS.map(group => group.id.split('/')),
    [...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'attachments'],
    [...MUSCULOSKELETAL_ROOT_PATH, 'back', 'muscles', BACK_ATTACHMENT_VIEW],
  ];
  for (const variant of ['sidebar', 'fullscreen'] as const) for (const path of paths) {
    const html = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
      variant, nodes, activeNerveId: path.slice(0, 3).join('/'), isolatedRegionPath: path,
      selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
      onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    assert.ok(html.includes('MUSCULOSKELETAL SYSTEM'), `${variant}/${path.join('/')}: heading`);
    for (const control of ['Show all', 'Restore previous view', 'Selected muscle attachments', 'Bilateral'])
      assert.ok(html.includes(control), control);
    assert.ok(!html.includes('<p class="text-[11px] leading-relaxed text-muted-foreground">'),
      `${variant}/${path.join('/')}: no descriptive paragraph`);
    for (const text of ['Separate meshes not found', 'Separate muscle meshes not found',
      'Only available source attachment', 'No separately named attachment', 'Whole-category attachments',
      'Neck muscles follow topographic regions', 'Rotatores use their original'])
      assert.ok(!html.includes(text), text);
  }
});

function assertSidebarCollapsed(html: string) {
  assert.ok(html.includes('aria-expanded="false"'), 'Groups expose their manual expand control');
  assert.ok(!html.includes('aria-expanded="true"'), 'Every right-hand group starts closed');
}

test('Show all restores the displayed musculoskeletal category, respects side filters and does not enable unrelated or optional source meshes', () => {
  const nodes = MUSCULOSKELETAL_SOURCE_ENTRIES.map((entry, i) => ({
    instanceID: i + 1, rawName: entry.name, name: entry.name, type: 'MatrixTransform', visible: false,
  }));
  for (const region of MUSCULOSKELETAL_REGIONS) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, region.id];
    const group = MUSCULOSKELETAL_GROUPS.find(group => group.id === path.join('/'))!;
    for (const side of ['both', 'left', 'right']) {
      const selected = menuCollectionNodeIds(nodes, [group],
        node => musculoskeletalPathForGroup(node, MUSCULOSKELETAL_ROOT_PATH),
        (node, requested) => musculoskeletalPathForGroup(node,
          [...requested, ...(side === 'both' ? [] : [`@side-${side}`])]));
      const expected = MUSCULOSKELETAL_SOURCE_ENTRIES.flatMap((entry, i) =>
        entry.regions.includes(region.id) && entry.category !== 'attachments'
        && (side === 'both' || musculoskeletalSide(entry.name) !== (side === 'left' ? 'right' : 'left')) ? [i + 1] : []);
      assert.deepEqual(selected, expected, `${region.label}: ${side}`);
      assert.ok(selected.length);
    }
  }
});

test('Upper Limb offers combined topographic regions and compartments alongside the original tissue menus', () => {
  const root = [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb'];
  const nodes = MUSCULOSKELETAL_SOURCE_ENTRIES.map((entry, i) => ({
    instanceID: i + 1, rawName: entry.name, name: entry.name, visible: true, type: 'MatrixTransform',
  }));
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
      variant, nodes, activeNerveId: root.join('/'),
      isolatedRegionPath: [...root, 'topography', 'arm', 'anterior'],
      selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
      onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    if (variant === 'sidebar') {
      assertSidebarCollapsed(html);
      assert.ok(!html.includes('Anterior arm compartment (flexors)'));
      continue;
    }
    for (const label of [
      'Topographic regions — combined tissues', 'Shoulder and shoulder girdle',
      'Anterior arm compartment (flexors)', 'Posterior arm compartment (extensors)',
      'Elbow region', 'Anterior forearm compartment (flexor–pronator)',
      'Posterior forearm compartment (extensor–supinator)', 'Posterolateral group (mobile wad)',
      'Wrist', 'Thenar region', 'Hypothenar region', 'Interosseous compartments',
      'Fasciae, intermuscular septa and tendon sheaths', 'Muscle attachment sites',
    ]) assert.ok(html.includes(label), `${variant}: ${label}`);
    for (const group of UPPER_LIMB_BONE_GROUPS) assert.ok(html.includes(group.label), 'Original Bones subdivisions remain');
    assert.ok(!html.includes('Choosing a combined region explicitly shows its attachments'));
    assert.ok(!html.includes('fused hand joint meshes remain at Hand level'));
    assert.ok(html.includes('checkbox-musculoskeletal-selected-attachments'));
    assert.ok(!html.includes('checkbox-musculoskeletal-selected-attachments" checked=""'));
    if (variant === 'fullscreen') assert.ok(!html.includes('Short head of biceps brachii.l'), 'Fullscreen stays collection-based');
  }
});

test('Neck muscles expose topographic regions and triangles in both shared menu layouts', () => {
  const root = [...MUSCULOSKELETAL_ROOT_PATH, 'neck'];
  const nodes = MUSCULOSKELETAL_SOURCE_ENTRIES.map((entry, i) => ({
    instanceID: i + 1, rawName: entry.name, name: entry.name, visible: true, type: 'MatrixTransform',
  }));
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
      variant, nodes, activeNerveId: root.join('/'), isolatedRegionPath: [...root, 'muscles'],
      selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
      onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    if (variant === 'sidebar') {
      assertSidebarCollapsed(html);
      assert.ok(!html.includes('Submental triangle'));
      continue;
    }
    for (const label of [
      'Superficial cervical layer', 'Sternocleidomastoid region', 'Anterior cervical region',
      'Submental triangle', 'Submandibular (digastric) triangle', 'Carotid triangle',
      'Muscular (omotracheal / infrahyoid) triangle', 'Pharyngeal muscles', 'Laryngeal muscles',
      'Lateral cervical region (posterior triangle)', 'Occipital triangle', 'Omoclavicular (supraclavicular) triangle',
      'Scalene region', 'Deep prevertebral region', 'Posterior cervical (nuchal) region',
      'Cervical erector spinae', 'Cervical transversospinal muscles', 'Short cervical segmental muscles',
      'Suboccipital region', 'Adjacent source anatomy (cheek)',
    ]) assert.ok(html.includes(label), `${variant}: ${label}`);
    assert.ok(!html.includes('Shared muscles remain whole'));
    for (const group of NECK_BONE_GROUPS) assert.ok(html.includes(group.label), `${variant}: ${group.label}`);
    assert.ok(!html.includes('Neck bone context includes T1–T6, ribs 1–6'));
    assert.ok(html.includes('checkbox-musculoskeletal-selected-attachments'));
    assert.ok(!html.includes('checkbox-musculoskeletal-selected-attachments" checked=""'), 'Attachments remain opt-in');
  }
});

test('Back displays superficial/deep, spinalis, transversospinal and attachment views in the shared normal/fullscreen menus', () => {
  const root = [...MUSCULOSKELETAL_ROOT_PATH, 'back'];
  const path = [...root, 'muscles', 'deep', 'transversospinal', 'with-attachments'];
  const nodes = MUSCULOSKELETAL_SOURCE_ENTRIES.map((entry, i) => ({
    instanceID: i + 1, rawName: entry.name, name: entry.name, visible: true, type: 'MatrixTransform',
  }));
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
      variant, nodes, activeNerveId: root.join('/'), isolatedRegionPath: path,
      selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
      onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    if (variant === 'sidebar') {
      assertSidebarCollapsed(html);
      assert.ok(!html.includes('Spinalis system'));
      continue;
    }
    for (const label of ['Superficial (extrinsic)', 'Deep (autochthonous)', 'Spinalis system',
      'Transversospinal system', 'Semispinalis', 'Multifidus'])
      assert.ok(html.includes(label), `${variant}: ${label}`);
    assert.ok(!html.includes('No separately named attachment patches are represented for this subgroup'));
    if (variant === 'fullscreen') assert.ok(!html.includes('data-testid=\"mesh-row-'));
  }
});

test('Thorax omits redundant missing-mesh paragraphs whether or not separately named meshes exist', () => {
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'thorax'];
  const props = {
    variant: 'sidebar' as const, activeNerveId: path.join('/'), isolatedRegionPath: path,
    selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
    onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
  };
  const makeNode = (rawName: string, instanceID: number) => ({
    rawName, instanceID, name: rawName, visible: true, type: 'MatrixTransform',
  });
  const nodes = ['Levatores longi costarum.l', 'Spinalis thoracis muscle.r', 'Rotatores.r'].map(makeNode);
  const missing = renderToStaticMarkup(createElement(MusculoskeletalMenu, { ...props, nodes }));
  assert.ok(!missing.includes('Separate muscle meshes not found in the loaded model'));
  const present = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
    ...props, nodes: [...nodes, makeNode('Intertransversarii thoracis muscles.l', 4), makeNode('Rotatores thoracis muscles.r', 5)],
  }));
  assert.ok(!present.includes('Separate muscle meshes not found in the loaded model'));
});

test('Lower Limb omits redundant missing-mesh and substitution paragraphs', () => {
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb'];
  const props = {
    variant: 'sidebar' as const, activeNerveId: path.join('/'), isolatedRegionPath: path,
    selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
    onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
  };
  const makeNode = (rawName: string, instanceID: number) => ({
    rawName, instanceID, name: rawName, visible: true, type: 'MatrixTransform',
  });
  const nodes = ['Iliacus muscle.l', 'Psoas major.r', 'Iliopsoas fascia.l'].map(makeNode);
  const missing = renderToStaticMarkup(createElement(MusculoskeletalMenu, { ...props, nodes }));
  assert.ok(!missing.includes('Separate muscle meshes not found in the loaded model'));
  assert.ok(!missing.includes('not a substitute for these muscles'));
  const present = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
    ...props, nodes: [...nodes, makeNode('Psoas minor.r', 4)],
  }));
  assert.ok(!present.includes('Separate muscle meshes not found in the loaded model'));
});

test('Neck omits redundant missing-mesh paragraphs before and after live nodes load', () => {
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'neck'];
  const props = {
    variant: 'sidebar' as const, activeNerveId: path.join('/'), isolatedRegionPath: path,
    selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
    onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
  };
  const makeNode = (rawName: string, instanceID: number) => ({
    rawName, instanceID, name: rawName, visible: true, type: 'MatrixTransform',
  });
  const nodes = [makeNode('Rectus lateralis capitis muscle.l', 1)];
  const missing = renderToStaticMarkup(createElement(MusculoskeletalMenu, { ...props, nodes }));
  assert.ok(!missing.includes('Separate meshes not found in the loaded model'));
  assert.ok(!missing.includes('Semispinalis capitis'));
  const present = renderToStaticMarkup(createElement(MusculoskeletalMenu, { ...props, nodes: [
    ...nodes, makeNode('Semispinalis capitis muscle.l', 2),
    makeNode('Intertransversarii cervicis muscles.r', 3), makeNode('Rotatores cervicis muscles.l', 4),
  ] }));
  assert.ok(!present.includes('Separate meshes not found in the loaded model'));
  const loading = renderToStaticMarkup(createElement(MusculoskeletalMenu, { ...props, nodes: [] }));
  assert.ok(!loading.includes('Separate meshes not found in the loaded model'));
});

test('Upper Limb bone collections stay closed in the sidebar and retain fullscreen navigation', () => {
  const path = [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb'];
  const bones = MUSCULOSKELETAL_SOURCE_ENTRIES.filter(entry => entry.category === 'bones' && entry.regions.includes('upper-limb'));
  const nodes = bones.map((entry, i) => ({
    instanceID: i + 1, rawName: entry.name, name: entry.name,
    visible: false, type: 'MatrixTransform', systemId: 'skeletal' as const,
  }));
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
      variant, nodes, activeNerveId: path.join('/'), isolatedRegionPath: path,
      selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
      onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    if (variant === 'sidebar') {
      assertSidebarCollapsed(html);
      for (const group of UPPER_LIMB_BONE_GROUPS) assert.ok(!html.includes(group.label));
      continue;
    }
    for (const group of UPPER_LIMB_BONE_GROUPS) assert.ok(html.includes(group.label), `${variant}: ${group.label}`);
    assert.ok(!html.includes('No mapped structures in this region.'));
    assert.ok(html.includes('Show'));
  }
});

test('musculoskeletal regions use shared atlas strip, tree controls and fullscreen names instead of a bespoke sidebar', () => {
  const props = {
    nodes: [{ instanceID: 1, rawName: 'Humerus.l', name: 'Humerus.l', visible: true, type: 'MatrixTransform' }],
    activeNerveId: [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb'].join('/'),
    isolatedRegionPath: [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb'],
    selectedNodeId: null,
    onActivateNerve: () => {}, onIsolateRegion: () => {},
    onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
  };
  const strip = renderToStaticMarkup(createElement(MusculoskeletalMenu, { ...props, variant: 'strip' }));
  assert.ok(strip.includes('Musculoskeletal regions'));
  assert.ok(strip.includes('Head'));
  assert.ok(strip.includes('Pelvis and Perineum'));
  assert.ok(strip.indexOf('Bones and joints') < strip.indexOf('Head'));
  const sidebar = renderToStaticMarkup(createElement(MusculoskeletalMenu, { ...props, variant: 'sidebar' }));
  assert.ok(sidebar.includes('Upper Limb'));
  assertSidebarCollapsed(sidebar);
  assert.ok(sidebar.includes('Show'));
  assert.ok(sidebar.includes('Hide'));
  assert.ok(sidebar.includes('Isolate'));
  assert.ok(sidebar.includes('Restore previous view'));
    assert.ok(sidebar.includes('button-show-all-musculoskeletal-view'));
  assert.ok(!sidebar.includes('checkbox-category-'), 'No replacement category-checkbox layout');
  const fullscreen = renderToStaticMarkup(createElement(MusculoskeletalMenu, { ...props, variant: 'fullscreen' }));
  assert.ok(fullscreen.includes('button-show-all-fullscreen-musculoskeletal-view'));
  assert.ok(fullscreen.includes('Selected structure'));
  assert.ok(fullscreen.includes('Browse'));
  assert.equal((sidebar.match(/<iframe\b/g) ?? []).length, 0, 'Viewer stays owned by the shared atlas page');
  const skeleton = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
    ...props, activeNerveId: [...MUSCULOSKELETAL_ROOT_PATH, 'bones-and-joints'].join('/'),
    isolatedRegionPath: [...MUSCULOSKELETAL_ROOT_PATH, 'bones-and-joints'],
  }));
  assert.ok(skeleton.includes('Bones and joints'));
  assertSidebarCollapsed(skeleton);
});

test('every regional sidebar starts collapsed, including when CSV joint anatomy is present', () => {
  const nodes = JOINT_SOURCE_ENTRIES.map((entry, i) => ({
    instanceID: i + 1, rawName: entry.name, name: entry.name, visible: true,
    type: 'MatrixTransform', systemId: 'skeletal' as const,
  }));
  for (const region of MUSCULOSKELETAL_REGIONS) {
    const path = [...MUSCULOSKELETAL_ROOT_PATH, region.id];
    const html = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
      variant: 'sidebar', nodes, activeNerveId: path.join('/'), isolatedRegionPath: path,
      selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
      onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    assertSidebarCollapsed(html);
    assert.ok(html.includes(region.label), region.label);
  }
});
