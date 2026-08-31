import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/rbac/guard';

/**
 * The caller's own recent notifications, for the bell popup.
 *
 * Scoped to the session user with no id parameter at all, so there is nothing
 * to tamper with: one person can only ever read their own feed.
 */
export const GET = apiHandler(async () => {
  const user = await requireUser();

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return apiSuccess({ items, unread });
});
