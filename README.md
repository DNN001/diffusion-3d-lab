# Diffusion 3D Lab

A Harness Web UI panel that puts a DDPM in one interactive 3D scene: the clean
image at the left of the front lane, the forward noising chain carrying it to
pure noise at the right, the U-Net standing between the lanes, and the reverse
denoising chain bringing a sample back along the rear lane until a picture
reappears under the original.

Installed in the `desktop` profile as `@local/diffusion-3d-lab`, ordered after
`Conv 3D Lab` and `CNN Explainer` in the sidebar panel rail.

- Host half — `index.js` — is empty: everything runs in the browser.
- Client half — `client.js` — registers itself with
  `window.__ModuleLoader__` and claims two slots: `sidebar.panellist` (the icon)
  and `main` (the keyed panel `diffusion-3d-lab`).
- `client.js` is assembled from `src/*.js` by `node build.mjs`; edit the parts,
  never the artifact.

## What it shows

Everything on screen is a number the panel computed. The forward planes are the
closed-form DDPM marginal, the reverse planes come from the ancestral sampling
recursion, and the U-Net feature planes are the output of real convolution,
pooling, upsampling and skip addition.

- **Clean image** — a 32×32 sample drawn from pure geometry (a cat face,
  seven-segment digits, rings, gradient, checkerboard, noise, waves), seeded so
  every run is reproducible and the noise field is tied to the run.
- **The forward chain** — `x_t = √ā_t·x₀ + √(1−ā_t)·ε` evaluated exactly, so the
  planes are the true marginal samples of the schedule, not a fading picture.
  Linear β (DDPM, β 1e-4…2e-2) and cosine ā (Nichol & Dhariwal) schedules,
  10…1000 timesteps, 3…9 planes per chain.
- **The reverse chain** — the real ancestral step
  `x_{t−1} = (x_t − β_t/√(1−ā_t)·ε̂)/√α_t + σ_t·z`, run from the same `x_T` the
  forward chain produced, so the two lanes form one closed loop: front and rear
  plane at the same x belong to the same timestep and can be compared directly.
- **The U-Net** — the Ho et al. (2020) ladder: four encoder levels
  (32²→16²→8²→4²), a middle block with self-attention, three decoder levels that
  each take a skip connection, and the ε head. Every block shows one feature
  plane computed by 3×3 convolution + ReLU, average pooling, nearest upsampling
  and skip addition over the noisy input at the active timestep, so scrubbing the
  flow visibly changes what the network is working on. The weights figure in the
  card is counted from the same channel configuration the scene draws.
- **ε and its error** — the predictor is idealised: with a clean estimate the
  Bayes-optimal ε is available in closed form. The `ε predictor` slider gives the
  network a blocky, seeded error on its x̂₀, so the reconstruction degrades the
  way a weak model's would instead of being suspiciously perfect.
- **Sampling noise σ** — scales the posterior standard deviation
  `σ_t = √(β_t(1−ā_{t−1})/(1−ā_t))`. It perturbs the trajectory; the late steps
  of the posterior sampler are nearly deterministic, so the error that survives
  in the final image is the predictor's, as the note in the panel says.
- **The flow** — a glowing packet walks the lanes and the network: forward
  planes, then D1 → D2 → D3 → D4 → Mid → U3 → U2 → U1 → ε, then the reverse
  planes back to `x̂₀`. Play, step, scrub, or jump to any block from the U-Net
  list.
- **Readouts** — `ā_t`, `√ā_t`, `√(1−ā_t)`, SNR in dB, posterior `σ_t`, MSE and
  PSNR against `x₀`, the `ā_t` curve with the sampled timesteps marked, and live
  thumbnails of `x_t`, `x̂_t` and `ε̂`.
- **Interaction** — drag orbits, right-drag (or Shift-drag) pans, wheel zooms,
  `Space` plays/pauses, `←`/`→` step, `D` jumps to the network, `R` resets the
  view. Hovering a pixel or a block fills the inspector; clicking selects.
- **Display** — plane labels, pixel grid, flow packet, skip connections, auto
  rotate, plane spacing and lane gap, all live toggles.

## Numeric notes

- `ā_t` never reaches exactly zero: the cosine schedule's final transition is
  capped at β = 0.9 so `α` cannot collapse, which is what implementations do
  rather than denormalise the last step.
- The reversed lanes agree with the forward lanes at identical timesteps because
  both are seeded from the same Gaussian field.
- With an exact predictor and σ = 0 the reverse chain returns `x₀` to machine
  precision — that is the posterior mean, and the tests assert it (< 1e-6).

## Checks

```sh
node build.mjs               # assemble client.js from src/*.js
node test/model.test.mjs     # schedule, marginal, reverse chain, U-Net, scene, locale, render
node test/render-smoke.test.mjs  # paint and play the canvas through a recording 2D context
node test/bundle-check.mjs   # manifest, patch, locales, icon, artifact
```

## Limits

- The U-Net is a schematic: real layer shapes, real feature arithmetic, but fixed
  filters instead of trained weights, and four drawn channels per block (the card
  says how many the real block carries). The panel never claims the features are
  meaningful — only that they are computed.
- The ε predictor is idealised against a corrupted clean estimate, not learned.
  The panel states this in the diffusion card note.
- Rendering is a hand-projected 2D-canvas painter: no WebGL, no 3D library, no
  external assets, no network access.
