// src/app/dashboard/blog/categories/[id]/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { postCategoryFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit blog category',
  robots: { index: false, follow: false },
};

export default async function EditBlogCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.BLOG_CATEGORIES_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('postCategory', id);

  return (
    <>
      <AdminPageHeader
        title={String(record.name ?? 'Edit category')}
        description="Renaming is safe. Changing the slug changes the category's public address, so any existing link to it will stop working."
      />
      <ResourceForm
        endpoint={`/api/dashboard/blog/categories/${id}`}
        method="PATCH"
        groups={postCategoryFields()}
        values={toFormValues(record)}
        cancelHref="/dashboard/blog/categories"
        redirectTo="/dashboard/blog/categories"
        successMessage="Category updated."
      />
    </>
  );
}
