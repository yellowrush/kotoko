import { build } from 'esbuild';

await build({
  entryPoints: ['vercel.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2020',
  minify: true,
  logLevel: 'warning',
  outfile: 'vercel.bundle.js',
  banner: {
    js: "import { createRequire } from 'node:module';const require=createRequire(import.meta.url);",
  },
});
