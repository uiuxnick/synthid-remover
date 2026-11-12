import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254);

// bcrypt truncates at 72 bytes, so cap there to avoid silent truncation.
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long (max 72 bytes)');

/**
 * Mobile number, stored in E.164 form (+ and 8 to 15 digits). Spaces, dashes, dots and brackets are
 * accepted on input and removed. A number without a country code is rejected rather than guessed.
 */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s().-]/g, ''))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Enter your mobile number with country code, for example +919876543210'));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80),
  phone: phoneSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
