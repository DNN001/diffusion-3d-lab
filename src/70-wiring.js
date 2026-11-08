    /* =====================================================================
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
