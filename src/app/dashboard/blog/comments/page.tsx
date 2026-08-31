// src/app/dashboard/blog/comments/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, TabLinks } from '@/components/admin/admin-ui';
import { CommentModerationForm } from '@/components/admin/comment-moderation-form';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminComments } from '@/lib/data/admin-blog';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog comments',
  robots: { index: false, follow: false },
};

const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminBlogCommentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.COMMENTS_READ);

  const params = await searchParams;
  const status = first(params.status) ?? 'PENDING';
  const query = first(params.q);

  const comments = await listAdminComments(status || undefined, query);
  const canModerate = hasPermission(staff, PERMISSIONS.COMMENTS_MODERATE);
  const canDelete = hasPermission(staff, PERMISSIONS.COMMENTS_DELETE);

  return (
    <>
      <AdminPageHeader
        title="Blog comments"
        description="Nothing a reader writes appears on the site until it is approved here. Rejecting keeps the comment on file; deleting removes it for good."
        actions={
          <ButtonLink href="/dashboard/blog" size="sm" variant="outline">
            Back to posts
          </ButtonLink>
        }
      />

      <TabLinks tabs={TABS} current={status} basePath="/dashboard/blog/comments" />

      <AdminCard title={`${comments.length} comment${comments.length === 1 ? '' : 's'}`}>
        {comments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Nothing in this queue"
            description="Comments left on blog posts arrive here for review."
          />
        ) : (
          <ul className="space-y-5">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-field border border-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {comment.authorName}{' '}
                      <span className="font-normal text-muted-foreground">
                        ({comment.authorEmail})
                      </span>
                      {comment.user && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Signed in
                        </span>
                      )}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      on{' '}
                      <Link
                        href={`/blog/${comment.post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary"
                      >
                        {comment.post.title}
                      </Link>{' '}
                      · {formatDateTime(comment.createdAt)}
                      {comment.parentId && ' · reply'}
                    </p>

                    {comment.parent && (
                      <p className="mt-3 border-l-2 border-border pl-3 text-xs text-muted-foreground">
                        In reply to {comment.parent.authorName}: “
                        {comment.parent.body.slice(0, 120)}
                        {comment.parent.body.length > 120 ? '…' : ''}”
                      </p>
                    )}

                    {/* Rendered as plain text, exactly as the public page does.
                        A comment is never treated as markup anywhere. */}
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                      {comment.body}
                    </p>

                    {comment.moderationNote && (
                      <p className="mt-2 text-xs text-warning">
                        Note: {comment.moderationNote}
                      </p>
                    )}
                    {comment.moderatedBy && comment.moderatedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last decided by {comment.moderatedBy.name} on{' '}
                        {formatDateTime(comment.moderatedAt)}
                      </p>
                    )}
                  </div>

                  <StatusBadge status={comment.status} />
                </div>

                {canModerate && (
                  <div className="mt-4 border-t border-border pt-4">
                    <CommentModerationForm
                      commentId={comment.id}
                      currentStatus={comment.status}
                      canDelete={canDelete}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </>
  );
}
