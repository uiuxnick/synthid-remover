import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from '@/lib/crypto';

describe('secret encryption', () => {
  it('round-trips and uses a fresh IV each time', () => {
    const a = encryptSecret('smtp-pass');
    expect(decryptSecret(a)).toBe('smtp-pass');
    expect(encryptSecret('smtp-pass')).not.toBe(a);
    expect(a).not.toContain('smtp-pass');
  });
  it('detects tampering (GCM auth tag)', () => {
    const buf = Buffer.from(encryptSecret('x'), 'base64');
    buf[buf.length - 1] ^= 1;
    expect(() => decryptSecret(buf.toString('base64'))).toThrow();
  });
});
