import { describe, expect, it } from 'vitest';
import { phoneSchema, registerSchema } from '@/lib/validation';

describe('mobile number', () => {
  it('accepts E.164 and normalises spaces, dashes and brackets', () => {
    expect(phoneSchema.parse('+919876543210')).toBe('+919876543210');
    expect(phoneSchema.parse('+91 98765-43210')).toBe('+919876543210');
    expect(phoneSchema.parse('+1 (415) 555.0134')).toBe('+14155550134');
  });
  it.each(['9876543210', '+0123456789', '+91abc', '+91 12', '', '+' + '9'.repeat(16)])('rejects %s', (v) => {
    expect(phoneSchema.safeParse(v).success).toBe(false);
  });
});

describe('signup', () => {
  const base = { name: 'A', email: 'a@example.com', password: 'long-enough-pw' };
  it('requires a mobile number', () => {
    expect(registerSchema.safeParse(base).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, phone: '+919876543210' }).success).toBe(true);
  });
});
