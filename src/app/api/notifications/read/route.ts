import type { NextRequest } from 'next/server';

import { apiHandler, apiSuccess } from '@/lib/api';
import { requireUser } from '@/lib/rbac/guard';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';

/**
 * Marks one notification, or all of them, as read.
 * Scoped to the caller's own notifications — the id alone is never enough.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = (await request.json().catch(() => ({}))) as {
    notificationId?: string;
    all?: boolean;
  };

  if (body.all) {
    const count = await markAllNotificationsRead(user.id);
    return apiSuccess({ marked: count });
  }

  if (typeof body.notificationId === 'string' && body.notificationId.length > 0) {
    await markNotificationRead(user.id, body.notificationId);
    return apiSuccess({ marked: 1 });
  }

  return apiSuccess({ marked: 0 });
});
