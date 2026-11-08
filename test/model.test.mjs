/**
 * Development harness for Diffusion 3D Lab.
 *
 * Loads the Client factory outside the browser (fake module loader + React
 * stub) and exercises the pure model code: the DDPM schedule, the forward
 * marginal, the reverse recursion, the U-Net ladder and feature pass, the scene
 * geometry, and locale coverage of every key the panel reads.
 *
 *   node test/model.test.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let captured = null;
globalThis.window = {
  __ModuleLoader__: { load(def) { captured = def; } },
  devicePixelRatio: 1,
  requestAnimationFrame() { return 0; },
  cancelAnimationFrame() {},
};

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
await import(new URL('../client.js', import.meta.url).href);
if (!captured) throw new Error('module did not register with the loader');
if (captured.id !== '@local/diffusion-3d-lab') throw new Error('unexpected module id ' + captured.id);

const reactStub = {
  createElement(type, props, ...children) { return { type, props: props || {}, children }; },
  useState(v) { return [typeof v === 'function' ? v() : v, function () {}]; },
  useEffect() {},
  useMemo(fn) { return fn(); },
  useRef(v) { return { current: v }; },
};

const mod = captured.factory(function (name) {
  if (name === 'react') return reactStub;
  throw new Error('unexpected require: ' + name);
});
if (typeof mod.apply !== 'function') throw new Error('apply missing');
const I = mod.__internals;

const fails = [];
function check(name, cond, detail) {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''));
}
function eq(name, actual, expected) {
  check(name, actual === expected, 'got ' + actual + ', want ' + expected);
}
function near(name, actual, expected, tol) {
  check(name, Math.abs(actual - expected) <= tol, 'got ' + actual + ', want ' + expected + ' ±' + tol);
}

/* ---------- 1. the schedule ---------- */

for (const kind of ['linear', 'cosine']) {
  const s = I.makeSchedule({ kind, T: 1000, betaStart: 1e-4, betaEnd: 0.02 });
  eq(kind + ' T', s.T, 1000);
  near(kind + ' ā₀', s.abar[0], 1, 1e-12);
  let monotone = true;
  for (let t = 2; t <= 1000; t += 1) if (!(s.abar[t] <= s.abar[t - 1])) monotone = false;
  check(kind + ' ā monotone', monotone && s.abar[1] < 1);
  check(kind + ' ā_T small', s.abar[1000] < 0.02, String(s.abar[1000]));
  let consistent = true;
  for (let t = 1; t <= 1000; t += 1) {
    if (Math.abs(s.abar[t] - s.abar[t - 1] * s.alpha[t]) > 1e-12) consistent = false;
    if (Math.abs(s.alpha[t] + s.beta[t] - 1) > 1e-12) consistent = false;
  }
  check(kind + ' α/ā/β consistency', consistent);
  check(kind + ' beta in range', s.beta[1] > 0 && s.beta[1000] < 1);
}

/* ---------- 2. sampled timesteps ---------- */

const steps = I.sampleSteps(100, 6);
eq('sample count', steps.length, 6);
eq('sample starts at 0', steps[0], 0);
eq('sample ends at T', steps[5], 100);
check('sample ascending', steps.every((v, i) => i === 0 || v > steps[i - 1]), steps.join(','));
eq('sample tiny T', I.sampleSteps(4, 9).length, 5);

/* ---------- 3. the clean image ---------- */

