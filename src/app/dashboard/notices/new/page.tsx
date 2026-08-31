import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { noticeFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New notice',
  robots: { index: false, follow: false },
};

export default async function NewNoticesPage() {
  await requirePermissionPage(PERMISSIONS.NOTICES_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="New notice"
        description="Notices appear in the bar across the top of every public page."
      />
      <ResourceForm
        endpoint="/api/dashboard/notices"
        groups={noticeFields()}
        cancelHref="/dashboard/notices"
        redirectTo="/dashboard/notices"
        successMessage="Notice created."
      />
    </>
  );
}
