import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { adFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New advertisement',
  robots: { index: false, follow: false },
};

export default async function NewAdsPage() {
  await requirePermissionPage(PERMISSIONS.ADS_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="New advertisement"
        description="Campaign creatives, with a cap on how often one viewer sees each one."
      />
      <ResourceForm
        endpoint="/api/dashboard/advertisements"
        groups={adFields()}
        cancelHref="/dashboard/ads"
        redirectTo="/dashboard/ads"
        successMessage="Advertisement created."
      />
    </>
  );
}
