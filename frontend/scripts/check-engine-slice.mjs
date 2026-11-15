// Check that the TypeScript port of slice_result (src/services/engineData.ts) gives exactly the engine's
// answer: the first 30 days cut from the precomputed year must equal contract/examples/ (validated files).
// Usage: npm run check-engine   (optional: node scripts/check-engine-slice.mjs <periods.json> to print slices)
import { build } from 'esbuild';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const out = join(mkdtempSync(join(tmpdir(), 'astra-')), 'engineData.mjs');
await build({ entryPoints: [resolve(here, '../src/services/engineData.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { sliceResult } = await import(pathToFileURL(out).href);
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

if (process.argv[2]) {
  // periods file: [{siteId, start, end}] -> print the slices as JSON (used for the Python cross-check)
  const periods = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const res = periods.map((p) => sliceResult(read(`contract/precomputed/result_${p.siteId}.json`), p.start, p.end));
  writeFileSync(process.argv[3], JSON.stringify(res));
} else {
  let failed = 0;
  for (const id of ['shackleton_coords_proto', 'shackleton_rim_high', 'malapert', 'malapert_summit']) {
    const cut = sliceResult(read(`contract/precomputed/result_${id}.json`), '2026-11-14T00:00:00Z', '2026-12-14T00:00:00Z');
    const same = JSON.stringify(cut) === JSON.stringify(read(`contract/examples/result_${id}.json`));
    console.log(`${id.padEnd(26)} 30 days cut == contract/examples: ${same}`);
    if (!same) failed++;
  }
  process.exit(failed ? 1 : 0);
}
