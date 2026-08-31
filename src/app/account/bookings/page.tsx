import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Panel } from '@/components/account/panels';
import { requireUserPage } from '@/lib/rbac/guard';
import { listMyBookings } from '@/lib/data/account';
import { cn, formatCurrency, formatDateRange } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Bookings',
  robots: { index: false, follow: false },
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const raw = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const filter: Filter = FILTERS.some((f) => f.value === raw)
    ? (raw as Filter)
    : 'all';

  const bookings = await listMyBookings(user.id, filter);

  return (
    <div className="space-y-6">
      <nav aria-label="Booking filters" className="flex gap-1.5 overflow-x-auto">
        {FILTERS.map((item) => (
          <Link
            key={item.value}
            href={item.value === 'all' ? '/account/bookings' : `/account/bookings?filter=${item.value}`}
            aria-current={filter === item.value ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              filter === item.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Panel title={`${bookings.length} booking${bookings.length === 1 ? '' : 's'}`}>
        {bookings.length === 0 ? (
          <EmptyState
            title={
              filter === 'upcoming'
                ? 'No upcoming trips yet'
                : filter === 'cancelled'
                  ? 'No cancelled bookings'
                  : 'No bookings here yet'
            }
            description="Book a fixed departure, a tour or a stay and it will show up here with its payment status."
            actionLabel="Browse trips"
            actionHref="/events"
          />
        ) : (
          <ul className="divide-y divide-border">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/account/bookings/${booking.id}`}
                  className="-mx-2 flex flex-col gap-3 rounded-lg px-2 py-4 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{booking.productTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {booking.bookingNumber} ·{' '}
                      {formatDateRange(booking.startDate, booking.endDate)} ·{' '}
                      {booking.quantity}{' '}
                      {booking.productType === 'ACCOMMODATION' ? 'room' : 'traveller'}
                      {booking.quantity === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-medium">
                      {formatCurrency(booking.total, booking.currency)}
                    </span>
                    <StatusBadge status={booking.paymentStatus} />
                    <StatusBadge status={booking.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
