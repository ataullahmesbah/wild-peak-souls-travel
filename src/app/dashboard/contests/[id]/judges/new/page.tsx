// src/app/dashboard/contests/[id]/judges/new/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { contestJudgeFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Add judge',
  robots: { index: false, follow: false },
};

export default async function NewContestChildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.CONTEST_MANAGE);
  const { id } = await params;

  return (
    <>
      <AdminPageHeader title="Add judge" />
      <ResourceForm
        endpoint="/api/dashboard/contests/judges"
        groups={contestJudgeFields(id)}
        values={{ contestId: id, sortOrder: 0 }}
        cancelHref={`/dashboard/contests/${id}/judges`}
        redirectTo={`/dashboard/contests/${id}/judges`}
        successMessage="Saved."
      />
    </>
  );
}
