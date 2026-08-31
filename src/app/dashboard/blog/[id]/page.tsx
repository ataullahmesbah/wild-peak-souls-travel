// src/app/dashboard/blog/[id]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { postFields } from '@/lib/admin/forms';
import { loadForEdit, postCategoryOptions, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit post',
  robots: { index: false, follow: false },
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.BLOG_MANAGE);
  const { id } = await params;

  const [record, categories] = await Promise.all([
    loadForEdit('post', id),
    postCategoryOptions(),
  ]);

  const slug = String(record.slug ?? '');
  const published = record.status === 'PUBLISHED';

  return (
    <>
      <AdminPageHeader
        title={String(record.title ?? 'Edit post')}
        description={
          published ? 'This post is live. Changes appear on the site as soon as you save.' : undefined
        }
        actions={
          published ? (
            <Link
              href={`/blog/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View on the site
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null
        }
      />
      <ResourceForm
        endpoint={`/api/dashboard/blog/${id}`}
        method="PATCH"
        groups={postFields(categories)}
        values={toFormValues(record)}
        cancelHref="/dashboard/blog"
        redirectTo="/dashboard/blog"
        successMessage="Post updated."
      />
    </>
  );
}
