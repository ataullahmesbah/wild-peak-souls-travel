import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { EventForm } from '@/components/admin/event-form';
import { eventFields } from '@/lib/admin/forms';
import { destinationOptions } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New event',
  robots: { index: false, follow: false },
};

export default async function NewEventPage() {
  await requirePermissionPage(PERMISSIONS.EVENTS_CREATE);
  const destinations = await destinationOptions();

  return (
    <>
      <AdminPageHeader
        title="New event"
        description="A dated departure with a fixed number of seats. Save it as a draft while you work; nothing is public until the status is Published."
      />
      <EventForm
        endpoint="/api/dashboard/events"
        groups={eventFields(destinations)}
      />
    </>
  );
}
