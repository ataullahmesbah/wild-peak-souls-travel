import type { Metadata } from 'next';
import { Bell } from 'lucide-react';

import { EmptyState } from '@/components/ui/states';
import { Panel } from '@/components/account/panels';
import { NotificationList } from '@/components/account/notification-list';
import { requireUserPage } from '@/lib/rbac/guard';
import { listMyNotifications } from '@/lib/data/account';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const user = await requireUserPage();
  const notifications = await listMyNotifications(user.id);
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <Panel
      title="Notifications"
      description={
        unread > 0
          ? `${unread} unread notification${unread === 1 ? '' : 's'}`
          : 'You are all caught up.'
      }
    >
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing here yet"
          description="Booking confirmations, payment updates and support replies will show up here."
        />
      ) : (
        <NotificationList
          notifications={notifications.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
            readAt: n.readAt?.toISOString() ?? null,
          }))}
        />
      )}
    </Panel>
  );
}
