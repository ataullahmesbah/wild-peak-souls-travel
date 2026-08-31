import type { Metadata } from 'next';
import { Star } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Panel } from '@/components/account/panels';
import { ReviewForm } from '@/components/account/review-form';
import { requireUserPage } from '@/lib/rbac/guard';
import { listMyReviews, listReviewableBookings } from '@/lib/data/account';
import { cn, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Reviews',
  robots: { index: false, follow: false },
};

export default async function MyReviewsPage() {
  const user = await requireUserPage();
  const [reviews, reviewable] = await Promise.all([
    listMyReviews(user.id),
    listReviewableBookings(user.id),
  ]);

  return (
    <div className="space-y-6">
      {reviewable.length > 0 && (
        <Panel
          title="Waiting for your review"
          description="Only travellers with a completed booking can review — that is why these are trustworthy."
        >
          <div className="space-y-6">
            {reviewable.map((booking) => (
              <div
                key={booking.id}
                className="rounded-field border border-border p-5"
              >
                <p className="text-sm font-medium">{booking.productTitle}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {booking.bookingNumber}
                  {booking.endDate ? ` · travelled ${formatDate(booking.endDate)}` : ''}
                </p>
                <div className="mt-4">
                  <ReviewForm bookingId={booking.id} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="Your reviews"
        description="Reviews are moderated before they appear publicly."
      >
        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="Once you have completed a trip with us, you will be able to review it here."
            actionLabel="Browse trips"
            actionHref="/events"
          />
        ) : (
          <ul className="divide-y divide-border">
            {reviews.map((review) => (
              <li key={review.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
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
                      <p className="mt-2 text-sm font-medium">{review.title}</p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {review.booking?.productTitle ?? 'General'} ·{' '}
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={review.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
