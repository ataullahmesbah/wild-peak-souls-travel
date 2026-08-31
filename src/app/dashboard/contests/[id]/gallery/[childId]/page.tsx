// src/app/dashboard/contests/[id]/gallery/[childId]/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { contestGalleryFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit gallery image',
  robots: { index: false, follow: false },
};

export default async function EditContestChildPage({
  params,
}: {
  params: Promise<{ id: string; childId: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.CONTEST_MANAGE);
  const { id, childId } = await params;
  const record = await loadForEdit('contestGalleryItem', childId);

  return (
    <>
      <AdminPageHeader title="Edit gallery image" />
      <ResourceForm
        endpoint={`/api/dashboard/contests/gallery/${childId}`}
        method="PATCH"
        groups={contestGalleryFields(id)}
        values={toFormValues(record)}
        cancelHref={`/dashboard/contests/${id}/gallery`}
        redirectTo={`/dashboard/contests/${id}/gallery`}
        successMessage="Saved."
      />
    </>
  );
}
