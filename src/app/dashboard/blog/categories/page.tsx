// src/app/dashboard/blog/categories/page.tsx
import type { Metadata } from 'next';
import { Folder } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminCategories } from '@/lib/data/admin-blog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog categories',
  robots: { index: false, follow: false },
};

export default async function AdminBlogCategoriesPage() {
  const staff = await requirePermissionPage(PERMISSIONS.BLOG_CATEGORIES_MANAGE);
  const categories = await listAdminCategories();
  const canDelete = hasPermission(staff, PERMISSIONS.BLOG_DELETE);

  return (
    <>
      <AdminPageHeader
        title="Blog categories"
        description="Categories give each post a home and drive the blog sidebar. A category with no published posts is hidden from the site automatically."
        actions={
          <div className="flex gap-2">
            <ButtonLink href="/dashboard/blog" size="sm" variant="outline">
              Back to posts
            </ButtonLink>
            <ButtonLink href="/dashboard/blog/categories/new" size="sm">
              New category
            </ButtonLink>
          </div>
        }
      />

      <AdminCard title={`${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}>
        {categories.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No categories yet"
            description="Add a few — Trekking, Beaches, Visa & Paperwork — so readers can browse by subject."
            actionLabel="New category"
            actionHref="/dashboard/blog/categories/new"
          />
        ) : (
          <DataTable headers={['Name', 'Slug', 'Posts', 'Order', 'Status', '']} minWidth="48rem">
            {categories.map((category) => (
              <tr key={category.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <span className="font-medium">{category.name}</span>
                  {category.description && (
                    <span className="block max-w-md truncate text-xs text-muted-foreground">
                      {category.description}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  /blog/category/{category.slug}
                </td>
                <td className="py-3 pr-4 tabular-nums">{category._count.posts}</td>
                <td className="py-3 pr-4 tabular-nums">{category.position}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={category.status} />
                </td>
                <td className="py-3">
                  <RowActions
                    editHref={`/dashboard/blog/categories/${category.id}`}
                    deleteEndpoint={
                      canDelete ? `/api/dashboard/blog/categories/${category.id}` : undefined
                    }
                    canDelete={canDelete}
                    label={category.name}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminCard>
    </>
  );
}
