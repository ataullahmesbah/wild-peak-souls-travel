import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { visaCountryFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit country',
  robots: { index: false, follow: false },
};

export default async function EditVisaCountriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.VISA_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('visaCountry', id);

  return (
    <>
      <AdminPageHeader
        title={String(record.name ?? 'Edit country')}
        description="Each country holds one or more visa types."
      />
      <ResourceForm
        endpoint={`/api/dashboard/visa-countries/${id}`}
        method="PATCH"
        groups={visaCountryFields()}
        values={toFormValues(record)}
        cancelHref="/dashboard/visa/countries"
        redirectTo="/dashboard/visa/countries"
        successMessage="Country updated."
      />
    </>
  );
}
