import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders, createSession } from '@/lib/auth/session';
import { verifyOtp } from '@/lib/auth/otp';
import { otpVerifySchema } from '@/lib/validation/auth';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { NotificationType, OtpPurpose, UserStatus } from '@/generated/prisma';

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = otpVerifySchema.parse(body);

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`otp-verify:${ip}`, RATE_LIMITS.OTP_VERIFY);
  if (!limit.allowed) {
    return apiError('Too many attempts. Please request a new code.', 429, {
      code: 'RATE_LIMITED',
    });
  }

  const result = await verifyOtp(
    input.identifier.trim().toLowerCase(),
    input.purpose as OtpPurpose,
    input.code,
  );

  if (!result.ok) {
    return apiError(result.reason, 400, { code: 'OTP_INVALID' });
  }

  if (!result.userId) {
    return apiError('That code is not valid. Request a new one.', 400, {
      code: 'OTP_INVALID',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { id: true, status: true, emailVerifiedAt: true },
  });

  if (!user) {
    return apiError('That code is not valid. Request a new one.', 400, {
      code: 'OTP_INVALID',
    });
  }

  // A successful signup OTP is what activates the account.
  if (
    input.purpose === 'SIGNUP' ||
    user.status === UserStatus.PENDING_VERIFICATION
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });
  } else if (user.status !== UserStatus.ACTIVE) {
    return apiError(
      'This account is not active. Please contact our support team.',
      403,
      { code: 'ACCOUNT_INACTIVE' },
    );
  }

  await createSession(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.OTP_VERIFIED,
    entityType: 'User',
    entityId: user.id,
    metadata: { purpose: input.purpose },
  });

  if (input.purpose === 'SIGNUP') {
    await notifyUser({
      userId: user.id,
      type: NotificationType.SYSTEM,
      title: 'Welcome to Wild Peak Souls',
      message: 'Your account is verified and ready to use.',
      link: '/events',
    });
  }

  return apiSuccess({ verified: true });
});
