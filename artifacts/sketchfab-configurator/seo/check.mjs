import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist/public');
const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const config = await readFile(path.join(root, '.replit-artifact/artifact.toml'), 'utf8');
const rewrites = new Map([...config.matchAll(/from\s*=\s*"([^"]+)"\s+to\s*=\s*"([^"]+)"/g)]
  .map(match => [match[1], match[2]]));

test('sitemap includes every configured public route, without preview addresses', () => {
  assert.equal(urls.length, 28);
  assert.equal(new Set(urls).size, urls.length);
  assert.equal(rewrites.has('/*'), false, 'Unknown paths must not return homepage HTML');
  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://anatomiaaperta.org');
    if (parsed.pathname !== '/') {
      assert.equal(rewrites.get(parsed.pathname), `${parsed.pathname}/index.html`);
    }
  }
  assert.equal(rewrites.size, urls.length - 1, 'A new route needs an SEO page and rewrite');
});

test('all public pages have unique metadata, server-rendered content, schemas and working local links', async () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const url of urls) {
    const route = new URL(url).pathname;
    const html = await readFile(path.join(output, route.slice(1), 'index.html'), 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(title && description, route);
    assert.equal(titles.has(title), false, `Duplicate title: ${route}`);
    assert.equal(descriptions.has(description), false, `Duplicate description: ${route}`);
    titles.add(title);
    descriptions.add(description);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), route);
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, route);
    assert.equal((html.match(/<title>/g) ?? []).length, 1, route);
    assert.doesNotMatch(html, /content="noindex|(?:src|href)="\/src\//, route);
    assert.match(html, /<main[\s>]/, route);
    assert.match(html, /property="og:image" content="https:\/\/anatomiaaperta.org\/social-preview.jpg"/, route);
    const schema = JSON.parse(html.match(/id="seo-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '');
    assert.equal(schema['@context'], 'https://schema.org');
    assert.ok(schema['@graph'].some(item => item['@type'] === 'WebPage' && item.url === url), route);
    for (const match of html.matchAll(/(?:src|href)="(\/[^"]*)"/g)) {
      const local = match[1].split(/[?#]/)[0];
      assert.ok(existsSync(path.join(output, local)) ||
        existsSync(path.join(output, local, 'index.html')), `${route}: missing ${local}`);
    }
  }
});

test('unknown pages are non-indexable and crawl instructions use the real domain', async () => {
  const html = await readFile(path.join(output, '404.html'), 'utf8');
  assert.match(html, /name="robots" content="noindex, follow"/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.match(html, /Page not found/);
  const robots = await readFile(path.join(output, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\/anatomiaaperta.org\/sitemap.xml/);
  assert.match(robots, /Disallow: \/__mockup/);
  assert.ok(existsSync(path.join(output, 'social-preview.jpg')));
});
