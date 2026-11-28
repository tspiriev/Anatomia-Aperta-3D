import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist/public');
const renderOutput = path.join(root, 'dist/seo-renderer');
// Bundle the renderer: the anatomy data contains circular imports that work in
// the production bundle but not in Vite's development SSR module runner.
await build({
  configFile: path.join(root, 'vite.config.ts'),
  build: {
    ssr: path.join(root, 'seo/entry.tsx'),
    outDir: renderOutput,
    emptyOutDir: true,
    manifest: false,
    rollupOptions: { output: { entryFileNames: 'entry.mjs', inlineDynamicImports: true } },
  },
});
{
  const { renderPage, seoPages, getSeoPage, withSeo } = await import(path.join(renderOutput, 'entry.mjs'));
  const template = await readFile(path.join(output, 'index.html'), 'utf8');
  const manifest = JSON.parse(await readFile(path.join(output, '.vite/manifest.json'), 'utf8'));
  const assetUrls = Object.entries(manifest).filter(([, item]) => !item.isEntry)
    .map(([source, item]) => [`/${source}`, `/${item.file}`]);
  const urls = [];
  for (const page of [...seoPages, getSeoPage('/404')]) {
    let content = renderPage(page.path);
    for (const [source, target] of assetUrls) content = content.replaceAll(source, target);
    // Vite's SSR asset URLs must never escape into the published HTML.
    assert.doesNotMatch(content, /(?:src|href)="\/src\//, `Unmapped asset on ${page.path}`);
    const html = withSeo(template, page, content);
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `One H1 required: ${page.path}`);
    assert.equal((html.match(/<title>/g) ?? []).length, 1, `One title required: ${page.path}`);
    const file = page.noindex ? path.join(output, '404.html')
      : path.join(output, page.path === '/' ? '' : page.path.slice(1), 'index.html');
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, html);
    if (!page.noindex) urls.push(`  <url><loc>https://anatomiaaperta.org${page.path === '/' ? '/' : page.path}</loc></url>`);
  }
  await writeFile(path.join(output, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  console.info(`Pre-rendered ${seoPages.length} public pages, a 404 page and sitemap.xml.`);
}
