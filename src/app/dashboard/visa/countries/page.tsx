import type { Metadata } from 'next';

import { StatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { RowActions } from '@/components/admin/row-actions';
import { prisma } from '@/lib/prisma';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Visa countries',
  robots: { index: false, follow: false },
};

export default async function AdminVisaCountriesPage() {
  const staff = await requirePermissionPage(PERMISSIONS.VISA_READ);

  const countries = await prisma.visaCountry.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { visaTypes: true } } },
  });

  return (
    <>
      <AdminPageHeader
        title="Visa countries"
        description="Each country holds its own visa types. Removing a country that still has visa types archives it rather than deleting it."
        actions={
          hasPermission(staff, PERMISSIONS.VISA_MANAGE) ? (
            <ButtonLink href="/dashboard/visa/countries/new" size="sm">
              New country
            </ButtonLink>
          ) : undefined
        }
      />

      <AdminCard title={`${countries.length} countr${countries.length === 1 ? 'y' : 'ies'}`}>
        {countries.length === 0 ? (
          <EmptyState
            title="No countries yet"
            description="Add a country to start publishing its visa requirements."
          />
        ) : (
          <DataTable headers={['Country', 'Code', 'Visa types', 'Order', 'Status', '']}>
            {countries.map((country) => (
              <tr key={country.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="font-medium">{country.name}</p>
                  <p className="text-xs text-muted-foreground">/visa/{country.slug}</p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{country.code ?? '—'}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {country._count.visaTypes}
                </td>
                <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                  {country.sortOrder}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={country.status} />
                </td>
                <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/visa/countries/${country.id}`}
                    deleteEndpoint={`/api/dashboard/visa-countries/${country.id}`}
                    label={country.name}
                    canDelete={hasPermission(staff, PERMISSIONS.VISA_DELETE)}
                    previewHref={`/visa/${country.slug}`}
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
