/**
 * Numbers shown in the homepage fragments. All measured with this repo's own pipeline:
 * - SAMPLE: public/hero-watermarked.jpg re-saved with EXIF + ICC, then run in balanced mode
 *   (scanBufferProvenance before/after, PSNR computed against the tagged input).
 * - MODES: the 1200x655 photo from scripts/verify-pipeline.mjs (`npm test`).
 */
export const SAMPLE = {
  name: 'sample-render.jpg',
  dims: '1200 × 655',
  inBytes: '104.1 KB',
  outBytes: '123.6 KB',
  found: ['EXIF', 'ICC profile'],
  psnr: '38.27 dB',
  mse: '9.69',
  ms: '846 ms',
  badge: 'Corner badge removed',
} as const;

export const MODES = {
  'Metadata only': { psnr: 'Lossless', ms: '127 ms', note: 'PNG output is pixel-identical in our test suite.' },
  Balanced: { psnr: '38.06 dB', ms: '846 ms', note: 'The default: metadata gone, quality held at the 38 dB target.' },
  Aggressive: { psnr: '30.11 dB', ms: '1.5 s', note: 'Strongest pixel changes. Expect visible softening.' },
} as const;
