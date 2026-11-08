    /* =====================================================================
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
