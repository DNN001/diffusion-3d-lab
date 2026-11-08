/**
 * Diffusion 3D Lab - Client half.
 *
 * One Web panel for looking at a DDPM from the inside. A clean image sits at
 * the left of the front lane; the forward chain q(x_t | x_0) carries it to pure
 * noise at the right while the noise level grows. There the data enters a
 * U-Net - encoder, bottleneck, decoder, skip connections - and the reverse
 * chain p(x_{t-1} | x_t) brings it back along the rear lane until a clean
 * sample reappears under the original.
 *
 * Every plane on screen is a real tensor: the forward planes are computed from
 * the closed-form DDPM marginal, the reverse planes come from the ancestral
 * sampling recursion, and the U-Net feature planes are produced by real
 * convolution, pooling and skip addition. Only the epsilon predictor is
 * idealised - the panel says so, and the quality control lets you degrade it
 * to see what a coarse predictor would cost.
 *
 * The scene is projected by hand and painted with the 2D canvas API: no WebGL,
 * no 3D library, no external assets, no network access.
 */
window.__ModuleLoader__.load({
  id: '@local/diffusion-3d-lab',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;

    const NS = 'diff3d';
    const PANEL_ID = 'diffusion-3d-lab';

﻿    /* =====================================================================
     * 0. Locale
     * ===================================================================*/

    const DICT_EN = {
      'app.title': 'Diffusion 3D Lab',
      'app.sub': 'One image, forward into noise, through the U-Net, then back to a picture',
      'view.reset': 'Reset view',
      'view.rotate': 'Auto rotate',
      'hint.drag': 'Drag to orbit · right-drag to pan · wheel to zoom',
      'hint.keys': 'Space plays, ←/→ steps, D jumps to the denoiser, R resets the view',
      'a11y.canvas': 'Interactive 3D view of a DDPM forward and reverse process',

      'img.title': 'Clean image x₀',
      'img.pattern': 'Content',
      'img.seed': 'Noise seed',
      'img.shuffle': 'New sample',
      'img.size': '{s}×{s} pixels',
      'pattern.cat': 'Cat portrait',
      'pattern.digit': 'Digit strokes',
      'pattern.rings': 'Concentric rings',
      'pattern.gradient': 'Gradient',
      'pattern.checker': 'Checkerboard',
      'pattern.noise': 'Noise',
      'pattern.waves': 'Waves',

      'diff.title': 'Diffusion process',
      'diff.schedule': 'Noise schedule',
      'schedule.linear': 'Linear β (DDPM)',
      'schedule.cosine': 'Cosine ā (Nichol & Dhariwal)',
      'diff.steps': 'Timesteps T',
      'diff.betaStart': 'β start',
      'diff.betaEnd': 'β end',
      'diff.planes': 'Planes per chain',
      'diff.sigma': 'Sampling noise',
      'diff.quality': 'ε predictor',
      'diff.ideal': 'ideal',
      'diff.coarse': 'coarse',
      'diff.note': 'x_t comes from the closed form and the reverse chain is the real ancestral recursion. σ perturbs the trajectory; the late steps of the posterior sampler are nearly deterministic, so the error left in the final image comes from ε.',

      'play.title': 'Flow',
      'play.play': 'Play',
      'play.pause': 'Pause',
      'play.prev': 'Previous step',
      'play.next': 'Next step',
      'play.restart': 'Restart',
      'play.speed': 'Speed',
      'play.step': 'Step',
      'phase.forward': 'Forward',
      'phase.unet': 'U-Net',
      'phase.reverse': 'Reverse',
      'flow.step': '{i} / {n}',
      'flow.forward': 'q(x_t|x₀) · add noise · t = {t}, ā_t = {ab}',
      'flow.unet': '{name} · {shape}',
      'flow.reverse': 'p(xₜ₋₁|xₜ) · denoise · t = {t}, ā_t = {ab}',
      'flow.idle': 'Paused at the start of the run',

      'unet.title': 'U-Net · ε predictor',
      'unet.hint': 'Click a block to jump the flow there. Resolution halves down the encoder and doubles back up the decoder; the skips hand the encoder features across.',
      'unet.attn': 'attention',
      'unet.skip': 'skip',
      'unet.timeEmb': 't → sinusoidal embedding 128·4 → 512, injected into every residual block (scale/shift), so one network serves all timesteps.',
      'unet.shown': '{n} of {ch} channels drawn',
      'unet.params': 'weights',
      'unet.blocks': 'blocks',

      'blk.down': 'down',
      'blk.mid': 'middle',
      'blk.up': 'up',
      'blk.head': 'ε head',

      'time.title': 'Timestep readout',
      'time.t': 't',
      'time.abar': 'ā_t',
      'time.sqrtA': '√ā_t',
      'time.sqrtN': '√(1−ā_t)',
      'time.snr': 'SNR',
      'time.sigma': 'posterior σ_t',
      'time.mse': 'MSE vs x₀',
      'time.psnr': 'PSNR',
      'time.curve': 'ā_t across the chain',

      'insp.title': 'Inspector',
      'insp.empty': 'Hover or click a plane pixel or a U-Net block.',
      'insp.node': 'Node',
      'insp.cell': 'Pixel (row, col)',
      'insp.rgb': 'RGB',
      'insp.residual': 'Residual vs x₀',
      'insp.shape': 'Shape',
      'insp.role': 'Role',
      'insp.eps': 'ε̂ at that pixel',
      'insp.channel': 'Channel {c} of {n}',
      'role.input': 'noisy input',
      'role.encoder': 'encoder',
      'role.bottleneck': 'bottleneck',
      'role.decoder': 'decoder',
      'role.head': 'epsilon head',
      'role.forward': 'forward chain',
      'role.reverse': 'reverse chain',

      'disp.title': 'Display',
      'disp.labels': 'Plane labels',
      'disp.grid': 'Pixel grid',
      'disp.particle': 'Flow packet',
      'disp.skip': 'Skip connections',
      'disp.rotate': 'Auto rotate',
      'disp.spacing': 'Plane spacing',
      'disp.laneGap': 'Lane gap',

      'legend.title': 'Reading the scene',
      'legend.forward': 'forward chain, noise grows to the right',
      'legend.reverse': 'reverse chain, denoised to the left',
      'legend.block': 'U-Net block, one feature plane per block',
      'legend.skip': 'skip connection',
      'legend.particle': 'the data packet being processed',
      'legend.scale': 'heat = feature value low → high',
      'legend.pair': 'front and rear plane at the same x share a timestep',

      'stat.chain': 'Shapes',
      'stat.steps': 'Timesteps',
      'stat.params': 'U-Net weights',
      'stat.mse': 'Final MSE',
      'stat.state': 'State',
      'badge.forward': 'forward',
      'badge.reverse': 'reverse',
    };

    const DICT_ZH = {
      'app.title': 'Diffusion 3D Lab',
      'app.sub': '一张图：前向加噪、穿过 U-Net、再反向还原成图像',
      'view.reset': '重置视角',
      'view.rotate': '自动旋转',
      'hint.drag': '拖拽旋转 · 右键拖拽平移 · 滚轮缩放',
      'hint.keys': '空格播放，←/→ 单步，D 跳到去噪器，R 重置视角',
      'a11y.canvas': 'DDPM 前向与反向过程的可交互三维视图',

      'img.title': '干净图像 x₀',
      'img.pattern': '图像内容',
      'img.seed': '噪声种子',
      'img.shuffle': '换一张',
      'img.size': '{s}×{s} 像素',
      'pattern.cat': '猫咪头像',
      'pattern.digit': '数字笔画',
      'pattern.rings': '同心圆环',
      'pattern.gradient': '渐变',
      'pattern.checker': '棋盘格',
      'pattern.noise': '随机噪声',
      'pattern.waves': '条纹波',

      'diff.title': '扩散过程',
      'diff.schedule': '噪声调度',
      'schedule.linear': '线性 β（DDPM）',
      'schedule.cosine': '余弦 ā（Nichol & Dhariwal）',
      'diff.steps': '时间步 T',
      'diff.betaStart': 'β 起点',
      'diff.betaEnd': 'β 终点',
      'diff.planes': '每条链的平面数',
      'diff.sigma': '采样噪声',
      'diff.quality': 'ε 预测器',
      'diff.ideal': '理想',
      'diff.coarse': '粗糙',
      'diff.note': 'x_t 由闭式边际直接算出，反向链是真正的祖先采样递推。σ 只扰动采样轨迹；后验采样在接近 t=0 时几乎确定，所以最终图像的误差来自 ε。',

      'play.title': '流程控制',
      'play.play': '播放',
      'play.pause': '暂停',
      'play.prev': '上一步',
      'play.next': '下一步',
      'play.restart': '回到开头',
      'play.speed': '速度',
      'play.step': '步',
      'phase.forward': '前向',
      'phase.unet': 'U-Net',
      'phase.reverse': '反向',
      'flow.step': '{i} / {n}',
      'flow.forward': 'q(x_t|x₀) · 加噪 · t = {t}，ā_t = {ab}',
      'flow.unet': '{name} · {shape}',
      'flow.reverse': 'p(xₜ₋₁|xₜ) · 去噪 · t = {t}，ā_t = {ab}',
      'flow.idle': '暂停在流程起点',

      'unet.title': 'U-Net · ε 预测器',
      'unet.hint': '点击任意模块，流程会直接跳过去。编码器逐级把分辨率减半，解码器再逐级放大回来，跳跃连接把编码器的特征送过去。',
      'unet.attn': '自注意力',
      'unet.skip': '跳跃',
      'unet.timeEmb': 't → 正弦嵌入 128·4 → 512，以 scale/shift 注入每个残差块，所以一个网络服务所有时间步。',
      'unet.shown': '绘制 {ch} 个通道中的 {n} 个',
      'unet.params': '参数量',
      'unet.blocks': '模块',

      'blk.down': '下采样',
      'blk.mid': '中间层',
      'blk.up': '上采样',
      'blk.head': 'ε 输出头',

      'time.title': '时间步读数',
      'time.t': 't',
      'time.abar': 'ā_t',
      'time.sqrtA': '√ā_t',
      'time.sqrtN': '√(1−ā_t)',
      'time.snr': '信噪比',
      'time.sigma': '后验 σ_t',
      'time.mse': '与 x₀ 的 MSE',
      'time.psnr': 'PSNR',
      'time.curve': '整条链上的 ā_t',

      'insp.title': '像素检视',
      'insp.empty': '把鼠标移到平面上的像素或 U-Net 模块上，或点击选中。',
      'insp.node': '节点',
      'insp.cell': '像素（行, 列）',
      'insp.rgb': 'RGB',
      'insp.residual': '相对 x₀ 的残差',
      'insp.shape': '形状',
      'insp.role': '角色',
      'insp.eps': '该像素的 ε̂',
      'insp.channel': '第 {c} / {n} 个通道',
      'role.input': '带噪输入',
      'role.encoder': '编码器',
      'role.bottleneck': '瓶颈',
      'role.decoder': '解码器',
      'role.head': '噪声输出头',
      'role.forward': '前向链',
      'role.reverse': '反向链',

      'disp.title': '显示',
      'disp.labels': '平面标签',
      'disp.grid': '像素格线',
      'disp.particle': '流动光点',
      'disp.skip': '跳跃连接',
      'disp.rotate': '自动旋转',
      'disp.spacing': '平面间距',
      'disp.laneGap': '两条跑道间距',

      'legend.title': '场景怎么看',
      'legend.forward': '前向链：越靠右噪声越大',
      'legend.reverse': '反向链：越靠左越干净',
      'legend.block': 'U-Net 模块，每块一张特征平面',
      'legend.skip': '跳跃连接',
      'legend.particle': '正在被处理的数据包',
      'legend.scale': '热力 = 特征值 低 → 高',
      'legend.pair': '同一 x 处前后两张平面对应同一时间步',

      'stat.chain': '形状流',
      'stat.steps': '时间步',
      'stat.params': 'U-Net 权重',
      'stat.mse': '最终 MSE',
      'stat.state': '状态',
      'badge.forward': '前向',
      'badge.reverse': '反向',
    };

    let hostCtx = null;
    let localeFace = null;
    let boundTranslate = null;

    /** The locale service can register after this plugin: resolve it on demand. */
    function ensureLocale() {
      if (localeFace) return;
      if (!hostCtx || typeof hostCtx.get !== 'function') return;
      try {
        const loc = hostCtx.get('locale');
        if (loc) localeFace = loc;
      } catch (e) { /* locale service absent: the built-in dictionaries carry the text */ }
    }

    function activeIsZh() {
      ensureLocale();
      if (!localeFace || typeof localeFace.getLocale !== 'function') return false;
      try {
        const snap = localeFace.getLocale();
        const tag = String((snap && (snap.active || snap.locale)) || '').toLowerCase();
        return tag.indexOf('zh') === 0 || tag.indexOf('cn') === 0;
      } catch (e) {
        return false;
      }
    }

    function translateFrom(dict, key, vars) {
      let text = dict[key];
      if (text == null) text = DICT_EN[key];
      if (text == null) return key;
      if (vars) {
        text = text.replace(/\{(\w+)\}/g, function (m, name) {
          return vars[name] == null ? m : String(vars[name]);
        });
      }
      return text;
    }

    function t(key, vars) {
      ensureLocale();
      if (boundTranslate) {
        try {
          const out = boundTranslate(key, vars);
          if (out != null && out !== key) return out;
        } catch (e) { /* fall through to the local dictionaries */ }
      }
      return translateFrom(activeIsZh() ? DICT_ZH : DICT_EN, key, vars);
    }

    /** Re-render the panel when the active locale or a dictionary changes. */
    function useLocaleTick() {
      const pair = React.useState(0);
      const bump = pair[1];
      React.useEffect(function () {
        ensureLocale();
        if (!localeFace || typeof localeFace.subscribe !== 'function') return undefined;
        return localeFace.subscribe(function () { bump(function (v) { return v + 1; }); });
      }, []);
      return pair[0];
    }

﻿    /* =====================================================================
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
﻿    /* =====================================================================
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

﻿    /* =====================================================================
     * 5. Scene layout
     * ===================================================================*/

    const SPAN = 3.40;          // lane length along the flow axis
    const LANE_Z = 0.55;        // half distance between the two lanes
    const LANE_Y = 0.80;        // vertical stagger: the two rows read apart
    const UNET_X = 3.55;        // where the U-Net tower stands
    const UNET_Z = 0.92;        // encoder / decoder depth offset
    const IMG_EDGE = 0.78;

    function unetEdge(res) { return 0.38 + 0.62 * (res / 32); }

    const UNET_Y = {
      d1: 1.20, d2: 0.62, d3: 0.04, d4: -0.54, mid: -1.22,
      u3: -0.54, u2: 0.04, u1: 0.62, out: 1.20,
    };

    const LANE_X_SHIFT = -0.45;

    function laneX(index, count) {
      if (count <= 1) return LANE_X_SHIFT;
      return LANE_X_SHIFT - SPAN / 2 + (SPAN * index) / (count - 1);
    }

    /**
     * Builds the drawable scene from the computed data.
     *
     * `data` carries the forward planes (t ascending), the reverse planes (t
     * descending, i.e. in the order the sampler produced them) and one U-Net
     * pass. Planes are ordered into `nodes` along the flow: forward chain,
     * U-Net blocks, reverse chain.
     */
    function buildScene(data, opts) {
      const o = opts || {};
      const laneGap = LANE_Z * clamp(num(o.laneGap, 1), 0.45, 2.2);
      const spread = clamp(num(o.spacing, 1), 0.5, 2);
      const planes = [];
      const nodes = [];

      const fplanes = data.fplanes || [];
      const rplanes = data.rplanes || [];

      for (let i = 0; i < fplanes.length; i += 1) {
        const p = fplanes[i];
        const item = {
          kind: 'image', role: 'forward', key: 'f' + i, index: i,
          x: laneX(i, fplanes.length) * spread, y: LANE_Y, z: laneGap,
          edge: IMG_EDGE, size: p.img.size, rgb: p.img.rgb,
          label: p.label, sub: p.sub, t: p.t,
        };
        planes.push(item);
        nodes.push({ type: 'plane', plane: item, x: item.x, y: item.y, z: item.z, t: p.t });
      }

      const pass = data.pass || { stages: [] };
      const blocks = [];
      for (let i = 0; i < pass.stages.length; i += 1) {
        const stage = pass.stages[i];
        const cy = UNET_Y[stage.id] != null ? UNET_Y[stage.id] : 0;
        const cz = stage.kind === 'mid' ? 0 : (stage.kind === 'up' || stage.kind === 'head' ? -UNET_Z : UNET_Z);
        const edge = unetEdge(stage.res);
        const block = {
          id: stage.id, kind: stage.kind, res: stage.res, ch: stage.ch,
          attn: !!stage.attn, skipFrom: stage.skipFrom,
          x: UNET_X, y: cy, z: cz, edge: edge,
          label: unetShortLabel(UNET_SPEC[i]),
          shape: unetShape(UNET_SPEC[i]),
          stage: stage,
        };
        blocks.push(block);
        const nPlanes = Math.min(3, stage.planes.length);
        for (let k = 0; k < nPlanes; k += 1) {
          const item = {
            kind: 'feat', role: 'unet', key: stage.id + ':' + k,
            block: block, channel: k, channels: stage.planes.length,
            x: UNET_X + (k - (nPlanes - 1) / 2) * 0.055,
            y: cy, z: cz, edge: edge, size: stage.res,
            vals: stage.planes[k],
            label: null, sub: null, t: pass.t,
          };
          planes.push(item);
          if (k === 0) item.primary = true;
        }
        nodes.push({ type: 'block', block: block, x: UNET_X, y: cy, z: cz, t: pass.t });
      }

      for (let j = 0; j < rplanes.length; j += 1) {
        const p = rplanes[j];
        const item = {
          kind: 'image', role: 'reverse', key: 'r' + j, index: j,
          x: laneX(rplanes.length - 1 - j, rplanes.length) * spread, y: -LANE_Y, z: -laneGap,
          edge: IMG_EDGE, size: p.img.size, rgb: p.img.rgb,
          label: p.label, sub: p.sub, t: p.t,
        };
        planes.push(item);
        nodes.push({ type: 'plane', plane: item, x: item.x, y: item.y, z: item.z, t: p.t });
      }

      /* skip connections drawn as arcs on the U-Net plane */
      const skips = [];
      for (let i = 0; i < blocks.length; i += 1) {
        const b = blocks[i];
        if (!b.skipFrom) continue;
        const src = blocks.filter(function (x) { return x.id === b.skipFrom; })[0];
        if (!src) continue;
        skips.push({
          from: { x: src.x + 0.10, y: src.y, z: src.z },
          to: { x: b.x + 0.10, y: b.y, z: b.z },
          label: src.id + ' → ' + b.id,
        });
      }

      /* the two hand-offs between the lanes and the network */
      const links = [];
      const lastF = fplanes.length ? nodes[fplanes.length - 1] : null;
      const firstB = fplanes.length && nodes[fplanes.length] ? nodes[fplanes.length] : null;
      const outNode = nodes[fplanes.length + blocks.length - 1] || null;
      const firstR = nodes[fplanes.length + blocks.length] || null;
      if (lastF && firstB) {
        links.push({ a: { x: lastF.x, y: lastF.y, z: lastF.z }, b: { x: firstB.x, y: firstB.y, z: firstB.z }, tone: 'forward' });
      }
      if (outNode && firstR) {
        links.push({ a: { x: outNode.x, y: outNode.y, z: outNode.z }, b: { x: firstR.x, y: firstR.y, z: firstR.z }, tone: 'reverse' });
      }

      let radius = 1.2;
      for (let i = 0; i < planes.length; i += 1) {
        const p = planes[i];
        const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) + p.edge * 0.6;
        if (r > radius) radius = r;
      }

      return {
        planes: planes, blocks: blocks, skips: skips, links: links,
        nodes: nodes, radius: radius, pass: pass,
        fcount: fplanes.length, bcount: blocks.length, rcount: rplanes.length,
      };
    }

    /* =====================================================================
     * 6. Renderer: hand-projected perspective scene on a 2D canvas
     * ===================================================================*/

    function withAlpha(hex, alpha) {
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function roleColor(role) {
      if (role === 'forward') return '#7fb6ff';
      if (role === 'reverse') return '#ffc46b';
      return '#8fe3c6';
    }

    function kindColor(kind) {
      if (kind === 'down') return '#8fe3c6';
      if (kind === 'mid') return '#c39bff';
      if (kind === 'up') return '#5fd0ff';
      return '#ff8fb8';
    }

    function createRenderer(canvas, hooks) {
      const cb = hooks || {};
      const ctx = canvas.getContext('2d');
      const HOME = { yaw: -0.55, pitch: 0.40, zoom: 1.45 };
      const st = {
        scene: null,
        opts: { labels: true, grid: true, particle: true, skip: true },
        step: 0,
        frac: 0,
        playing: false,
        speed: 1.4,
        autoRotate: false,
        yaw: HOME.yaw,
        pitch: HOME.pitch,
        zoom: HOME.zoom,
        target: { x: 0, y: 0, z: 0 },
        hover: null,
        sel: null,
        W: 1, H: 1, dpr: 1,
        needDraw: true,
        last: 0,
        raf: 0,
        items: null,
        disposed: false,
        drag: null,
        cam: null,
      };

      function resize() {
        const w = Math.max(1, canvas.clientWidth || canvas.width || 1);
        const ht = Math.max(1, canvas.clientHeight || canvas.height || 1);
        const dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
        if (w === st.W && ht === st.H && dpr === st.dpr) return;
        st.W = w; st.H = ht; st.dpr = dpr;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(ht * dpr);
        st.needDraw = true;
      }

      function makeCam() {
        const radius = st.scene ? st.scene.radius : 3.2;
        const focal = Math.min(st.W, st.H) * 0.95;
        return {
          focal: focal,
          dist: (radius * 2.15) / clamp(st.zoom, 0.22, 6),
          cy: Math.cos(st.yaw), sy: Math.sin(st.yaw),
          cp: Math.cos(st.pitch), sp: Math.sin(st.pitch),
          cx: st.W / 2, cyS: st.H / 2,
          target: st.target,
        };
      }

      function project(p, cam) {
        const x = p.x - cam.target.x;
        const y = p.y - cam.target.y;
        const z = p.z - cam.target.z;
        const x1 = x * cam.cy + z * cam.sy;
        const z1 = -x * cam.sy + z * cam.cy;
        const y2 = y * cam.cp - z1 * cam.sp;
        const z2 = y * cam.sp + z1 * cam.cp;
        const depth = cam.dist + z2;
        if (depth < 0.08) return null;
        const s = cam.focal / depth;
        return { x: cam.cx + x1 * s, y: cam.cyS - y2 * s, depth: depth };
      }

      function panBy(dx, dy) {
        const cam = makeCam();
        const k = cam.dist / cam.focal;
        const rx = cam.cy, rz = cam.sy;
        const ux = cam.sy * cam.sp, uy = cam.cp, uz = -cam.cy * cam.sp;
        const ax = dx * k, ay = -dy * k;
        st.target.x -= rx * ax + ux * ay;
        st.target.y -= uy * ay;
        st.target.z -= rz * ax + uz * ay;
        st.needDraw = true;
      }

      function quadPath(pts) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.lineTo(pts[3].x, pts[3].y);
        ctx.closePath();
      }

      function planeGrid(it, cam, step) {
        const size = it.size;
        const cells = Math.max(1, Math.round(size / step));
        const cols1 = cells + 1;
        const pts = new Array(cols1 * cols1);
        for (let j = 0; j <= cells; j += 1) {
          const v = (j * step) / size;
          const y = it.edge * (0.5 - v);
          for (let i = 0; i <= cells; i += 1) {
            const u = (i * step) / size;
            const z = it.edge * (-0.5 + u);
            const p = project({ x: it.x, y: y, z: it.z + z }, cam);
            if (!p) return null;
            pts[j * cols1 + i] = p;
          }
        }
        return { pts: pts, cells: cells, cols1: cols1, step: step };
      }

      function cellColor(it, j, i, step) {
        const size = it.size;
        if (it.kind === 'image') {
          let r = 0, g = 0, b = 0, n = 0;
          for (let dy = 0; dy < step; dy += 1) {
            const yy = Math.min(size - 1, j * step + dy);
            for (let dx = 0; dx < step; dx += 1) {
              const xx = Math.min(size - 1, i * step + dx);
              const o = (yy * size + xx) * 3;
              r += it.rgb[o]; g += it.rgb[o + 1]; b += it.rgb[o + 2];
              n += 1;
            }
          }
          const q = function (v) { return Math.round(clamp(v, 0, 1) * 7) / 7; };
          return rgbCss(q(r / n), q(g / n), q(b / n));
        }
        let acc = 0, cnt = 0;
        for (let dy = 0; dy < step; dy += 1) {
          const yy = Math.min(size - 1, j * step + dy);
          for (let dx = 0; dx < step; dx += 1) {
            const xx = Math.min(size - 1, i * step + dx);
            acc += it.vals[yy * size + xx];
            cnt += 1;
          }
        }
        return colorFor(acc / cnt);
      }

      function drawPlane(it, cam, active) {
        const cellWpx = cam.focal / Math.max(0.2, cam.dist) * (it.edge / it.size);
        const step = cellWpx < 5.5 ? (cellWpx < 2.6 ? 4 : 2) : 1;
        const grid = planeGrid(it, cam, step);
        if (!grid) return;
        const pts = grid.pts, cells = grid.cells, cols1 = grid.cols1;

        const buckets = {};
        const order = [];
        for (let j = 0; j < cells; j += 1) {
          for (let i = 0; i < cells; i += 1) {
            const color = cellColor(it, j, i, step);
            if (!buckets[color]) { buckets[color] = []; order.push(color); }
            const base = j * cols1 + i;
            const arr = buckets[color];
            arr.push(pts[base], pts[base + 1], pts[base + cols1 + 1], pts[base + cols1]);
          }
        }
        for (let k = 0; k < order.length; k += 1) {
          const arr = buckets[order[k]];
          ctx.fillStyle = order[k];
          ctx.beginPath();
          for (let q = 0; q < arr.length; q += 4) {
            ctx.moveTo(arr[q].x, arr[q].y);
            ctx.lineTo(arr[q + 1].x, arr[q + 1].y);
            ctx.lineTo(arr[q + 2].x, arr[q + 2].y);
            ctx.lineTo(arr[q + 3].x, arr[q + 3].y);
            ctx.closePath();
          }
          ctx.fill();
        }

        if (st.opts.grid && step === 1) {
          const cellPx = Math.abs(pts[1].x - pts[0].x) + Math.abs(pts[1].y - pts[0].y);
          if (cellPx > 4.5) {
            ctx.strokeStyle = 'rgba(6,10,18,0.42)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let j = 0; j <= cells; j += 1) {
              const a = pts[j * cols1], b = pts[j * cols1 + cells];
              ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            }
            for (let i = 0; i <= cells; i += 1) {
              const a = pts[i], b = pts[cells * cols1 + i];
              ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            }
            ctx.stroke();
          }
        }

        const a = pts[0], b = pts[cells], c = pts[cells * cols1 + cells], d = pts[cells * cols1];
        const border = roleColor(it.role);
        ctx.lineWidth = active ? 2.4 : 1;
        ctx.strokeStyle = active ? border : withAlpha(border, 0.42);
        quadPath([a, b, c, d]);
        ctx.stroke();

        if (active) {
          const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 220);
          ctx.save();
          ctx.shadowColor = withAlpha(border, 0.85);
          ctx.shadowBlur = 14 + 8 * pulse;
          ctx.lineWidth = 2.6;
          ctx.strokeStyle = border;
          quadPath([a, b, c, d]);
          ctx.stroke();
          ctx.restore();
        }
      }

      function boxCorners(b) {
        const hx = 0.11, hy = b.edge / 2, hz = b.edge / 2;
        const out = [];
        for (let sx = -1; sx <= 1; sx += 2) {
          for (let sy = -1; sy <= 1; sy += 2) {
            for (let sz = -1; sz <= 1; sz += 2) {
              out.push({ x: b.x + sx * hx, y: b.y + sy * hy, z: b.z + sz * hz });
            }
          }
        }
        return out;
      }

      const BOX_EDGES = [
        [0, 1], [2, 3], [4, 5], [6, 7],
        [0, 2], [1, 3], [4, 6], [5, 7],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];

      function drawBox(b, cam, active) {
        const corners = boxCorners(b).map(function (p) { return project(p, cam); });
        if (corners.some(function (p) { return !p; })) return;
        const color = kindColor(b.kind);
        ctx.lineWidth = active ? 1.9 : 1;
        ctx.strokeStyle = active ? color : withAlpha(color, 0.45);
        ctx.beginPath();
        for (let i = 0; i < BOX_EDGES.length; i += 1) {
          const a = corners[BOX_EDGES[i][0]], c = corners[BOX_EDGES[i][1]];
          ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y);
        }
        ctx.stroke();
        if (active) {
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
          ctx.save();
          ctx.shadowColor = withAlpha(color, 0.8);
          ctx.shadowBlur = 12 + 8 * pulse;
          ctx.stroke();
          ctx.restore();
        }
      }

      function drawSkip(skip, cam, active) {
        const steps = 16;
        const pts = [];
        for (let i = 0; i <= steps; i += 1) {
          const k = i / steps;
          const y = lerp(skip.from.y, skip.to.y, k);
          const z = lerp(skip.from.z, skip.to.z, k);
          const bow = Math.sin(k * Math.PI);
          const x = lerp(skip.from.x, skip.to.x, k) + bow * 0.30;
          const zz = z * (1 - 0.16 * bow);
          pts.push(project({ x: x, y: y, z: zz }, cam));
        }
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = active ? 1.8 : 1.1;
        ctx.strokeStyle = active ? 'rgba(255,196,107,0.95)' : 'rgba(255,196,107,0.40)';
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < pts.length; i += 1) {
          const p = pts[i];
          if (!p) continue;
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      function drawLink(link, cam) {
        const a = project(link.a, cam), b = project(link.b, cam);
        if (!a || !b) return;
        const color = link.tone === 'forward' ? '#7fb6ff' : '#ffc46b';
        ctx.save();
        ctx.setLineDash([3, 6]);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = withAlpha(color, 0.65);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }

      function nodePos(node) { return { x: node.x, y: node.y, z: node.z }; }

      function activeNode() {
        const scene = st.scene;
        if (!scene || !scene.nodes.length) return null;
        return scene.nodes[clamp(st.step, 0, scene.nodes.length - 1)] || null;
      }

      function drawParticle(cam) {
        const scene = st.scene;
        if (!scene || !scene.nodes.length) return;
        const cur = activeNode();
        if (!cur) return;
        const nextIdx = Math.min(scene.nodes.length - 1, st.step + 1);
        const nxt = scene.nodes[nextIdx];
        const from = nodePos(cur);
        const to = nodePos(nxt);
        const k = nextIdx === st.step ? 0 : clamp(st.frac, 0, 1);
        const pos = {
          x: lerp(from.x, to.x, k),
          y: lerp(from.y, to.y, k),
          z: lerp(from.z, to.z, k),
        };
        const p = project(pos, cam);
        if (!p) return;
        const color = st.step < scene.fcount ? '#9ecbff'
          : st.step < scene.fcount + scene.bcount ? '#8fe3c6' : '#ffd166';

        const back = project({
          x: lerp(from.x, to.x, Math.max(0, k - 0.16)),
          y: lerp(from.y, to.y, Math.max(0, k - 0.16)),
          z: lerp(from.z, to.z, Math.max(0, k - 0.16)),
        }, cam);
        if (back) {
          const grad = ctx.createLinearGradient(back.x, back.y, p.x, p.y);
          grad.addColorStop(0, withAlpha(color, 0));
          grad.addColorStop(1, withAlpha(color, 0.75));
          ctx.strokeStyle = grad;
          ctx.lineWidth = 3.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(back.x, back.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.lineCap = 'butt';
        }

        const r = Math.max(6, Math.min(st.W, st.H) * 0.013);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4);
        glow.addColorStop(0, withAlpha('#ffffff', 0.95));
        glow.addColorStop(0.35, withAlpha(color, 0.85));
        glow.addColorStop(1, withAlpha(color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.4, 0, 6.283185307179586);
        ctx.fill();
      }

      function drawLabels(cam, scene) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i < scene.nodes.length; i += 1) {
          const node = scene.nodes[i];
          const isActive = i === st.step;
          if (node.type === 'plane') {
            const it = node.plane;
            const above = it.role === 'forward';
            const top = project({
              x: it.x,
              y: above ? it.edge * 0.5 + 0.05 : -it.edge * 0.5 - 0.05,
              z: it.z,
            }, cam);
            if (!top) continue;
            ctx.font = '600 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
            const showSub = isActive;
            const w = Math.max(ctx.measureText(it.label).width,
              showSub ? ctx.measureText(it.sub).width : 0) + 12;
            const bh = showSub ? 25 : 17;
            const bx = top.x - w / 2, by = above ? top.y - bh - 2 : top.y;
            ctx.fillStyle = isActive ? 'rgba(38,58,88,0.94)' : 'rgba(12,19,32,0.80)';
            ctx.beginPath();
            const r = 5;
            ctx.moveTo(bx + r, by);
            ctx.lineTo(bx + w - r, by);
            ctx.quadraticCurveTo(bx + w, by, bx + w, by + r);
            ctx.lineTo(bx + w, by + bh - r);
            ctx.quadraticCurveTo(bx + w, by + bh, bx + w - r, by + bh);
            ctx.lineTo(bx + r, by + bh);
            ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
            ctx.lineTo(bx, by + r);
            ctx.quadraticCurveTo(bx, by, bx + r, by);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = isActive
              ? roleColor(it.role)
              : 'rgba(120,150,190,0.26)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = isActive ? '#eef6ff' : 'rgba(214,226,242,0.84)';
            ctx.fillText(it.label, top.x, by + 3);
            if (showSub) {
              ctx.font = '400 9.5px ui-monospace, Menlo, monospace';
              ctx.fillStyle = 'rgba(158,180,208,0.88)';
              ctx.fillText(it.sub, top.x, by + 14);
            }
          } else {
            const b = node.block;
            const anchor = project({ x: b.x, y: b.y - b.edge * 0.5 - 0.03, z: b.z }, cam);
            if (!anchor) continue;
            ctx.font = (isActive ? '700 ' : '600 ') + '10.5px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
            const text = b.label + ' · ' + b.res + '²';
            const w = ctx.measureText(text).width + 10;
            ctx.fillStyle = isActive ? 'rgba(38,58,88,0.94)' : 'rgba(12,19,32,0.72)';
            ctx.fillRect(anchor.x - w / 2, anchor.y - 1, w, 15);
            ctx.strokeStyle = isActive ? kindColor(b.kind) : 'rgba(120,150,190,0.25)';
            ctx.lineWidth = 1;
            ctx.strokeRect(anchor.x - w / 2, anchor.y - 1, w, 15);
            ctx.fillStyle = isActive ? '#eef6ff' : 'rgba(206,220,238,0.86)';
            ctx.fillText(text, anchor.x, anchor.y + 1);
          }
        }
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      function drawRails(cam, scene) {
        const n = scene.nodes;
        if (!n.length) return;
        const f = scene.fcount, b = scene.bcount;
        const draw = function (a, c, color) {
          const p0 = project(a, cam), p1 = project(c, cam);
          if (!p0 || !p1) return;
          ctx.save();
          ctx.setLineDash([6, 8]);
          ctx.strokeStyle = withAlpha(color, 0.30);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          ctx.restore();
        };
        if (f > 1) {
          draw({ x: n[0].x, y: n[0].y, z: n[0].z }, { x: n[f - 1].x, y: n[f - 1].y, z: n[f - 1].z }, '#7fb6ff');
        }
        if (b > 1) {
          const r0 = n[f + b], r1 = n[n.length - 1];
          draw({ x: r0.x, y: r0.y, z: r0.z }, { x: r1.x, y: r1.y, z: r1.z }, '#ffc46b');
        }
      }

      function draw() {
        const W = st.W, H = st.H;
        ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const bg = ctx.createLinearGradient(0, 0, W * 0.35, H);
        bg.addColorStop(0, '#070b14');
        bg.addColorStop(0.55, '#0a1120');
        bg.addColorStop(1, '#111a2b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const scene = st.scene;
        if (!scene || !scene.planes.length) return;
        const cam = makeCam();
        st.cam = cam;
        const active = activeNode();

        drawRails(cam, scene);
        for (let i = 0; i < scene.links.length; i += 1) drawLink(scene.links[i], cam);
        for (let i = 0; i < scene.skips.length; i += 1) {
          const skip = scene.skips[i];
          const on = !!(st.opts.skip && active && active.type === 'block' &&
            (skip.label.indexOf(active.block.id) >= 0 || skip.label.indexOf(active.block.skipFrom) >= 0));
          if (st.opts.skip) drawSkip(skip, cam, on);
        }

        const items = [];
        for (let i = 0; i < scene.planes.length; i += 1) {
          const it = scene.planes[i];
          const centre = project({ x: it.x, y: it.y, z: it.z }, cam);
          if (!centre) continue;
          items.push({ it: it, depth: centre.depth });
        }
        items.sort(function (a, b) { return b.depth - a.depth; });
        st.items = items;
        for (let i = 0; i < items.length; i += 1) {
          const it = items[i].it;
          const on = !!(active && active.plane === it);
          drawPlane(it, cam, on);
        }
        for (let i = 0; i < scene.blocks.length; i += 1) {
          const b = scene.blocks[i];
          drawBox(b, cam, !!(active && active.block === b));
        }
        if (st.opts.particle) drawParticle(cam);
        if (st.opts.labels) drawLabels(cam, scene);

        const hover = st.hover;
        if (hover && hover.plane) {
          const it = hover.plane;
          const hz = it.z - it.edge / 2 + ((hover.col + 0.5) / it.size) * it.edge;
          const hy = it.edge * 0.5 - ((hover.row + 0.5) / it.size) * it.edge;
          const c = project({ x: it.x, y: hy, z: hz }, cam);
          if (c) {
            const r = Math.max(3, cam.focal / Math.max(0.2, cam.dist) * (it.edge / it.size) * 0.75);
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.lineWidth = 1.4;
            ctx.strokeRect(c.x - r, c.y - r, r * 2, r * 2);
          }
        }
      }

      /* ---------------- picking ---------------- */

      function inQuad(px, py, a, b, c, d) {
        const cross = function (p, q) {
          return (q.x - p.x) * (py - p.y) - (q.y - p.y) * (px - p.x);
        };
        const c1 = cross(a, b), c2 = cross(b, c), c3 = cross(c, d), c4 = cross(d, a);
        const hasNeg = c1 < 0 || c2 < 0 || c3 < 0 || c4 < 0;
        const hasPos = c1 > 0 || c2 > 0 || c3 > 0 || c4 > 0;
        return !(hasNeg && hasPos);
      }

      function pickAt(px, py) {
        const items = st.items;
        if (!items) return null;
        for (let n = items.length - 1; n >= 0; n -= 1) {
          const it = items[n].it;
          const cA = project({ x: it.x, y: it.edge * 0.5, z: it.z - it.edge * 0.5 }, st.cam);
          const cB = project({ x: it.x, y: it.edge * 0.5, z: it.z + it.edge * 0.5 }, st.cam);
          const cC = project({ x: it.x, y: -it.edge * 0.5, z: it.z + it.edge * 0.5 }, st.cam);
          const cD = project({ x: it.x, y: -it.edge * 0.5, z: it.z - it.edge * 0.5 }, st.cam);
          if (!cA || !cB || !cC || !cD) continue;
          const bx0 = Math.min(cA.x, cB.x, cC.x, cD.x), bx1 = Math.max(cA.x, cB.x, cC.x, cD.x);
          const by0 = Math.min(cA.y, cB.y, cC.y, cD.y), by1 = Math.max(cA.y, cB.y, cC.y, cD.y);
          if (px < bx0 - 1 || px > bx1 + 1 || py < by0 - 1 || py > by1 + 1) continue;
          const grid = planeGrid(it, st.cam, 1);
          if (!grid) continue;
          const pts = grid.pts, cells = grid.cells, cols1 = grid.cols1;
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (let k = 0; k < pts.length; k += 1) {
            const p = pts[k];
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          }
          if (px < minX || px > maxX || py < minY || py > maxY) continue;
          for (let j = 0; j < cells; j += 1) {
            for (let i = 0; i < cells; i += 1) {
              const a = pts[j * cols1 + i];
              const b = pts[j * cols1 + i + 1];
              const c = pts[(j + 1) * cols1 + i + 1];
              const d = pts[(j + 1) * cols1 + i];
              if (inQuad(px, py, a, b, c, d)) {
                return {
                  type: 'pixel', plane: it, row: j, col: i,
                  x: px, y: py,
                };
              }
            }
          }
        }
        const cam = st.cam;
        if (cam && st.scene) {
          for (let i = 0; i < st.scene.blocks.length; i += 1) {
            const b = st.scene.blocks[i];
            const centre = project({ x: b.x, y: b.y, z: b.z }, cam);
            if (!centre) continue;
            const r = cam.focal / Math.max(0.2, centre.depth) * (b.edge / 2) * 0.95;
            const dx = centre.x - px, dy = centre.y - py;
            if (dx * dx + dy * dy <= r * r) {
              return { type: 'block', block: b, x: px, y: py };
            }
          }
        }
        return null;
      }

      /* ---------------- loop ---------------- */

      function nodeCount() {
        return st.scene && st.scene.nodes ? st.scene.nodes.length : 0;
      }

      function loop(ts) {
        if (st.disposed) return;
        st.raf = window.requestAnimationFrame(loop);
        const dt = st.last ? Math.min(0.14, (ts - st.last) / 1000) : 0;
        st.last = ts;
        let changed = false;
        if (st.playing) {
          const count = nodeCount();
          if (count > 1) {
            st.frac += dt * st.speed;
            while (st.frac >= 1 && st.step < count - 1) {
              st.frac -= 1;
              st.step += 1;
              if (cb.onStep) cb.onStep(st.step);
            }
            if (st.step >= count - 1) {
              st.step = count - 1;
              st.frac = 0;
              st.playing = false;
              if (cb.onPlaying) cb.onPlaying(false);
              if (cb.onFinished) cb.onFinished();
            }
          } else {
            st.playing = false;
            if (cb.onPlaying) cb.onPlaying(false);
          }
          changed = true;
        }
        if (st.autoRotate) {
          st.yaw += dt * 0.28;
          changed = true;
        }
        if (changed || st.needDraw) {
          st.needDraw = false;
          draw();
        }
      }

      /* ---------------- events ---------------- */

      const disposers = [];

      function on(target, type, fn, options) {
        target.addEventListener(type, fn, options);
        disposers.push(function () { target.removeEventListener(type, fn, options); });
      }

      function localPoint(ev) {
        const r = canvas.getBoundingClientRect();
        return { x: ev.clientX - r.left, y: ev.clientY - r.top };
      }

      let downAt = null;

      on(canvas, 'pointerdown', function (ev) {
        const p = localPoint(ev);
        st.drag = { x: p.x, y: p.y, mode: (ev.button === 2 || ev.shiftKey) ? 'pan' : 'orbit' };
        downAt = { x: p.x, y: p.y, moved: 0 };
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* capture is best effort */ }
        ev.preventDefault();
      });

      on(canvas, 'pointermove', function (ev) {
        const p = localPoint(ev);
        if (st.drag) {
          const dx = p.x - st.drag.x, dy = p.y - st.drag.y;
          if (downAt) downAt.moved += Math.abs(dx) + Math.abs(dy);
          if (st.drag.mode === 'orbit') {
            st.yaw += dx * 0.0085;
            st.pitch = clamp(st.pitch + dy * 0.0055, -1.15, 1.15);
            st.needDraw = true;
          } else {
            panBy(dx, dy);
          }
          st.drag.x = p.x;
          st.drag.y = p.y;
          return;
        }
        const hit = pickAt(p.x, p.y);
        const same = (!hit && !st.hover) ||
          (hit && st.hover && hit.type === st.hover.type &&
            hit.plane === st.hover.plane && hit.block === st.hover.block &&
            hit.row === st.hover.row && hit.col === st.hover.col);
        if (!same) {
          st.hover = hit;
          st.needDraw = true;
          if (cb.onHover) cb.onHover(hit);
        }
      });

      function endDrag(ev) {
        const moved = downAt ? downAt.moved : 99;
        st.drag = null;
        downAt = null;
        if (moved < 5 && ev) {
          const p = localPoint(ev);
          const hit = pickAt(p.x, p.y);
          st.sel = hit;
          st.needDraw = true;
          if (cb.onSelect) cb.onSelect(hit);
        }
      }

      on(canvas, 'pointerup', endDrag);
      on(canvas, 'pointercancel', function () { st.drag = null; downAt = null; });
      on(canvas, 'pointerleave', function () {
        if (st.hover) {
          st.hover = null;
          st.needDraw = true;
          if (cb.onHover) cb.onHover(null);
        }
      });
      on(canvas, 'contextmenu', function (ev) { ev.preventDefault(); });
      on(canvas, 'wheel', function (ev) {
        ev.preventDefault();
        st.zoom = clamp(st.zoom * (1 - ev.deltaY * 0.0013), 0.28, 6);
        st.needDraw = true;
      }, { passive: false });
      on(canvas, 'keydown', function (ev) {
        if (ev.key === ' ' || ev.key === 'Spacebar') {
          ev.preventDefault();
          if (cb.onTogglePlay) cb.onTogglePlay();
        } else if (ev.key === 'ArrowRight') {
          ev.preventDefault();
          stepBy(1);
        } else if (ev.key === 'ArrowLeft') {
          ev.preventDefault();
          stepBy(-1);
        } else if (ev.key === 'r' || ev.key === 'R') {
          ev.preventDefault();
          resetView();
        } else if (ev.key === 'd' || ev.key === 'D') {
          ev.preventDefault();
          jumpToUnet();
        }
      });

      let observer = null;
      if (typeof window.ResizeObserver === 'function') {
        observer = new window.ResizeObserver(function () { resize(); });
        try { observer.observe(canvas); } catch (e) { observer = null; }
      }
      on(window, 'resize', function () { resize(); });

      /* ---------------- public surface ---------------- */

      function setScene(scene) {
        st.scene = scene;
        const count = nodeCount();
        st.step = clamp(st.step, 0, Math.max(0, count - 1));
        st.frac = 0;
        st.hover = null;
        st.needDraw = true;
      }

      function setOpts(opts) {
        st.opts = Object.assign({}, st.opts, opts || {});
        st.needDraw = true;
      }

      function setStep(index) {
        const count = nodeCount();
        const next = clamp(Math.round(num(index, 0)), 0, Math.max(0, count - 1));
        if (next === st.step) return;
        st.step = next;
        st.frac = 0;
        st.needDraw = true;
      }

      function setPlaying(on_) {
        const next = !!on_;
        if (next && !st.playing) {
          const count = nodeCount();
          if (count > 1 && st.step >= count - 1) {
            st.step = 0;
            if (cb.onStep) cb.onStep(0);
          }
          st.last = 0;
        }
        st.playing = next;
        st.needDraw = true;
      }

      function setSpeed(v) { st.speed = clamp(num(v, 1.4), 0.15, 12); }
      function setAutoRotate(v) { st.autoRotate = !!v; st.needDraw = true; }

      function stepBy(delta) {
        const count = nodeCount();
        if (!count) return;
        st.playing = false;
        if (cb.onPlaying) cb.onPlaying(false);
        const next = clamp(st.step + delta, 0, count - 1);
        st.step = next;
        st.frac = 0;
        st.needDraw = true;
        if (cb.onStep) cb.onStep(next);
      }

      function restart() {
        st.step = 0;
        st.frac = 0;
        st.needDraw = true;
        if (cb.onStep) cb.onStep(0);
      }

      function jumpToUnet() {
        if (!st.scene) return;
        st.playing = false;
        if (cb.onPlaying) cb.onPlaying(false);
        st.step = st.scene.fcount;
        st.frac = 0;
        st.needDraw = true;
        if (cb.onStep) cb.onStep(st.step);
      }

      function jumpTo(index) {
        setStep(index);
        if (cb.onStep) cb.onStep(st.step);
      }

      function resetView() {
        st.yaw = HOME.yaw;
        st.pitch = HOME.pitch;
        st.zoom = HOME.zoom;
        st.target = { x: 0, y: 0, z: 0 };
        st.needDraw = true;
      }

      function dispose() {
        st.disposed = true;
        if (st.raf) window.cancelAnimationFrame(st.raf);
        if (observer) { try { observer.disconnect(); } catch (e) { /* already gone */ } }
        for (let i = 0; i < disposers.length; i += 1) {
          try { disposers[i](); } catch (e) { /* listener already removed */ }
        }
        disposers.length = 0;
      }

      resize();
      st.raf = window.requestAnimationFrame(loop);

      return {
        setScene: setScene,
        setOpts: setOpts,
        setStep: setStep,
        setPlaying: setPlaying,
        setSpeed: setSpeed,
        setAutoRotate: setAutoRotate,
        stepBy: stepBy,
        restart: restart,
        jumpTo: jumpTo,
        jumpToUnet: jumpToUnet,
        resetView: resetView,
        dispose: dispose,
        resize: resize,
      };
    }

    /* =====================================================================
     * 7. Panel CSS (host theme tokens only; the canvas is artwork)
     * ===================================================================*/

    const CSS = [
      '.d3-root{position:relative;display:flex;flex-direction:column;height:100%;min-height:340px;',
      'width:100%;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);',
      'font-size:12px;line-height:1.45;isolation:isolate}',

      '.d3-canvas{position:absolute;inset:0;display:block;width:100%;height:100%;cursor:grab;outline:none;',
      'touch-action:none}',
      '.d3-canvas:active{cursor:grabbing}',
      '.d3-canvas:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',

      '.d3-head{position:relative;z-index:3;display:flex;align-items:center;gap:10px;flex-wrap:wrap;',
      'padding:7px 12px;background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.d3-brand{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-brand-primary)}',
      '.d3-title{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.d3-sub{font-size:10.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;',
      'text-overflow:ellipsis;max-width:42vw}',
      '.d3-grow{flex:1 1 auto;min-width:8px}',

      '.d3-body{position:relative;z-index:2;flex:1 1 auto;display:flex;align-items:flex-start;',
      'justify-content:space-between;gap:8px;padding:8px;min-height:0;pointer-events:none}',
      '.d3-col{pointer-events:auto;display:flex;flex-direction:column;gap:8px;width:244px;max-height:100%;',
      'overflow-y:auto;overflow-x:hidden;padding-right:2px;scrollbar-width:thin}',
      '.d3-col::-webkit-scrollbar{width:6px}',
      '.d3-col::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:3px}',

      '.d3-card{flex:0 0 auto;display:flex;flex-direction:column;gap:6px;padding:8px 9px;border-radius:10px;',
      'background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);',
      'box-shadow:0 6px 18px rgba(0,0,0,.18)}',
      '.d3-cardhead{display:flex;align-items:center;justify-content:space-between;gap:6px}',
      '.d3-cardtitle{font-size:11.5px;font-weight:600;letter-spacing:.01em}',
      '.d3-cap{font-size:10px;color:var(--dsw-alias-label-secondary)}',
      '.d3-hint{font-size:10px;color:var(--dsw-alias-label-secondary);line-height:1.5}',

      '.d3-row{display:flex;align-items:center;gap:6px}',
      '.d3-rowwrap{display:flex;flex-wrap:wrap;gap:4px}',
      '.d3-field{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.d3-label{font-size:10px;color:var(--dsw-alias-label-secondary)}',

      '.d3-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:4px 8px;',
      'border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);',
      'color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}',
      '.d3-btn:hover{border-color:var(--dsw-alias-border-l2)}',
      '.d3-btn[data-active="true"]{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}',
      '.d3-btn:disabled{opacity:.45;cursor:default}',
      '.d3-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.d3-btnicon{width:26px;padding:4px 0}',

      '.d3-num{width:100%;min-width:0;padding:3px 5px;border-radius:5px;font:inherit;font-size:11px;',
      'border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);',
      'color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}',
      '.d3-select{width:100%;padding:4px 6px;border-radius:6px;font:inherit;font-size:11px;',
      'border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);',
      'color:var(--dsw-alias-label-primary)}',
      '.d3-grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}',

      '.d3-range{width:100%;height:14px;cursor:pointer;accent-color:var(--dsw-alias-brand-primary)}',
      '.d3-check{display:flex;align-items:center;gap:5px;font-size:10.5px;',
      'color:var(--dsw-alias-label-secondary);cursor:pointer;user-select:none}',
      '.d3-check input{accent-color:var(--dsw-alias-brand-primary);cursor:pointer;margin:0}',

      '.d3-blocks{display:flex;flex-direction:column;gap:3px}',
      '.d3-block{display:flex;flex-direction:column;gap:1px;padding:5px 7px;border-radius:7px;cursor:pointer;',
      'border:1px solid transparent;background:var(--dsw-alias-bg-layer-2);text-align:left;font:inherit;',
      'color:var(--dsw-alias-label-primary)}',
      '.d3-block:hover{border-color:var(--dsw-alias-border-l2)}',
      '.d3-block[data-active="true"]{border-color:var(--dsw-alias-brand-primary)}',
      '.d3-block[data-focus="true"]{box-shadow:inset 2px 0 0 var(--dsw-alias-state-success-primary)}',
      '.d3-btop{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;font-weight:600}',
      '.d3-bbot{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:9.5px;',
      'color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.d3-dot{width:7px;height:7px;border-radius:2px;flex:0 0 auto}',
      '.d3-badge{font-size:9px;padding:0 4px;border-radius:4px;border:1px solid var(--dsw-alias-border-l2);',
      'color:var(--dsw-alias-label-secondary);line-height:1.4}',

      '.d3-kv{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:10.5px;',
      'padding:1px 0}',
      '.d3-kv-k{color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.d3-kv-v{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;text-align:right;',
      'overflow:hidden;text-overflow:ellipsis}',

      '.d3-bar{height:4px;border-radius:2px;overflow:hidden;background:var(--dsw-alias-bg-layer-2)}',
      '.d3-bar>i{display:block;height:100%;background:var(--dsw-alias-brand-primary)}',

      '.d3-map{position:relative;border-radius:4px;overflow:hidden;background:#060a12;',
      'outline:1px solid var(--dsw-alias-border-l1)}',
      '.d3-mapgrid{display:flex;flex-wrap:wrap;gap:6px}',
      '.d3-mapcell{display:flex;flex-direction:column;gap:2px;align-items:center}',
      '.d3-legend{display:flex;flex-direction:column;gap:3px}',
      '.d3-legrow{display:flex;align-items:center;gap:6px;font-size:10.5px;',
      'color:var(--dsw-alias-label-secondary)}',
      '.d3-swatch{width:10px;height:10px;border-radius:2px;flex:0 0 auto}',
      '.d3-scale{height:8px;border-radius:4px;',
      'background:linear-gradient(90deg,#060a12,#2c6a9d,#1ba0ae,#6bd267,#eed83c,#ff8650,#dd2f52)}',

      '.d3-chart{width:100%;height:54px;display:block}',
      '.d3-phase{font-size:10px;padding:0 5px;border-radius:4px;line-height:1.5;',
      'border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}',

      '.d3-foot{position:relative;z-index:3;display:flex;align-items:center;gap:10px;flex-wrap:wrap;',
      'padding:5px 12px;font-size:10px;color:var(--dsw-alias-label-secondary);',
      'background:var(--dsw-alias-bg-layer-1);border-top:1px solid var(--dsw-alias-border-l1)}',
      '.d3-foot b{color:var(--dsw-alias-label-primary);font-weight:600}',
      '.d3-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}',

      '.d3-tip{position:absolute;z-index:6;pointer-events:none;transform:translate(-50%,-148%);',
      'padding:3px 7px;border-radius:6px;font-size:10px;white-space:nowrap;',
      'background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);',
      'box-shadow:0 6px 16px rgba(0,0,0,.35);color:var(--dsw-alias-label-primary)}',
      '.d3-empty{font-size:10.5px;color:var(--dsw-alias-label-secondary);line-height:1.5}',

      '@media (max-width:980px){.d3-col{width:212px}.d3-sub{display:none}}',
      '@media (max-width:780px){.d3-body{flex-direction:column;overflow-y:auto}',
      '.d3-col{width:100%;max-height:none;overflow:visible}.d3-canvas{position:relative;height:48vh;inset:auto}}',
    ].join('');

