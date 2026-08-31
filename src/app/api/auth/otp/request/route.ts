import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders } from '@/lib/auth/session';
import { issueOtp } from '@/lib/auth/otp';
import { otpRequestSchema } from '@/lib/validation/auth';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { OtpPurpose } from '@/generated/prisma';

/**
 * Issues (or re-issues) an OTP. Always responds the same way whether or not
 * the identifier belongs to an account, so this cannot be used to discover
 * registered users, and always rate-limited so it cannot be used to spam an
 * inbox or phone.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = otpRequestSchema.parse(body);

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';

  const [byIp, byIdentifier] = await Promise.all([
    rateLimit(`otp-req:ip:${ip}`, RATE_LIMITS.OTP_REQUEST),
    rateLimit(
      `otp-req:id:${input.identifier.toLowerCase()}`,
      RATE_LIMITS.OTP_REQUEST,
    ),
  ]);

  if (!byIp.allowed || !byIdentifier.allowed) {
    return apiError(
      'Too many code requests. Please wait a few minutes before trying again.',
      429,
      { code: 'RATE_LIMITED' },
    );
  }

  const identifier = input.identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: input.identifier.trim() }] },
    select: { id: true, email: true },
  });

  if (user) {
    await issueOtp(user.email, input.purpose as OtpPurpose, user.id);
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.OTP_ISSUED,
      entityType: 'User',
      entityId: user.id,
      metadata: { purpose: input.purpose },
    });
  }

  return apiSuccess({ sent: true });
});
