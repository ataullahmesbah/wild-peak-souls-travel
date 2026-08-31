import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { destinationFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New destination',
  robots: { index: false, follow: false },
};

export default async function NewDestinationsPage() {
  await requirePermissionPage(PERMISSIONS.DESTINATIONS_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="New destination"
        description="A destination groups everything that happens in one place — its page lists every published event, tour, activity and stay attached to it."
      />
      <ResourceForm
        endpoint="/api/dashboard/destinations"
        groups={destinationFields()}
        cancelHref="/dashboard/destinations"
        redirectTo="/dashboard/destinations"
        successMessage="Destination created."
      />
    </>
  );
}
