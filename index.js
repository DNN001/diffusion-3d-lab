/**
 * Host half of the Diffusion 3D Lab bundle.
 *
 * The lab is a Client-side Web panel: the image sample, the DDPM noise
 * schedule, the forward noising chain, the U-Net epsilon pass and the reverse
 * denoising chain all run in the browser. The Host only needs this plugin row
 * so the bundle's Client module is loaded into the page, so `apply` stays
 * empty.
 */
export function apply() {}
