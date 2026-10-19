import { build } from 'esbuild';
import { mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const core = resolve(root, 'packages/core');
const outDir = resolve(core, 'dist');
mkdirSync(outDir, { recursive: true });

const targets = [
  // npm：ESM
  { entry: 'src/index.js', out: 'dist/trust-lens.esm.js', format: 'esm', minify: false },
  // npm：CJS
  { entry: 'src/index.js', out: 'dist/trust-lens.cjs.js', format: 'cjs', minify: false, platform: 'node' },
  // CDN：IIFE 单文件，自动注册 <trust-lens>
  { entry: 'src/cdn.js', out: 'dist/trust-lens.min.js', format: 'iife', minify: true },
];

for (const t of targets) {
  const outfile = resolve(core, t.out);
  await build({
    entryPoints: [resolve(core, t.entry)],
    outfile,
    bundle: true,
    format: t.format,
    minify: t.minify,
    platform: t.platform || 'browser',
    target: ['es2019'],
    legalComments: 'none',
    logLevel: 'silent',
  });
  const kb = (statSync(outfile).size / 1024).toFixed(1);
  console.log(`✓ ${t.out.padEnd(28)} ${kb} KB`);
}
