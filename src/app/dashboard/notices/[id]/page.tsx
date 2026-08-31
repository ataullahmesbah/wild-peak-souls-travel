import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { noticeFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit notice',
  robots: { index: false, follow: false },
};

export default async function EditNoticesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.NOTICES_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('notice', id);

  return (
    <>
      <AdminPageHeader
        title={String(record.title ?? 'Edit notice')}
        description="Notices appear in the bar across the top of every public page."
      />
      <ResourceForm
        endpoint={`/api/dashboard/notices/${id}`}
        method="PATCH"
        groups={noticeFields()}
        values={toFormValues(record)}
        cancelHref="/dashboard/notices"
        redirectTo="/dashboard/notices"
        successMessage="Notice updated."
      />
    </>
  );
}
