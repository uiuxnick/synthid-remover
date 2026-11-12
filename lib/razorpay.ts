import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Minimal Razorpay REST client (Basic auth over fetch) plus signature verification.
 * Keeps us dependency-free; only the endpoints we use are implemented.
 */
const API = 'https://api.razorpay.com/v1';

export class RazorpayConfigError extends Error {}

function keys() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new RazorpayConfigError('Razorpay is not configured');
  return { id, secret };
}

async function rzp<T>(path: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const { id, secret } = keys();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(json?.error?.description || `Razorpay ${path} failed (${res.status})`);
  }
  return json as T;
}

export interface RzpOrder { id: string; amount: number; currency: string }
export interface RzpSubscription { id: string; status: string; plan_id: string }

export const createOrder = (args: { amount: number; receipt: string; notes?: Record<string, string> }) =>
  rzp<RzpOrder>('/orders', { amount: args.amount, currency: 'INR', receipt: args.receipt, notes: args.notes });

export const createSubscription = (args: {
  planId: string;
  totalCount: number;
  notes?: Record<string, string>;
}) =>
  rzp<RzpSubscription>('/subscriptions', {
    plan_id: args.planId,
    total_count: args.totalCount,
    customer_notify: 1,
    notes: args.notes,
  });

export const cancelSubscription = (subscriptionId: string, atCycleEnd: boolean) =>
  rzp<RzpSubscription>(`/subscriptions/${subscriptionId}/cancel`, { cancel_at_cycle_end: atCycleEnd ? 1 : 0 });

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');

/** Checkout success for an Order: HMAC_SHA256(order_id|payment_id). */
export function verifyOrderSignature(orderId: string, paymentId: string, signature: string): boolean {
  return safeEqualHex(hmac(keys().secret, `${orderId}|${paymentId}`), signature);
}

/** Checkout success for a Subscription: HMAC_SHA256(payment_id|subscription_id). */
export function verifySubscriptionSignature(paymentId: string, subscriptionId: string, signature: string): boolean {
  return safeEqualHex(hmac(keys().secret, `${paymentId}|${subscriptionId}`), signature);
}

/** Webhook: HMAC_SHA256(raw body) with the dashboard webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new RazorpayConfigError('RAZORPAY_WEBHOOK_SECRET is not set');
  return safeEqualHex(hmac(secret, rawBody), signature);
}
