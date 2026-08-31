import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders } from '@/lib/auth/session';
import { generateOpaqueToken, hashToken } from '@/lib/auth/tokens';
import { forgotPasswordSchema } from '@/lib/validation/auth';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { siteUrl } from '@/lib/env';

const RESET_TTL_MINUTES = 30;

/**
 * Always returns success, whether or not the email is registered — the reply
 * must not reveal which addresses have accounts.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = forgotPasswordSchema.parse(body);

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`pw-forgot:${ip}`, RATE_LIMITS.PASSWORD_RESET);
  if (!limit.allowed) {
    return apiError('Too many requests. Please try again later.', 429, {
      code: 'RATE_LIMITED',
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (user) {
    // Invalidate outstanding tokens so only the newest link works.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const rawToken = generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      },
    });

    // An email provider is plugged in here in a real deployment. The raw token
    // is deliberately never returned in the response.
    const link = `${siteUrl()}/reset-password?token=${rawToken}`;
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[password-reset] link for ${input.email}: ${link}`);
    } else {
      console.info(`[password-reset] issued token for user ${user.id}`);
    }
  }

  return apiSuccess({ sent: true });
});
