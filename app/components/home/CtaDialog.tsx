'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const MODES = ['Metadata only', 'Balanced'] as const;

/** The product's own first screen, already open. The typed email is carried into sign-up. */
export function CtaDialog() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<(typeof MODES)[number]>('Balanced');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (email.trim()) q.set('email', email.trim().slice(0, 254));
    router.push(`/register${q.toString() ? `?${q}` : ''}`);
  };

  return (
    <form
      data-ui
      onSubmit={submit}
      className="w-full max-w-[440px] rounded-md border border-h-line bg-h-frag p-6 text-h-ink shadow-2xl"
    >
      <h3 className="text-[20px] font-semibold">Create your free account</h3>
      <label className="mt-5 block text-[14px] font-medium" htmlFor="cta-email">Email</label>
      <input
        id="cta-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="mt-1.5 w-full rounded-[10px] border border-h-line bg-transparent px-3 py-2.5 text-[15px]"
      />
      <fieldset className="mt-5">
        <legend className="text-[14px] font-medium">Default mode</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5" role="radiogroup">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-[10px] border px-3 py-2 text-[14px] ${mode === m ? 'border-h-ink bg-h-accent text-h-accent-ink' : 'border-h-line'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="mt-6 h-[52px] w-full rounded-[10px] bg-h-accent text-[15px] font-semibold text-h-accent-ink">
        Create account
      </button>
    </form>
  );
}
