// src/app/dashboard/contests/[id]/prizes/new/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { contestPrizeFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Add prize',
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
      <AdminPageHeader title="Add prize" />
      <ResourceForm
        endpoint="/api/dashboard/contests/prizes"
        groups={contestPrizeFields(id)}
        values={{ contestId: id, sortOrder: 0 }}
        cancelHref={`/dashboard/contests/${id}/prizes`}
        redirectTo={`/dashboard/contests/${id}/prizes`}
        successMessage="Saved."
      />
    </>
  );
}
