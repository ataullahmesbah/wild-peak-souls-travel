// src/app/dashboard/contests/[id]/judges/[childId]/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { contestJudgeFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit judge',
  robots: { index: false, follow: false },
};

export default async function EditContestChildPage({
  params,
}: {
  params: Promise<{ id: string; childId: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.CONTEST_MANAGE);
  const { id, childId } = await params;
  const record = await loadForEdit('contestJudge', childId);

  return (
    <>
      <AdminPageHeader title="Edit judge" />
      <ResourceForm
        endpoint={`/api/dashboard/contests/judges/${childId}`}
        method="PATCH"
        groups={contestJudgeFields(id)}
        values={toFormValues(record)}
        cancelHref={`/dashboard/contests/${id}/judges`}
        redirectTo={`/dashboard/contests/${id}/judges`}
        successMessage="Saved."
      />
    </>
  );
}
