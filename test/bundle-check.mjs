/**
 * Delivery checks for the installed bundle: manifest, locale resources, icon
 * bytes, and the assembled client artifact.
 *
 *   node test/bundle-check.mjs
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (name, cond, detail) => { if (!cond) fails.push(name + (detail ? ' — ' + detail : '')); };

const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
check('package name', pkg.name === '@local/diffusion-3d-lab', pkg.name);
check('bundle patch declared', pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch === './cordis.patch.yml');
check('client half declared', pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === 'web');
check('client export', pkg.exports && pkg.exports['./client'] === './client.js');
for (const needed of ['index.js', 'client.js', 'cordis.patch.yml', 'locale/*.json', 'icon.svg']) {
  check('files lists ' + needed, pkg.files.indexOf(needed) >= 0);
}

const patch = readFileSync(join(dir, 'cordis.patch.yml'), 'utf8');
check('patch inserts the row',
  /id:\s*diffusion-3d-lab/.test(patch) && /@local\/diffusion-3d-lab/.test(patch));

for (const lang of ['en', 'zh']) {
  const meta = JSON.parse(readFileSync(join(dir, 'locale', lang + '.json'), 'utf8'));
  check(lang + ' meta.title', meta.meta && meta.meta.title === 'Diffusion 3D Lab',
    JSON.stringify(meta.meta));
  check(lang + ' meta.description',
    !!(meta.meta && meta.meta.description && meta.meta.description.length > 40));
}

const icon = readFileSync(join(dir, 'icon.svg'), 'utf8');
check('icon is svg', /^<svg[\s>]/.test(icon.trim()));
check('icon under 256 KiB', Buffer.byteLength(icon) < 256 * 1024, String(Buffer.byteLength(icon)));
check('icon closes', /<\/svg>\s*$/.test(icon));
const opens = (icon.match(/<(?!\/)[a-zA-Z]+/g) || []).length;
const closes = (icon.match(/<\/[a-zA-Z]+>/g) || []).length + (icon.match(/\/>/g) || []).length;
check('icon tags balanced', Math.abs(opens - closes) <= 1, opens + ' open / ' + closes + ' closed');

const client = readFileSync(join(dir, 'client.js'), 'utf8');
const regAt = client.indexOf('window.__ModuleLoader__.load({');
check('client registers with the loader', regAt > 0 && regAt < 2000, String(regAt));
check('client declares its id', client.indexOf("id: '@local/diffusion-3d-lab'") > 0);
check('client tabs the sidebar panel', client.indexOf("'sidebar.panellist'") > 0);
check('client claims the main panel', client.indexOf("name: 'main'") > 0);
check('client size sane', statSync(join(dir, 'client.js')).size > 60000, String(client.length));

if (fails.length) {
  console.error('FAILED (' + fails.length + ')');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('ok: bundle manifest, patch, locales, icon (' + Buffer.byteLength(icon) +
  ' B) and client.js checked');
