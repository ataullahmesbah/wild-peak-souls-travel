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
  title: 'Stays',
  robots: { index: false, follow: false },
};

export default async function AdminStaysPage() {
  const staff = await requirePermissionPage(PERMISSIONS.STAYS_READ);
  const { stays } = await listAdminCatalogue();

  return (
    <>
      <AdminPageHeader
        title="Stays"
        description="Properties and their room types. Availability is held per night, per room type, inside the booking transaction."
        actions={
          <ButtonLink href="/dashboard/stays/new" size="sm">
            New property
          </ButtonLink>
        }
      />

      <AdminCard title={`${stays.length} propert${stays.length === 1 ? 'y' : 'ies'}`}>
        {stays.length === 0 ? (
          <EmptyState title="No properties yet" description="Add a property and at least one room type to make it bookable." />
        ) : (
          <DataTable headers={['Property', 'Type', 'Destination', 'Room types', 'Status', '']}>
            {stays.map((stay) => (
              <tr key={stay.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="max-w-56 truncate font-medium">{stay.name}</p>
                  <p className="text-xs text-muted-foreground">/{stay.slug}</p>
                </td>
                <td className="py-3 pr-4 capitalize text-muted-foreground">
                  {stay.type.replace(/_/g, ' ').toLowerCase()}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {stay.destination?.name ?? '—'}
                </td>
                <td className="py-3 pr-4">
                  {stay._count.roomTypes === 0 ? (
                    <span className="text-xs text-warning">No rooms — not bookable</span>
                  ) : (
                    `${stay._count.roomTypes} room type${stay._count.roomTypes === 1 ? '' : 's'}`
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={stay.status} />
                    {stay.featured && (
                      <span className="rounded-full bg-accent/12 px-2 py-0.5 text-xs text-accent">
                        Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/stays/${stay.id}`}
                    deleteEndpoint={`/api/dashboard/stays/${stay.id}`}
                    label={stay.name}
                    canDelete={hasPermission(staff, PERMISSIONS.STAYS_DELETE)}
                    previewHref={`/stays/${stay.slug}`}
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
