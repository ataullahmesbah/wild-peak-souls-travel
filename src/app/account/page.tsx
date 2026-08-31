import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bell,
  CalendarCheck,
  CreditCard,
  LifeBuoy,
  Ticket,
} from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { Panel, StatTile } from '@/components/account/panels';
import { requireUserPage } from '@/lib/rbac/guard';
import { getAccountOverview } from '@/lib/data/account';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Account Overview',
  robots: { index: false, follow: false },
};

export default async function AccountOverviewPage() {
  const user = await requireUserPage();
  const overview = await getAccountOverview(user.id);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile icon={Ticket} label="Total bookings" value={overview.totalBookings} href="/account/bookings" />
        <StatTile
          icon={CalendarCheck}
          label="Upcoming trips"
          value={overview.upcomingTrips}
          href="/account/bookings?filter=upcoming"
          tone="success"
        />
        <StatTile
          icon={CreditCard}
          label="Awaiting payment"
          value={overview.pendingPayments}
          href="/account/payments"
          tone="warning"
        />
        <StatTile
          icon={LifeBuoy}
          label="Open support"
          value={overview.openTokens}
          href="/account/support"
          tone="info"
        />
        <StatTile
          icon={Bell}
          label="Unread notices"
          value={overview.unreadNotifications}
          href="/account/notifications"
          tone="warning"
        />
      </div>

      <Panel
        title="Recent bookings"
        description="Your five most recent bookings and their current status."
        action={{ label: 'View all', href: '/account/bookings' }}
      >
        {overview.recentBookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="When you book a trip it will appear here, with its payment status and invoice."
            actionLabel="Browse upcoming departures"
            actionHref="/events"
          />
        ) : (
          <ul className="divide-y divide-border">
            {overview.recentBookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/account/bookings/${booking.id}`}
                  className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3.5 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{booking.productTitle}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {booking.bookingNumber} ·{' '}
                      {booking.startDate
                        ? formatDate(booking.startDate)
                        : `Booked ${formatDate(booking.createdAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {formatCurrency(booking.total, booking.currency)}
                    </span>
                    <StatusBadge status={booking.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Plan your next trip">
          <p className="text-sm text-muted-foreground">
            Browse fixed departures, or tell us what you want and we will build it
            around your dates and budget.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/events" size="sm">
              Upcoming events
            </ButtonLink>
            <ButtonLink href="/custom-tour" variant="outline" size="sm">
              Request a custom trip
            </ButtonLink>
          </div>
        </Panel>

        <Panel title="Need a hand?">
          <p className="text-sm text-muted-foreground">
            Support tokens are tracked and assigned to a specific agent, so nothing
            gets lost in an email thread.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/account/support" size="sm">
              Open a support token
            </ButtonLink>
            <ButtonLink href="/faq" variant="outline" size="sm">
              Read the FAQ
            </ButtonLink>
          </div>
        </Panel>
      </div>
    </div>
  );
}
