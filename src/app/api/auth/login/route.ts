import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { clientIpFromHeaders, createSession } from '@/lib/auth/session';
import { issueOtp } from '@/lib/auth/otp';
import { loginSchema } from '@/lib/validation/auth';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import {
  SETTING_KEYS,
  getPublicSettings,
  settingBool,
} from '@/lib/settings';
import { OtpPurpose, UserStatus } from '@/generated/prisma';

/**
 * Password login.
 *
 * Failure responses are deliberately identical whether the account does not
 * exist or the password is wrong, so this endpoint cannot be used to enumerate
 * registered emails and phone numbers.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = loginSchema.parse(body);

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';

  // Two buckets: one per IP (blocks a spray across many accounts) and one per
  // identifier (blocks a focused attack on one account from many IPs).
  const [byIp, byIdentifier] = await Promise.all([
    rateLimit(`login:ip:${ip}`, RATE_LIMITS.LOGIN),
    rateLimit(`login:id:${input.identifier.toLowerCase()}`, RATE_LIMITS.LOGIN),
  ]);

  if (!byIp.allowed || !byIdentifier.allowed) {
    return apiError(
      'Too many sign-in attempts. Please wait a few minutes and try again.',
      429,
      { code: 'RATE_LIMITED' },
    );
  }

  const identifier = input.identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: input.identifier.trim() }],
    },
    select: {
      id: true,
      email: true,
      phone: true,
      passwordHash: true,
      status: true,
    },
  });

  const passwordValid = await verifyPassword(input.password, user?.passwordHash);

  if (!user || !passwordValid) {
    await recordAudit({
      actorId: user?.id ?? null,
      actorLabel: identifier,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'User',
      entityId: user?.id,
      metadata: { reason: user ? 'bad_password' : 'unknown_identifier' },
    });
    return apiError('Those credentials do not match an account.', 401, {
      code: 'INVALID_CREDENTIALS',
    });
  }

  if (user.status !== UserStatus.ACTIVE) {
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'User',
      entityId: user.id,
      metadata: { reason: 'inactive_account', status: user.status },
    });
    return apiError(
      'This account is not active. Please contact our support team.',
      403,
      { code: 'ACCOUNT_INACTIVE' },
    );
  }

  const settings = await getPublicSettings();

  // When the SUPER_ADMIN has enabled OTP globally, a correct password is not
  // enough — no session is created until the code is verified.
  if (settingBool(settings, SETTING_KEYS.AUTH_OTP_ENABLED)) {
    await issueOtp(user.email, OtpPurpose.LOGIN, user.id);
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.OTP_ISSUED,
      entityType: 'User',
      entityId: user.id,
      metadata: { purpose: 'LOGIN' },
    });
    return apiSuccess({ otpRequired: true, identifier: user.email });
  }

  await createSession(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    entityType: 'User',
    entityId: user.id,
  });

  return apiSuccess({ otpRequired: false });
});
