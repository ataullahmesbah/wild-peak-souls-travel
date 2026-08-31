import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .max(254)
  .toLowerCase();

/** Accepts local BD formats and general international numbers. */
export const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(20, 'Phone number is too long')
  .regex(/^[+0-9][0-9\s-]{5,19}$/, 'Enter a valid phone number');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(120, 'Name is too long');

export const slugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, 'Enter the 6-digit code');

export const cuidSchema = z.string().trim().min(1).max(64);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const requiredText = (min = 1, max = 5000) =>
  z.string().trim().min(min).max(max);

/** ISO date string → Date, rejecting invalid calendar dates. */
export const dateStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date')
  .transform((v) => new Date(v));

export const futureDateSchema = dateStringSchema.refine(
  (d) => d.getTime() > Date.now() - 24 * 60 * 60 * 1000,
  'Choose a date in the future',
);

/**
 * Builds the update (PATCH) schema for a create schema.
 *
 * `.partial()` alone is not enough, and the difference is a data-loss bug.
 * Zod's `.partial()` makes a key optional but leaves any `.default()` in
 * place, so a PATCH that omits the key still parses to the default and the
 * field is written. In practice that meant sending
 *
 *     PATCH /api/dashboard/tours/<id>  { "title": "New title" }
 *
 * silently reset `status` to DRAFT — unpublishing a live tour — along with
 * `difficulty`, `durationDays`, `maxGroupSize` and every other defaulted
 * field. A PATCH must touch only what it names.
 *
 * Array defaults are deliberately left alone. The catalogue's child rows
 * (a tour's itinerary, a stay's room types) are replaced wholesale, and the
 * editor clearing every row sends no rows at all — the `[]` default is what
 * turns that into a delete. Stripping it would make "remove all days"
 * silently do nothing.
 */
export function partialForUpdate<Shape extends z.ZodRawShape>(
  schema: z.ZodObject<Shape>,
): ReturnType<z.ZodObject<Shape>['partial']> {
  const next: Record<string, z.ZodTypeAny> = {};

  for (const [key, field] of Object.entries(schema.shape as z.ZodRawShape)) {
    const def = (field as unknown as { def?: { type?: string; innerType?: unknown } }).def;

    if (def?.type === 'default' && def.innerType) {
      const inner = def.innerType as z.ZodTypeAny;
      const innerType = (inner as unknown as { def?: { type?: string } }).def?.type;
      // Keep the default for arrays; strip it for everything else.
      next[key] = innerType === 'array' ? (field as z.ZodTypeAny) : inner.optional();
      continue;
    }

    next[key] = (field as z.ZodTypeAny).optional();
  }

  // The static type is exactly what `.partial()` would have given — every
  // field optional — so callers type-check unchanged. Only the runtime
  // behaviour differs, and only in the direction of doing less.
  return z.object(next) as unknown as ReturnType<z.ZodObject<Shape>['partial']>;
}
