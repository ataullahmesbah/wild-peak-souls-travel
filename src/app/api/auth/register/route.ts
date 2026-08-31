import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { clientIpFromHeaders, createSession } from '@/lib/auth/session';
import { issueOtp } from '@/lib/auth/otp';
import { signupSchema } from '@/lib/validation/auth';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import {
  SETTING_KEYS,
  getPublicSettings,
  settingBool,
} from '@/lib/settings';
import { NotificationType, OtpPurpose, RoleName, UserStatus } from '@/generated/prisma';

export const POST = apiHandler(async (request: NextRequest) => {
  const settings = await getPublicSettings();
  if (!settingBool(settings, SETTING_KEYS.AUTH_SIGNUP_ENABLED, true)) {
    return apiError('New registrations are currently paused.', 403, {
      code: 'SIGNUP_DISABLED',
    });
  }

  const body = await request.json().catch(() => ({}));
  const input = signupSchema.parse(body);

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`signup:${ip}`, RATE_LIMITS.SIGNUP);
  if (!limit.allowed) {
    return apiError('Too many sign-up attempts. Please try again later.', 429, {
      code: 'RATE_LIMITED',
    });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { id: true, email: true },
  });

  if (existing) {
    // Same message regardless of which field collided — enough to be useful,
    // not enough to confirm which one is registered.
    return apiError(
      'An account already exists with that email or phone number. Try signing in instead.',
      409,
      { code: 'ACCOUNT_EXISTS' },
    );
  }

  const customerRole = await prisma.role.findUnique({
    where: { name: RoleName.CUSTOMER },
    select: { id: true },
  });

  if (!customerRole) {
    console.error('[register] CUSTOMER role missing — run `npm run db:seed`');
    return apiError(
      'Account creation is temporarily unavailable. Please try again shortly.',
      503,
    );
  }

  const otpEnabled = settingBool(settings, SETTING_KEYS.AUTH_OTP_ENABLED);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      status: otpEnabled ? UserStatus.PENDING_VERIFICATION : UserStatus.ACTIVE,
      roles: { create: { roleId: customerRole.id } },
    },
    select: { id: true, email: true, name: true },
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.SIGNUP,
    entityType: 'User',
    entityId: user.id,
  });

  if (otpEnabled) {
    await issueOtp(user.email, OtpPurpose.SIGNUP, user.id);
    return apiSuccess({ otpRequired: true, identifier: user.email }, 201);
  }

  await createSession(user.id);
  await notifyUser({
    userId: user.id,
    type: NotificationType.SYSTEM,
    title: 'Welcome to Wild Peak Souls',
    message:
      'Your account is ready. Browse upcoming departures or tell us about the trip you want.',
    link: '/events',
  });

  return apiSuccess({ otpRequired: false }, 201);
});
