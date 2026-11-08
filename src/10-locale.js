    /* =====================================================================
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
