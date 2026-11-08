    /* =====================================================================
     * 4. The U-Net: architecture ladder, feature pass, epsilon output
     * ===================================================================*/

    /**
     * The DDPM U-Net of Ho et al. (2020) in the shape it is usually drawn:
     * four encoder levels, a middle block with self-attention, three decoder
     * levels that take a skip connection each, and the epsilon head. Channel
     * counts follow the paper's 128-base configuration.
     */
    const UNET_SPEC = [
      { id: 'd1', kind: 'down', res: 32, ch: 128, attn: false },
      { id: 'd2', kind: 'down', res: 16, ch: 256, attn: true },
      { id: 'd3', kind: 'down', res: 8, ch: 256, attn: true },
      { id: 'd4', kind: 'down', res: 4, ch: 256, attn: false },
      { id: 'mid', kind: 'mid', res: 4, ch: 256, attn: true },
      { id: 'u3', kind: 'up', res: 8, ch: 256, skipFrom: 'd3' },
      { id: 'u2', kind: 'up', res: 16, ch: 256, skipFrom: 'd2' },
      { id: 'u1', kind: 'up', res: 32, ch: 128, skipFrom: 'd1' },
      { id: 'out', kind: 'head', res: 32, ch: 3, skipFrom: null },
    ];

    const FEAT_CHANNELS = 4;

    /** Short label for the canvas: D1, Mid, U2, ε… */
    function unetShortLabel(node) {
      if (node.kind === 'down') return 'D' + node.id.slice(1);
      if (node.kind === 'up') return 'U' + node.id.slice(1);
      if (node.kind === 'mid') return 'Mid';
      return 'ε';
    }

    function unetStageName(node) {
      if (node.kind === 'down') return t('blk.down') + ' ' + node.res + '²';
      if (node.kind === 'up') return t('blk.up') + ' ' + node.res + '²';
      if (node.kind === 'mid') return t('blk.mid') + ' ' + node.res + '²';
      return t('blk.head') + ' ' + node.res + '²';
    }

    function unetShape(node) {
      return node.res + '×' + node.res + '×' + node.ch;
    }

    function unetChainText() {
      const parts = ['32×32×3'];
      for (let i = 0; i < UNET_SPEC.length; i += 1) parts.push(unetShape(UNET_SPEC[i]));
      return parts.join(' → ');
    }

    /** Parameter count of the stack this panel draws (weights plus biases). */
    function unetParams() {
      const timeDim = 512;
      let inCh = 3;
      let total = 0;
      for (let i = 0; i < UNET_SPEC.length; i += 1) {
        const node = UNET_SPEC[i];
        if (node.kind === 'head') {
          total += 2 * inCh;                          // group norm
          total += inCh * node.ch * 9 + node.ch;      // 3×3 conv to 3 channels
          inCh = node.ch;
          continue;
        }
        let stageIn = inCh;
        if (node.kind === 'up' && node.skipFrom) {
          const src = UNET_SPEC.filter(function (n) { return n.id === node.skipFrom; })[0];
          if (src) stageIn += src.ch;
        }
        for (let blk = 0; blk < 2; blk += 1) {
          const cIn = blk === 0 ? stageIn : node.ch;
          const cOut = node.ch;
          total += cIn * cOut * 9 + cOut;             // conv 3×3
          total += cOut * cOut * 9 + cOut;            // conv 3×3
          total += 2 * (timeDim * cOut + cOut);       // timestep MLP
          total += 4 * cOut;                          // two group norms
        }
        if (node.attn) {
          total += 4 * node.ch;                       // group norm
          total += 3 * (node.ch * node.ch + node.ch); // qkv
          total += node.ch * node.ch + node.ch;       // projection
        }
        if (node.kind === 'up') {
          total += inCh * node.ch * 9 + node.ch;      // nearest-upsample conv
        }
        inCh = node.ch;
      }
      return total;
    }

    /* ---------------- feature arithmetic ---------------- */

    const KERNELS = [
      [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
      [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
      [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
      [[1, 2, 1], [2, 4, 2], [1, 2, 1]],
      [[-1, 1, -1], [1, 0, 1], [-1, 1, -1]],
      [[2, 0, -1], [0, 1, 0], [-1, 0, 2]],
    ];

    function zeros(n) { return new Float32Array(n); }

    /** 3×3 convolution of a channel stack with a fixed kernel, then ReLU. */
    function convStack(src, res, outCh) {
      const out = [];
      const inCh = src.length;
      for (let k = 0; k < outCh; k += 1) {
        const kern = KERNELS[k % KERNELS.length];
        const dst = zeros(res * res);
        for (let j = 0; j < res; j += 1) {
          for (let i = 0; i < res; i += 1) {
            let acc = 0;
            for (let c = 0; c < inCh; c += 1) {
              const w = ((k + c) % 3 === 0) ? -0.7 : 0.55;
              const plane = src[c];
              for (let ky = -1; ky <= 1; ky += 1) {
                const yy = clamp(j + ky, 0, res - 1);
                for (let kx = -1; kx <= 1; kx += 1) {
                  const xx = clamp(i + kx, 0, res - 1);
                  acc += w * kern[ky + 1][kx + 1] * plane[yy * res + xx];
                }
              }
            }
            dst[j * res + i] = Math.max(0, acc / (inCh * 6));
          }
        }
        out.push(dst);
      }
      return out;
    }

    function poolHalf(src, res) {
      const half = Math.max(1, res >> 1);
      const out = [];
      for (let c = 0; c < src.length; c += 1) {
        const dst = zeros(half * half);
        for (let j = 0; j < half; j += 1) {
          for (let i = 0; i < half; i += 1) {
            let acc = 0;
            for (let dy = 0; dy < 2; dy += 1) {
              for (let dx = 0; dx < 2; dx += 1) {
                const y = Math.min(res - 1, j * 2 + dy);
                const x = Math.min(res - 1, i * 2 + dx);
                acc += src[c][y * res + x];
              }
            }
            dst[j * half + i] = acc / 4;
          }
        }
        out.push(dst);
      }
      return out;
    }

    function upHalf(src, res) {
      const big = res * 2;
      const out = [];
      for (let c = 0; c < src.length; c += 1) {
        const dst = zeros(big * big);
        for (let j = 0; j < big; j += 1) {
          for (let i = 0; i < big; i += 1) {
            const y = Math.min(res - 1, j >> 1);
            const x = Math.min(res - 1, i >> 1);
            dst[j * big + i] = src[c][y * res + x];
          }
        }
        out.push(dst);
      }
      return out;
    }

    /** Fit the source stack to `target` resolution. */
    function resampleStack(src, res, target) {
      if (res === target) return src;
      if (target < res) {
        let cur = src, r = res;
        while (r > target && r > 1) { cur = poolHalf(cur, r); r = r >> 1; }
        return cur;
      }
      let cur = src, r = res;
      while (r < target) { cur = upHalf(cur, r); r = r * 2; }
      return cur;
    }

    function addStacks(a, b, n) {
      const out = [];
      for (let c = 0; c < a.length; c += 1) {
        const dst = zeros(n);
        const bb = b[Math.min(c, b.length - 1)];
        for (let i = 0; i < n; i += 1) dst[i] = a[c][i] + (bb ? bb[i] : 0);
        out.push(dst);
      }
      return out;
    }

    /** Normalise one feature plane to 0..1 for display. */
    function normalizePlane(plane) {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < plane.length; i += 1) {
        const v = plane[i];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const span = (hi - lo) || 1;
      const out = new Float32Array(plane.length);
      for (let i = 0; i < plane.length; i += 1) out[i] = (plane[i] - lo) / span;
      return out;
    }

    /** A diverging colour map for the predicted epsilon. */
    function epsToRgb(eps, size) {
      let mx = 0;
      for (let i = 0; i < eps.length; i += 1) {
        const a = Math.abs(eps[i]);
        if (a > mx) mx = a;
      }
      const scale = mx > 1e-9 ? 1 / mx : 1;
      const rgb = new Float32Array(eps.length);
      for (let i = 0; i < eps.length; i += 1) {
        const v = clamp(eps[i] * scale, -1, 1);
        const k = Math.abs(v);
        if (v >= 0) {
          rgb[i] = lerp(0.17, 1.0, k);
          rgb[i + 1] = lerp(0.19, 0.69, k);
          rgb[i + 2] = lerp(0.28, 0.36, k);
        } else {
          rgb[i] = lerp(0.17, 0.12, k);
          rgb[i + 1] = lerp(0.19, 0.55, k);
          rgb[i + 2] = lerp(0.28, 1.0, k);
        }
      }
      return rgb;
    }

    function imageToStack(img) {
      const size = img.size;
      const n = size * size;
      const stack = [];
      for (let c = 0; c < 3; c += 1) {
        const plane = zeros(n);
        for (let i = 0; i < n; i += 1) plane[i] = img.rgb[i * 3 + c];
        stack.push(plane);
      }
      return stack;
    }

    /**
     * One forward pass of the drawn U-Net at timestep `t`.
     *
     * The feature planes are the real output of 3×3 convolution, ReLU,
     * average pooling, nearest upsampling and skip addition over the noisy
     * input; the epsilon plane is predictEps() for the same input, which is the
     * value the reverse step actually consumes.
     */
    function runUnetPass(imgT, opts) {
      const o = opts || {};
      const x0 = o.x0 || null;
      const abar = num(o.abar, 0.5);
      const quality = clamp(num(o.quality, 0), 0, 1);
      const shown = FEAT_CHANNELS;
      const stages = [];
      const byId = {};
      let cur = imageToStack(imgT);
      let curRes = imgT.size;

      let epsRaw = null;
      let epsRgb = null;
      const epsPlanes = [];
      if (x0) {
        const target = degradedClean(x0, quality, num(o.seed, 1));
        epsRaw = predictEps(imgT.rgb, target, abar);
        epsRgb = epsToRgb(epsRaw, imgT.size);
        const n = imgT.size * imgT.size;
        for (let c = 0; c < 3; c += 1) {
          const plane = zeros(n);
          for (let i = 0; i < n; i += 1) plane[i] = epsRaw[i * 3 + c];
          epsPlanes.push(normalizePlane(plane));
        }
      }

      for (let i = 0; i < UNET_SPEC.length; i += 1) {
        const node = UNET_SPEC[i];
        let stack;
        if (node.kind === 'head') {
          stack = epsPlanes.length ? epsPlanes : cur;
        } else {
          if (node.res < curRes) {
            stack = convStack(poolHalf(cur, curRes), curRes >> 1, shown);
            curRes = curRes >> 1;
          } else if (node.res > curRes) {
            stack = convStack(upHalf(cur, curRes), curRes * 2, shown);
            curRes = curRes * 2;
          } else {
            stack = convStack(cur, curRes, shown);
          }
          if (node.kind === 'up' && node.skipFrom && byId[node.skipFrom]) {
            const src = byId[node.skipFrom];
            const fit = resampleStack(src.stack, src.res, curRes);
            stack = addStacks(stack, fit, curRes * curRes);
          }
        }
        byId[node.id] = { stack: stack, res: curRes };
        stages.push({
          id: node.id, kind: node.kind, res: curRes, ch: node.ch,
          planes: stack.map(normalizePlane),
          attn: !!node.attn, skipFrom: node.skipFrom || null,
        });
        cur = stack;
      }

      return { stages: stages, epsRaw: epsRaw, epsRgb: epsRgb, t: imgT.t, abar: abar };
    }
