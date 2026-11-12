import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/credits', () => ({ getAppConfig: vi.fn() }));
import { ID_PATTERNS, parseScripts } from '@/lib/tracking';

describe('tracking ID patterns', () => {
  it('accepts real-looking ids and rejects injection attempts', () => {
    expect(ID_PATTERNS.ga4MeasurementId.test('G-ABC123XYZ9')).toBe(true);
    expect(ID_PATTERNS.ga4MeasurementId.test("G-ABC');alert(1);('")).toBe(false);
    expect(ID_PATTERNS.gtmContainerId.test('GTM-ABCD123')).toBe(true);
    expect(ID_PATTERNS.gtmContainerId.test('GTM-A"></script>')).toBe(false);
    expect(ID_PATTERNS.metaPixelId.test('123456789012345')).toBe(true);
    expect(ID_PATTERNS.plausibleDomain.test('example.com')).toBe(true);
    expect(ID_PATTERNS.plausibleDomain.test('a.com"><script>')).toBe(false);
  });
});

describe('parseScripts (sanitising on)', () => {
  const strict = (h: string) => parseScripts(h, true);
  it('allows https src and plain inline scripts', () => {
    expect(strict('<script src="https://cdn.example.com/a.js" async></script>').scripts).toHaveLength(1);
    expect(strict('<script>window.x=1</script>').scripts[0].inline).toBe('window.x=1');
  });
  it.each([
    ['http src', '<script src="http://cdn.example.com/a.js"></script>'],
    ['ip host', '<script src="https://127.0.0.1/a.js"></script>'],
    ['localhost', '<script src="https://localhost/a.js"></script>'],
    ['credentials in url', '<script src="https://u:p@cdn.example.com/a.js"></script>'],
    ['event attribute', '<script onload="x()" src="https://a.example.com/a.js"></script>'],
    ['iframe', '<iframe src="https://a.example.com"></iframe>'],
    ['img onerror', '<img src=x onerror=alert(1)>'],
    ['module/json type', '<script type="application/json">{}</script>'],
  ])('rejects %s', (_n, html) => {
    expect(strict(html).error).toBeTruthy();
  });
  it('rejects oversized snippets', () => {
    expect(strict(`<script>${'a'.repeat(21_000)}</script>`).error).toMatch(/20 KB/);
  });
  it('relaxed mode ignores non-script markup but still parses scripts', () => {
    const r = parseScripts('<img src=x><script src="http://a.example.com/a.js"></script>', false);
    expect(r.error).toBeUndefined();
    expect(r.scripts).toHaveLength(1);
  });
});
