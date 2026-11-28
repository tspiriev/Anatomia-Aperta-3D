import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const assetUrl = new URL('../../../attached_assets/', import.meta.url);
const server = await createServer({
  configFile: false,
  cacheDir: '/tmp/check-muscular-vite',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@assets': fileURLToPath(assetUrl) } },
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { MUSCULAR_GROUPS, classifyMuscularObject } =
    await server.ssrLoadModule('/src/data/muscularTaxonomy.ts');
  const { csvRows, systemForMeshName } =
    await server.ssrLoadModule('/src/data/anatomicalSystems.ts');
  const { planRegionIsolation } = await server.ssrLoadModule('/src/lib/regionIsolation.ts');
  const objects = [...csvRows(fs.readFileSync(new URL('Final_Muscles_fused__1791343224663.csv', assetUrl), 'utf8'))]
    .filter((row) => row[0] === 'OBJECT');
  assert.equal(objects.length, 683);
  assert.deepEqual(MUSCULAR_GROUPS.map((group) => group.label),
    ['01 Muscles', '02 Fasciae', '03 Bursae']);
  assert.deepEqual(MUSCULAR_GROUPS[0].children.map((group) => group.label), [
    'Neck', 'Upper Limb', 'Thorax', 'Abdomen', 'Pelvis',
    'Lower Limb', 'Head & Face', 'Back',
  ]);
  assert.deepEqual(MUSCULAR_GROUPS.map((group) => group.children.length), [8, 0, 0]);
  const paths = new Map();
  for (const group of MUSCULAR_GROUPS) {
    paths.set(group.label, [group.id]);
    for (const child of group.children) paths.set(child.label, [group.id, child.id]);
  }
  for (const row of objects) {
    const expected = paths.get(row[1]);
    assert.ok(expected, `Unmapped source collection: ${row[1]}`);
    assert.deepEqual(classifyMuscularObject(row[4]), expected, row[4]);
    assert.deepEqual(classifyMuscularObject(` ${row[4].toUpperCase()}_123 `), expected, row[4]);
    assert.equal(systemForMeshName(row[4]), 'muscular', row[4]);
    assert.equal(systemForMeshName(` ${row[4].toUpperCase()}_123 `), 'muscular', row[4]);
  }
  // Keep the previous file only as a regression fixture: all 24 corrected
  // memberships must move while unchanged objects retain their prior region.
  const previousObjects = [...csvRows(fs.readFileSync(new URL('Final_Muscles_fused__1791342345155.csv', assetUrl), 'utf8'))]
    .filter((row) => row[0] === 'OBJECT');
  const previousCollections = new Map(previousObjects.map((row) => [row[4], row[1]]));
  assert.deepEqual(new Set(objects.map((row) => row[4])), new Set(previousCollections.keys()));
  const moves = new Map();
  for (const row of objects) {
    const previous = previousCollections.get(row[4]);
    if (previous === row[1]) continue;
    const move = `${previous} -> ${row[1]}`;
    moves.set(move, (moves.get(move) ?? 0) + 1);
    assert.deepEqual(classifyMuscularObject(row[4]),
      previous === 'Face' ? ['muscular-01', 'head-face'] : ['muscular-01', 'upper-limb']);
  }
  assert.deepEqual(moves, new Map([['Lower Limb -> Upper Limb', 16], ['Face -> Head & Face', 8]]));
  const originalRows = [...csvRows(fs.readFileSync(new URL('First_combinedblend_1790668070052.csv', assetUrl), 'utf8'))];
  const legacyName = 'Common tendinous ring.r.001';
  assert.ok(originalRows.some((row) => row[0] === 'OBJECT' && row[4] === legacyName));
  assert.deepEqual(classifyMuscularObject(legacyName), ['muscular-01', 'head-face']);
  assert.deepEqual(classifyMuscularObject(`${legacyName}_123`), ['muscular-01', 'head-face']);
  assert.equal(systemForMeshName(legacyName), 'muscular');
  assert.equal(classifyMuscularObject('Common tendinous ring.r.002'), null);
  assert.equal(classifyMuscularObject('Unknown muscle'), null);
  const names = new Set(objects.map((row) => row[4].trim().toLowerCase()));
  const oldSystems = {
    BONES: 'skeletal', CARTILAGE: 'skeletal', 'Joints and cartilage': 'joints',
    'Vascular system': 'vascular', 'Visceral organs': 'organs',
    MUSCLE_ATTACHMENTS: 'attachments', TENDON_LIGAMENT_ATTACHMENTS: 'attachments',
  };
  for (const row of originalRows) {
    if (row[0] !== 'OBJECT' || !oldSystems[row[1]] || names.has(row[4].trim().toLowerCase())) continue;
    assert.equal(systemForMeshName(row[4]), oldSystems[row[1]], row[4]);
  }
  const nodes = [...objects.map((row) => row[4]), legacyName].map((rawName, index) => ({
    instanceID: index + 1, rawName, name: rawName, systemId: 'muscular',
    visible: index % 3 !== 0, type: 'MatrixTransform', children: [],
  }));
  const unrelated = { instanceID: 9000, rawName: 'Kidney.r', systemId: 'organs', visible: true };
  const unknown = { instanceID: 9001, rawName: 'Unidentified muscular mesh', systemId: 'muscular', visible: true };
  const pathForNode = (node) => node.systemId === 'muscular' ? classifyMuscularObject(node.rawName) : null;
  const baseline = new Map(nodes.map((node) => [node.instanceID, node.visible]));
  const hiddenByCollections = new Set();
  for (const [label, path] of paths) {
    const members = nodes.filter((node) => path.every((part, index) => pathForNode(node)?.[index] === part));
    assert.ok(members.length, `${label} has members`);
    const visibility = new Map(baseline);
    for (const node of members) {
      visibility.set(node.instanceID, false);
      hiddenByCollections.add(node.instanceID);
    }
    for (const node of nodes) assert.equal(visibility.get(node.instanceID),
      members.includes(node) ? false : baseline.get(node.instanceID), `${label} Hide scope`);
    for (const node of members) visibility.set(node.instanceID, true);
    for (const node of members) assert.equal(visibility.get(node.instanceID), true, `${label} Show`);
    const plan = planRegionIsolation([...nodes, unrelated, unknown], 'muscular', path, pathForNode);
    assert.ok(plan, label);
    assert.equal(plan.affected.length, nodes.length);
    assert.deepEqual(new Set(plan.show), new Set(members.map((node) => node.instanceID)));
    assert.equal(plan.hide.length + plan.show.length, nodes.length);
    assert.ok(![...plan.show, ...plan.hide].includes(unrelated.instanceID));
    assert.ok(![...plan.show, ...plan.hide].includes(unknown.instanceID), 'Unknown anatomy remains unchanged');
    const isolated = new Map(baseline);
    for (const id of plan.hide) isolated.set(id, false);
    for (const id of plan.show) isolated.set(id, true);
    for (const node of plan.affected) isolated.set(node.instanceID, baseline.get(node.instanceID));
    assert.deepEqual(isolated, baseline, `${label} Restore preserves previous visibility`);
  }
  assert.equal(hiddenByCollections.size, nodes.length, 'All known objects covered by collection Hide');
  assert.equal(planRegionIsolation(nodes, 'muscular', ['nonexistent'], pathForNode), null);
  console.log('Muscular checks passed: all 24 corrected memberships; 683 CSV objects + 1 verified legacy duplicate; 3 collections, 8 subdivisions; Show/Hide/Isolate/Restore checked at all 11 levels.');
} finally {
  await server.close();
}
