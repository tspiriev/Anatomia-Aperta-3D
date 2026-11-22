// Runs every src/**/*.test.ts(x) file with `node --test`.
//
// The tests use the app's path aliases (`@`, `@assets`) and `?raw` CSV imports,
// and the anatomy data has circular imports that only resolve correctly in a
// Rollup bundle (the same reason seo/prerender.mjs bundles its renderer). So the
// tests are first bundled with Vite in SSR mode, one entry per test file, and
// each bundle then runs in its own `node --test` process.
//
// Usage: node scripts/run-tests.mjs [substring-filter ...]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist/tests');
const filters = process.argv.slice(2);

function findTests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findTests(full);
    return /\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const assetsDir = path.resolve(root, '../../attached_assets');
const matched = findTests(path.join(root, 'src'))
  .filter((file) => filters.length === 0 || filters.some((f) => file.includes(f)))
  .sort();

// A test that names a data file missing from attached_assets/ can't be bundled
// and would abort the whole build, so report it as a failure and run the rest.
const missingFixtures = new Map();
for (const file of matched) {
  const source = readFileSync(file, 'utf8');
  const missing = [...source.matchAll(/(?:@assets|attached_assets)\/([\w.-]+)/g)]
    .map((match) => match[1])
    .filter((name) => !existsSync(path.join(assetsDir, name)));
  if (missing.length) missingFixtures.set(file, [...new Set(missing)]);
}
const files = matched.filter((file) => !missingFixtures.has(file));

if (files.length === 0 && missingFixtures.size === 0) {
  console.error('No test files matched.');
  process.exit(1);
}

// Entry names mirror the source layout, e.g. "src/data/neck.test".
const input = Object.fromEntries(files.map((file) => [
  path.relative(root, file).replace(/\.tsx?$/, '').split(path.sep).join('/'),
  file,
]));

// Tests read sources and CSVs relative to their own location, so keep
// `import.meta.url` pointing at the original module rather than the bundle.
const preserveImportMetaUrl = {
  name: 'preserve-import-meta-url',
  enforce: 'pre',
  transform(code, id) {
    if (!id.startsWith(path.join(root, 'src')) || !code.includes('import.meta.url')) return null;
    const url = JSON.stringify(pathToFileURL(id.split('?')[0]).href);
    return { code: code.replaceAll('import.meta.url', url), map: null };
  },
};

rmSync(outDir, { recursive: true, force: true });
if (files.length) await build({
  configFile: false,
  root,
  logLevel: 'warn',
  plugins: [react(), preserveImportMetaUrl],
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
      '@assets': path.resolve(root, '../../attached_assets'),
    },
  },
  build: {
    ssr: true,
    outDir,
    emptyOutDir: true,
    minify: false,
    sourcemap: 'inline',
    rollupOptions: {
      input,
      output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' },
    },
  },
});

const bundles = Object.keys(input).map((name) => path.join(outDir, `${name}.mjs`));
const result = bundles.length
  ? spawnSync(process.execPath, ['--enable-source-maps', '--test', ...bundles], { cwd: root, stdio: 'inherit' })
  : { status: 0 };

if (missingFixtures.size) {
  console.error(`\n✖ ${missingFixtures.size} test file(s) not run: they use data files missing from attached_assets/`);
  for (const [file, names] of missingFixtures) {
    console.error(`  ${path.relative(root, file)}: ${names.join(', ')}`);
  }
}
process.exit(result.status || (missingFixtures.size ? 1 : 0));
