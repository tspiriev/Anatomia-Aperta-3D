import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Router } from 'wouter';
import { SpinalCordMenu } from './SpinalCordMenu';
import { SPINAL_REFERENCE_MODELS, SPINAL_TOPOGRAPHIC_PATH, SPINAL_NERVE_PATH, SPINAL_CSV_OBJECTS } from '../data/spinalCordAtlas';
const base = {
  nodes: [], selectedNodeId: null, activeNerveId: SPINAL_TOPOGRAPHIC_PATH.join('/'),
  isolatedRegionPath: null, disabled: true,
  onActivateNerve: () => {}, onIsolateRegion: () => {},
  onRestoreRegion: () => {}, onSetRegionVisibility: () => {},
};
const render = (props: Parameters<typeof SpinalCordMenu>[0]) => renderToStaticMarkup(
  createElement(Router, { ssrPath: '/atlas/spinal-cord-anatomy' }, createElement(SpinalCordMenu, props)));
test('all three original model cards remain available when an external SDK is unavailable', () => {
  const html = render({ ...base, variant: 'strip' });
  const cards = [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs)];
  for (const model of SPINAL_REFERENCE_MODELS) {
    const card = cards.find(card => card[1].includes(`button-spinal-cord-model-${model.uid}`));
    assert.ok(card);
    assert.ok(!/\sdisabled(?:=|\s|$)/.test(card[1]));
    assert.ok(card[2].includes('3D model'));
  }
  assert.ok(html.indexOf(SPINAL_REFERENCE_MODELS[0].uid) < html.indexOf('button-spinal-cord-spinal-cord-topography'));
  assert.ok(html.includes('Root anatomy'));
  assert.ok(!html.includes('Spinal nerve anatomy'));
  const roots = render({ ...base, variant: 'sidebar', activeNerveId: SPINAL_NERVE_PATH.join('/') });
  assert.ok(roots.includes('C1–C2 root components'));
  assert.ok(roots.includes('White matter (semi-transparent context)'));
  assert.ok(roots.includes('Spinal cord white matter is retained as semi-transparent context'));
});
test('source annotation indices and names are not renumbered or rewritten', () => {
  const html = render({
    ...base, variant: 'sidebar', spinalReferenceModelUid: SPINAL_REFERENCE_MODELS[0].uid,
    activeNerveId: `advanced-neuroanatomy/long-tracts/model-${SPINAL_REFERENCE_MODELS[0].uid}`,
    sourceAnnotations: [{ index: 5, name: 'Original posterior horn label', content: { raw: '' } }],
  });
  assert.ok(html.includes('6. Original posterior horn label'));
  assert.ok(html.includes('button-source-annotation-6'));
  const ordinary = render({ ...base, variant: 'sidebar' });
  assert.ok(!ordinary.includes('Original numbered annotations'));
});

test('sidebar and fullscreen expose regional root subdivisions under anterior and posterior roots', () => {
  const nodes = SPINAL_CSV_OBJECTS.map((o, i) => ({
    instanceID: i + 1, rawName: o.name, name: o.name, visible: true,
    systemId: 'nervous', type: 'MatrixTransform',
  }));
  for (const variant of ['sidebar', 'fullscreen'] as const) {
    const html = render({ ...base, nodes, variant, activeNerveId: SPINAL_NERVE_PATH.join('/') });
    assert.ok(html.includes('Anterior roots'));
    assert.ok(html.includes('Posterior roots'));
    // These labels are rendered in the shared category tree, not a custom menu.
    for (const region of ['Cervical', 'Thoracic', 'Lumbar']) {
      assert.ok(html.includes(`${region} nerve roots`), `${variant}: ${region}`);
    }
  }
});

test('spinal collection cards use two readable rows on the main atlas and reference-model routes', () => {
  for (const uid of [undefined, SPINAL_REFERENCE_MODELS[0].uid]) {
    const html = render({ ...base, variant: 'strip', activeNerveId: null, spinalReferenceModelUid: uid });
    assert.ok(html.includes('data-testid="collection-strip-spinal-cord"'));
    assert.ok(html.includes('grid grid-rows-2'));
    assert.ok(html.includes('grid-template-columns:repeat(6, minmax(7rem, 1fr))'));
    assert.ok(html.includes('overflow-x-auto'), 'Small screens retain scroll access rather than squeezing labels');
    assert.equal([...html.matchAll(/data-testid="button-spinal-cord-/g)].length, 11, 'All cards remain available');
    assert.ok(!html.includes('aria-pressed="true"'), 'Changing layout never auto-selects a collection');
  }
});
