import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { flightRouteFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New flight route',
  robots: { index: false, follow: false },
};

export default async function NewFlightsPage() {
  await requirePermissionPage(PERMISSIONS.FLIGHTS_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="New flight route"
        description="Schedules shown on the flights page. Live data replaces these when an airline feed is reachable."
      />
      <ResourceForm
        endpoint="/api/dashboard/flight-routes"
        groups={flightRouteFields()}
        cancelHref="/dashboard/flights"
        redirectTo="/dashboard/flights"
        successMessage="Flight route created."
      />
    </>
  );
}