﻿    /* =====================================================================
     * 8. Components
     * ===================================================================*/

    function PanelIcon(props) {
      const size = (props && props.size) || 18;
      const active = !!(props && props.active);
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, focusable: 'false', 'aria-hidden': 'true',
        style: { display: 'block', opacity: active ? 1 : 0.86 },
      },
        h('rect', { x: 1.4, y: 4.6, width: 6.4, height: 6.4, rx: 1.3, fill: 'currentColor', fillOpacity: 0.85 }),
        h('path', {
          d: 'M8.6 7.8h2.6v5.1c0 1.7 1.1 2.8 2.8 2.8s2.8-1.1 2.8-2.8V7.8h2.6',
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
          strokeLinecap: 'round', strokeLinejoin: 'round',
        }),
        h('rect', { x: 16.2, y: 4.6, width: 6.4, height: 6.4, rx: 1.3, fill: 'currentColor', fillOpacity: 0.55 }),
        h('circle', { cx: 12, cy: 19.4, r: 1.4, fill: 'currentColor' }),
        h('path', {
          d: 'M9 18.6c1.3.8 4.7.8 6 0', fill: 'none', stroke: 'currentColor',
          strokeWidth: 1.3, strokeLinecap: 'round',
        }));
    }

    /** Diverging ramp for a signed value carried as 0..1 with 0.5 = zero. */
    function epsColor(v) {
      const k = clamp(Math.abs(v - 0.5) * 2, 0, 1);
      if (v >= 0.5) {
        return 'rgba(255,' + Math.round(150 - 55 * k) + ',' + Math.round(90 - 55 * k) + ',' +
          (0.18 + 0.82 * k).toFixed(3) + ')';
      }
      return 'rgba(' + Math.round(70 - 20 * k) + ',' + Math.round(140 + 25 * k) + ',255,' +
        (0.18 + 0.82 * k).toFixed(3) + ')';
    }

    /** A small pixel thumbnail painted straight onto its own canvas. */
    function Thumb(props) {
      const ref = React.useRef(null);
      const size = props.size;
      const cell = props.cell || 3;
      const token = props.token;
      const painter = props.at;
      React.useEffect(function () {
        const canvas = ref.current;
        if (!canvas) return;
        const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
        canvas.width = Math.round(size * cell * dpr);
        canvas.height = Math.round(size * cell * dpr);
        const g = canvas.getContext('2d');
        if (!g) return;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, size * cell, size * cell);
        for (let j = 0; j < size; j += 1) {
          for (let i = 0; i < size; i += 1) {
            g.fillStyle = painter(j * size + i) || '#000';
            g.fillRect(i * cell, j * cell, cell, cell);
          }
        }
      }, [size, cell, token]);
      return h('canvas', {
        ref: ref,
        style: {
          width: (size * cell) + 'px', height: (size * cell) + 'px', display: 'block',
          borderRadius: '4px', outline: '1px solid var(--dsw-alias-border-l1)', background: '#060a12',
        },
      });
    }

    function ImageThumb(props) {
      const img = props.img;
      return h(Thumb, {
        size: img.size, cell: props.cell || 3, token: props.token,
        at: function (i) {
          return rgbCss(img.rgb[i * 3], img.rgb[i * 3 + 1], img.rgb[i * 3 + 2]);
        },
      });
    }

    function EpsThumb(props) {
      const eps = props.eps;
      let mx = 1e-9;
      for (let k = 0; k < eps.length; k += 1) {
        const a = Math.abs(eps[k]);
        if (a > mx) mx = a;
      }
      const scale = 1 / mx;
      return h(Thumb, {
        size: props.size, cell: props.cell || 3, token: props.token,
        at: function (i) {
          return epsColor(0.5 + 0.5 * clamp(eps[i * 3] * scale, -1, 1));
        },
      });
    }

    function Field(label, node) {
      return h('div', { className: 'd3-field' },
        h('span', { className: 'd3-label' }, label), node);
    }

    function KV(key, value) {
      return h('div', { className: 'd3-kv', key: key },
        h('span', { className: 'd3-kv-k' }, key),
        h('span', { className: 'd3-kv-v' }, value));
    }

    function Leg(color, text) {
      return h('div', { className: 'd3-legrow', key: text },
        h('span', { className: 'd3-swatch', style: { background: color } }),
        h('span', null, text));
    }

    function Check(label, value, onChange) {
      return h('label', { className: 'd3-check', key: label },
        h('input', {
          type: 'checkbox', checked: !!value,
          onChange: function (e) { onChange(e.target.checked); },
        }),
        label);
    }

    function NumInput(props) {
      return h('input', {
        className: 'd3-num', type: 'number',
        min: props.min, max: props.max, step: props.step || 1,
        value: props.value,
        onChange: function (e) {
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) props.onChange(clamp(n, props.min, props.max));
        },
      });
    }

    function RangeField(label, value, min, max, step, onChange, text) {
      return h('div', { className: 'd3-field' },
        h('div', { className: 'd3-row' },
          h('span', { className: 'd3-label', style: { flex: '1 1 auto' } }, label),
          h('span', { className: 'd3-cap d3-mono' },
            text != null ? text : Number(value).toFixed(step < 1 ? 2 : 0))),
        h('input', {
          className: 'd3-range', type: 'range',
          min: min, max: max, step: step, value: value,
          onChange: function (e) { onChange(parseFloat(e.target.value)); },
        }));
    }

    /** ā_t against t, with the sampled planes marked. */
    function Curve(props) {
      const sched = props.sched;
      const ts = props.ts;
      const activeT = props.activeT;
      const W = 100, H = 34;
      const pts = [];
      for (let i = 0; i <= 40; i += 1) {
        const tt = (i / 40) * sched.T;
        const x = (i / 40) * W;
        const y = H - sched.abar[Math.round(tt)] * H;
        pts.push(x.toFixed(2) + ',' + y.toFixed(2));
      }
      const marks = ts.map(function (tt, i) {
        return h('circle', {
          key: 'm' + i, cx: (tt / sched.T) * W, cy: H - sched.abar[tt] * H, r: 1.5,
          fill: 'var(--dsw-alias-brand-primary)', fillOpacity: 0.85,
        });
      });
      const ax = (clamp(activeT, 0, sched.T) / sched.T) * W;
      return h('svg', {
        className: 'd3-chart', viewBox: '0 0 ' + W + ' ' + (H + 6), preserveAspectRatio: 'none',
        'aria-hidden': 'true',
      },
        h('line', {
          x1: 0, y1: H, x2: W, y2: H,
          stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 0.5,
        }),
        h('polyline', {
          points: pts.join(' '), fill: 'none',
          stroke: 'var(--dsw-alias-brand-primary)', strokeWidth: 1.2,
          strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke',
        }),
        marks,
        h('line', {
          x1: ax, y1: 0, x2: ax, y2: H,
          stroke: 'var(--dsw-alias-state-success-primary)', strokeWidth: 0.8, strokeDasharray: '2 2',
        }));
    }

    /* =====================================================================
     * 9. The panel
     * ===================================================================*/

    function LabPage() {
      const tick = useLocaleTick();
      const canvasRef = React.useRef(null);
      const apiRef = React.useRef(null);

      const [spec, setSpec] = React.useState({
        pattern: 'cat', seed: 3, T: 100, kind: 'linear',
        betaStart: 0.0001, betaEnd: 0.02, planes: 5, sigma: 0, quality: 0.35,
      });
      const [step, setStep] = React.useState(0);
      const [playing, setPlaying] = React.useState(false);
      const [speed, setSpeed] = React.useState(1.4);
      const [disp, setDisp] = React.useState({
        labels: true, grid: true, particle: true, skip: true,
        rotate: false, spacing: 1, laneGap: 1,
      });
      const [hover, setHover] = React.useState(null);
      const [sel, setSel] = React.useState(null);

      /* ---------- the numbers ---------- */
      const img = React.useMemo(function () {
        return makeImage(spec.pattern, spec.seed);
      }, [spec.pattern, spec.seed, tick]);

      const sched = React.useMemo(function () {
        return makeSchedule(spec);
      }, [spec.T, spec.kind, spec.betaStart, spec.betaEnd, tick]);

      const ts = React.useMemo(function () {
        return sampleSteps(sched.T, spec.planes);
      }, [sched, spec.planes, tick]);

      const forward = React.useMemo(function () {
        return ts.map(function (tt) { return forwardImage(img, sched, tt, spec.seed); });
      }, [img, sched, ts, spec.seed, tick]);

      const reverse = React.useMemo(function () {
        return reverseChain(img, sched, {
          sigma: spec.sigma, quality: spec.quality, seed: spec.seed, ts: ts,
        });
      }, [img, sched, ts, spec.sigma, spec.quality, spec.seed, tick]);

      const nF = forward.length;
      const nU = UNET_SPEC.length;
      const nR = reverse.frames.length;
      const total = nF + nU + nR;
      const safeStep = clamp(step, 0, Math.max(0, total - 1));

      let phase = 'forward';
      let localIdx = safeStep;
      if (safeStep >= nF + nU) { phase = 'reverse'; localIdx = safeStep - nF - nU; }
      else if (safeStep >= nF) { phase = 'unet'; localIdx = safeStep - nF; }

      const reverseFrame = phase === 'reverse' && localIdx < nR
        ? reverse.frames[nR - 1 - localIdx] : null;

      const activeT = phase === 'forward' ? ts[clamp(localIdx, 0, nF - 1)]
        : phase === 'reverse' && reverseFrame ? reverseFrame.t
          : sched.T;

      const unetInput = React.useMemo(function () {
        return forwardImage(img, sched, activeT, spec.seed);
      }, [img, sched, activeT, spec.seed]);

      const pass = React.useMemo(function () {
        return runUnetPass(unetInput, {
          x0: img.rgb, abar: sched.abar[clamp(activeT, 0, sched.T)],
          quality: spec.quality, seed: spec.seed,
        });
      }, [unetInput, img, sched, activeT, spec.quality, spec.seed]);

      const scene = React.useMemo(function () {
        const fplanes = forward.map(function (im, i) {
          const tt = ts[i];
          return {
            t: tt, img: im,
            label: timesLabel(false, tt, sched.T),
            sub: 'ā ' + fmtSmall(sched.abar[tt]),
          };
        });
        const rplanes = [];
        for (let j = 0; j < nR; j += 1) {
          const fr = reverse.frames[nR - 1 - j];
          if (!fr) continue;
          rplanes.push({
            t: fr.t, img: fr,
            label: timesLabel(true, fr.t, sched.T),
            sub: 'MSE ' + fmtSmall(fr.mse),
          });
        }
        return buildScene({ fplanes: fplanes, rplanes: rplanes, pass: pass }, {
          spacing: disp.spacing, laneGap: disp.laneGap,
        });
      }, [forward, ts, sched, reverse, nR, pass, disp.spacing, disp.laneGap, tick]);

      /* ---------- renderer lifecycle ---------- */
      React.useEffect(function () {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const api = createRenderer(canvas, {
          onStep: function (i) { setStep(i); },
          onHover: function (hit) { setHover(hit); },
          onSelect: function (hit) { setSel(hit); },
          onPlaying: function (v) { setPlaying(v); },
          onFinished: function () { setPlaying(false); },
          onTogglePlay: function () { setPlaying(function (p) { return !p; }); },
        });
        apiRef.current = api;
        return function () {
          api.dispose();
          apiRef.current = null;
        };
      }, []);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setScene(scene);
      }, [scene]);

      React.useEffect(function () {
        if (apiRef.current) {
          apiRef.current.setOpts({
            labels: disp.labels, grid: disp.grid,
            particle: disp.particle, skip: disp.skip,
          });
        }
      }, [disp.labels, disp.grid, disp.particle, disp.skip]);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setStep(safeStep);
      }, [safeStep, scene]);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setPlaying(playing);
      }, [playing]);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setSpeed(speed);
      }, [speed]);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setAutoRotate(disp.rotate);
      }, [disp.rotate]);

      /* ---------- edits ---------- */
      function patchSpec(patch) {
        setSpec(function (s) { return Object.assign({}, s, patch); });
        setPlaying(false);
      }

      function patchDisp(patch) {
        setDisp(function (d) { return Object.assign({}, d, patch); });
      }

      function jumpTo(index) {
        setPlaying(false);
        setStep(index);
        if (apiRef.current) apiRef.current.jumpTo(index);
      }

      function resetView() {
        if (apiRef.current) apiRef.current.resetView();
      }

      /* ---------- derived readouts ---------- */
      const abarActive = sched.abar[clamp(activeT, 0, sched.T)];
      const betaActive = sched.beta[clamp(activeT, 1, sched.T)] || 0;
      const abarPrev = sched.abar[clamp(activeT - 1, 0, sched.T)];
      const postSigma = activeT > 0
        ? Math.sqrt(Math.max(0, betaActive * (1 - abarPrev) / Math.max(1e-9, 1 - abarActive)))
        : 0;
      const snrDb = abarActive >= 1 ? Infinity
        : 10 * Math.log10(Math.max(1e-12, abarActive / Math.max(1e-12, 1 - abarActive)));
      const fwdFrame = forward[clamp(localIdx, 0, Math.max(0, nF - 1))];
      const frameMse = phase === 'forward' && fwdFrame
        ? mseOf(fwdFrame.rgb, img.rgb)
        : reverseFrame ? reverseFrame.mse : reverse.finalMse;

      let caption;
      if (phase === 'forward') {
        caption = t('flow.forward', { t: fwdFrame ? fwdFrame.t : 0, ab: fmtSmall(fwdFrame ? fwdFrame.abar : 1) });
      } else if (phase === 'unet') {
        const node = UNET_SPEC[clamp(localIdx, 0, nU - 1)];
        caption = t('flow.unet', { name: unetStageName(node), shape: unetShape(node) });
      } else if (reverseFrame) {
        caption = t('flow.reverse', { t: reverseFrame.t, ab: fmtSmall(reverseFrame.abar) });
      } else {
        caption = t('flow.idle');
      }

      const phaseName = phase === 'forward' ? t('phase.forward')
        : phase === 'unet' ? t('phase.unet') : t('phase.reverse');

      /* ---------- header ---------- */
      const header = h('div', { className: 'd3-head' },
        h('div', { className: 'd3-brand' }, h(PanelIcon, { size: 18, active: true })),
        h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
          h('div', { className: 'd3-title' }, t('app.title')),
          h('div', { className: 'd3-sub' }, t('app.sub'))),
        h('span', { className: 'd3-phase' }, phaseName),
        h('div', { className: 'd3-grow' }),
        h('button', {
          type: 'button', className: 'd3-btn', title: t('hint.drag'), onClick: resetView,
        }, t('view.reset')));

      /* ---------- image card ---------- */
      const seedRow = h('div', { className: 'd3-row' },
        h('button', {
          type: 'button', className: 'd3-btn',
          onClick: function () { patchSpec({ seed: (spec.seed % 12) + 1 }); },
        }, t('img.shuffle')),
        h('span', { className: 'd3-cap d3-mono' }, 'seed ' + spec.seed));

      const patternSelect = h('select', {
        className: 'd3-select', value: spec.pattern,
        onChange: function (e) { patchSpec({ pattern: e.target.value }); },
      }, PATTERNS.map(function (p) {
        return h('option', { key: p, value: p }, t('pattern.' + p));
      }));

      const imageCard = h('div', { className: 'd3-card' },
        h('div', { className: 'd3-cardhead' },
          h('div', { className: 'd3-cardtitle' }, t('img.title')),
          h('span', { className: 'd3-cap' }, t('img.size', { s: img.size }))),
        h('div', { className: 'd3-row' },
          h(ImageThumb, { img: img, cell: 2, token: spec.pattern + ':' + spec.seed }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 auto', minWidth: 0 } },
            Field(t('img.pattern'), patternSelect),
            seedRow)));

      /* ---------- diffusion card ---------- */
      const scheduleSelect = h('select', {
        className: 'd3-select', value: spec.kind,
        onChange: function (e) { patchSpec({ kind: e.target.value }); },
      }, SCHEDULES.map(function (k) {
        return h('option', { key: k, value: k }, t('schedule.' + k));
      }));

      const betaRow = spec.kind === 'linear'
        ? h('div', { className: 'd3-grid2' },
          Field(t('diff.betaStart'), h(NumInput, {
            value: spec.betaStart, min: 0.000001, max: 0.2, step: 0.0001,
            onChange: function (v) { patchSpec({ betaStart: v }); },
          })),
          Field(t('diff.betaEnd'), h(NumInput, {
            value: spec.betaEnd, min: 0.000002, max: 0.9, step: 0.005,
            onChange: function (v) { patchSpec({ betaEnd: v }); },
          })))
        : null;

      const diffusionCard = h('div', { className: 'd3-card' },
        h('div', { className: 'd3-cardhead' },
          h('div', { className: 'd3-cardtitle' }, t('diff.title')),
          h('span', { className: 'd3-cap d3-mono' }, 'T=' + sched.T)),
        Field(t('diff.schedule'), scheduleSelect),
        h('div', { className: 'd3-grid2' },
          Field(t('diff.steps'), h(NumInput, {
            value: spec.T, min: 10, max: 1000, step: 10,
            onChange: function (v) { patchSpec({ T: Math.round(v) }); },
          })),
          Field(t('diff.planes'), h(NumInput, {
            value: spec.planes, min: 3, max: 9, step: 1,
            onChange: function (v) { patchSpec({ planes: Math.round(v) }); },
          }))),
        betaRow,
        RangeField(t('diff.sigma'), spec.sigma, 0, 1.2, 0.05,
          function (v) { patchSpec({ sigma: v }); }, spec.sigma.toFixed(2)),
        RangeField(t('diff.quality'), spec.quality, 0, 1, 0.05,
          function (v) { patchSpec({ quality: v }); },
          spec.quality <= 0.02 ? t('diff.ideal')
            : spec.quality >= 0.98 ? t('diff.coarse') : spec.quality.toFixed(2)),
        h('div', { className: 'd3-hint' }, t('diff.note')));

      /* ---------- playback card ---------- */
      const playCard = h('div', { className: 'd3-card' },
        h('div', { className: 'd3-cardhead' },
          h('div', { className: 'd3-cardtitle' }, t('play.title')),
          h('span', { className: 'd3-cap d3-mono' }, t('flow.step', { i: safeStep + 1, n: total }))),
        h('div', { className: 'd3-rowwrap' },
          h('button', {
            type: 'button', className: 'd3-btn', 'data-active': playing ? 'true' : 'false',
            onClick: function () { setPlaying(function (p) { return !p; }); },
          }, playing ? t('play.pause') : t('play.play')),
          h('button', {
            type: 'button', className: 'd3-btn d3-btnicon', title: t('play.prev'),
            onClick: function () {
              setPlaying(false);
              if (apiRef.current) apiRef.current.stepBy(-1);
            },
          }, '‹'),
          h('button', {
            type: 'button', className: 'd3-btn d3-btnicon', title: t('play.next'),
            onClick: function () {
              setPlaying(false);
              if (apiRef.current) apiRef.current.stepBy(1);
            },
          }, '›'),
          h('button', {
            type: 'button', className: 'd3-btn',
            onClick: function () {
              setPlaying(false);
              if (apiRef.current) apiRef.current.restart();
            },
          }, t('play.restart'))),
        h('input', {
          className: 'd3-range', type: 'range',
          min: 0, max: Math.max(0, total - 1), step: 1, value: safeStep,
          'aria-label': t('play.step'),
          onChange: function (e) { jumpTo(parseInt(e.target.value, 10) || 0); },
        }),
        RangeField(t('play.speed'), speed, 0.15, 6, 0.05,
          function (v) { setSpeed(v); }, speed.toFixed(2) + '×'),
        h('div', { className: 'd3-hint' }, caption));

      /* ---------- timestep card ---------- */
      const timeCard = h('div', { className: 'd3-card' },
        h('div', { className: 'd3-cardhead' },
          h('div', { className: 'd3-cardtitle' }, t('time.title')),
          h('span', { className: 'd3-cap d3-mono' }, 't = ' + activeT + ' / ' + sched.T)),
        h('div', { style: { display: 'flex', gap: '8px' } },
          h('div', { style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' } },
            KV(t('time.abar'), fmtSmall(abarActive)),
            KV(t('time.sqrtA'), fmtSmall(Math.sqrt(abarActive))),
            KV(t('time.sqrtN'), fmtSmall(Math.sqrt(1 - abarActive))),
            KV(t('time.snr'), Number.isFinite(snrDb) ? fmtNum(snrDb) + ' dB' : '∞')),
          h('div', { style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' } },
            KV(t('time.sigma'), fmtSmall(postSigma)),
            KV(t('time.mse'), fmtSmall(frameMse)),
            KV(t('time.psnr'), Number.isFinite(psnrOf(frameMse)) ? fmtNum(psnrOf(frameMse)) : '∞'),
            KV('|ε̂|', fmtSmall(reverse.epsMeanAbs)))),
        h(Curve, { sched: sched, ts: ts, activeT: activeT }),
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start' } },
          pass.epsRaw
            ? h('div', { className: 'd3-mapcell' },
              h('span', { className: 'd3-cap' }, 'ε̂'),
              h(EpsThumb, { eps: pass.epsRaw, size: unetInput.size, cell: 2, token: 'e' + activeT + ':' + spec.quality }))
            : null,
          h('div', { className: 'd3-mapcell' },
            h('span', { className: 'd3-cap' }, timesLabel(false, activeT, sched.T)),
            h(ImageThumb, { img: unetInput, cell: 2, token: 'i' + activeT + ':' + spec.seed + ':' + spec.kind })),
          reverseFrame
            ? h('div', { className: 'd3-mapcell' },
              h('span', { className: 'd3-cap' }, timesLabel(true, activeT, sched.T)),
              h(ImageThumb, { img: reverseFrame, cell: 2, token: 'r' + activeT + ':' + spec.sigma + ':' + spec.quality }))
            : null),
        h('div', { className: 'd3-cap' }, t('time.curve')));

      /* ---------- U-Net card ---------- */
      const unetCard = h('div', { className: 'd3-card' },
        h('div', { className: 'd3-cardhead' },
          h('div', { className: 'd3-cardtitle' }, t('unet.title')),
          h('span', { className: 'd3-cap' }, fmtCount(unetParams()) + ' ' + t('unet.params'))),
        h('div', { className: 'd3-blocks' }, UNET_SPEC.map(function (node, i) {
          const active = phase === 'unet' && localIdx === i;
          return h('button', {
            key: node.id,
            type: 'button',
            className: 'd3-block',
            'data-active': active ? 'true' : 'false',
            'data-focus': phase === 'unet' && localIdx >= i ? 'true' : 'false',
            onClick: function () { jumpTo(nF + i); },
          },
            h('div', { className: 'd3-btop' },
              h('span', { className: 'd3-dot', style: { background: kindColor(node.kind) } }),
              h('span', { style: { flex: '1 1 auto' } }, unetShortLabel(node) + ' · ' + unetStageName(node)),
              h('span', { className: 'd3-cap' }, unetShape(node))),
            h('div', { className: 'd3-bbot' },
              h('span', null, node.kind === 'up' && node.skipFrom
                ? t('unet.skip') + ' ← ' + node.skipFrom
                : node.attn ? t('unet.attn') : 'res ×2'),
              h('span', null, t('unet.shown', { n: Math.min(3, FEAT_CHANNELS), ch: node.ch }))));
        })),
        h('div', { className: 'd3-hint' }, t('unet.timeEmb')),
        h('div', { className: 'd3-hint' }, t('unet.hint')));

      /* ---------- inspector card ---------- */
      const target = hover || sel;
      let inspBody;
      if (!target) {
        inspBody = h('div', { className: 'd3-empty' }, t('insp.empty'));
      } else if (target.type === 'pixel') {
        const it = target.plane;
        const idx = target.row * it.size + target.col;
        const sameSize = it.size === img.size;
        if (it.kind === 'image') {
          const r = it.rgb[idx * 3], g = it.rgb[idx * 3 + 1], b = it.rgb[idx * 3 + 2];
          inspBody = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '1px' } },
            KV(t('insp.node'), it.label || '-'),
            KV(t('insp.role'), it.role === 'forward' ? t('role.forward') : t('role.reverse')),
            KV(t('insp.cell'), (target.row + 1) + ', ' + (target.col + 1)),
            KV(t('insp.rgb'), fmtSmall(r) + ' / ' + fmtSmall(g) + ' / ' + fmtSmall(b)),
            sameSize
              ? KV(t('insp.residual'), fmtSmall(r - img.rgb[idx * 3]) + ' / ' +
                fmtSmall(g - img.rgb[idx * 3 + 1]) + ' / ' + fmtSmall(b - img.rgb[idx * 3 + 2]))
              : null,
            pass.epsRaw && sameSize ? KV(t('insp.eps'), fmtSmall(pass.epsRaw[idx * 3])) : null);
        } else {
          const block = it.block;
          const node = block ? UNET_SPEC.filter(function (n) { return n.id === block.id; })[0] : null;
          inspBody = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '1px' } },
            KV(t('insp.node'), node ? unetShortLabel(node) + ' · ' + unetStageName(node) : (block ? block.label : '-')),
            KV(t('insp.shape'), block ? block.shape : '-'),
            KV(t('insp.role'), node && node.kind === 'head' ? t('role.head')
              : node && node.kind === 'mid' ? t('role.bottleneck')
                : node && node.kind === 'down' ? t('role.encoder') : t('role.decoder')),
            KV(t('insp.cell'), (target.row + 1) + ', ' + (target.col + 1)),
            KV(it.channel != null ? it.channel + 1 : '-', fmtSmall(it.vals[idx])));
        }
      } else {
        const block = target.block;
        const node = UNET_SPEC.filter(function (n) { return n.id === block.id; })[0];
        inspBody = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
          KV(t('insp.node'), unetShortLabel(node) + ' · ' + unetStageName(node)),
          KV(t('insp.shape'), unetShape(node)),
          KV(t('insp.role'), node.kind === 'head' ? t('role.head')
            : node.kind === 'mid' ? t('role.bottleneck')
              : node.kind === 'down' ? t('role.encoder') : t('role.decoder')),
          KV(t('unet.skip'), node.skipFrom || '—'),
          KV(t('unet.attn'), node.attn ? 'multi-head' : '—'),
          block.stage && block.stage.planes.length
            ? h('div', { className: 'd3-mapcell', style: { marginTop: '3px' } },
              h('span', { className: 'd3-cap' }, t('insp.channel', { c: 1, n: block.stage.planes.length })),
              h(Thumb, {
                size: block.stage.res, cell: 3,
                token: 'f' + block.id + ':' + activeT,
                at: function (i) { return colorFor(block.stage.planes[0][i]); },
              }))
            : null);
      }

      const inspCard = h('div', { className: 'd3-card' },
        h('div', { className: 'd3-cardhead' },
          h('div', { className: 'd3-cardtitle' }, t('insp.title'))),
        inspBody);

      /* ---------- display card ---------- */
      const dispCard = h('div', { className: 'd3-card' },
        h('div', { className: 'd3-cardhead' },
          h('div', { className: 'd3-cardtitle' }, t('disp.title')),
          h('span', { className: 'd3-cap' }, t('hint.drag'))),
        h('div', { className: 'd3-rowwrap' },
          Check(t('disp.labels'), disp.labels, function (v) { patchDisp({ labels: v }); }),
          Check(t('disp.grid'), disp.grid, function (v) { patchDisp({ grid: v }); }),
          Check(t('disp.particle'), disp.particle, function (v) { patchDisp({ particle: v }); }),
          Check(t('disp.skip'), disp.skip, function (v) { patchDisp({ skip: v }); }),
          Check(t('disp.rotate'), disp.rotate, function (v) { patchDisp({ rotate: v }); })),
        RangeField(t('disp.spacing'), disp.spacing, 0.5, 2, 0.05,
          function (v) { patchDisp({ spacing: v }); }),
        RangeField(t('disp.laneGap'), disp.laneGap, 0.45, 2.2, 0.05,
          function (v) { patchDisp({ laneGap: v }); }),
        h('button', { type: 'button', className: 'd3-btn', onClick: resetView }, t('view.reset')));

      /* ---------- legend card ---------- */
      const legendCard = h('div', { className: 'd3-card' },
        h('div', { className: 'd3-cardhead' },
          h('div', { className: 'd3-cardtitle' }, t('legend.title'))),
        h('div', { className: 'd3-legend' },
          Leg('#7fb6ff', t('legend.forward')),
          Leg('#ffc46b', t('legend.reverse')),
          Leg('#8fe3c6', t('legend.block')),
          Leg('rgba(255,196,107,0.55)', t('legend.skip')),
          Leg('#ffffff', t('legend.particle')),
          Leg('#ffd166', t('legend.pair'))),
        h('div', { className: 'd3-scale' }),
        h('div', { className: 'd3-cap' }, t('legend.scale')));

      /* ---------- foot ---------- */
      const foot = h('div', { className: 'd3-foot' },
        h('span', { title: unetChainText() }, h('b', null, t('stat.chain')), ' ',
          h('span', { className: 'd3-mono' }, '32²→16²→8²→4²→4²→8²→16²→32²→32²×3')),
        h('span', null, h('b', null, t('stat.steps')), ' ', String(sched.T)),
        h('span', null, h('b', null, t('stat.params')), ' ', fmtCount(unetParams())),
        h('span', null, h('b', null, t('stat.mse')), ' ', fmtSmall(reverse.finalMse)),
        h('span', null, h('b', null, t('stat.state')), ' ', phaseName + ' · ' + t('flow.step', { i: safeStep + 1, n: total })),
        h('span', { className: 'd3-grow' }),
        h('span', { className: 'd3-cap' }, t('hint.keys')));

      /* ---------- tooltip ---------- */
      let tip = null;
      if (hover && hover.type === 'pixel') {
        const it = hover.plane;
        const idx = hover.row * it.size + hover.col;
        const val = it.kind === 'image'
          ? fmtSmall(it.rgb[idx * 3]) + ',' + fmtSmall(it.rgb[idx * 3 + 1]) + ',' +
            fmtSmall(it.rgb[idx * 3 + 2])
          : fmtSmall(it.vals[idx]);
        tip = h('div', {
          className: 'd3-tip',
          style: { left: hover.x + 'px', top: hover.y + 'px' },
        }, (it.label || (it.block ? it.block.label : '')) + ' · (' +
          (hover.row + 1) + ',' + (hover.col + 1) + ') · ' + val);
      }

      return h('div', { className: 'd3-root' },
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h('canvas', {
          className: 'd3-canvas', ref: canvasRef, tabIndex: 0,
          role: 'img', 'aria-label': t('a11y.canvas'),
        }),
        header,
        h('div', { className: 'd3-body' },
          h('div', { className: 'd3-col' }, imageCard, diffusionCard, playCard),
          h('div', { className: 'd3-col' }, timeCard, unetCard, inspCard, dispCard, legendCard)),
        foot,
        tip);
    }

