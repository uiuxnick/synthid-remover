'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    if (!window.confirm('Cancel at the end of the current billing period? You keep your credits and Pro access until then.')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not cancel');
      toast.success('Subscription will end at the close of this period');
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={cancel} disabled={busy} className="text-[14px] underline disabled:opacity-50">
      {busy ? 'Cancelling…' : 'Cancel subscription'}
    </button>
  );
}
