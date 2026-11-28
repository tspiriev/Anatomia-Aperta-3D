import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: '/tmp/check-attachments-vite',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@assets': fileURLToPath(new URL('../../../attached_assets', import.meta.url)) } },
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { ATTACHMENT_GROUPS, classifyAttachmentObject } =
    await server.ssrLoadModule('/src/data/attachmentTaxonomy.ts');
  const { csvRows, systemForMeshName } = await server.ssrLoadModule('/src/data/anatomicalSystems.ts');
  const { planRegionIsolation } = await server.ssrLoadModule('/src/lib/regionIsolation.ts');
  const source = fs.readFileSync(new URL('../../../attached_assets/Skeletal_system_and_muscle_attachments_1791278212022.csv', import.meta.url), 'utf8');
  const allObjects = [...csvRows(source)].filter((row) => row[0] === 'OBJECT');
  const objects = allObjects.filter((row) =>
    ['MUSCLE_ATTACHMENTS', 'TENDON_LIGAMENT_ATTACHMENTS'].includes(row[1]));
  assert.equal(objects.length, 705);
  assert.equal(objects.filter((row) => row[1] === 'MUSCLE_ATTACHMENTS').length, 685);
  assert.equal(new Set(objects.map((row) => row[4].toLowerCase())).size, 705);
  assert.equal(ATTACHMENT_GROUPS.length, 2);
  assert.equal(ATTACHMENT_GROUPS[0].children.length, 8);
  assert.equal(ATTACHMENT_GROUPS[1].children.length, 4);

  const groupPaths = ATTACHMENT_GROUPS.flatMap((group) => [
    [group.id], ...group.children.map((child) => [group.id, child.id]),
  ]);
  const leafPaths = new Set(groupPaths.filter((path) => path.length === 2).map((path) => path.join('/')));
  const counts = new Map([...leafPaths].map((path) => [path, 0]));
  for (const row of objects) {
    const path = classifyAttachmentObject(row[4]);
    assert.ok(path, `Unmapped attachment: ${row[4]}`);
    assert.ok(leafPaths.has(path.join('/')), row[4]);
    assert.equal(path[0], row[1] === 'MUSCLE_ATTACHMENTS' ? 'attachment-muscles' : 'attachment-tendons', row[4]);
    assert.deepEqual(classifyAttachmentObject(` ${row[4].toUpperCase()}_123 `), path, row[4]);
    assert.equal(systemForMeshName(row[4]), 'attachments', row[4]);
    counts.set(path.join('/'), counts.get(path.join('/')) + 1);
  }
  for (const [path, count] of counts) assert.ok(count > 0, `Empty group: ${path}`);
  // This export also contains skeletal geometry: it must not enter attachment groups.
  for (const row of allObjects.filter((row) => ['BONES', 'CARTILAGE'].includes(row[1]))) {
    assert.equal(classifyAttachmentObject(row[4]), null, row[4]);
    assert.equal(systemForMeshName(row[4]), 'skeletal', row[4]);
  }
  const examples = [
    ['Extensor digitorum.e7l', 'upper-extremity'],
    ['Extensor digitorum longus.e3r', 'lower-extremity'],
    ['Abductor digiti minimi of hand.or', 'upper-extremity'],
    ['Abductor digiti minimi of foot.el', 'lower-extremity'],
    ['Temporalis muscle.o1r', 'head-face'],
    ['Rectus anterior capitis muscle.el', 'cervical'],
    ['Pectoralis major muscle.or', 'thoracic'],
    ['Longissimus thoracis muscle.e24r', 'back'],
    ['External abdominal oblique muscle.or', 'abdominal'],
    ['Gluteus medius muscle.or', 'hip-pelvis'],
  ];
  for (const [name, region] of examples) {
    assert.deepEqual(classifyAttachmentObject(name), ['attachment-muscles', region], name);
  }
  for (const [name, region] of [
    ['Common extensor tendon.ol', 'elbow'], ['Tensor fasciae latae.or', 'hip'],
    ['Patellar ligament.er', 'knee'], ['Long plantar ligament.o4r', 'foot'],
  ]) assert.deepEqual(classifyAttachmentObject(name), ['attachment-tendons', region], name);
  assert.equal(classifyAttachmentObject('Unknown muscle.ol'), null);
  assert.equal(classifyAttachmentObject('Temporalis muscle'), null, 'Do not classify actual muscles as attachment sites');

  const nodes = objects.map((row, index) => ({
    instanceID: index + 1, rawName: row[4], name: row[4], systemId: 'attachments',
    visible: index % 3 !== 0, type: 'MatrixTransform', children: [],
  }));
  nodes.push({ instanceID: 9000, rawName: 'Unknown attachment', systemId: 'attachments', visible: true });
  const unrelated = [
    { instanceID: 9998, rawName: 'Ulna.l', systemId: 'skeletal', visible: false },
    { instanceID: 9999, rawName: 'Temporalis muscle', systemId: 'muscular', visible: true },
  ];
  const baseline = new Map(nodes.map((node) => [node.instanceID, node.visible]));
  const pathForNode = (node) => node.systemId === 'attachments' ? classifyAttachmentObject(node.rawName) : null;
  for (const path of groupPaths) {
    const plan = planRegionIsolation([...nodes, ...unrelated], 'attachments', path, pathForNode);
    assert.ok(plan, path.join('/'));
    assert.equal(plan.affected.length, nodes.length);
    const shown = new Set(plan.show);
    const hidden = new Set(plan.hide);
    assert.equal(shown.size + hidden.size, nodes.length);
    for (const node of nodes) {
      const nodePath = pathForNode(node);
      const belongs = nodePath !== null && path.every((part, index) => nodePath[index] === part);
      assert.equal(shown.has(node.instanceID), belongs, `${node.rawName} in ${path.join('/')}`);
      assert.equal(hidden.has(node.instanceID), !belongs, node.rawName);
    }
    assert.ok(hidden.has(9000), 'Unassigned sites cannot leak into isolated groups');
    for (const node of unrelated) {
      assert.ok(!shown.has(node.instanceID) && !hidden.has(node.instanceID));
    }
    const visibility = new Map(baseline);
    for (const id of plan.hide) visibility.set(id, false);
    for (const id of plan.show) visibility.set(id, true);
    const snapshot = new Map(plan.affected.map((node) => [node.instanceID, node.visible]));
    for (const [id, visible] of snapshot) visibility.set(id, visible);
    assert.deepEqual(visibility, baseline, 'Restore preserves mixed visibility, including unidentified attachments');
  }
  assert.equal(planRegionIsolation(nodes, 'attachments', ['missing'], pathForNode), null);
  console.log('Attachment checks passed: 705/705 sites; 2 collections, 12 regional subdivisions; isolation/restore checked at all 14 levels; bones/cartilage unchanged.');
  console.log('Regional counts:', Object.fromEntries(counts));
} finally {
  await server.close();
}
