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
  title: 'Tours',
  robots: { index: false, follow: false },
};

export default async function AdminToursPage() {
  const staff = await requirePermissionPage(PERMISSIONS.TOURS_READ);
  const { tours } = await listAdminCatalogue();

  return (
    <>
      <AdminPageHeader
        title="Tour packages"
        description="Multi-day itineraries. Tour bookings are staff-confirmed rather than seat-limited."
        actions={
          <ButtonLink href="/dashboard/tours/new" size="sm">
            New tour
          </ButtonLink>
        }
      />

      <AdminCard title={`${tours.length} tour${tours.length === 1 ? '' : 's'}`}>
        {tours.length === 0 ? (
          <EmptyState title="No tours yet" description="Published tours appear on the public /tours listing." />
        ) : (
          <DataTable headers={['Tour', 'Destination', 'Duration', 'From', 'Status', '']}>
            {tours.map((tour) => (
              <tr key={tour.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="max-w-56 truncate font-medium">{tour.title}</p>
                  <p className="text-xs text-muted-foreground">/{tour.slug}</p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {tour.destination?.name ?? '—'}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{tour.duration ?? '—'}</td>
                <td className="py-3 pr-4 font-medium">{formatCurrency(tour.basePrice)}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={tour.status} />
                    {tour.featured && (
                      <span className="rounded-full bg-accent/12 px-2 py-0.5 text-xs text-accent">
                        Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/tours/${tour.id}`}
                    deleteEndpoint={`/api/dashboard/tours/${tour.id}`}
                    label={tour.title}
                    canDelete={hasPermission(staff, PERMISSIONS.TOURS_DELETE)}
                    previewHref={`/tours/${tour.slug}`}
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
