'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: any) => void) => void };
  }
}

function loadScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export type CheckoutRequest =
  | { type: 'topup'; packs: number }
  | { type: 'subscription'; interval: 'monthly' | 'annual' };

interface Props {
  request: CheckoutRequest;
  label: string;
  className?: string;
  /** Where to send signed-out users back to after login. */
  returnTo?: string;
}

export function CheckoutButton({ request, label, className, returnTo = '/dashboard/billing' }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const verify = async (payload: Record<string, string>) => {
    const res = await fetch('/api/billing/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Verification failed');
    return json as { ok: boolean; pending?: boolean };
  };

  const start = async () => {
    setBusy(true);
    try {
      const [ready, res] = await Promise.all([
        loadScript(),
        fetch('/api/billing/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }),
      ]);
      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not start checkout');
      if (!ready || !window.Razorpay) throw new Error('Could not load the payment window. Check your connection.');

      const common = {
        key: data.keyId,
        name: 'Synthid Remover',
        theme: { color: '#000000' },
        modal: { ondismiss: () => setBusy(false) },
      };
      const opts =
        data.kind === 'order'
          ? {
              ...common,
              order_id: data.orderId,
              amount: data.amount,
              currency: data.currency,
              description: `${data.credits} credits`,
              handler: async (r: any) => {
                try {
                  await verify({
                    razorpay_order_id: r.razorpay_order_id,
                    razorpay_payment_id: r.razorpay_payment_id,
                    razorpay_signature: r.razorpay_signature,
                  });
                  toast.success('Payment received', { description: `${data.credits} credits added.` });
                  router.push('/dashboard/billing');
                  router.refresh();
                } catch (e: any) {
                  toast.error('Payment could not be confirmed', {
                    description: 'If you were charged, credits will appear shortly. Contact support if not.',
                  });
                } finally {
                  setBusy(false);
                }
              },
            }
          : {
              ...common,
              subscription_id: data.subscriptionId,
              description: 'Pro Creator subscription',
              handler: async (r: any) => {
                try {
                  await verify({
                    razorpay_subscription_id: r.razorpay_subscription_id,
                    razorpay_payment_id: r.razorpay_payment_id,
                    razorpay_signature: r.razorpay_signature,
                  });
                  toast.success('Subscription started', { description: 'Credits arrive within a minute.' });
                  router.push('/dashboard/billing');
                  router.refresh();
                } catch {
                  toast.error('Could not confirm subscription', { description: 'It will activate automatically if payment succeeded.' });
                } finally {
                  setBusy(false);
                }
              },
            };

      const rz = new window.Razorpay(opts);
      rz.on('payment.failed', (r: any) => {
        toast.error('Payment failed', { description: r?.error?.description || 'Try another method.' });
        setBusy(false);
      });
      rz.open();
    } catch (e: any) {
      toast.error(e.message || 'Checkout failed');
      setBusy(false);
    }
  };

  return (
    <button onClick={start} disabled={busy} className={className}>
      {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-label="Loading" /> : label}
    </button>
  );
}
