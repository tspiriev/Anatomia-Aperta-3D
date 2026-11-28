import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: '/tmp/check-viscera-vite',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@assets': fileURLToPath(new URL('../../../attached_assets', import.meta.url)) } },
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { VISCERA_GROUPS, classifyVisceraObject } = await server.ssrLoadModule('/src/data/visceraTaxonomy.ts');
  const { csvRows, systemForMeshName } = await server.ssrLoadModule('/src/data/anatomicalSystems.ts');
  const csv = fs.readFileSync('../../attached_assets/Internal_organs_1790925899980.csv', 'utf8');
  const objects = [...csvRows(csv)].filter((row) => row[0] === 'OBJECT');
  assert.deepEqual(VISCERA_GROUPS.map((group) => group.children.length), [4, 7, 3, 4, 3]);

  const paths = new Map();
  for (const group of VISCERA_GROUPS) {
    paths.set(group.label, [group.id]);
    for (const child of group.children) paths.set(child.label, [group.id, child.id]);
  }
  let mapped = 0;
  for (const row of objects) {
    const expected = paths.get(row[1]) ?? null;
    assert.deepEqual(classifyVisceraObject(row[4]), expected, row[4]);
    assert.deepEqual(classifyVisceraObject(` ${row[4].toUpperCase()}_123 `), expected, row[4]);
    assert.equal(systemForMeshName(row[4]), 'organs', `${row[4]} must be accessible in Internal organs`);
    if (expected) mapped++;
  }
  assert.equal(mapped, 120);
  assert.equal(objects.length - mapped, 1);
  assert.equal(classifyVisceraObject('Cross Section X'), null);
  assert.equal(classifyVisceraObject('Unknown right lung structure'), null);
  assert.deepEqual(classifyVisceraObject('Pleura'), ['respiratory']);
  assert.deepEqual(classifyVisceraObject('Greater omentum'), ['digestive']);
  assert.deepEqual(classifyVisceraObject('Lesser omentum'), ['digestive']);
  assert.deepEqual(classifyVisceraObject('Kidney.r'), ['urinary', 'right-kidney-ureter']);
  assert.deepEqual(classifyVisceraObject('Kidney.l'), ['urinary', 'left-kidney-ureter']);
  console.log(`Viscera checks passed: ${mapped}/${objects.length} mapped meshes, 5 systems, 21 subdivisions, 1 review structure.`);
} finally {
  await server.close();
}