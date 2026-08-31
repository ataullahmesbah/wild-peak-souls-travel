import { z } from 'zod';

/**
 * Server-side environment contract. Parsed lazily so that `next build` can
 * render static shells without a database, while any request path that
 * actually needs a value fails loudly and early.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid server environment — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Safe for build-time/static contexts: never throws. */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Resolves the Cloudinary credentials from either form.
 *
 * Cloudinary's own dashboard leads with a single line —
 * `CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>` — and that
 * is what most people paste into their environment. Accepting only the three
 * separate variables meant a correctly configured account still reported
 * "Image hosting is not configured", with nothing to indicate why.
 *
 * The three explicit variables win when both are present, so an existing
 * deployment keeps behaving exactly as before.
 */
export function cloudinaryCredentials(): CloudinaryCredentials | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };

  const url = process.env.CLOUDINARY_URL?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'cloudinary:') return null;
    const key = decodeURIComponent(parsed.username);
    const secret = decodeURIComponent(parsed.password);
    const host = parsed.hostname;
    if (!key || !secret || !host) return null;
    return { cloudName: host, apiKey: key, apiSecret: secret };
  } catch {
    return null;
  }
}

export function isCloudinaryConfigured(): boolean {
  return cloudinaryCredentials() !== null;
}

/**
 * Which piece is missing, for an error message a person can act on.
 * Never includes a value — only names.
 */
export function cloudinaryConfigProblem(): string | null {
  if (isCloudinaryConfigured()) return null;

  if (process.env.CLOUDINARY_URL?.trim()) {
    return 'CLOUDINARY_URL is set but could not be read. It must look like cloudinary://<api_key>:<api_secret>@<cloud_name>.';
  }

  const missing = (
    [
      ['CLOUDINARY_CLOUD_NAME', process.env.CLOUDINARY_CLOUD_NAME],
      ['CLOUDINARY_API_KEY', process.env.CLOUDINARY_API_KEY],
      ['CLOUDINARY_API_SECRET', process.env.CLOUDINARY_API_SECRET],
    ] as const
  )
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missing.length === 3) {
    return 'No Cloudinary credentials found. Set CLOUDINARY_URL, or all three of CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.';
  }
  return `Cloudinary is partly configured. Still missing: ${missing.join(', ')}.`;
}
