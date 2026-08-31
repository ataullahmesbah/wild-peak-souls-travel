import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { tourFields } from '@/lib/admin/forms';
import { destinationOptions } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New tour',
  robots: { index: false, follow: false },
};

export default async function NewToursPage() {
  await requirePermissionPage(PERMISSIONS.TOURS_MANAGE);
  const destinations = await destinationOptions();

  return (
    <>
      <AdminPageHeader
        title="New tour"
        description="Tours are repeatable itineraries travellers can book on flexible dates."
      />
      <ResourceForm
        endpoint="/api/dashboard/tours"
        groups={tourFields(destinations)}
        cancelHref="/dashboard/tours"
        redirectTo="/dashboard/tours"
        successMessage="Tour created."
      />
    </>
  );
}
