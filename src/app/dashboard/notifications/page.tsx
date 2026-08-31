import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader } from '@/components/admin/admin-ui';
import { NotificationList } from '@/components/account/notification-list';
import { requireStaffPage } from '@/lib/rbac/guard';
import { listMyNotifications } from '@/lib/data/account';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

export default async function AdminNotificationsPage() {
  const staff = await requireStaffPage();
  const notifications = await listMyNotifications(staff.id);
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <AdminPageHeader
        title="Notifications"
        description="Operational alerts routed to you based on the permissions your role holds."
      />

      <AdminCard
        title={unread > 0 ? `${unread} unread` : 'All caught up'}
      >
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="New bookings, payments to verify and support tokens will alert you here."
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
      </AdminCard>
    </>
  );
}
