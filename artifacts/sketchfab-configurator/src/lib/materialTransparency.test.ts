import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DIENCEPHALON_DEFINITION } from '../data/diencephalonTaxonomy';
import type { AdvancedCollection } from '../data/advancedCollection';
import type { SceneNode, SketchfabMaterial } from '../types/sketchfab';
import { isAlwaysOpaqueStructure, structureColorOverride, brainstemCerebellumOpacity } from './materialTransparency';
import { MeshRow } from '../components/MeshRow';

const node = (rawName: string): SceneNode => ({
  instanceID: 1, rawName, name: rawName, systemId: 'nervous', type: 'MatrixTransform', visible: true,
});

test('Brainstem and cerebellum uses exact screenshot refraction without modifying source materials or other models', () => {
  const material: SketchfabMaterial = {
    id: 'source', name: 'Original anatomy',
    channels: { Opacity: { enable: false, factor: 1, type: 'blending' } },
  };
  const original = JSON.stringify(material);
  const preset = brainstemCerebellumOpacity('7f0c31427e24481797eba7369bc4c505', material)!;
  assert.deepEqual(preset, {
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false, useNormalOffset: false,
    ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  });
  assert.equal(JSON.stringify(material), original);
  assert.notEqual(brainstemCerebellumOpacity('7f0c31427e24481797eba7369bc4c505', material), preset);
  for (const other of ['fe9c919b91c04fd8b2147106b07e5566', 'a7654718603c4cd58111b4dd52213d4a', 'unrelated']) {
    assert.equal(brainstemCerebellumOpacity(other, material), undefined);
  }
});

test('every hypothalamic nucleus is opaque and has no Fade setting on either side or export aliases, without changing its color', () => {
  const hypothalamus = DIENCEPHALON_DEFINITION.children!.find(group => group.id === 'hypothalamus')!;
  const names = (group: AdvancedCollection): string[] => [
    ...(group.objects ?? []), ...(group.children ?? []).flatMap(names),
  ];
  const nuclei = hypothalamus.children!.filter(group => group.id !== 'areas').flatMap(names);
  assert.equal(nuclei.length, 13);
  for (const name of nuclei) for (const rawName of [name, `${name}.l`, `${name}.r`, `${name}.r.001_123`]) {
    const nucleus = node(rawName);
    assert.equal(isAlwaysOpaqueStructure(nucleus), true, rawName);
    assert.equal(structureColorOverride(nucleus), null, 'Keep original anatomical colors');
    const html = renderToStaticMarkup(createElement(MeshRow, {
      node: nucleus, isSelected: false, isFaded: false, selectedRowRef: null,
      onSelect: () => {}, onToggleFade: () => {}, toggleVisibility: () => {},
    }));
    assert.ok(!html.includes('button-fade-mesh'), rawName);
    assert.ok(html.includes('button-visibility-mesh'), rawName);
  }
});

test('hypothalamic opacity protection does not change gross context, diffuse areas or other nuclei', () => {
  for (const rawName of ['Hypothalamus', 'Dorsal hypothalamic area.l', 'Lateral_hypothalamic_area.r',
    'Arcuate fascicle.l', 'Thalamus.r', '01_Anterior_ventral_AV.l', 'Nucleus of oculomotor nerve.r']) {
    assert.equal(isAlwaysOpaqueStructure(node(rawName)), false, rawName);
  }
});
