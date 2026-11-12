import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/credits', () => ({ getAppConfig: vi.fn() }));
vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn(),
  escapeHtml: (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`),
}));
import { fill } from '@/lib/emailTemplates';

describe('email template fill', () => {
  it('HTML-escapes variables in the body', () => {
    const r = fill({ subject: 'Hi', html: '<p>{{name}}</p>' }, { name: '<img src=x onerror=alert(1)>' });
    expect(r.html).not.toContain('<img');
    expect(r.html).toContain('&#60;img');
  });
  it('strips newlines from the subject (header injection)', () => {
    const r = fill({ subject: 'Hello {{name}}', html: '' }, { name: 'a\r\nBcc: evil@x.com' });
    expect(r.subject).not.toMatch(/[\r\n]/);
  });
  it('unknown variables render empty', () => {
    expect(fill({ subject: 's', html: '{{missing}}x' }, {}).html).toBe('x');
  });
});
