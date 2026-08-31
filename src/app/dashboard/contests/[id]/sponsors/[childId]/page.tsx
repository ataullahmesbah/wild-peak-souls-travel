// src/app/dashboard/contests/[id]/sponsors/[childId]/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { contestSponsorFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit sponsor',
  robots: { index: false, follow: false },
};

export default async function EditContestChildPage({
  params,
}: {
  params: Promise<{ id: string; childId: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.CONTEST_MANAGE);
  const { id, childId } = await params;
  const record = await loadForEdit('contestSponsor', childId);

  return (
    <>
      <AdminPageHeader title="Edit sponsor" />
      <ResourceForm
        endpoint={`/api/dashboard/contests/sponsors/${childId}`}
        method="PATCH"
        groups={contestSponsorFields(id)}
        values={toFormValues(record)}
        cancelHref={`/dashboard/contests/${id}/sponsors`}
        redirectTo={`/dashboard/contests/${id}/sponsors`}
        successMessage="Saved."
      />
    </>
  );
}
