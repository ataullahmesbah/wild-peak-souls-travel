import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { trainScheduleFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit train service',
  robots: { index: false, follow: false },
};

export default async function EditTrainsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.TRAINS_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('trainSchedule', id);

  return (
    <>
      <AdminPageHeader
        title={String(record.trainName ?? 'Edit train service')}
        description="Intercity train schedules shown on the trains page."
      />
      <ResourceForm
        endpoint={`/api/dashboard/train-schedules/${id}`}
        method="PATCH"
        groups={trainScheduleFields()}
        values={toFormValues(record)}
        cancelHref="/dashboard/trains"
        redirectTo="/dashboard/trains"
        successMessage="Train service updated."
      />
    </>
  );
}