for (const pattern of I.PATTERNS) {
  const image = I.makeImage(pattern, 3);
  eq(pattern + ' size', image.size, I.IMG_SIZE);
  eq(pattern + ' values', image.rgb.length, I.IMG_SIZE * I.IMG_SIZE * 3);
  let inRange = true, lo = 1, hi = 0;
  for (let i = 0; i < image.rgb.length; i += 1) {
    const v = image.rgb[i];
    if (!(v >= 0 && v <= 1)) inRange = false;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  check(pattern + ' values in 0..1', inRange);
  check(pattern + ' has contrast', hi - lo > 0.25, lo + '..' + hi);
}
const img = I.makeImage('cat', 3);
const imgB = I.makeImage('cat', 4);
let differs = 0;
for (let i = 0; i < img.rgb.length; i += 1) if (img.rgb[i] !== imgB.rgb[i]) differs += 1;
check('seed changes the sample', differs > 100, String(differs));

/* ---------- 4. the forward marginal ---------- */

const sched = I.makeSchedule({ kind: 'linear', T: 100 });
const at0 = I.forwardImage(img, sched, 0, 3);
let sameAsClean = true;
for (let i = 0; i < at0.rgb.length; i += 1) {
  if (Math.abs(at0.rgb[i] - img.rgb[i]) > 1e-6) sameAsClean = false;
}
check('t=0 reproduces x₀', sameAsClean);
const atT = I.forwardImage(img, sched, 100, 3);
let mean = 0, sq = 0;
for (let i = 0; i < atT.rgb.length; i += 1) { mean += atT.rgb[i]; sq += atT.rgb[i] * atT.rgb[i]; }
mean /= atT.rgb.length;
sq = Math.sqrt(sq / atT.rgb.length - mean * mean);
check('t=T is close to pure noise', Math.abs(mean) < 0.25 && sq > 0.7,
  'mean ' + mean.toFixed(3) + ' sd ' + sq.toFixed(3));

/* the epsilon that generated x_t is recovered in closed form */
const epsTrue = I.predictEps(atT.rgb, img.rgb, sched.abar[100], 0, 4);
let em = 0, es = 0;
for (let i = 0; i < epsTrue.length; i += 1) { em += epsTrue[i]; es += epsTrue[i] * epsTrue[i]; }
em /= epsTrue.length;
es = Math.sqrt(es / epsTrue.length - em * em);
check('ideal epsilon is standard normal', Math.abs(em) < 0.2 && es > 0.7 && es < 1.4,
  'mean ' + em.toFixed(3) + ' sd ' + es.toFixed(3));

/* ---------- 5. the reverse chain ---------- */

const ts = I.sampleSteps(100, 6);
const exact = I.reverseChain(img, sched, { sigma: 0, quality: 0, seed: 3, ts });
eq('reverse frames', exact.frames.length, 6);
check('reverse frames cover 0..T', exact.frames[0].t === 0 && exact.frames[5].t === 100);
check('posterior mean reconstructs x₀', exact.finalMse < 1e-6, String(exact.finalMse));
check('frame MSE improves along the chain',
  exact.frames[0].mse < exact.frames[5].mse,
  exact.frames[0].mse + ' vs ' + exact.frames[5].mse);
check('the exact path tracks the forward marginal', exact.frames[5].mse > 0.3);

const coarse = I.reverseChain(img, sched, { sigma: 0, quality: 0.8, seed: 3, ts });
check('a coarse predictor loses detail', coarse.finalMse > 1e-3, String(coarse.finalMse));
check('a coarse predictor leaves late frames noisy',
  coarse.frames[1].mse > exact.frames[1].mse * 10,
  exact.frames[1].mse + ' → ' + coarse.frames[1].mse);

const noisy = I.reverseChain(img, sched, { sigma: 1, quality: 0, seed: 3, ts });
check('sampling noise perturbs the trajectory',
  noisy.frames[3].mse > exact.frames[3].mse * 2,
  exact.frames[3].mse + ' → ' + noisy.frames[3].mse);
check('an ideal predictor ends deterministically',
  noisy.finalMse < 1e-6 && exact.finalMse < 1e-6,
  noisy.finalMse + ' / ' + exact.finalMse);

const noisyCoarse = I.reverseChain(img, sched, { sigma: 1, quality: 0.8, seed: 3, ts });
check('noise survives a weak predictor', noisyCoarse.finalMse > coarse.finalMse,
  coarse.finalMse + ' → ' + noisyCoarse.finalMse);

check('PSNR of the exact chain is infinite', I.psnrOf(0) === Infinity);
near('PSNR of MSE 0.01', I.psnrOf(0.01), 20, 1e-9);

/* ---------- 6. the U-Net ---------- */

const spec = I.UNET_SPEC;
eq('unet depth', spec.length, 9);
eq('unet resolutions', spec.map((n) => n.res).join(','), '32,16,8,4,4,8,16,32,32');
check('unet has three skips', spec.filter((n) => n.skipFrom).length === 3);

const pass = I.runUnetPass(atT, { x0: img.rgb, abar: sched.abar[100], quality: 0.3 });
eq('pass stages', pass.stages.length, 9);
eq('pass resolutions', pass.stages.map((s) => s.res).join(','), '32,16,8,4,4,8,16,32,32');
for (const stage of pass.stages) {
  const want = stage.kind === 'head' ? 3 : 4;
  eq(stage.id + ' plane count', stage.planes.length, want);
  eq(stage.id + ' plane size', stage.planes[0].length, stage.res * stage.res);
  let ok = true;
  for (let i = 0; i < stage.planes[0].length; i += 1) {
    const v = stage.planes[0][i];
    if (!(v >= 0 && v <= 1)) ok = false;
  }
  check(stage.id + ' plane normalised', ok);
}
check('epsilon plane present', !!pass.epsRaw && pass.epsRaw.length === 32 * 32 * 3);
check('epsilon srgb present', !!pass.epsRgb && pass.epsRgb.length === 32 * 32 * 3);
check('skip lands at its mirrored resolution',
  pass.stages.filter((s) => s.id === 'u3')[0].res ===
  pass.stages.filter((s) => s.id === 'd3')[0].res);

const params = I.unetParams();
check('parameter count is plausible', params > 1e6 && params < 2e8, String(params));
eq('shape chain lists every stage', I.unetChainText().split('→').length, 10);

/* ---------- 7. the scene ---------- */

const fplanes = ts.map((tt) => ({
  t: tt, img: I.forwardImage(img, sched, tt, 3),
  label: I.timesLabel(false, tt, 100), sub: 'ā',
}));
const rplanes = exact.frames.slice().reverse().map((fr) => ({
  t: fr.t, img: fr, label: I.timesLabel(true, fr.t, 100), sub: 'mse',
}));
const scene = I.buildScene({ fplanes, rplanes, pass }, { spacing: 1, laneGap: 1 });
eq('scene planes', scene.planes.length, fplanes.length + rplanes.length + pass.stages.length * 3);
eq('scene blocks', scene.blocks.length, 9);
eq('scene skip arcs', scene.skips.length, 3);
eq('scene hand-off links', scene.links.length, 2);
eq('flow nodes', scene.nodes.length, fplanes.length + 9 + rplanes.length);
check('scene radius positive', scene.radius > 1);
const fwd = scene.planes.filter((p) => p.role === 'forward');
const rev = scene.planes.filter((p) => p.role === 'reverse');
check('lanes sit on opposite sides', fwd[0].z > 0 && rev[0].z < 0);
check('forward chain runs left to right', fwd[0].x < fwd[5].x);
check('reverse chain runs right to left', rev[0].x > rev[5].x);
check('front and rear planes share an x for the same timestep',
  Math.abs(fwd[2].x - rev[3].x) < 1e-9 && Math.abs(fwd[0].x - rev[5].x) < 1e-9,
  fwd[2].x + ' vs ' + rev[3].x);

/* ---------- 8. labels ---------- */

eq('label x₀', I.timesLabel(false, 0, 100), 'x₀');
eq('label x₃₇', I.timesLabel(false, 37, 100), 'x₃₇');
eq('label x_T', I.timesLabel(false, 100, 100), 'x_T');
eq('label reverse zero', I.timesLabel(true, 0, 100), 'x̂₀');

/* ---------- 9. locale coverage ---------- */

const en = I.DICT_EN;
const zh = I.DICT_ZH;
const used = new Set();
for (const file of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js'))) {
  const text = readFileSync(join(root, 'src', file), 'utf8');
  const re = /\bt\('([a-zA-Z0-9._]+)'/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!m[1].endsWith('.')) used.add(m[1]);
  }
}
for (const prefix of ['pattern.', 'schedule.', 'blk.', 'role.', 'phase.']) {
  for (const key of Object.keys(en)) if (key.indexOf(prefix) === 0) used.add(key);
}
const missing = [];
for (const key of used) {
  if (!(key in en)) missing.push('en:' + key);
  if (!(key in zh)) missing.push('zh:' + key);
}
check('every used key exists in both dictionaries', missing.length === 0, missing.join(', '));
check('a meaningful number of keys', used.size > 60, String(used.size));
let translated = 0;
for (const key of Object.keys(en)) if (zh[key] && zh[key] !== en[key]) translated += 1;
check('most keys are translated', translated / Object.keys(en).length > 0.8,
  translated + '/' + Object.keys(en).length);

/* ---------- 10. the panel renders ---------- */

try {
  const tree = I.LabPage();
  check('panel renders a tree', !!tree && !!tree.props && tree.props.className === 'd3-root');
  const header = tree.children.filter((c) => c && c.props && c.props.className === 'd3-head');
  check('panel has a header', header.length === 1);
} catch (e) {
  check('panel renders a tree', false, e && e.message);
}

if (fails.length) {
  console.error('FAILED (' + fails.length + ')');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('ok: schedule, forward marginal, reverse chain, U-Net pass, scene, labels, locale (' +
  used.size + ' keys), render');
