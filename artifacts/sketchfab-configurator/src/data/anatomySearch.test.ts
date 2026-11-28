import test from 'node:test';
import assert from 'node:assert/strict';
import { searchAnatomy, anatomySearchDisplayName } from './anatomySearch';
import { ATLAS_VIEWS } from './atlasViews';

test('empty, one-character and unknown queries produce no invented results', async () => {
  for (const query of ['', ' ', 'v', 'xyznonexistentanatomy987'])
    assert.deepEqual(await searchAnatomy(query), { results: [], total: 0 });
});

test('search finds real structures and links all relevant focused menus before the full atlas', async () => {
  const result = (await searchAnatomy(' VAGUS   nerve ')).results.find(item => item.name === 'Vagus nerve (X)');
  assert.ok(result);
  for (const id of ['cranial-nerves', 'autonomic-nervous-system', 'full-anatomy'])
    assert.ok(result.destinations.some(item => item.atlasId === id), id);
  assert.equal(result.destinations.at(-1)?.atlasId, 'full-anatomy');
  assert.ok(!result.destinations.some(item => item.atlasId === 'head-neck-topography'));
  // The Brain source scope is permissive; a peripheral nerve without an
  // actual Brain collection is not a valid search destination.
  assert.ok(!result.destinations.some(item => item.atlasId === 'brain'));
});

test('muscles and skeletal synonyms link their actual regional menus, not unrelated source scopes', async () => {
  const psoas = (await searchAnatomy('psoas major')).results.find(item => item.name === 'Psoas major')!;
  assert.ok(psoas);
  assert.ok(psoas.destinations.some(item => item.atlasId === 'musculoskeletal-system'
    && item.collections.some(label => label.includes('Lower Limb'))));
  assert.ok(!psoas.destinations.some(item => item.atlasId === 'head-neck-topography'));
  const hip = (await searchAnatomy('iliac bone')).results.find(item => item.name === 'Hip bone')!;
  assert.ok(hip);
  assert.ok(hip.destinations.some(item => item.atlasId === 'musculoskeletal-system'));
  assert.ok(!hip.destinations.some(item => ['skull-base', 'brain', 'central-nervous-system'].includes(item.atlasId)));
});

test('ansa cervicalis spellings merge into named roots without linking the head-only atlas', async () => {
  const { results } = await searchAnatomy('ansa cervicalis');
  const superior = results.find(item => item.name === 'Superior root ansa cervicalis')!;
  const inferior = results.find(item => /Inferior root.*ansa cervicalis/.test(item.name))!;
  assert.ok(superior);
  assert.ok(inferior);
  for (const structure of [superior, inferior]) {
    assert.ok(!structure.destinations.some(item => item.atlasId === 'head-neck-topography'));
  }
  assert.equal(new Set(results.map(item => item.id)).size, results.length);
});

test('homepage gland search links actual head regions, while cervical glands stay outside this atlas', async () => {
  for (const query of ['parotid gland', 'submandibular gland', 'sublingual gland', 'lacrimal gland']) {
    const { results } = await searchAnatomy(query);
    const destination = results.flatMap(result => result.destinations)
      .find(item => item.atlasId === 'head-neck-topography');
    assert.ok(destination, query);
    assert.ok(destination.collections.some(label => /Parotid|Oral|Orbit/.test(label)), query);
  }
  for (const query of ['thyroid gland', 'parathyroid gland'])
    assert.ok(!(await searchAnatomy(query)).results.flatMap(r => r.destinations)
      .some(d => d.atlasId === 'head-neck-topography'), query);
});

test('export prefixes and side suffixes are readable without changing source lookup names', async () => {
  assert.equal(anatomySearchDisplayName('FJ4261_BP29310_FMA7003_Trunk of C2 nerve root.l.001_1234'),
    'Trunk of C2 nerve root');
  const { results } = await searchAnatomy('great auricular nerve');
  assert.ok(results.some(result => result.destinations.some(item =>
    item.atlasId === 'head-neck-topography'
       && item.collections.some(label => label.includes('Parotid and retromandibular region')))));
});

test('pagination retains a stable ordering and every result has registered internal destinations', async () => {
  const first = await searchAnatomy('nerve', 2);
  const more = await searchAnatomy('nerve', 5);
  assert.equal(first.total, more.total);
  assert.ok(first.total > 5);
  assert.equal(first.results.length, 2);
  assert.equal(more.results.length, 5);
  assert.deepEqual(first.results.map(item => item.id), more.results.slice(0, 2).map(item => item.id));
  for (const result of more.results) {
    assert.ok(result.destinations.length);
    assert.equal(new Set(result.destinations.map(item => item.href)).size, result.destinations.length);
    for (const destination of result.destinations) {
      assert.ok(ATLAS_VIEWS.some(view => view.href === destination.href));
      assert.ok(destination.collections.length);
      assert.ok(destination.menuLabel);
    }
  }
});
