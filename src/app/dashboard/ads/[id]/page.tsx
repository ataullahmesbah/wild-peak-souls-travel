import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { adFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit advertisement',
  robots: { index: false, follow: false },
};

export default async function EditAdsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.ADS_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('advertisement', id);

  return (
    <>
      <AdminPageHeader
        title={String(record.title ?? 'Edit advertisement')}
        description="Campaign creatives, with a cap on how often one viewer sees each one."
      />
      <ResourceForm
        endpoint={`/api/dashboard/advertisements/${id}`}
        method="PATCH"
        groups={adFields()}
        values={toFormValues(record)}
        cancelHref="/dashboard/ads"
        redirectTo="/dashboard/ads"
        successMessage="Advertisement updated."
      />
    </>
  );
}
