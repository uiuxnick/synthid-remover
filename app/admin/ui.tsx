import React from 'react';

export const input =
  'h-11 w-full rounded-[10px] border border-h-line bg-h-frag px-3.5 text-[16px] text-h-ink placeholder:text-h-muted';
export const btn =
  'rounded-[10px] bg-h-accent px-5 py-3 text-[15px] font-semibold text-h-accent-ink transition-transform active:scale-[0.99]';
export const btnGhost = 'rounded-[10px] bg-h-surface2 px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-h-frag';
export const card = 'rounded-[14px] bg-h-surface p-6';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[14px] font-medium">{label}</span>
      {children}
      {hint && <span className="block text-[14px] text-h-muted">{hint}</span>}
    </label>
  );
}

export function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`rounded-[14px] px-5 py-4 text-[16px] font-medium ${error ? 'bg-h-danger text-h-bg' : 'bg-h-accent text-h-accent-ink'}`}
    >
      {error ?? ok}
    </div>
  );
}

export const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
