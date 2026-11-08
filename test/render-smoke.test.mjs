/**
 * Headless smoke test for the canvas renderer: a fake 2D context records every
 * call, so a draw pass over real scene data fails loudly instead of silently
 * doing nothing.
 *
 *   node test/render-smoke.test.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let captured = null;
let rafCb = null;

globalThis.window = {
  __ModuleLoader__: { load(def) { captured = def; } },
  devicePixelRatio: 1,
  requestAnimationFrame(cb) { rafCb = cb; return 1; },
  cancelAnimationFrame() { rafCb = null; },
  addEventListener() {},
  removeEventListener() {},
};

const here = dirname(fileURLToPath(import.meta.url));
await import(new URL('../client.js', import.meta.url).href);
if (!captured) throw new Error('module did not register with the loader');

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
const I = mod.__internals;

const fails = [];
const check = (name, cond, detail) => { if (!cond) fails.push(name + (detail ? ' — ' + detail : '')); };

/* ---------- a recording 2D context ---------- */

const counts = {};
function makeCtx() {
  const state = {};
  const grad = { addColorStop() { counts.gradient = (counts.gradient || 0) + 1; } };
  const bump = (key) => () => { counts[key] = (counts[key] || 0) + 1; };
  const api = {
    setTransform: bump('setTransform'), clearRect: bump('clearRect'), fillRect: bump('fillRect'),
    strokeRect: bump('strokeRect'), save: bump('save'), restore: bump('restore'),
    beginPath: bump('beginPath'), closePath: bump('closePath'), moveTo: bump('moveTo'),
    lineTo: bump('lineTo'), arc: bump('arc'), quadraticCurveTo: bump('quad'), fill: bump('fill'),
    stroke: bump('stroke'), setLineDash: bump('dash'), fillText: bump('text'),
    measureText(value) { return { width: String(value).length * 6 }; },
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
  };
  return new Proxy(api, {
    get(target, key) { return key in target ? target[key] : state[key]; },
    set(target, key, value) { state[key] = value; return true; },
  });
}

const listeners = {};
const ctx = makeCtx();
const canvas = {
  clientWidth: 960, clientHeight: 560, width: 960, height: 560,
  getContext() { return ctx; },
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  removeEventListener(type, fn) {
    if (listeners[type]) listeners[type] = listeners[type].filter((f) => f !== fn);
  },
  getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 560 }; },
  setPointerCapture() {},
};

/* ---------- real data ---------- */

const img = I.makeImage('cat', 3);
const sched = I.makeSchedule({ kind: 'linear', T: 60 });
const ts = I.sampleSteps(60, 5);
const forward = ts.map((tt) => I.forwardImage(img, sched, tt, 3));
const reverse = I.reverseChain(img, sched, { sigma: 0.4, quality: 0.5, seed: 3, ts });
const pass = I.runUnetPass(forward[4], {
  x0: img.rgb, abar: sched.abar[60], quality: 0.5,
});
const scene = I.buildScene({
  fplanes: forward.map((im, i) => ({
    t: ts[i], img: im, label: I.timesLabel(false, ts[i], sched.T), sub: 'ā',
  })),
  rplanes: reverse.frames.slice().reverse().map((fr) => ({
    t: fr.t, img: fr, label: I.timesLabel(true, fr.t, sched.T), sub: 'mse',
  })),
  pass,
}, { spacing: 1, laneGap: 1 });

/* ---------- drive the renderer ---------- */

const seen = { steps: [], hover: 0, select: 0, playing: [], finished: 0 };
const api = I.createRenderer(canvas, {
  onStep(i) { seen.steps.push(i); },
  onHover(hit) { if (hit) seen.hover += 1; },
  onSelect(hit) { if (hit) seen.select += 1; },
  onPlaying(v) { seen.playing.push(v); },
  onFinished() { seen.finished += 1; },
  onTogglePlay() {},
});

check('renderer exposes its surface', ['setScene', 'setOpts', 'setStep', 'setPlaying', 'stepBy',
  'restart', 'jumpTo', 'jumpToUnet', 'resetView', 'dispose'].every((k) => typeof api[k] === 'function'));

try {
  api.setScene(scene);
  api.setOpts({ labels: true, grid: true, particle: true, skip: true });
  check('a frame is scheduled', typeof rafCb === 'function');
  rafCb(16);
  check('the first draw painted the background', (counts.fillRect || 0) > 0, String(counts.fillRect));
  check('the first draw painted pixels', (counts.fill || 0) > 0, String(counts.fill));
  check('the first draw wrote labels', (counts.text || 0) > 0, String(counts.text));

  /* walk every flow node and paint it */
  const nodeCount = scene.nodes.length;
  for (let i = 0; i < nodeCount; i += 1) {
    api.setStep(i);
    rafCb(32 + i * 16);
  }
  check('every node painted', (counts.fill || 0) > scene.planes.length, String(counts.fill));

  /* playback advances the flow */
  const before = seen.steps.length;
  api.setPlaying(true);
  api.setSpeed(8);
  for (let k = 0; k < 40; k += 1) rafCb(1000 + k * 120);
  check('playback reports steps', seen.steps.length > before, String(seen.steps.length - before));
  check('playback finished at the end', seen.finished >= 1, String(seen.finished));
  check('playing flag came back down', seen.playing[seen.playing.length - 1] === false);

  /* picking through a synthetic pointer move */
  api.jumpToUnet();
  rafCb(6000);
  const move = listeners.pointermove && listeners.pointermove[0];
  check('pointermove is wired', typeof move === 'function');
  for (const pos of [[480, 300], [300, 380], [700, 240], [120, 120]]) {
    move({ clientX: pos[0], clientY: pos[1], preventDefault() {}, button: 0 });
  }
  check('hover picked at least one cell', seen.hover > 0, String(seen.hover));
  rafCb(7000);

  const down = listeners.pointerdown && listeners.pointerdown[0];
  const up = listeners.pointerup && listeners.pointerup[0];
  if (down && up) {
    down({ clientX: 480, clientY: 300, button: 0, pointerId: 1, preventDefault() {} });
    up({ clientX: 480, clientY: 300, button: 0, pointerId: 1, preventDefault() {} });
    check('clicking selects a node', seen.select > 0, String(seen.select));
  }

  api.jumpTo(0);
  rafCb(8000);
  api.dispose();
  check('dispose drops its listeners', !listeners.pointermove || listeners.pointermove.length === 0);
} catch (e) {
  check('renderer runs without throwing', false, e && (e.stack || e.message));
}

if (fails.length) {
  console.error('FAILED (' + fails.length + ')');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('ok: renderer painted ' + scene.planes.length + ' planes over ' + scene.nodes.length +
  ' flow nodes, playback advanced, picking responded (' + counts.fill + ' fills, ' +
  counts.text + ' labels)');
