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
