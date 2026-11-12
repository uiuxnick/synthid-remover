'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

type Mode = 'login' | 'register';

/** Only allow same-site relative redirects (blocks open-redirect via ?callbackUrl=). */
function safeCallback(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
}

const input =
  'w-full rounded-md border border-h-line bg-h-bg px-3 py-2 text-sm outline-none focus:border-black   ';
const btn = 'w-full rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-60';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallback(params.get('callbackUrl'));
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: (params.get('email') ?? '').slice(0, 254), phone: '', password: '' }); // email may be prefilled from the homepage
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = data.issues ? Object.values(data.issues as Record<string, string[]>).flat()[0] : undefined;
          throw new Error(detail || data.error || 'Could not create account.');
        }
      }
      const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (result?.error) throw new Error('Invalid email or password.');
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function magicLink() {
    if (!form.email) return toast.error('Enter your email first.');
    setBusy(true);
    try {
      const result = await signIn('nodemailer', { email: form.email, redirect: false, callbackUrl });
      if (result?.error) throw new Error('Could not send the sign-in link.');
      toast.success('Check your inbox', { description: 'The link expires in 15 minutes.' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === 'register';
  const field = 'mt-1.5 h-12 w-full rounded-[10px] border border-h-line bg-h-frag px-3.5 text-[16px] text-h-ink placeholder:text-h-muted';
  const label = 'block text-[14px] font-medium';

  return (
    <div className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-2">
      {/* Statement field: says what you get, in the page's own voice. Hidden on phones, where the form leads. */}
      <aside className="hidden flex-col justify-end bg-h-accent p-10 text-h-accent-ink lg:flex xl:p-14">
        <p className="text-[clamp(44px,5vw,84px)] font-semibold leading-[0.95] tracking-[-0.035em]">
          {isRegister ? (
            <>
              Clean files.
              <br />
              Proof included.
            </>
          ) : (
            <>
              Back to
              <br />
              your images.
            </>
          )}
        </p>
        <p className="mt-5 max-w-[40ch] text-[17px] leading-relaxed">
          {isRegister
            ? 'Every run lists the metadata it found, what it removed, and how close the result is to your original.'
            : 'Your credits, history and API keys are where you left them.'}
        </p>
      </aside>

      <div className="flex items-center justify-center px-4 py-14 sm:px-8">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">{isRegister ? 'Create your account' : 'Log in'}</h1>
          <p className="mt-2 text-[16px] text-h-muted">
            {isRegister ? 'Free credits are added as soon as you sign up. No card needed.' : 'Use your email and password, Google, or a one-time link.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate={false}>
            {isRegister && (
              <div>
                <label htmlFor="auth-name" className={label}>Name</label>
                <input id="auth-name" className={field} autoComplete="name" required value={form.name} onChange={set('name')} />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className={label}>Email</label>
              <input id="auth-email" className={field} type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={set('email')} />
            </div>
            {isRegister && (
              <div>
                <label htmlFor="auth-phone" className={label}>Mobile number</label>
                <input
                  id="auth-phone"
                  className={field}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  aria-describedby="auth-phone-hint"
                  required
                  value={form.phone}
                  onChange={set('phone')}
                />
                <p id="auth-phone-hint" className="mt-1.5 text-[14px] text-h-muted">Include your country code.</p>
              </div>
            )}
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="auth-password" className={label}>Password</label>
                <button type="button" onClick={() => setShowPw((v) => !v)} className="text-[14px] text-h-muted underline underline-offset-4" aria-pressed={showPw}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="auth-password"
                className={field}
                type={showPw ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                aria-describedby={isRegister ? 'auth-password-hint' : undefined}
                required
                value={form.password}
                onChange={set('password')}
              />
              {isRegister && (
                <p id="auth-password-hint" className="mt-1.5 text-[14px] text-h-muted">At least 10 characters.</p>
              )}
            </div>
            <button disabled={busy} className="h-12 w-full rounded-[10px] bg-h-accent text-[16px] font-semibold text-h-accent-ink transition-transform active:scale-[0.99] disabled:opacity-60">
              {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => signIn('google', { callbackUrl })} className="h-12 rounded-[10px] bg-h-surface text-[15px] font-medium transition-colors hover:bg-h-surface2 disabled:opacity-60">
              Continue with Google
            </button>
            <button type="button" disabled={busy} onClick={magicLink} className="h-12 rounded-[10px] bg-h-surface text-[15px] font-medium transition-colors hover:bg-h-surface2 disabled:opacity-60">
              Email me a link
            </button>
          </div>

          <p className="mt-8 text-[15px] text-h-muted">
            {isRegister ? 'Already have an account? ' : 'New here? '}
            <Link href={isRegister ? '/login' : '/register'} className="font-medium text-h-ink underline underline-offset-4">
              {isRegister ? 'Log in' : 'Create an account'}
            </Link>
          </p>
          {isRegister && (
            <p className="mt-3 text-[14px] text-h-muted">
              Signing up with Google or an email link? We will ask for your mobile number right after. By continuing you agree to the <Link href="/terms" className="underline underline-offset-4">Terms</Link> and{' '}
              <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
