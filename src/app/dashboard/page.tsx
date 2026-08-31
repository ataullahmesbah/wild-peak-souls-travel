import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  BadgeDollarSign,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  LifeBuoy,
  Receipt,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import {
  AdminCard,
  AdminPageHeader,
  DataTable,
  MetricCard,
} from '@/components/admin/admin-ui';
import { requireStaffPage, hasPermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import {
  getDashboardMetrics,
  getPendingPaymentQueue,
  getRecentBookings,
} from '@/lib/data/admin';
import { formatCurrency, formatDate, relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const user = await requireStaffPage();

  return (
    <>
      <AdminPageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description="Everything needing attention across the agency, filtered to what your role can act on."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          canSeeFinance={hasPermission(user, PERMISSIONS.FINANCE_READ)}
          canSeeBookings={hasPermission(user, PERMISSIONS.BOOKINGS_READ)}
          canVerifyPayments={hasPermission(user, PERMISSIONS.PAYMENTS_VERIFY)}
        />
      </Suspense>
    </>
  );
}

async function DashboardContent({
  canSeeFinance,
  canSeeBookings,
  canVerifyPayments,
}: {
  canSeeFinance: boolean;
  canSeeBookings: boolean;
  canVerifyPayments: boolean;
}) {
  const [metrics, recentBookings, paymentQueue] = await Promise.all([
    getDashboardMetrics(),
    canSeeBookings ? getRecentBookings(8) : Promise.resolve([]),
    canVerifyPayments ? getPendingPaymentQueue(6) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ClipboardList}
          label="Total bookings"
          value={metrics.totalBookings}
          href="/dashboard/bookings"
        />
        <MetricCard
          icon={ClipboardList}
          label="Pending bookings"
          value={metrics.pendingBookings}
          hint="Awaiting payment or confirmation"
          href="/dashboard/bookings?status=PAYMENT_PENDING"
          tone="warning"
        />
        <MetricCard
          icon={CalendarRange}
          label="Upcoming events"
          value={metrics.upcomingEvents}
          href="/dashboard/events"
          tone="info"
        />
        <MetricCard
          icon={Users}
          label="Seats still available"
          value={metrics.availableCapacity}
          hint="Across all published departures"
          href="/dashboard/events"
          tone="success"
        />
        <MetricCard
          icon={Receipt}
          label="Payments to verify"
          value={metrics.pendingPayments}
          href="/dashboard/payments"
          tone={metrics.pendingPayments > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          icon={FileCheck2}
          label="New visa requests"
          value={metrics.newVisaRequests}
          href="/dashboard/visa/requests"
          tone="info"
        />
        <MetricCard
          icon={LifeBuoy}
          label="Open support tokens"
          value={metrics.openTokens}
          href="/dashboard/support"
          tone={metrics.openTokens > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          icon={Star}
          label="Reviews to moderate"
          value={metrics.pendingReviews}
          href="/dashboard/reviews"
          tone="info"
        />
      </div>

      {canSeeFinance && (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            icon={TrendingUp}
            label="Revenue this month"
            value={formatCurrency(metrics.revenue)}
            href="/dashboard/finance"
            tone="success"
          />
          <MetricCard
            icon={TrendingDown}
            label="Expenses this month"
            value={formatCurrency(metrics.expenses)}
            href="/dashboard/finance"
            tone="destructive"
          />
          <MetricCard
            icon={BadgeDollarSign}
            label="Net this month"
            value={formatCurrency(metrics.net)}
            href="/dashboard/finance"
            tone={metrics.net >= 0 ? 'success' : 'destructive'}
          />
        </div>
      )}

      {canVerifyPayments && (
        <AdminCard
          title="Payments awaiting verification"
          description="Match each transaction ID against the merchant account before verifying."
          action={
            <Link href="/dashboard/payments" className="text-sm font-medium text-primary hover:underline">
              Open queue
            </Link>
          }
        >
          {paymentQueue.length === 0 ? (
            <EmptyState
              title="Nothing waiting"
              description="Every submitted payment has been reviewed."
            />
          ) : (
            <DataTable
              headers={['Booking', 'Customer', 'Method', 'Transaction ID', 'Amount', 'Waiting']}
            >
              {paymentQueue.map((payment) => (
                <tr key={payment.id}>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/dashboard/payments/${payment.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {payment.booking.bookingNumber}
                    </Link>
                    <p className="max-w-48 truncate text-xs text-muted-foreground">
                      {payment.booking.productTitle}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <p>{payment.booking.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.booking.user.phone ?? payment.booking.user.email}
                    </p>
                  </td>
                  <td className="py-3 pr-4">{payment.method}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{payment.transactionId}</td>
                  <td className="py-3 pr-4 font-medium">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {relativeTime(payment.createdAt)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </AdminCard>
      )}

      {canSeeBookings && (
        <AdminCard
          title="Recent bookings"
          action={
            <Link href="/dashboard/bookings" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {recentBookings.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              description="Bookings created on the website will appear here."
            />
          ) : (
            <DataTable
              headers={['Booking', 'Customer', 'Service', 'Date', 'Amount', 'Payment', 'Status']}
            >
              {recentBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {booking.bookingNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="max-w-40 truncate">{booking.user.name}</p>
                    <p className="max-w-40 truncate text-xs text-muted-foreground">
                      {booking.user.email}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="max-w-48 truncate">{booking.productTitle}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {booking.productType.toLowerCase()}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {booking.startDate ? formatDate(booking.startDate) : '—'}
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    {formatCurrency(booking.total, booking.currency)}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={booking.paymentStatus} />
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </AdminCard>
      )}
    </div>
  );
}
