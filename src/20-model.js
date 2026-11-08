    /* =====================================================================
     * 1. Numbers, colours, formatting
     * ===================================================================*/

    function num(v, fallback) {
      const n = typeof v === 'number' ? v : parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    }

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function lerp(a, b, k) { return a + (b - a) * k; }

    function smoothstep(e0, e1, x) {
      const d = e1 - e0;
      const k = clamp(d === 0 ? 0 : (x - e0) / d, 0, 1);
      return k * k * (3 - 2 * k);
    }

    function hash32(str) {
      let x = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i += 1) {
        x ^= str.charCodeAt(i);
        x = Math.imul(x, 16777619) >>> 0;
      }
      return x >>> 0;
    }

    /** Deterministic 0..1 from an integer seed. */
    function unit(seed) {
      let x = (seed >>> 0) || 0x9e3779b9;
      x ^= x << 13; x >>>= 0;
      x ^= x >>> 17; x >>>= 0;
      x ^= x << 5; x >>>= 0;
      return x / 4294967296;
    }

    /** Standard normal from two deterministic uniforms (Box-Muller). */
    function gauss(seed, t, i) {
      const a = unit(hash32('a:' + seed + ':' + t + ':' + i));
      const b = unit(hash32('b:' + seed + ':' + t + ':' + i));
      const u1 = a < 1e-9 ? 1e-9 : a;
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(6.283185307179586 * b);
    }

    /** Value ramp: deep navy (low) through cyan and green to red (high). */
    const PALETTE = [
      '#060a12', '#0a1120', '#101b2e', '#152540', '#1b3050', '#213d62',
      '#274b75', '#2b5a89', '#2c6a9d', '#287cab', '#218eb0', '#1ba0ae',
      '#22b39f', '#43c483', '#6bd267', '#9bdc51', '#c8e23f', '#eed83c',
      '#ffc247', '#ffa64d', '#ff8650', '#ff6455', '#f24651', '#dd2f52',
    ];

    const EMPTY_CELL = '#0c1524';

    function palIndex(v01) {
      const n = PALETTE.length;
      const i = Math.round(clamp(v01, 0, 1) * (n - 1));
      return i < 0 ? 0 : i > n - 1 ? n - 1 : i;
    }

    function colorFor(v01) { return PALETTE[palIndex(v01)]; }

    function fmtNum(v) {
      if (!Number.isFinite(v)) return '-';
      const a = Math.abs(v);
      if (a >= 100) return v.toFixed(0);
      if (a >= 10) return v.toFixed(1);
      return v.toFixed(2);
    }

    function fmtSmall(v) {
      if (!Number.isFinite(v)) return '-';
      const a = Math.abs(v);
      if (a === 0) return '0';
      if (a < 0.001) return v.toExponential(1);
      if (a < 0.01) return v.toFixed(4);
      if (a < 1) return v.toFixed(3);
      return v.toFixed(2);
    }

    function fmtCount(v) {
      if (!Number.isFinite(v)) return '-';
      if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
      if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
      return String(Math.round(v));
    }

    const SUBS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

    /** `x37` -> `x₃₇`; the last timestep is written `x_T` the way the papers do. */
    function timesLabel(hat, t, T) {
      const base = hat ? 'x̂' : 'x';
      if (t >= T) return base + '_T';
      const digits = String(Math.round(t)).split('');
      let out = '';
      for (let i = 0; i < digits.length; i += 1) out += SUBS[+digits[i]];
      return base + out;
    }

    function rgbCss(r, g, b) {
      return 'rgb(' + Math.round(clamp(r, 0, 1) * 255) + ',' +
        Math.round(clamp(g, 0, 1) * 255) + ',' +
        Math.round(clamp(b, 0, 1) * 255) + ')';
    }

    /* =====================================================================
     * 2. The clean image: a small sample drawn from pure geometry
     * ===================================================================*/

    const IMG_SIZE = 32;
    const PATTERNS = ['cat', 'digit', 'rings', 'gradient', 'checker', 'noise', 'waves'];

    function ellipseCov(u, v, cx, cy, rx, ry) {
      const dx = (u - cx) / rx, dy = (v - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy) - 1;
      const w = 0.9 / (IMG_SIZE * Math.min(rx, ry));
      return 1 - smoothstep(-w, w, d);
    }

    function cross2(ax, ay, bx, by, px, py) {
      return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    }

    function triCov(u, v, ax, ay, bx, by, cx, cy) {
      const s1 = cross2(ax, ay, bx, by, u, v);
      const s2 = cross2(bx, by, cx, cy, u, v);
      const s3 = cross2(cx, cy, ax, ay, u, v);
      const neg = s1 < 0 || s2 < 0 || s3 < 0;
      const pos = s1 > 0 || s2 > 0 || s3 > 0;
      if (neg && pos) return 0;
      const l1 = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay)) || 1e-6;
      const l2 = Math.sqrt((cx - bx) * (cx - bx) + (cy - by) * (cy - by)) || 1e-6;
      const l3 = Math.sqrt((ax - cx) * (ax - cx) + (ay - cy) * (ay - cy)) || 1e-6;
      const d = Math.min(Math.abs(s1) / l1, Math.abs(s2) / l2, Math.abs(s3) / l3);
      return clamp(d / (1.1 / IMG_SIZE), 0, 1);
    }

    function segCov(u, v, x1, y1, x2, y2, w) {
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy || 1e-6;
      const k = clamp(((u - x1) * dx + (v - y1) * dy) / len2, 0, 1);
      const px = x1 + dx * k, py = y1 + dy * k;
      const d = Math.sqrt((u - px) * (u - px) + (v - py) * (v - py));
      return 1 - smoothstep(w * 0.65, w * 1.5, d);
    }

    /** A cat face drawn with ellipses, triangles and line segments. */
    function catPixel(u, v, seed) {
      const vig = clamp(1 - 1.9 * ((u - 0.5) * (u - 0.5) + (v - 0.55) * (v - 0.55)), 0.25, 1);
      let r = 0.05 + 0.085 * (1 - v) * vig;
      let g = 0.065 + 0.105 * (1 - v) * vig;
      let b = 0.10 + 0.145 * (1 - v) * vig;

      const mix = function (cr, cg, cb, a) {
        if (!(a > 0)) return;
        r += (cr - r) * a; g += (cg - g) * a; b += (cb - b) * a;
      };

      /* ears sit behind the head */
      const earL = triCov(u, v, 0.255, 0.405, 0.205, 0.105, 0.435, 0.315);
      const earR = triCov(u, v, 0.745, 0.405, 0.795, 0.105, 0.565, 0.315);
      const ear = Math.max(earL, earR);
      if (ear > 0) {
        mix(0.50, 0.41, 0.35, ear);
        const inL = triCov(u, v, 0.267, 0.365, 0.240, 0.165, 0.400, 0.300);
        const inR = triCov(u, v, 0.733, 0.365, 0.760, 0.165, 0.600, 0.300);
        mix(0.80, 0.50, 0.52, Math.max(inL, inR) * ear);
      }

      /* head, fur, forehead stripes, muzzle */
      const head = ellipseCov(u, v, 0.5, 0.575, 0.315, 0.285);
      if (head > 0) {
        const stripe = Math.sin((u - 0.5) * 34 + Math.sin(v * 7.5 + 1) * 1.3);
        const band = clamp((stripe - 0.25) * 1.7, 0, 1) * clamp((0.66 - v) * 3.4, 0, 1);
        let fr = 0.755 - 0.22 * band;
        let fg = 0.665 - 0.21 * band;
        let fb = 0.575 - 0.18 * band;
        const muzzle = ellipseCov(u, v, 0.5, 0.675, 0.205, 0.155);
        fr += (0.93 - fr) * muzzle * 0.85;
        fg += (0.90 - fg) * muzzle * 0.85;
        fb += (0.85 - fb) * muzzle * 0.85;
        const furNoise = (unit(hash32('fur:' + seed + ':' +
          Math.floor(u * IMG_SIZE) + ':' + Math.floor(v * IMG_SIZE))) - 0.5) * 0.05;
        mix(fr + furNoise, fg + furNoise, fb + furNoise, head);

        /* eyes */
        const eyeL = ellipseCov(u, v, 0.395, 0.545, 0.083, 0.069);
        const eyeR = ellipseCov(u, v, 0.605, 0.545, 0.083, 0.069);
        const eye = Math.max(eyeL, eyeR);
        if (eye > 0) {
          mix(0.96, 0.965, 0.93, eye);
          const iris = Math.max(
            ellipseCov(u, v, 0.395, 0.548, 0.046, 0.046),
            ellipseCov(u, v, 0.605, 0.548, 0.046, 0.046));
          mix(0.36, 0.62, 0.36, iris * eye);
          const pupil = Math.max(
            ellipseCov(u, v, 0.395, 0.548, 0.021, 0.028),
            ellipseCov(u, v, 0.605, 0.548, 0.021, 0.028));
          mix(0.05, 0.05, 0.06, pupil * eye);
          const shine = Math.max(
            ellipseCov(u, v, 0.382, 0.534, 0.012, 0.012),
            ellipseCov(u, v, 0.592, 0.534, 0.012, 0.012));
          mix(1, 1, 1, shine * eye);
        }

        /* nose and mouth */
        const nose = triCov(u, v, 0.470, 0.632, 0.530, 0.632, 0.5, 0.668);
        mix(0.86, 0.55, 0.60, nose);
        const mouth = Math.max(
          segCov(u, v, 0.5, 0.668, 0.5, 0.694, 0.010),
          segCov(u, v, 0.5, 0.694, 0.452, 0.716, 0.009),
          segCov(u, v, 0.5, 0.694, 0.548, 0.716, 0.009));
        mix(0.24, 0.17, 0.16, mouth);

        /* whiskers */
        const wk = Math.max(
          segCov(u, v, 0.40, 0.680, 0.150, 0.655, 0.006),
          segCov(u, v, 0.40, 0.700, 0.145, 0.706, 0.006),
          segCov(u, v, 0.40, 0.718, 0.160, 0.752, 0.006),
          segCov(u, v, 0.60, 0.680, 0.850, 0.655, 0.006),
          segCov(u, v, 0.60, 0.700, 0.855, 0.706, 0.006),
          segCov(u, v, 0.60, 0.718, 0.840, 0.752, 0.006));
        mix(0.94, 0.93, 0.88, wk * 0.9);
      }
      return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1)];
    }

    const SEG_MASK = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
    const SEG_RECT = [
      [0.30, 0.70, 0.13, 0.20],
      [0.700, 0.775, 0.21, 0.47],
      [0.700, 0.775, 0.54, 0.80],
      [0.30, 0.70, 0.81, 0.88],
      [0.225, 0.300, 0.54, 0.80],
      [0.225, 0.300, 0.21, 0.47],
      [0.30, 0.70, 0.475, 0.525],
    ];

    function digitPixel(u, v, digit) {
      const mask = SEG_MASK[digit % 10];
      let inside = false;
      for (let s = 0; s < SEG_RECT.length; s += 1) {
        if (!(mask & (1 << s))) continue;
        const rc = SEG_RECT[s];
        if (u >= rc[0] && u <= rc[1] && v >= rc[2] && v <= rc[3]) { inside = true; break; }
      }
      const glow = 0.10 + 0.30 * clamp(1 - Math.hypot(u - 0.5, v - 0.5) * 1.8, 0, 1);
      if (inside) return [0.97, 0.93, 0.80];
      return [glow * 0.55, glow * 0.65, glow * 1.05];
    }

    function patternPixel(pattern, u, v, seed, channel) {
      switch (pattern) {
        case 'cat':
          return catPixel(u, v, seed);
        case 'digit':
          return digitPixel(u, v, (seed + channel * 4) % 10);
        case 'rings': {
          const d = Math.hypot(u - 0.5, v - 0.5) * 2;
          const a = 0.5 + 0.5 * Math.cos(d * 9.5 + channel * 0.7);
          return [0.12 + 0.22 * a, 0.30 + 0.45 * a, 0.55 + 0.45 * a];
        }
        case 'gradient':
          return [u, 0.25 + 0.55 * v, 1 - 0.6 * u];
        case 'checker': {
          const on = ((Math.floor(u * 4) + Math.floor(v * 4)) % 2) === 0;
          return on ? [0.92, 0.88, 0.72] : [0.10, 0.13, 0.22];
        }
        case 'noise': {
          const n = unit(hash32('px' + seed + ':' + channel + ':' +
            Math.floor(u * 64) + ':' + Math.floor(v * 64)));
          const m = unit(hash32('py' + seed + ':' + channel + ':' +
            Math.floor(u * 64) + ':' + Math.floor(v * 64)));
          return [n * 0.9 + 0.05, m * 0.8 + 0.1, (1 - n) * 0.85 + 0.08];
        }
        case 'waves':
        default: {
          const a = 0.5 + 0.5 * Math.sin(u * 9 + channel * 1.7) * Math.cos(v * 8 - channel);
          const b = 0.5 + 0.5 * Math.sin(u * 7 - 1.1 + channel) * Math.cos(v * 11 + 0.7);
          return [0.15 + 0.75 * a, 0.20 + 0.60 * b, 0.35 + 0.55 * (1 - a) * b];
        }
      }
    }

    function makeImage(pattern, seed) {
      const pat = PATTERNS.indexOf(pattern) >= 0 ? pattern : 'cat';
      const sd = Math.round(num(seed, 1));
      const n = IMG_SIZE * IMG_SIZE;
      const rgb = new Float32Array(n * 3);
      for (let j = 0; j < IMG_SIZE; j += 1) {
        for (let i = 0; i < IMG_SIZE; i += 1) {
          const px = patternPixel(pat, (i + 0.5) / IMG_SIZE, (j + 0.5) / IMG_SIZE, sd, 0);
          const o = (j * IMG_SIZE + i) * 3;
          rgb[o] = px[0]; rgb[o + 1] = px[1]; rgb[o + 2] = px[2];
        }
      }
      return { size: IMG_SIZE, pattern: pat, seed: sd, rgb: rgb };
    }

    /* =====================================================================
     * 3. DDPM noise schedule and the forward marginal
     * ===================================================================*/

    const SCHEDULES = ['linear', 'cosine'];

    function makeSchedule(spec) {
      const s = spec || {};
      const kind = SCHEDULES.indexOf(s.kind) >= 0 ? s.kind : 'linear';
      const T = clamp(Math.round(num(s.T, 100)), 10, 1000);
      const b0 = clamp(num(s.betaStart, 1e-4), 1e-7, 0.4);
      const b1 = Math.max(clamp(num(s.betaEnd, 0.02), 1e-7, 0.9), b0 + 1e-7);
      const alpha = new Float64Array(T + 1);
      const beta = new Float64Array(T + 1);
      const abar = new Float64Array(T + 1);
      alpha[0] = 1; beta[0] = 0; abar[0] = 1;
      const cosF = function (x) {
        const f = Math.cos(((x + 0.008) / 1.008) * Math.PI / 2);
        return f * f;
      };
      const ab0 = cosF(0);
      const maxBeta = 0.9;
      for (let ti = 1; ti <= T; ti += 1) {
        let ab;
        if (kind === 'cosine') {
          ab = cosF(ti / T) / ab0;
        } else {
          const b = b0 + (b1 - b0) * (ti - 1) / Math.max(1, T - 1);
          ab = abar[ti - 1] * (1 - b);
        }
        /* the cosine schedule reaches exactly 0 at t = T; keep the last step
           sane instead of letting alpha collapse, the way implementations cap
           beta rather than denormalise the final transition */
        let a = clamp(ab / abar[ti - 1], 1 - maxBeta, 1);
        abar[ti] = clamp(abar[ti - 1] * a, 1e-30, 1);
        alpha[ti] = a;
        beta[ti] = clamp(1 - a, 0, 1);
      }
      return {
        kind: kind, T: T, beta: beta, alpha: alpha, abar: abar,
        betaStart: b0, betaEnd: b1,
      };
    }

    /** Evenly spaced timesteps from 0 to T, de-duplicated, at most 9 planes. */
    function sampleSteps(T, planes) {
      const n = clamp(Math.round(num(planes, 6)), 3, 9);
      const list = [];
      for (let i = 0; i < n; i += 1) {
        const val = Math.round((i * T) / (n - 1));
        if (list.length === 0 || list[list.length - 1] !== val) list.push(val);
      }
      if (list[list.length - 1] !== T) list[list.length - 1] = T;
      return list;
    }

    /** x_t = √ā_t·x₀ + √(1−ā_t)·ε, computed exactly from the marginal. */
    function forwardImage(img, sched, t, seed) {
      const ti = clamp(Math.round(t), 0, sched.T);
      const ab = sched.abar[ti];
      const sa = Math.sqrt(ab), sn = Math.sqrt(1 - ab);
      const n = img.rgb.length;
      const rgb = new Float32Array(n);
      for (let i = 0; i < n; i += 1) {
        rgb[i] = sa * img.rgb[i] + sn * gauss(seed, ti, i);
      }
      return { size: img.size, rgb: rgb, t: ti, abar: ab };
    }

    function mseOf(a, b) {
      let s = 0;
      for (let i = 0; i < a.length; i += 1) {
        const d = a[i] - b[i];
        s += d * d;
      }
      return a.length ? s / a.length : 0;
    }

    function psnrOf(mse) {
      if (!(mse > 0)) return Infinity;
      return 10 * Math.log10(1 / mse);
    }

    /**
     * The predictor's idea of the clean image.
     *
     * A network that has seen a lot of data still gets details wrong, so its
     * x̂₀ is the clean image plus a slow, blocky error seeded from the run and
     * scaled by `quality` (0 = the estimator is exact, 1 = it invents whole
     * patches). The estimate stays inside 0..1, so a sampler driven by it stays
     * bounded - which is exactly how a real sampler behaves.
     */
    function degradedClean(x0, quality, seed) {
      const q = clamp(num(quality, 0), 0, 1);
      if (q <= 0.001) return x0;
      const size = IMG_SIZE;
      const n = x0.length;
      const out = new Float32Array(n);
      const bl = clamp(Math.round(4 + 8 * q), 4, 16);
      const amp = 0.45 * q;
      for (let c = 0; c < 3; c += 1) {
        for (let jb = 0; jb < size; jb += bl) {
          for (let ib = 0; ib < size; ib += bl) {
            const e = gauss(seed + 11, 1000 + c, jb * size + ib) * amp;
            const jEnd = Math.min(size, jb + bl), iEnd = Math.min(size, ib + bl);
            for (let j = jb; j < jEnd; j += 1) {
              for (let i = ib; i < iEnd; i += 1) {
                const k = (j * size + i) * 3 + c;
                out[k] = clamp(x0[k] + e * (0.35 + 1.3 * Math.abs(x0[k] - 0.5)), 0, 1);
              }
            }
          }
        }
      }
      return out;
    }

    /**
     * The epsilon a predictor returns for one whole image.
     *
     * Given a clean estimate, the Bayes-optimal epsilon of the DDPM marginal is
     * available in closed form, which is what an idealised network outputs at
     * every timestep.
     */
    function predictEps(x, x0, abar) {
      const n = x.length;
      const sa = Math.sqrt(abar);
      const sn = Math.sqrt(1 - abar) || 1e-9;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i += 1) out[i] = (x[i] - sa * x0[i]) / sn;
      return out;
    }

    /**
     * The reverse chain: start at x_T from the forward marginal, then run the
     * DDPM ancestral step
     *
     *   x_{t-1} = 1/√α_t · (x_t − β_t/√(1−ā_t) · ε̂) + σ_t·z
     *
     * with ε̂ from predictEps() against the predictor's own x̂₀, so σ = 0 gives
     * the posterior mean and σ = 1 the posterior variance.
     */
    function reverseChain(img, sched, opts) {
      const o = opts || {};
      const sigmaScale = clamp(num(o.sigma, 0), 0, 1.5);
      const quality = clamp(num(o.quality, 0), 0, 1);
      const seed = Math.round(num(o.seed, 1));
      const ts = o.ts && o.ts.length ? o.ts.slice() : sampleSteps(sched.T, 6);
      const T = sched.T;
      const n = img.rgb.length;
      const x0 = img.rgb;
      const target = degradedClean(x0, quality, seed);

      const frames = new Array(ts.length);
      const write = function (slot, t, arr, extra) {
        frames[slot] = {
          size: img.size, rgb: Float32Array.from(arr), t: t,
          abar: sched.abar[t], mse: mseOf(arr, x0),
          sigma: extra ? extra.sigma : 0,
        };
      };

      let x = forwardImage(img, sched, T, seed).rgb;
      for (let i = 0; i < ts.length; i += 1) {
        if (ts[i] === T) write(i, T, x, null);
      }
      let epsSum = 0, epsCount = 0;
      for (let ti = T; ti >= 1; ti -= 1) {
        const ab = sched.abar[ti];
        const abPrev = sched.abar[ti - 1];
        const a = sched.alpha[ti];
        const b = sched.beta[ti];
        const sa = Math.sqrt(a);
        const sn = Math.sqrt(1 - ab) || 1e-9;
        const sig = sigmaScale * Math.sqrt(Math.max(0, b * (1 - abPrev) / Math.max(1e-9, 1 - ab)));
        const eps = predictEps(x, target, ab);
        const next = new Float32Array(n);
        for (let i = 0; i < n; i += 1) {
          const mu = (x[i] - (b / sn) * eps[i]) / sa;
          const z = sig > 0 ? gauss(seed + 7, ti, i) : 0;
          next[i] = mu + sig * z;
          epsSum += Math.abs(eps[i]);
          epsCount += 1;
        }
        x = next;
        const slot = ts.indexOf(ti - 1);
        if (slot >= 0) write(slot, ti - 1, x, { sigma: sig });
      }

      const finalMse = mseOf(x, x0);
      const targetMse = target === x0 ? 0 : mseOf(target, x0);
      return {
        frames: frames, ts: ts, finalMse: finalMse, psnr: psnrOf(finalMse),
        sigma: sigmaScale, quality: quality, epsMeanAbs: epsCount ? epsSum / epsCount : 0,
        targetMse: targetMse, target: target, x0: img,
      };
    }