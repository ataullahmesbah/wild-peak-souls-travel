import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { visaTypeFields } from '@/lib/admin/forms';
import { visaCountryOptions } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New visa type',
  robots: { index: false, follow: false },
};

export default async function NewVisaTypesPage() {
  await requirePermissionPage(PERMISSIONS.VISA_MANAGE);
  const countries = await visaCountryOptions();

  return (
    <>
      <AdminPageHeader
        title="New visa type"
        description="Everything an applicant needs for one visa category in one country."
      />
      <ResourceForm
        endpoint="/api/dashboard/visa-types"
        groups={visaTypeFields(countries)}
        cancelHref="/dashboard/visa/types"
        redirectTo="/dashboard/visa/types"
        successMessage="Visa type created."
      />
    </>
  );
}
