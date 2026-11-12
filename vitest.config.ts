import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    env: {
      AUTH_SECRET: 'test-secret',
      RAZORPAY_KEY_ID: 'rzp_test_key',
      RAZORPAY_KEY_SECRET: 'test_secret',
      RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
      APP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    },
  },
});
