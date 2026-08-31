import type { Metadata } from 'next';

import { StatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { RowActions } from '@/components/admin/row-actions';
import { prisma } from '@/lib/prisma';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Visa types',
  robots: { index: false, follow: false },
};

export default async function AdminVisaTypesPage() {
  const staff = await requirePermissionPage(PERMISSIONS.VISA_READ);

  const types = await prisma.visaType.findMany({
    orderBy: [{ country: { name: 'asc' } }, { name: 'asc' }],
    include: {
      country: { select: { name: true, slug: true } },
      _count: { select: { requests: true } },
    },
  });

  return (
    <>
      <AdminPageHeader
        title="Visa types"
        description="The requirements, documents and fees published for each visa category. A type with customer requests against it is archived rather than deleted."
        actions={
          hasPermission(staff, PERMISSIONS.VISA_MANAGE) ? (
            <ButtonLink href="/dashboard/visa/types/new" size="sm">
              New visa type
            </ButtonLink>
          ) : undefined
        }
      />

      <AdminCard title={`${types.length} visa type${types.length === 1 ? '' : 's'}`}>
        {types.length === 0 ? (
          <EmptyState
            title="No visa types yet"
            description="Add a country first, then publish the visa types it offers."
          />
        ) : (
          <DataTable
            headers={['Visa type', 'Country', 'Service fee', 'Requests', 'Status', '']}
            minWidth="52rem"
          >
            {types.map((type) => (
              <tr key={type.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="font-medium">{type.name}</p>
                  <p className="text-xs text-muted-foreground">
                    /visa/{type.country.slug}/{type.slug}
                  </p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{type.country.name}</td>
                <td className="py-3 pr-4">
                  {type.serviceFee ? formatCurrency(type.serviceFee) : '—'}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{type._count.requests}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={type.status} />
                </td>
                <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/visa/types/${type.id}`}
                    deleteEndpoint={`/api/dashboard/visa-types/${type.id}`}
                    label={`${type.name} (${type.country.name})`}
                    canDelete={hasPermission(staff, PERMISSIONS.VISA_DELETE)}
                    previewHref={`/visa/${type.country.slug}/${type.slug}`}
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
