import { headers } from 'next/headers';
import { z } from 'zod';

import type { NextRequest } from 'next/server';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({ adId: z.string().min(1).max(40) });

/**
 * Counts one impression.
 *
 * Public and unauthenticated by necessity — most viewers are not signed in —
 * so it is rate limited per address and does nothing but increment a counter on
 * a row that already exists. A request naming an unknown advert is a silent
 * no-op rather than a 404, because a 404 would let anyone enumerate which ad
 * ids are real.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`ad-impression:${ip}`, {
    limit: 120,
    windowSeconds: 60,
  });
  if (!limit.allowed) return apiSuccess({ counted: false });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiSuccess({ counted: false });

  await prisma.advertisement
    .update({
      where: { id: parsed.data.adId },
      data: { impressions: { increment: 1 } },
    })
    .catch(() => null);

  return apiSuccess({ counted: true });
});
