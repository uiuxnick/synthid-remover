import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/credits', () => ({
  getAppConfig: vi.fn(),
  InsufficientCreditsError: class extends Error {},
  refundJobCredits: vi.fn(),
  spendCredits: vi.fn(),
}));
vi.mock('@/lib/emailTemplates', () => ({ sendTemplated: vi.fn() }));
vi.mock('@/lib/imageProcessor', () => ({ processImagePipeline: vi.fn() }));
import { CleanError, parseCleanForm } from '@/lib/cleanJob';

const form = (fields: Record<string, string | Blob>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) (v instanceof Blob ? fd.append(k, v, 'a.png') : fd.append(k, v));
  return fd;
};
const png = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' });

describe('parseCleanForm', () => {
  it('applies defaults', () => {
    const r = parseCleanForm(form({ file: png }));
    expect(r).toMatchObject({ format: 'png', mode: 'balanced', strength: 75, stripMetadata: true });
  });
  it('requires a file', () => {
    expect(() => parseCleanForm(form({ format: 'png' }))).toThrow(CleanError);
  });
  it('rejects unknown formats and modes (no raw strings reach data URLs)', () => {
    expect(() => parseCleanForm(form({ file: png, format: 'png;base64,<script>' }))).toThrow(/format/);
    expect(() => parseCleanForm(form({ file: png, disruptionMode: 'nuke' }))).toThrow(/mode/);
  });
  it('reads the API field name and clamps strength', () => {
    const r = parseCleanForm(form({ file: png, mode: 'metadata-only', disruptionStrength: '9999' }), 'mode');
    expect(r.mode).toBe('metadata-only');
    expect(r.strength).toBe(100);
  });
});
