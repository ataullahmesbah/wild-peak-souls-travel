import type { Metadata } from 'next';
import { CalendarRange, ClipboardList, TrendingUp, Users } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable, MetricCard } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { prisma } from '@/lib/prisma';
import { reportingWindow } from '@/lib/data/admin';
import { formatCurrency, formatDate, toNumber } from '@/lib/utils';
import { BookingStatus } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reports',
  robots: { index: false, follow: false },
};

export default async function AdminReportsPage() {
  await requirePermissionPage(PERMISSIONS.REPORTS_READ);

  const { from: since } = reportingWindow(90);

  const [byProductType, topEvents, newCustomers, confirmedAgg] = await Promise.all([
    prisma.booking.groupBy({
      by: ['productType'],
      where: { createdAt: { gte: since } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.event.findMany({
      where: { startAt: { gte: since } },
      select: {
        id: true,
        title: true,
        capacity: true,
        reservedSeats: true,
        price: true,
        startAt: true,
        status: true,
      },
      orderBy: { reservedSeats: 'desc' },
      take: 10,
    }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.booking.aggregate({
      where: {
        createdAt: { gte: since },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const totalBookings = byProductType.reduce((sum, row) => sum + row._count, 0);
  const grossValue = toNumber(confirmedAgg._sum.total);
  const averageValue =
    confirmedAgg._count > 0 ? grossValue / confirmedAgg._count : 0;

  return (
    <>
      <AdminPageHeader
        title="Reports"
        description="Operational summary for the last 90 days. Figures count confirmed and completed bookings only, so unpaid holds do not inflate them."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href="/api/dashboard/reports/export?report=bookings&days=90"
              variant="outline"
              size="sm"
            >
              Bookings CSV
            </ButtonLink>
            <ButtonLink
              href="/api/dashboard/reports/export?report=accounts&days=90"
              variant="outline"
              size="sm"
            >
              Accounts CSV
            </ButtonLink>
            <ButtonLink
              href="/api/dashboard/reports/export?report=transactions&days=90"
              variant="outline"
              size="sm"
            >
              Transactions CSV
            </ButtonLink>
          </div>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={ClipboardList} label="Bookings created" value={totalBookings} />
          <MetricCard
            icon={TrendingUp}
            label="Confirmed booking value"
            value={formatCurrency(grossValue)}
            tone="success"
          />
          <MetricCard
            icon={TrendingUp}
            label="Average booking value"
            value={formatCurrency(averageValue)}
            tone="info"
          />
          <MetricCard icon={Users} label="New customers" value={newCustomers} tone="primary" />
        </div>

        <AdminCard
          title="Bookings by product type"
          description="Where demand is actually coming from."
        >
          {byProductType.length === 0 ? (
            <EmptyState title="No bookings in this period" description="Try again once bookings start coming in." />
          ) : (
            <DataTable headers={['Product type', 'Bookings', 'Share', 'Total value']}>
              {byProductType.map((row) => {
                const share =
                  totalBookings > 0 ? Math.round((row._count / totalBookings) * 100) : 0;
                return (
                  <tr key={row.productType}>
                    <td className="py-3 pr-4 capitalize">
                      {row.productType.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="py-3 pr-4">{row._count}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{share}%</span>
                      </div>
                    </td>
                    <td className="py-3 font-medium">
                      {formatCurrency(toNumber(row._sum.total))}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </AdminCard>

        <AdminCard
          title="Event fill rates"
          description="Departures ranked by seats sold — useful for deciding what to repeat."
        >
          {topEvents.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No events in this period"
              description="Published departures will be ranked here by how well they filled."
            />
          ) : (
            <DataTable headers={['Event', 'Departs', 'Sold', 'Fill rate', 'Seat value']}>
              {topEvents.map((event) => {
                const fill =
                  event.capacity > 0
                    ? Math.round((event.reservedSeats / event.capacity) * 100)
                    : 0;
                return (
                  <tr key={event.id}>
                    <td className="py-3 pr-4">
                      <p className="max-w-56 truncate font-medium">{event.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {event.status.replace(/_/g, ' ').toLowerCase()}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(event.startAt)}
                    </td>
                    <td className="py-3 pr-4">
                      {event.reservedSeats} / {event.capacity}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, fill)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{fill}%</span>
                      </div>
                    </td>
                    <td className="py-3 font-medium">
                      {formatCurrency(toNumber(event.price) * event.reservedSeats)}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </AdminCard>
      </div>
    </>
  );
}
