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

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
