import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAnatomicalName } from './anatomicalDisplayName';

test('corrects both tensor typmani muscle display names with side and exporter suffixes intact internally', () => {
  for (const [side, label] of [['l', 'Left'], ['r', 'Right']])
    for (const suffix of ['', '_123', '.001', '.001_123']) {
      const rawName = `Tensor typmani muscle.${side}${suffix}`;
      assert.equal(formatAnatomicalName(rawName), `Tensor tympani muscle (${label})`);
      assert.equal(rawName, `Tensor typmani muscle.${side}${suffix}`);
    }
  assert.equal(formatAnatomicalName('Tensor typmani muscle'), 'Tensor tympani muscle');
  assert.equal(formatAnatomicalName('Tensor_typmani_muscle.r'), 'Tensor tympani muscle (Right)');
});

test('preserves existing normal anatomy, nerve names, side labels and non-lateral numeric identifiers', () => {
  for (const [raw, expected] of [
    ['Pons', 'Pons'], ['Central sulcus.l_123', 'Central sulcus (Left)'],
    ['Tensor tympani muscle.r', 'Tensor tympani muscle (Right)'],
    ['Tensor tympani nerve.l', 'Tensor tympani nerve (Left)'],
    ['13 Ventral posteromedial VPM', '13 Ventral posteromedial VPM'],
    ['Anatomical structure.001', 'Anatomical structure.001'],
  ]) assert.equal(formatAnatomicalName(raw), expected);
});
