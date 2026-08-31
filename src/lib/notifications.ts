import 'server-only';

import { prisma } from '@/lib/prisma';
import { NotificationType, RoleName } from '@/generated/prisma';
import type { PermissionKey } from '@/lib/rbac/permissions';

export interface NotifyInput {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
  targetType?: string;
  targetId?: string;
}

export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type ?? NotificationType.SYSTEM,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
      },
    });
  } catch (error) {
    console.error('[notifications] failed to notify user', input.userId, error);
  }
}

/**
 * Fans a notification out to every staff member holding a permission.
 * Used so that, for example, a new support token reaches whoever can act on it
 * rather than a hardcoded inbox.
 */
export async function notifyStaffWithPermission(
  permission: PermissionKey,
  input: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  try {
    const staff = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roles: {
          some: {
            role: {
              OR: [
                { name: RoleName.SUPER_ADMIN },
                { permissions: { some: { permission: { key: permission } } } },
              ],
            },
          },
        },
      },
      select: { id: true },
      take: 200,
    });

    if (staff.length === 0) return;

    await prisma.notification.createMany({
      data: staff.map((s) => ({
        userId: s.id,
        type: input.type ?? NotificationType.ADMIN,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
      })),
    });
  } catch (error) {
    console.error('[notifications] staff fan-out failed', permission, error);
  }
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification
    .count({ where: { userId, readAt: null } })
    .catch(() => 0);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
