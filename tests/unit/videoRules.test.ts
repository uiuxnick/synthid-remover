import { describe, expect, it } from 'vitest';
import { isAllowedContainer, toPixelRegion, userTags, videoCost } from '@/lib/videoRules';

describe('video pricing', () => {
  it('metadata-only is always one credit', () => {
    expect(videoCost('metadata-only', 1)).toBe(1);
    expect(videoCost('metadata-only', 179)).toBe(1);
  });
  it('mark removal is one credit per started 10 seconds', () => {
    expect(videoCost('remove-mark', 0.5)).toBe(1);
    expect(videoCost('remove-mark', 10)).toBe(1);
    expect(videoCost('remove-mark', 10.1)).toBe(2);
    expect(videoCost('remove-mark', 95)).toBe(10);
  });
});

describe('container allowlist', () => {
  it('accepts real video containers as ffprobe names them', () => {
    expect(isAllowedContainer('mov,mp4,m4a,3gp,3g2,mj2')).toBe(true);
    expect(isAllowedContainer('matroska,webm')).toBe(true);
  });
  it('refuses playlists, image sequences and text demuxers', () => {
    for (const f of ['hls', 'concat', 'image2', 'tty', 'lavfi', 'mpegts', '']) expect(isAllowedContainer(f)).toBe(false);
  });
});

describe('mark region', () => {
  it('converts fractions to pixels', () => {
    expect(toPixelRegion({ x: 0.5, y: 0.5, w: 0.25, h: 0.25 }, 640, 360)).toEqual({ x: 320, y: 180, w: 160, h: 90 });
  });
  it('always stays inside the frame with a 1px border (delogo requirement)', () => {
    for (const r of [{ x: 0, y: 0, w: 1, h: 1 }, { x: 0.99, y: 0.99, w: 0.5, h: 0.5 }, { x: 0, y: 0, w: 0, h: 0 }]) {
      const p = toPixelRegion(r, 640, 360);
      expect(p.x).toBeGreaterThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(1);
      expect(p.x + p.w).toBeLessThanOrEqual(639);
      expect(p.y + p.h).toBeLessThanOrEqual(359);
      expect(p.w).toBeGreaterThanOrEqual(4);
      expect(p.h).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('userTags', () => {
  it('reports real metadata and ignores container plumbing', () => {
    expect(userTags({ title: 'x', Comment: 'y', major_brand: 'isom', handler_name: 'VideoHandler', language: 'und' })).toEqual(['title', 'comment']);
    expect(userTags(undefined)).toEqual([]);
  });
});
