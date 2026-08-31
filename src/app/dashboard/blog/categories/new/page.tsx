// src/app/dashboard/blog/categories/new/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { postCategoryFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New blog category',
  robots: { index: false, follow: false },
};

export default async function NewBlogCategoryPage() {
  await requirePermissionPage(PERMISSIONS.BLOG_CATEGORIES_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="New blog category"
        description="Each category gets its own page at /blog/category/<slug> and a row in the blog sidebar."
      />
      <ResourceForm
        endpoint="/api/dashboard/blog/categories"
        groups={postCategoryFields()}
        values={{ status: 'PUBLISHED', position: 0 }}
        cancelHref="/dashboard/blog/categories"
        redirectTo="/dashboard/blog/categories"
        successMessage="Category created."
      />
    </>
  );
}
