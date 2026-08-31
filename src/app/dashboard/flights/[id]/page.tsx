import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { flightRouteFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit flight route',
  robots: { index: false, follow: false },
};

export default async function EditFlightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.FLIGHTS_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('flightRoute', id);

  return (
    <>
      <AdminPageHeader
        title={String(record.flightNumber ?? 'Edit flight route')}
        description="Schedules shown on the flights page. Live data replaces these when an airline feed is reachable."
      />
      <ResourceForm
        endpoint={`/api/dashboard/flight-routes/${id}`}
        method="PATCH"
        groups={flightRouteFields()}
        values={toFormValues(record)}
        cancelHref="/dashboard/flights"
        redirectTo="/dashboard/flights"
        successMessage="Flight route updated."
      />
    </>
  );
}
