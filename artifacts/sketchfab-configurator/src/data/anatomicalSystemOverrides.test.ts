import assert from 'node:assert/strict';
import test from 'node:test';
import { systemOverrideForMeshName } from './anatomicalSystemOverrides';

test('both sides of incus, malleus, and stapes move to the nervous system', () => {
  for (const bone of ['Incus', 'Malleus', 'Stapes']) {
    for (const side of ['l', 'r']) {
      assert.equal(systemOverrideForMeshName(`${bone}.${side}`), 'nervous');
    }
  }
});

test('ossicle system assignments survive duplicate and Sketchfab export suffixes', () => {
  for (const name of ['INCUS.L_123', 'Malleus.r.001_42', 'Stapes.001.l_87', ' Stapes.r ', 'Incus']) {
    assert.equal(systemOverrideForMeshName(name), 'nervous', name);
  }
});

test('other bones and structures mentioning ossicles retain their original assignments', () => {
  for (const name of ['Femur.l', 'Temporal bone.r', 'Ligament of malleus.l', 'Incus ligament.r', 'Stapedius.l', 'Stapes tendon.r']) {
    assert.equal(systemOverrideForMeshName(name), null, name);
  }
});
