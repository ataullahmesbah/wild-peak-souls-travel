import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminCatalogue } from '@/lib/data/admin';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Activities',
  robots: { index: false, follow: false },
};

export default async function AdminActivitiesPage() {
  const staff = await requirePermissionPage(PERMISSIONS.ACTIVITIES_READ);
  const { activities } = await listAdminCatalogue();

  return (
    <>
      <AdminPageHeader
        title="Activities"
        description="Trending activities appear on the homepage. Only activities marked bookable can be sold on their own."
        actions={
          <ButtonLink href="/dashboard/activities/new" size="sm">
            New activity
          </ButtonLink>
        }
      />

      <AdminCard title={`${activities.length} activit${activities.length === 1 ? 'y' : 'ies'}`}>
        {activities.length === 0 ? (
          <EmptyState title="No activities yet" description="Add activities to attach them to events and tours." />
        ) : (
          <DataTable headers={['Activity', 'Destination', 'Price', 'Flags', 'Status', '']}>
            {activities.map((activity) => (
              <tr key={activity.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="max-w-56 truncate font-medium">{activity.name}</p>
                  <p className="text-xs text-muted-foreground">/{activity.slug}</p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {activity.destination?.name ?? '—'}
                </td>
                <td className="py-3 pr-4 font-medium">{formatCurrency(activity.price)}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {activity.trending && (
                      <span className="rounded-full bg-accent/12 px-2 py-0.5 text-xs text-accent">
                        Trending
                      </span>
                    )}
                    {activity.bookable && (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
                        Bookable
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={activity.status} />
                </td>
                <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/activities/${activity.id}`}
                    deleteEndpoint={`/api/dashboard/activities/${activity.id}`}
                    label={activity.name}
                    canDelete={hasPermission(staff, PERMISSIONS.ACTIVITIES_DELETE)}
                    previewHref={`/activities/${activity.slug}`}
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
