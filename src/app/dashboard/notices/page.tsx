import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notices',
  robots: { index: false, follow: false },
};

export default async function AdminNoticesPage() {
  const staff = await requirePermissionPage(PERMISSIONS.NOTICES_MANAGE);

  const notices = await prisma.notice.findMany({
    orderBy: [{ active: 'desc' }, { priority: 'desc' }],
    take: 50,
  });

  const now = new Date();
  const isLive = (notice: (typeof notices)[number]) =>
    notice.active &&
    (!notice.startAt || notice.startAt <= now) &&
    (!notice.endAt || notice.endAt >= now);

  return (
    <>
      <AdminPageHeader
        title="Notices"
        description="Site-wide banners shown above the header. Visitors can dismiss a notice, and their choice is remembered in their browser."
        actions={
          <ButtonLink href="/dashboard/notices/new" size="sm">
            New notice
          </ButtonLink>
        }
      />

      <AdminCard title={`${notices.length} notice${notices.length === 1 ? '' : 's'}`}>
        {notices.length === 0 ? (
          <EmptyState
            title="No notices"
            description="Create a notice to announce a departure, a policy change or scheduled maintenance."
          />
        ) : (
          <DataTable
            headers={['Title', 'Message', 'Type', 'Window', 'Priority', 'Showing now', '']}
            minWidth="60rem"
          >
            {notices.map((notice) => (
              <tr key={notice.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4 font-medium">{notice.title}</td>
                <td className="py-3 pr-4 max-w-72 truncate text-muted-foreground">
                  {notice.message}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={notice.type} />
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {notice.startAt ? formatDate(notice.startAt) : 'Always'} →{' '}
                  {notice.endAt ? formatDate(notice.endAt) : 'No end'}
                </td>
                <td className="py-3 pr-4">{notice.priority}</td>
                <td className="py-3">
                  {isLive(notice) ? (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Not showing
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/notices/${notice.id}`}
                    deleteEndpoint={`/api/dashboard/notices/${notice.id}`}
                    label={notice.title}
                    canDelete={hasPermission(staff, PERMISSIONS.NOTICES_DELETE)}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminCard>
    </>
  );
}
