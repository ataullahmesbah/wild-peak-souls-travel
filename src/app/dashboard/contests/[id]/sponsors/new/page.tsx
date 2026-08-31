// src/app/dashboard/contests/[id]/sponsors/new/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { contestSponsorFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Add sponsor',
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
      <AdminPageHeader title="Add sponsor" />
      <ResourceForm
        endpoint="/api/dashboard/contests/sponsors"
        groups={contestSponsorFields(id)}
        values={{ contestId: id, sortOrder: 0 }}
        cancelHref={`/dashboard/contests/${id}/sponsors`}
        redirectTo={`/dashboard/contests/${id}/sponsors`}
        successMessage="Saved."
      />
    </>
  );
}
