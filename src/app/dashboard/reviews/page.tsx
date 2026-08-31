import type { Metadata } from 'next';
import { Star } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, TabLinks } from '@/components/admin/admin-ui';
import { ReviewModerationForm } from '@/components/admin/review-moderation-form';
import { requirePermissionPage, hasPermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminReviews } from '@/lib/data/admin';
import { cn, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reviews',
  robots: { index: false, follow: false },
};

const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'HIDDEN', label: 'Hidden' },
  { value: '', label: 'All' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.REVIEWS_READ);

  const params = await searchParams;
  const status = first(params.status) ?? 'PENDING';
  const reviews = await listAdminReviews(status || undefined);
  const canModerate = hasPermission(staff, PERMISSIONS.REVIEWS_MODERATE);

  return (
    <>
      <AdminPageHeader
        title="Reviews"
        description="Only customers with a completed booking can submit a review. Nothing appears publicly until it is approved here."
      />

      <TabLinks tabs={TABS} current={status} basePath="/dashboard/reviews" />

      <AdminCard title={`${reviews.length} review${reviews.length === 1 ? '' : 's'}`}>
        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Nothing in this queue"
            description="Reviews submitted by travellers appear here for moderation."
          />
        ) : (
          <ul className="space-y-5">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-field border border-border p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-4 w-4',
                            i < review.rating ? 'fill-accent text-accent' : 'text-border',
                          )}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    {review.title && (
                      <p className="mt-2 font-display text-base font-semibold">
                        {review.title}
                      </p>
                    )}
                    <p className="mt-1.5 text-sm text-muted-foreground">{review.body}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {review.user.name} ({review.user.email}) ·{' '}
                      {review.booking
                        ? `${review.booking.bookingNumber} — ${review.booking.productTitle}`
                        : 'No linked booking'}{' '}
                      · {formatDateTime(review.createdAt)}
                    </p>
                    {review.moderationNote && (
                      <p className="mt-2 text-xs text-warning">
                        Moderation note: {review.moderationNote}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={review.status} />
                    {review.featured && (
                      <span className="rounded-full bg-accent/12 px-2 py-0.5 text-xs text-accent">
                        Featured
                      </span>
                    )}
                  </div>
                </div>

                {canModerate && (
                  <div className="mt-4 border-t border-border pt-4">
                    <ReviewModerationForm
                      reviewId={review.id}
                      currentStatus={review.status}
                      featured={review.featured}
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
