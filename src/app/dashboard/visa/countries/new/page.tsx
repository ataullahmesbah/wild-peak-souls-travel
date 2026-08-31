import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { visaCountryFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New country',
  robots: { index: false, follow: false },
};

export default async function NewVisaCountriesPage() {
  await requirePermissionPage(PERMISSIONS.VISA_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="New country"
        description="Each country holds one or more visa types."
      />
      <ResourceForm
        endpoint="/api/dashboard/visa-countries"
        groups={visaCountryFields()}
        cancelHref="/dashboard/visa/countries"
        redirectTo="/dashboard/visa/countries"
        successMessage="Country created."
      />
    </>
  );
}
