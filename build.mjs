/**
 * Builds `client.js` from the numbered source parts.
 *
 * The parts are plain statement sequences that share one closure: the module
 * loader opens in `src/00-head.js` and closes in `src/70-wiring.js`, so the
 * concatenation order is the file-name order.
 *
 *   node build.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, 'src');
const files = readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
const parts = files.map((f) => readFileSync(join(srcDir, f), 'utf8'));
const out = parts.join('\n');
writeFileSync(join(here, 'client.js'), out, 'utf8');
console.log('client.js: ' + out.length + ' bytes from ' + files.length + ' parts');
for (const f of files) console.log('  ' + f);
