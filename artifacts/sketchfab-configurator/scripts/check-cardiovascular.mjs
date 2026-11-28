import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: '/tmp/check-cardiovascular-vite',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@assets': fileURLToPath(new URL('../../../attached_assets', import.meta.url)) } },
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { CARDIOVASCULAR_GROUPS, classifyCardiovascularObject } =
    await server.ssrLoadModule('/src/data/cardiovascularTaxonomy.ts');
  const { csvRows, systemForMeshName } = await server.ssrLoadModule('/src/data/anatomicalSystems.ts');
  const { CARDIOVASCULAR_CORRECTIONS, reviewedCardiovascularPath } =
    await server.ssrLoadModule('/src/data/cardiovascularCorrections.ts');
  const { planRegionIsolation } = await server.ssrLoadModule('/src/lib/regionIsolation.ts');
  const source = fs.readFileSync(new URL('../../../attached_assets/Cardiovascular_system_final_1790945714118.csv', import.meta.url), 'utf8');
  const objects = [...csvRows(source)].filter((row) => row[0] === 'OBJECT');
  assert.deepEqual(CARDIOVASCULAR_GROUPS.map((group) => group.label), [
    '01 Heart & Great Vessels', '02 Brain Vessels', '03 Head & Face Vessels',
    '04 Cervical Vessels', '05 Thoracic Vessels', '06 Abdominal Vessels',
    '07 Pelvic & Perineal Vessels', '08 Upper Extremity Vessels', '09 Lower Extremity Vessels',
  ]);
  assert.equal(new Set(CARDIOVASCULAR_GROUPS.map((group) => group.id)).size, 9);
  const counts = new Map(CARDIOVASCULAR_GROUPS.map((group) => [group.id, 0]));
  const paths = new Map(CARDIOVASCULAR_GROUPS.map((group) => [group.label, [group.id]]));
  // Creator-approved out-of-hierarchy objects, checked independently of the
  // incoming regional corrections.
  const reviewed = new Map([
    ['HCS_RV_Purkinje_05', 'cardiovascular-01'],
    ['HCS_LV_Purkinje_04', 'cardiovascular-01'],
    ['Anterior_Intercavernous_Sinus', 'cardiovascular-02'],
    ['Basilar venous plexus clivus', 'cardiovascular-02'],
    ['Cavernous_Sinus_L', 'cardiovascular-02'],
    ['Cavernous_Sinus_R', 'cardiovascular-02'],
    ['FJ5120_BP28747_FMA52210_Right marginal sinus', 'cardiovascular-02'],
    ['Posterior_Intercavernous_Sinus', 'cardiovascular-02'],
    ['Sphenoid venous plexus', 'cardiovascular-02'],
    ['Cervical vertebral venous pleus', 'cardiovascular-04'],
    ['Thoracic vertebral venosu plexus', 'cardiovascular-05'],
    ['Lumbar vertebral venous plexus', 'cardiovascular-06'],
  ]);
  assert.equal(reviewed.size, 12);
  assert.deepEqual(
    objects.filter((row) => !paths.has(row[1])).map((row) => row[4]).sort(),
    [...reviewed.keys()].sort(),
  );
  for (const [name, region] of reviewed) {
    assert.deepEqual(classifyCardiovascularObject(name), [region], name);
    assert.deepEqual(classifyCardiovascularObject(` ${name.toUpperCase()}_123 `), [region], name);
  }
  let mapped = 0;
  for (const row of objects) {
    const expected = reviewedCardiovascularPath(row[4], paths.get(row[1]) ?? null);
    assert.deepEqual(classifyCardiovascularObject(row[4]), expected, row[4]);
    assert.deepEqual(classifyCardiovascularObject(` ${row[4].toUpperCase()}_123 `), expected, row[4]);
    assert.equal(systemForMeshName(row[4]), 'vascular', row[4]);
    if (expected) {
      mapped++;
      counts.set(expected[0], counts.get(expected[0]) + 1);
    }
  }
  const exportedNames = new Set(objects.map((row) => row[4].trim().toLowerCase()));
  for (const name of CARDIOVASCULAR_CORRECTIONS.keys()) {
    assert.ok(exportedNames.has(name), `Correction must match a real exported object: ${name}`);
  }
  assert.equal(mapped, 735);
  assert.equal(objects.length - mapped, 2);
  assert.deepEqual(classifyCardiovascularObject('????????'), ['cardiovascular-01']);
  assert.deepEqual(classifyCardiovascularObject('??????'), ['cardiovascular-01']);
  assert.equal(systemForMeshName('??????'), 'vascular');
  assert.equal(classifyCardiovascularObject('?x.l'), null);
  assert.equal(classifyCardiovascularObject('?x.r'), null);
  assert.deepEqual(classifyCardiovascularObject('HCS_Bundle_of_His'), ['cardiovascular-01']);
  assert.deepEqual(classifyCardiovascularObject('Parietal branch middle meningeal artery.r'), ['cardiovascular-03']);
  assert.deepEqual(classifyCardiovascularObject('HCS_RV_Purkinje_05'), ['cardiovascular-01']);
  assert.deepEqual(classifyCardiovascularObject('Basilar venous plexus clivus'), ['cardiovascular-02']);
  assert.deepEqual(classifyCardiovascularObject('Cervical vertebral venous pleus'), ['cardiovascular-04']);
  assert.deepEqual(classifyCardiovascularObject('Thoracic vertebral venosu plexus'), ['cardiovascular-05']);
  assert.deepEqual(classifyCardiovascularObject('Lumbar vertebral venous plexus'), ['cardiovascular-06']);
  for (const side of ['l', 'r']) {
    assert.deepEqual(classifyCardiovascularObject(`Internal carotid artery.${side}`), ['cardiovascular-04']);
    assert.deepEqual(classifyCardiovascularObject(`Maxillary artery.${side}`), ['cardiovascular-03']);
    assert.deepEqual(classifyCardiovascularObject(`Dorsal digital arteries of foot.${side}`), ['cardiovascular-09']);
    assert.deepEqual(classifyCardiovascularObject(`Dorsal carpal anastomosis.${side}`), ['cardiovascular-08']);
    assert.deepEqual(classifyCardiovascularObject(`Intrarenal arteries of ${side === 'l' ? 'left' : 'right'} kidney`), ['cardiovascular-06']);
  }
  for (const row of objects) {
    if (/\bof (?:left|right) lung\b/i.test(row[4])) {
      assert.deepEqual(classifyCardiovascularObject(row[4]), ['cardiovascular-05'], `${row[4]} is not a brain/head vessel`);
    }
    if (row[4].startsWith('HCS_')) {
      assert.deepEqual(classifyCardiovascularObject(row[4]), ['cardiovascular-01'], `${row[4]} is cardiac conduction`);
    }
  }
  assert.equal(classifyCardiovascularObject('Unknown artery'), null);
  assert.equal(systemForMeshName('Kidney.r'), 'organs');
  assert.equal(systemForMeshName('Tongue'), 'organs');
  for (const name of [
    'HCS_RV_Purkinje_06', 'HCS_LV_Purkinje_03', 'Cavernous_Sinus',
    'Basilar venous plexus', 'Cervical vertebral venous plexus',
    'Thoracic vertebral venous plexus', 'Lumbar vertebral venous plexus extra',
  ]) assert.equal(classifyCardiovascularObject(name), null, name);
  // Objects absent from this export retain their combined-model system.
  const originalSource = fs.readFileSync(new URL('../../../attached_assets/First_combinedblend_1790668070052.csv', import.meta.url), 'utf8');
  const legacyMeningealNames = [
    'Parietal branch middle meningeal artery.r.001',
    'Parietal branch middle meningeal artery.l.001',
    'Middle meningeal artery.r.002',
    'Frontal branch middle meningeal artery.r.001',
    'Frontal branch middle meningeal artery.l.001',
  ];
  const originalNames = new Set([...csvRows(originalSource)]
    .filter((row) => row[0] === 'OBJECT').map((row) => row[4]));
  for (const name of legacyMeningealNames) {
    assert.ok(originalNames.has(name), `Alias must match a real legacy object: ${name}`);
    assert.ok(!exportedNames.has(name.toLowerCase()), 'Regression covers objects missing from the new regional CSV');
    assert.deepEqual(classifyCardiovascularObject(name), ['cardiovascular-03']);
    assert.deepEqual(classifyCardiovascularObject(` ${name.toUpperCase()}_123 `), ['cardiovascular-03']);
    assert.equal(systemForMeshName(name), 'vascular');
  }
  for (const side of ['l', 'r']) {
    assert.deepEqual(classifyCardiovascularObject(`Middle meningeal artery.${side}`), ['cardiovascular-03']);
  }
  const cardiovascularNames = new Set(objects.map((row) => row[4].trim().toLowerCase()));
  const muscularSource = fs.readFileSync(new URL('../../../attached_assets/Final_Muscles_fused__1791343224663.csv', import.meta.url), 'utf8');
  const muscularNames = new Set([...csvRows(muscularSource)]
    .filter((row) => row[0] === 'OBJECT').map((row) => row[4].trim().toLowerCase()));
  const originalSystems = {
    BONES: 'skeletal', CARTILAGE: 'skeletal', 'Muscular system': 'muscular',
    'Joints and cartilage': 'joints', 'Vascular system': 'vascular',
    'Nervous system': 'nervous', 'Visceral organs': 'organs',
    MUSCLE_ATTACHMENTS: 'attachments', TENDON_LIGAMENT_ATTACHMENTS: 'attachments',
  };
  for (const row of csvRows(originalSource)) {
    if (row[0] !== 'OBJECT' || !row[4] || !originalSystems[row[1]]
      || cardiovascularNames.has(row[4].trim().toLowerCase())
      || muscularNames.has(row[4].trim().toLowerCase())) continue;
    assert.equal(systemForMeshName(row[4]), originalSystems[row[1]], row[4]);
  }
  const nodes = objects.map((row, index) => ({
    instanceID: index + 1, rawName: row[4], name: row[4],
    systemId: 'vascular', visible: index % 3 !== 0, type: 'MatrixTransform', children: [],
  }));
  [...legacyMeningealNames, '??????'].forEach((rawName, index) => nodes.push({
    instanceID: 8000 + index, rawName, name: rawName, systemId: 'vascular',
    visible: index % 2 === 0, type: 'MatrixTransform', children: [],
  }));
  const unrelated = { instanceID: 9999, rawName: 'Tongue', name: 'Tongue', systemId: 'organs', visible: true };
  const pathForNode = (node) => node.systemId === 'vascular' ? classifyCardiovascularObject(node.rawName) : null;
  const baseline = new Map(nodes.map((node) => [node.instanceID, node.visible]));
  // Sequentially using every collection's Hide must cover the known residual
  // geometry, including legacy duplicate arteries and the cardiac vein alias.
  const collectionHidden = new Set();
  for (const group of CARDIOVASCULAR_GROUPS) {
    for (const node of nodes) {
      if (pathForNode(node)?.[0] === group.id) collectionHidden.add(node.instanceID);
    }
  }
  for (const node of nodes.filter((node) =>
    legacyMeningealNames.includes(node.rawName)
    || /^Middle meningeal artery\.[lr]$/.test(node.rawName)
    || ['??????', '????????'].includes(node.rawName))) {
    assert.ok(collectionHidden.has(node.instanceID), `${node.rawName} must hide with its assigned collection`);
  }
  for (const group of CARDIOVASCULAR_GROUPS) {
    const plan = planRegionIsolation([...nodes, unrelated], 'vascular', [group.id], pathForNode);
    assert.ok(plan);
    assert.equal(plan.affected.length, nodes.length);
    const shown = new Set(plan.show);
    const hidden = new Set(plan.hide);
    assert.equal(shown.size + hidden.size, nodes.length);
    assert.ok(!shown.has(unrelated.instanceID) && !hidden.has(unrelated.instanceID));
    for (const node of nodes) {
      const belongs = pathForNode(node)?.[0] === group.id;
      assert.equal(shown.has(node.instanceID), belongs, `${node.rawName} visibility in ${group.label}`);
      assert.equal(hidden.has(node.instanceID), !belongs, `${node.rawName} must not leak into ${group.label}`);
    }
    const visibility = new Map(baseline);
    for (const id of plan.hide) visibility.set(id, false);
    for (const id of plan.show) visibility.set(id, true);
    for (const node of plan.affected) visibility.set(node.instanceID, baseline.get(node.instanceID));
    assert.deepEqual(visibility, baseline, 'Restore covers all changed structures, including unknown meshes');
  }
  assert.equal(planRegionIsolation(nodes, 'vascular', ['nonexistent-region'], pathForNode), null);
  const uncertainOrgan = { ...unrelated, instanceID: 9998, rawName: 'unknown' };
  const organPlan = planRegionIsolation([unrelated, uncertainOrgan], 'organs', ['digestive'],
    (node) => node.rawName === 'Tongue' ? ['digestive'] : null);
  assert.deepEqual(organPlan.show, [9999]);
  assert.deepEqual(organPlan.hide, []);
  assert.deepEqual(organPlan.affected.map((node) => node.instanceID), [9999]);
  console.log(`Cardiovascular checks passed: ${mapped}/${objects.length} mapped objects, 9 regions, 2 unidentified objects; isolation/restore checked for every region, including legacy meningeal aliases and the identified cardiac vein.`);
  console.log('Reviewed region counts:', [...counts.values()]);
  console.log('All 12 creator-approved out-of-hierarchy placements checked.');
} finally {
  await server.close();
}