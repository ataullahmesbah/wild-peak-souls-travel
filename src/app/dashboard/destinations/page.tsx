import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminCatalogue } from '@/lib/data/admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Destinations',
  robots: { index: false, follow: false },
};

export default async function AdminDestinationsPage() {
  const staff = await requirePermissionPage(PERMISSIONS.DESTINATIONS_READ);
  const { destinations } = await listAdminCatalogue();

  return (
    <>
      <AdminPageHeader
        title="Destinations"
        description="Reusable travel locations. Publishing a destination makes its page surface every live event, tour, activity and stay attached to it."
        actions={
          <ButtonLink href="/dashboard/destinations/new" size="sm">
            New destination
          </ButtonLink>
        }
      />

      <AdminCard title={`${destinations.length} destination${destinations.length === 1 ? '' : 's'}`}>
        {destinations.length === 0 ? (
          <EmptyState
            title="No destinations yet"
            description="Run the seed script or create destinations to populate the catalogue."
          />
        ) : (
          <DataTable headers={['Name', 'Country', 'Attached content', 'Status', '']}>
            {destinations.map((destination) => (
              <tr key={destination.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="font-medium">{destination.name}</p>
                  <p className="text-xs text-muted-foreground">/{destination.slug}</p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{destination.country}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {destination._count.events} events · {destination._count.tours} tours ·{' '}
                  {destination._count.activities} activities
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={destination.status} />
                    {destination.featured && (
                      <span className="rounded-full bg-accent/12 px-2 py-0.5 text-xs text-accent">
                        Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/destinations/${destination.id}`}
                    deleteEndpoint={`/api/dashboard/destinations/${destination.id}`}
                    label={destination.name}
                    canDelete={hasPermission(staff, PERMISSIONS.DESTINATIONS_DELETE)}
                    previewHref={`/destinations/${destination.slug}`}
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
