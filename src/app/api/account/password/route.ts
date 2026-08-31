import type { NextRequest } from 'next/server';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/rbac/guard';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { changePasswordSchema } from '@/lib/validation/auth';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { NotificationType } from '@/generated/prisma';

/**
 * Changing a password requires re-authentication with the current one, so a
 * hijacked session cannot lock the real owner out.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = changePasswordSchema.parse(body);

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  const currentValid = await verifyPassword(
    input.currentPassword,
    record?.passwordHash,
  );

  if (!currentValid) {
    throw new BusinessError(
      'Your current password is not correct.',
      'INVALID_PASSWORD',
      401,
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.password) },
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    entityType: 'User',
    entityId: user.id,
    metadata: { method: 'self_service' },
  });

  await notifyUser({
    userId: user.id,
    type: NotificationType.SECURITY,
    title: 'Your password was changed',
    message: 'If this was not you, contact support immediately.',
    link: '/account/profile',
  });

  return apiSuccess({ changed: true });
});
