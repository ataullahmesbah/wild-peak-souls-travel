import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { tourFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues, destinationOptions } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit tour',
  robots: { index: false, follow: false },
};

export default async function EditToursPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.TOURS_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('tour', id);
  const destinations = await destinationOptions();

  return (
    <>
      <AdminPageHeader
        title={String(record.title ?? 'Edit tour')}
        description="Tours are repeatable itineraries travellers can book on flexible dates."
      />
      <ResourceForm
        endpoint={`/api/dashboard/tours/${id}`}
        method="PATCH"
        groups={tourFields(destinations)}
        values={toFormValues(record)}
        cancelHref="/dashboard/tours"
        redirectTo="/dashboard/tours"
        successMessage="Tour updated."
      />
    </>
  );
}
