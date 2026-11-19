import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MusculoskeletalMenu } from '../components/MusculoskeletalMenu';
import { MUSCULOSKELETAL_ROOT_PATH as root, MUSCULOSKELETAL_SOURCE_ENTRIES as entries,
  MUSCULOSKELETAL_GROUPS, musculoskeletalPathForGroup as pathFor, cleanMusculoskeletalPath,
  musculoskeletalSide, classifyMusculoskeletalNode } from './musculoskeletalTaxonomy';
import { lowerLimbMuscleSubdivision as subdivision } from './musculoskeletalLowerLimb';
import { planRegionIsolation } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';

const scene: SceneNode[] = entries.map((entry, i) => ({
  instanceID: i + 1, rawName: entry.name, name: entry.name, type: 'MatrixTransform', visible: true,
}));
const muscleRoot = [...root, 'lower-limb', 'muscles'];
const muscles = entries.filter(entry => entry.regions.includes('lower-limb') && entry.category === 'muscles');
const plan = (path: readonly string[]) =>
  planRegionIsolation(scene, 'muscular', cleanMusculoskeletalPath(path), node => pathFor(node, path))!;

test('every source Lower Limb muscle or associated tissue remains accessible in a named topographic group without duplicates', () => {
  const parent = plan(muscleRoot);
  assert.equal(parent.show.length, muscles.length);
  for (const entry of muscles) {
    const group = subdivision(entry.name);
    assert.ok(group, entry.name);
    const node = scene.find(node => node.rawName === entry.name)!;
    assert.deepEqual(pathFor(node, [...muscleRoot, ...group]), [...muscleRoot, ...group], entry.name);
    for (const suffix of ['', '.001_123']) {
      const alias = { ...node, rawName: node.rawName + suffix };
      assert.deepEqual(subdivision(alias.rawName), group, alias.rawName);
      assert.ok(pathFor(alias, [...muscleRoot, ...group]), alias.rawName);
    }
  }
  const category = MUSCULOSKELETAL_GROUPS.find(group => group.id === [...root, 'lower-limb'].join('/'))!
    .children!.find(group => group.id.endsWith('/muscles'))!;
  const leaves: number[] = [];
  function check(group: NervousGroup) {
    const ids = plan(group.id.split('/')).show;
    assert.ok(ids.length, group.label);
    assert.ok(ids.every(id => entries[id - 1].category === 'muscles'), group.label);
    if (group.children) for (const child of group.children) check(child);
    else leaves.push(...ids);
  }
  for (const group of category.children!) check(group);
  assert.equal(leaves.length, new Set(leaves).size, 'One primary topographic group per source object');
  assert.deepEqual(new Set(leaves), new Set(parent.show));
});

test('thigh, leg and foot boundaries follow anatomical compartments rather than name similarity', () => {
  for (const [name, expected] of [
    ['Rectus femoris muscle.r', ['thigh', 'anterior']],
    ['Sartorius muscle.l', ['thigh', 'anterior']],
    ['Pectineus muscle.r', ['thigh', 'medial']],
    ['(Adductor minimus).l', ['thigh', 'medial']],
    ['Short head of biceps femoris.l', ['thigh', 'posterior']],
    ['Semimembranosus muscle.r', ['thigh', 'posterior']],
    ['Fibularis tertius muscle.l', ['leg', 'anterior']],
    ['Fibularis longus muscle.l', ['leg', 'lateral']],
    ['Popliteus muscle.r', ['leg', 'posterior', 'deep']],
    ['Plantaris muscle.l', ['leg', 'posterior', 'superficial']],
    ['Flexor hallucis longus.r', ['leg', 'posterior', 'deep']],
    ['Extensor hallucis brevis.l', ['foot', 'dorsal']],
    ['Dorsal interossei muscles of foot.r', ['foot', 'plantar', 'layer-4']],
    ['Lumbrical muscles of foot.r', ['foot', 'plantar', 'layer-2']],
    ['(Opponens digiti minimi muscle of foot).r', ['foot', 'plantar', 'layer-3']],
    ['Psoas minor.r', ['hip', 'flexors']],
    ['Tendon of extensor digitorum longus.l.001', ['associated-tissues']],
    ['Lateral femoral intermuscular septum.r', ['associated-tissues']],
  ] as const) assert.deepEqual(subdivision(name), expected, name);
});

test('topographic isolation respects laterality and leaves attachments optional and bones, joints and fascia in their existing collections', () => {
  for (const parts of [['thigh', 'anterior'], ['thigh', 'posterior'], ['leg', 'posterior'], ['foot', 'plantar']]) {
    for (const side of ['left', 'right']) {
      const selected = plan([...muscleRoot, ...parts, `@side-${side}`]);
      assert.ok(selected.show.length);
      for (const id of selected.show) {
        assert.equal(entries[id - 1].category, 'muscles');
        assert.notEqual(musculoskeletalSide(scene[id - 1].rawName), side === 'left' ? 'right' : 'left');
      }
    }
  }
  for (const category of ['bones', 'joints-ligaments', 'fasciae', 'attachments']) {
    const scope = [...root, 'lower-limb', category];
    const selected = plan(scope);
    assert.ok(selected.show.length, category);
    for (const id of selected.show) {
      const entry = entries[id - 1];
      assert.ok(entry.category === category || (category === 'attachments' && entry.category === 'bones'));
      assert.ok(!plan(muscleRoot).show.includes(id));
    }
  }
  for (const name of ['Iliacus muscle.l', 'Psoas major.r', 'Gluteus maximus muscle.l'])
    assert.ok(classifyMusculoskeletalNode(name).some(entry => entry.regions.includes('pelvis-perineum')),
      'Existing overlapping pelvic membership is preserved');
});

test('sidebar and fullscreen expose all lower-limb compartments with the existing side, attachment and restoration controls', () => {
  const nodes = scene.filter((_, i) => entries[i].regions.includes('lower-limb'));
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = renderToStaticMarkup(createElement(MusculoskeletalMenu, {
      variant, nodes, activeNerveId: [...root, 'lower-limb'].join('/'), isolatedRegionPath: muscleRoot,
      selectedNodeId: null, onActivateNerve: () => {}, onIsolateRegion: () => {},
      onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
    }));
    if (variant === 'sidebar') {
      assert.ok(!html.includes('aria-expanded="true"'), 'Sidebar collections remain collapsed');
      for (const label of ['Selected muscle attachments', 'Restore previous view', 'Show all'])
        assert.ok(html.includes(label), label);
      continue;
    }
    for (const label of ['Anterior thigh', 'Medial thigh', 'Posterior thigh',
      'Anterior leg', 'Lateral leg', 'Superficial posterior leg', 'Deep posterior leg',
      'Dorsal foot', 'Plantar foot', 'Layer 1', 'Layer 4', 'Hip flexors', 'Gluteal muscles',
      'Associated tendons, sheaths and septa', 'Selected muscle attachments', 'Restore previous view', 'Show all'])
      assert.ok(html.includes(label), `${variant}: ${label}`);
  }
});
