import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { visaTypeFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues, visaCountryOptions } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit visa type',
  robots: { index: false, follow: false },
};

export default async function EditVisaTypesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.VISA_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('visaType', id);
  const countries = await visaCountryOptions();

  return (
    <>
      <AdminPageHeader
        title={String(record.name ?? 'Edit visa type')}
        description="Everything an applicant needs for one visa category in one country."
      />
      <ResourceForm
        endpoint={`/api/dashboard/visa-types/${id}`}
        method="PATCH"
        groups={visaTypeFields(countries)}
        values={toFormValues(record)}
        cancelHref="/dashboard/visa/types"
        redirectTo="/dashboard/visa/types"
        successMessage="Visa type updated."
      />
    </>
  );
}
