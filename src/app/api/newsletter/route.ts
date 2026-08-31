import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders } from '@/lib/auth/session';
import { newsletterSchema } from '@/lib/validation/leads';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = newsletterSchema.parse(body);

  if (input.website) return apiSuccess({ subscribed: true });

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`newsletter:${ip}`, RATE_LIMITS.PUBLIC_FORM);
  if (!limit.allowed) {
    return apiError('Too many requests. Please try again later.', 429, {
      code: 'RATE_LIMITED',
    });
  }

  // Re-subscribing an existing address quietly reactivates it rather than
  // erroring — the outcome the person wanted either way.
  await prisma.newsletterSubscriber.upsert({
    where: { email: input.email },
    create: { email: input.email },
    update: { active: true },
  });

  return apiSuccess({ subscribed: true }, 201);
});
