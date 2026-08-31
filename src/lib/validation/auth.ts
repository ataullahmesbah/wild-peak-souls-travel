import { z } from 'zod';

import {
  emailSchema,
  nameSchema,
  otpCodeSchema,
  passwordSchema,
  phoneSchema,
} from '@/lib/validation/common';

export const signupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, 'You must accept the terms to continue'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, 'Enter your email or phone number')
    .max(254),
  password: z.string().min(1, 'Password is required').max(128),
  next: z.string().max(300).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const otpRequestSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  purpose: z.enum(['LOGIN', 'SIGNUP', 'PASSWORD_RESET', 'PHONE_VERIFY', 'EMAIL_VERIFY']),
});

export const otpVerifySchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  code: otpCodeSchema,
  purpose: z.enum(['LOGIN', 'SIGNUP', 'PASSWORD_RESET', 'PHONE_VERIFY', 'EMAIL_VERIFY']),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10).max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const profileUpdateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional(),
  image: z.string().url().max(500).optional().or(z.literal('')),
});
