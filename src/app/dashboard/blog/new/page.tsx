// src/app/dashboard/blog/new/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { postFields } from '@/lib/admin/forms';
import { postCategoryOptions } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New post',
  robots: { index: false, follow: false },
};

export default async function NewPostPage() {
  await requirePermissionPage(PERMISSIONS.BLOG_MANAGE);
  const categories = await postCategoryOptions();

  return (
    <>
      <AdminPageHeader
        title="New post"
        description="Save as a draft while you work. The byline is your own account — it is taken from your session, not from this form."
      />
      <ResourceForm
        endpoint="/api/dashboard/blog"
        groups={postFields(categories)}
        values={{ status: 'DRAFT', commentsOpen: true, readMinutes: 0 }}
        cancelHref="/dashboard/blog"
        redirectTo="/dashboard/blog"
        successMessage="Post created."
      />
    </>
  );
}
