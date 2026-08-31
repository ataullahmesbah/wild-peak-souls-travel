import type { NextRequest } from 'next/server';

import { z } from 'zod';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { hasPermission, requireUser } from '@/lib/rbac/guard';
import {
  PERMISSIONS,
  canActOnUser,
  canAssignRole,
} from '@/lib/rbac/permissions';
import { revokeAllSessions } from '@/lib/auth/session';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { NotificationType, RoleName, UserStatus } from '@/generated/prisma';

const schema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(RoleName).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

/**
 * Updates a user's role and/or status.
 *
 * Authorization here is two-dimensional, and both dimensions are required:
 *
 *  1. **Permission** — may this actor perform this kind of action at all?
 *  2. **Rank** — may they perform it on *this particular person*?
 *
 * Checking only the first is what allowed an ADMIN to demote or suspend a
 * SUPER_ADMIN: the permission was satisfied and the target's role was never
 * consulted. `canActOnUser` closes that, and `canAssignRole` stops an actor
 * minting a peer or a superior.
 *
 * A rank failure returns 404 rather than 403 — telling an attacker "that
 * account exists and outranks you" is free reconnaissance.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = schema.parse(body);

  const canManageRoles = hasPermission(staff, PERMISSIONS.USERS_ROLE_UPDATE);
  const canSuspend = hasPermission(staff, PERMISSIONS.USERS_SUSPEND);

  if (!canManageRoles && !canSuspend) {
    throw new BusinessError('You do not have access to this action.', 'FORBIDDEN', 403);
  }

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      name: true,
      status: true,
      roles: { select: { role: { select: { id: true, name: true } } } },
    },
  });

  if (!target) {
    throw new BusinessError('User not found.', 'NOT_FOUND', 404);
  }

  const targetRoles = target.roles.map((r) => r.role.name);

  // The rank gate. Deliberately before any branch, so it covers role changes,
  // status changes and anything added later.
  if (target.id !== staff.id && !canActOnUser(staff.roles, targetRoles)) {
    throw new BusinessError('User not found.', 'NOT_FOUND', 404);
  }

  const changes: Record<string, unknown> = {};

  if (input.role) {
    if (!canManageRoles) {
      throw new BusinessError(
        'You do not have permission to change roles.',
        'FORBIDDEN',
        403,
      );
    }
    if (!canAssignRole(staff.roles, input.role)) {
      throw new BusinessError(
        'You cannot assign a role at or above your own level.',
        'FORBIDDEN',
        403,
      );
    }

    // Changing your own role is always an escalation risk, even downward:
    // it would let the last SUPER_ADMIN strand the platform.
    if (target.id === staff.id) {
      throw new BusinessError(
        'You cannot change your own role.',
        'SELF_ROLE_CHANGE',
      );
    }

    const role = await prisma.role.findUnique({
      where: { name: input.role },
      select: { id: true },
    });
    if (!role) {
      throw new BusinessError('That role does not exist.', 'INVALID_ROLE');
    }

    const previousRoles = targetRoles;

    // Replace the assignment rather than accumulating roles, so the effective
    // permission set is always what the operator just chose.
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: target.id } }),
      prisma.userRole.create({ data: { userId: target.id, roleId: role.id } }),
    ]);

    changes.role = { from: previousRoles, to: input.role };

    await recordAudit({
      actorId: staff.id,
      action: AUDIT_ACTIONS.USER_ROLE_UPDATED,
      entityType: 'User',
      entityId: target.id,
      metadata: { from: previousRoles, to: input.role, targetName: target.name },
    });
  }

  if (input.status && input.status !== target.status) {
    if (!canSuspend) {
      throw new BusinessError(
        'You do not have permission to change account status.',
        'FORBIDDEN',
        403,
      );
    }
    if (target.id === staff.id && input.status !== UserStatus.ACTIVE) {
      throw new BusinessError(
        'You cannot deactivate your own account.',
        'SELF_LOCKOUT',
      );
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { status: input.status },
    });

    // A suspended user must lose access immediately, not at token expiry.
    if (input.status !== UserStatus.ACTIVE) {
      await revokeAllSessions(target.id);
    }

    changes.status = { from: target.status, to: input.status };

    await recordAudit({
      actorId: staff.id,
      action: AUDIT_ACTIONS.USER_STATUS_UPDATED,
      entityType: 'User',
      entityId: target.id,
      metadata: { from: target.status, to: input.status, targetName: target.name },
    });

    if (input.status === UserStatus.ACTIVE) {
      await notifyUser({
        userId: target.id,
        type: NotificationType.SECURITY,
        title: 'Your account has been reactivated',
        message: 'You can sign in again. Contact support if you have questions.',
      });
    }
  }

  return apiSuccess({ updated: true, changes });
});
