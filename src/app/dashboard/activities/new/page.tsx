import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { activityFields } from '@/lib/admin/forms';
import { destinationOptions } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New activity',
  robots: { index: false, follow: false },
};

export default async function NewActivitiesPage() {
  await requirePermissionPage(PERMISSIONS.ACTIVITIES_MANAGE);
  const destinations = await destinationOptions();

  return (
    <>
      <AdminPageHeader
        title="New activity"
        description="Activities are the individual experiences that make up an itinerary, and can be sold on their own."
      />
      <ResourceForm
        endpoint="/api/dashboard/activities"
        groups={activityFields(destinations)}
        cancelHref="/dashboard/activities"
        redirectTo="/dashboard/activities"
        successMessage="Activity created."
      />
    </>
  );
}
