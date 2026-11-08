    /* =====================================================================
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
