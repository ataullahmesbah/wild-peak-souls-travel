import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { destinationFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit destination',
  robots: { index: false, follow: false },
};

export default async function EditDestinationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.DESTINATIONS_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('destination', id);

  return (
    <>
      <AdminPageHeader
        title={String(record.name ?? 'Edit destination')}
        description="A destination groups everything that happens in one place — its page lists every published event, tour, activity and stay attached to it."
      />
      <ResourceForm
        endpoint={`/api/dashboard/destinations/${id}`}
        method="PATCH"
        groups={destinationFields()}
        values={toFormValues(record)}
        cancelHref="/dashboard/destinations"
        redirectTo="/dashboard/destinations"
        successMessage="Destination updated."
      />
    </>
  );
}
