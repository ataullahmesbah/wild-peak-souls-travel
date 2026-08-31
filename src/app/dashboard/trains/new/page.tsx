import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { trainScheduleFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New train service',
  robots: { index: false, follow: false },
};

export default async function NewTrainsPage() {
  await requirePermissionPage(PERMISSIONS.TRAINS_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="New train service"
        description="Intercity train schedules shown on the trains page."
      />
      <ResourceForm
        endpoint="/api/dashboard/train-schedules"
        groups={trainScheduleFields()}
        cancelHref="/dashboard/trains"
        redirectTo="/dashboard/trains"
        successMessage="Train service created."
      />
    </>
  );
}
