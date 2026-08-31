import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { hashToken } from '@/lib/auth/tokens';
import { revokeAllSessions } from '@/lib/auth/session';
import { resetPasswordSchema } from '@/lib/validation/auth';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { NotificationType } from '@/generated/prisma';

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = resetPasswordSchema.parse(body);

  // Tokens are stored hashed, so the lookup is by hash — a database read
  // cannot reveal a usable reset link.
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
    select: { id: true, userId: true, expiresAt: true, consumedAt: true },
  });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    return apiError(
      'This reset link is no longer valid. Please request a new one.',
      400,
      { code: 'TOKEN_INVALID' },
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(input.password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  // Any session opened with the old password is no longer trustworthy.
  await revokeAllSessions(record.userId);

  await recordAudit({
    actorId: record.userId,
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    entityType: 'User',
    entityId: record.userId,
  });

  await notifyUser({
    userId: record.userId,
    type: NotificationType.SECURITY,
    title: 'Your password was changed',
    message:
      'If this was not you, contact our support team immediately. All other sessions have been signed out.',
    link: '/account/security',
  });

  return apiSuccess({ reset: true });
});
