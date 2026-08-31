// src/app/dashboard/blog/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare, Newspaper } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable, TabLinks } from '@/components/admin/admin-ui';
import { Pagination } from '@/components/ui/pagination';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { countPendingComments, listAdminPosts } from '@/lib/data/admin-blog';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
  robots: { index: false, follow: false },
};

const TABS = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.BLOG_READ);

  const params = await searchParams;
  const status = first(params.status) ?? '';
  const query = first(params.q);
  const page = Number(first(params.page) ?? 1);

  const [result, pending] = await Promise.all([
    listAdminPosts({ status: status || undefined, query, page }),
    countPendingComments(),
  ]);

  const canWrite = hasPermission(staff, PERMISSIONS.BLOG_MANAGE);
  const canDelete = hasPermission(staff, PERMISSIONS.BLOG_DELETE);

  return (
    <>
      <AdminPageHeader
        title="Blog"
        description="Write and publish articles. A draft is visible only here; publishing puts it on /blog straight away."
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/dashboard/blog/categories" size="sm" variant="outline">
                Categories
              </ButtonLink>
              <ButtonLink href="/dashboard/blog/comments" size="sm" variant="outline">
                Comments
                {pending > 0 && (
                  <span className="ml-1.5 rounded-full bg-warning-soft px-1.5 text-xs text-warning">
                    {pending}
                  </span>
                )}
              </ButtonLink>
              <ButtonLink href="/dashboard/blog/new" size="sm">
                New post
              </ButtonLink>
            </div>
          ) : null
        }
      />

      {pending > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-field border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {pending} comment{pending === 1 ? '' : 's'} waiting for review.{' '}
            <Link href="/dashboard/blog/comments?status=PENDING" className="font-medium underline">
              Review now
            </Link>
          </span>
        </div>
      )}

      <TabLinks tabs={TABS} current={status} basePath="/dashboard/blog" />

      <AdminCard title={`${result.total} post${result.total === 1 ? '' : 's'}`}>
        {result.items.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="No posts yet"
            description="Write the first article — packing lists, seasonal advice and route notes are what readers search for."
            actionLabel={canWrite ? 'New post' : undefined}
            actionHref={canWrite ? '/dashboard/blog/new' : undefined}
          />
        ) : (
          <>
            <DataTable
              headers={['Title', 'Category', 'Author', 'Status', 'Published', 'Views', 'Comments', '']}
              minWidth="64rem"
            >
              {result.items.map((post) => (
                <tr key={post.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 pr-4">
                    <span className="font-medium">{post.title}</span>
                    {post.featured && (
                      <span className="ml-2 rounded-full bg-accent/12 px-2 py-0.5 text-xs text-accent">
                        Featured
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground">/blog/{post.slug}</span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {post.category?.name ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{post.authorName ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {post.publishedAt ? formatDate(post.publishedAt) : 'Not published'}
                  </td>
                  <td className="py-3 pr-4 tabular-nums">{post.views}</td>
                  <td className="py-3 pr-4 tabular-nums">{post._count.comments}</td>
                  <td className="py-3">
                    <RowActions
                      editHref={`/dashboard/blog/${post.id}`}
                      deleteEndpoint={canDelete ? `/api/dashboard/blog/${post.id}` : undefined}
                      canDelete={canDelete}
                      label={post.title}
                      previewHref={
                        post.status === 'PUBLISHED' ? `/blog/${post.slug}` : undefined
                      }
                    />
                  </td>
                </tr>
              ))}
            </DataTable>

            <div className="mt-6">
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                basePath="/dashboard/blog"
                searchParams={{ status: status || undefined, q: query }}
              />
            </div>
          </>
        )}
      </AdminCard>
    </>
  );
}
