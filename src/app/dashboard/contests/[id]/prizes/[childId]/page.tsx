// src/app/dashboard/contests/[id]/prizes/[childId]/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { contestPrizeFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit prize',
  robots: { index: false, follow: false },
};

export default async function EditContestChildPage({
  params,
}: {
  params: Promise<{ id: string; childId: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.CONTEST_MANAGE);
  const { id, childId } = await params;
  const record = await loadForEdit('contestPrize', childId);

  return (
    <>
      <AdminPageHeader title="Edit prize" />
      <ResourceForm
        endpoint={`/api/dashboard/contests/prizes/${childId}`}
        method="PATCH"
        groups={contestPrizeFields(id)}
        values={toFormValues(record)}
        cancelHref={`/dashboard/contests/${id}/prizes`}
        redirectTo={`/dashboard/contests/${id}/prizes`}
        successMessage="Saved."
      />
    </>
  );
}
