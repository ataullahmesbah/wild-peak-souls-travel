import { Star } from 'lucide-react';

import { cn, formatDate, initials } from '@/lib/utils';

export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: Date;
  user: { name: string; image: string | null };
}

/**
 * Reviews for one trip, shown on its own page.
 *
 * Only moderated reviews from travellers with a completed booking reach here,
 * and the page says so rather than leaving it assumed — an unqualified
 * "4.8 stars" tells a reader nothing about whether it can be trusted.
 */
export function ProductReviews({
  reviews,
  count,
  average,
  emptyMessage = 'No reviews yet. These appear once travellers who have been on this trip write one.',
}: {
  reviews: ProductReview[];
  count: number;
  average: number;
  emptyMessage?: string;
}) {
  return (
    <section aria-labelledby="reviews-heading" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="font-display text-xl font-semibold">
            Traveller reviews
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Written by people who completed this trip, and moderated before publishing.
          </p>
        </div>

        {count > 0 && (
          <div className="flex items-center gap-2.5">
            <Stars rating={Math.round(average)} />
            <span className="text-sm">
              <span className="font-semibold">{average.toFixed(1)}</span>
              <span className="text-muted-foreground">
                {' '}
                from {count} review{count === 1 ? '' : 's'}
              </span>
            </span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-5 rounded-card border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.id} className="wps-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {initials(review.user.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{review.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <Stars rating={review.rating} />
              </div>

              {review.title && <p className="mt-2.5 font-medium">{review.title}</p>}
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {review.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.max(0, Math.min(5, rating));
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rounded} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn(
            'h-4 w-4',
            star <= rounded ? 'fill-accent text-accent' : 'text-muted-foreground/30',
          )}
        />
      ))}
    </span>
  );
}
