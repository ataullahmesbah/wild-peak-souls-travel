import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { activityFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues, destinationOptions } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit activity',
  robots: { index: false, follow: false },
};

export default async function EditActivitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.ACTIVITIES_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('activity', id);
  const destinations = await destinationOptions();

  return (
    <>
      <AdminPageHeader
        title={String(record.name ?? 'Edit activity')}
        description="Activities are the individual experiences that make up an itinerary, and can be sold on their own."
      />
      <ResourceForm
        endpoint={`/api/dashboard/activities/${id}`}
        method="PATCH"
        groups={activityFields(destinations)}
        values={toFormValues(record)}
        cancelHref="/dashboard/activities"
        redirectTo="/dashboard/activities"
        successMessage="Activity updated."
      />
    </>
  );
}