﻿    /* =====================================================================
     * 10. Plugin wiring
     * ===================================================================*/

    /**
     * Run `fn` as an owned effect when the context offers one, so unmounting or
     * collapsing the slot disposes the registrations; otherwise run it once.
     */
    function effectOrRun(ctx, fn, label) {
      let ran = false;
      if (ctx && typeof ctx.effect === 'function') {
        try {
          ctx.effect(function () { ran = true; return fn(); }, label);
          return;
        } catch (e) {
          if (ran) return;
        }
      }
      try { fn(); } catch (e) { /* without its slot the panel simply never mounts */ }
    }

    function apply(ctx) {
      hostCtx = ctx;

      const loc = (ctx && typeof ctx.get === 'function') ? ctx.get('locale') : null;
      if (loc) {
        localeFace = loc;
        effectOrRun(ctx, function () {
          const disposers = [];
          try {
            if (typeof loc.register === 'function') disposers.push(loc.register(NS, 'en', DICT_EN));
          } catch (e) { /* the namespace may already be registered */ }
          try {
            if (typeof loc.register === 'function') disposers.push(loc.register(NS, 'zh', DICT_ZH));
          } catch (e) { /* the namespace may already be registered */ }
          try {
            if (typeof loc.bind === 'function') boundTranslate = loc.bind(NS);
          } catch (e) { boundTranslate = null; }
          return function () {
            for (let i = 0; i < disposers.length; i += 1) {
              try { disposers[i](); } catch (e) { /* already disposed */ }
            }
            boundTranslate = null;
          };
        }, 'diff3d:locale');
      }

      const slots = (ctx && typeof ctx.get === 'function') ? ctx.get('slots') : null;
      if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') return;

      effectOrRun(ctx, function () {
        return slots.inject('sidebar.panellist', function () {
          return slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 48,
            label: function () { return t('app.title'); },
          }, PanelIcon);
        });
      }, 'diff3d:panellist');

      effectOrRun(ctx, function () {
        return slots.inject('main', function () {
          return slots.register({ name: 'main', key: PANEL_ID }, LabPage);
        });
      }, 'diff3d:main');
    }

    return {
      inject: ['slots'],
      apply: apply,
      __internals: {
        NS: NS,
        PANEL_ID: PANEL_ID,
        DICT_EN: DICT_EN,
        DICT_ZH: DICT_ZH,
        PATTERNS: PATTERNS,
        SCHEDULES: SCHEDULES,
        UNET_SPEC: UNET_SPEC,
        IMG_SIZE: IMG_SIZE,
        PALETTE: PALETTE,
        makeImage: makeImage,
        makeSchedule: makeSchedule,
        sampleSteps: sampleSteps,
        forwardImage: forwardImage,
        predictEps: predictEps,
        degradedClean: degradedClean,
        reverseChain: reverseChain,
        mseOf: mseOf,
        psnrOf: psnrOf,
        timesLabel: timesLabel,
        unetParams: unetParams,
        unetChainText: unetChainText,
        runUnetPass: runUnetPass,
        buildScene: buildScene,
        createRenderer: createRenderer,
        LabPage: LabPage,
        PanelIcon: PanelIcon,
        fmtSmall: fmtSmall,
        fmtCount: fmtCount,
        gauss: gauss,
      },
    };
  },
});
