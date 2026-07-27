/**
 * Ejecuta una entrada TypeScript con el esbuild que ya trae Vite, sin generar
 * bundles temporales. Mantiene operativas las herramientas de arte incluso en
 * un checkout que todavía no actualizó `node_modules/.bin/tsx`.
 *
 * El nombre se conserva porque nació como lanzador del procesador de piezas.
 *
 *   node scripts/run-process-mostasa-parts.mjs scripts/validate-parts.mts \
 *     assets/entrega-mostasa
 */

import { build } from 'esbuild';

const [, , requestedEntry, ...args] = process.argv;
const entryPoint = requestedEntry ?? 'scripts/process-mostasa-parts.mts';
process.argv = [process.execPath, entryPoint, ...args];

const result = await build({
  entryPoints: [entryPoint],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  logLevel: 'silent',
});

const output = result.outputFiles[0];
if (!output) throw new Error(`esbuild no produjo una salida para ${entryPoint}`);

const moduleUrl = `data:text/javascript;base64,${Buffer.from(output.contents).toString('base64')}`;
await import(moduleUrl);
