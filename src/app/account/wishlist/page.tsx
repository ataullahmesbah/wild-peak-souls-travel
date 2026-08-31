import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart } from 'lucide-react';

import { EmptyState } from '@/components/ui/states';
import { Panel } from '@/components/account/panels';
import { requireUserPage } from '@/lib/rbac/guard';
import { listMyWishlist } from '@/lib/data/account';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Wishlist',
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  const user = await requireUserPage();
  const { items, events, tours, destinations, activities, stays } =
    await listMyWishlist(user.id);

  const total =
    events.length + tours.length + destinations.length + activities.length + stays.length;

  if (items.length === 0 || total === 0) {
    return (
      <Panel title="Wishlist">
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Save destinations, trips and stays you are considering and they will collect here."
          actionLabel="Browse destinations"
          actionHref="/destinations"
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {events.length > 0 && (
        <Panel title="Saved events">
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-4 py-3.5">
                <Link href={`/events/${event.slug}`} className="min-w-0 hover:text-primary">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Departs {formatDate(event.startAt)}
                  </p>
                </Link>
                <span className="shrink-0 text-sm font-medium">
                  {formatCurrency(event.price)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tours.length > 0 && (
        <Panel title="Saved tours">
          <ul className="divide-y divide-border">
            {tours.map((tour) => (
              <li key={tour.id} className="flex items-center justify-between gap-4 py-3.5">
                <Link href={`/tours/${tour.slug}`} className="min-w-0 hover:text-primary">
                  <p className="truncate text-sm font-medium">{tour.title}</p>
                  {tour.duration && (
                    <p className="text-xs text-muted-foreground">{tour.duration}</p>
                  )}
                </Link>
                <span className="shrink-0 text-sm font-medium">
                  {formatCurrency(tour.basePrice)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {destinations.length > 0 && (
        <Panel title="Saved destinations">
          <ul className="divide-y divide-border">
            {destinations.map((destination) => (
              <li key={destination.id} className="py-3.5">
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="hover:text-primary"
                >
                  <p className="text-sm font-medium">{destination.name}</p>
                  <p className="text-xs text-muted-foreground">{destination.country}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {activities.length > 0 && (
        <Panel title="Saved activities">
          <ul className="divide-y divide-border">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between gap-4 py-3.5">
                <Link
                  href={`/activities/${activity.slug}`}
                  className="min-w-0 truncate text-sm font-medium hover:text-primary"
                >
                  {activity.name}
                </Link>
                <span className="shrink-0 text-sm font-medium">
                  {formatCurrency(activity.price)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {stays.length > 0 && (
        <Panel title="Saved stays">
          <ul className="divide-y divide-border">
            {stays.map((stay) => (
              <li key={stay.id} className="py-3.5">
                <Link href={`/stays/${stay.slug}`} className="hover:text-primary">
                  <p className="text-sm font-medium">{stay.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {stay.type.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
