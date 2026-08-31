import 'server-only';

import { prisma } from '@/lib/prisma';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Database-backed fixed-window rate limiter. Chosen over an in-memory map so
 * that limits hold across serverless instances. Swap the backing store for
 * Redis if request volume outgrows this.
 */
export async function rateLimit(
  identifier: string,
  options: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = options;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowEnd = new Date(Math.ceil(now / windowMs) * windowMs);

  try {
    const counter = await prisma.rateLimitCounter.upsert({
      where: { bucket_windowEnd: { bucket: identifier, windowEnd } },
      create: { bucket: identifier, windowEnd, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    const allowed = counter.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - counter.count),
      retryAfterSeconds: allowed
        ? 0
        : Math.max(1, Math.ceil((windowEnd.getTime() - now) / 1000)),
    };
  } catch {
    // Fail open rather than locking users out of the whole site if the
    // counter table is unavailable — the action itself is still authorized
    // and validated downstream.
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

export const RATE_LIMITS = {
  LOGIN: { limit: 8, windowSeconds: 300 },
  SIGNUP: { limit: 5, windowSeconds: 900 },
  OTP_REQUEST: { limit: 5, windowSeconds: 900 },
  OTP_VERIFY: { limit: 10, windowSeconds: 900 },
  PASSWORD_RESET: { limit: 5, windowSeconds: 900 },
  PUBLIC_FORM: { limit: 10, windowSeconds: 600 },
  SUPPORT_TOKEN: { limit: 8, windowSeconds: 3600 },
  MESSAGE_SEND: { limit: 40, windowSeconds: 600 },
  SEARCH: { limit: 90, windowSeconds: 60 },
  BOOKING_CREATE: { limit: 12, windowSeconds: 600 },
} as const;

/** Periodically callable cleanup for expired counter rows. */
export async function pruneRateLimitCounters(): Promise<number> {
  const result = await prisma.rateLimitCounter.deleteMany({
    where: { windowEnd: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  return result.count;
}
