import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifyOrderSignature, verifySubscriptionSignature, verifyWebhookSignature } from '@/lib/razorpay';

const h = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');

describe('razorpay signatures', () => {
  it('accepts a valid order signature and rejects tampering', () => {
    expect(verifyOrderSignature('order_1', 'pay_1', h('test_secret', 'order_1|pay_1'))).toBe(true);
    expect(verifyOrderSignature('order_1', 'pay_2', h('test_secret', 'order_1|pay_1'))).toBe(false);
    expect(verifyOrderSignature('order_1', 'pay_1', 'deadbeef')).toBe(false);
    expect(verifyOrderSignature('order_1', 'pay_1', '')).toBe(false);
  });
  it('subscription signature order is payment|subscription', () => {
    expect(verifySubscriptionSignature('pay_1', 'sub_1', h('test_secret', 'pay_1|sub_1'))).toBe(true);
    expect(verifySubscriptionSignature('pay_1', 'sub_1', h('test_secret', 'sub_1|pay_1'))).toBe(false);
  });
  it('webhook signature covers the exact raw body', () => {
    const body = '{"event":"payment.captured"}';
    expect(verifyWebhookSignature(body, h('test_webhook_secret', body))).toBe(true);
    expect(verifyWebhookSignature(body + ' ', h('test_webhook_secret', body))).toBe(false);
    expect(verifyWebhookSignature(body, h('wrong', body))).toBe(false);
  });
});
