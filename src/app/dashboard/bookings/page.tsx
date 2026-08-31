import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { AdminCard, AdminPageHeader, DataTable, TabLinks } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminBookings } from '@/lib/data/admin';
import { formatCurrency, formatDate, parsePageParam } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bookings',
  robots: { index: false, follow: false },
};

const TABS = [
  { value: '', label: 'All' },
  { value: 'PAYMENT_PENDING', label: 'Awaiting payment' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermissionPage(PERMISSIONS.BOOKINGS_READ);

  const params = await searchParams;
  const status = first(params.status) ?? '';
  const query = first(params.q);
  const page = parsePageParam(first(params.page));

  const result = await listAdminBookings({
    page,
    status: status || undefined,
    query,
  });

  return (
    <>
      <AdminPageHeader
        title="Bookings"
        description="Every booking across events, tours, activities and stays."
      />

      <TabLinks tabs={TABS} current={status} basePath="/dashboard/bookings" />

      <AdminCard
        title={`${result.total} booking${result.total === 1 ? '' : 's'}`}
        action={
          <form action="/dashboard/bookings" className="w-full sm:w-64">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="booking-search" className="sr-only">
              Search bookings
            </label>
            <input
              id="booking-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Booking number, name, email…"
              className="h-9 w-full rounded-field border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none"
            />
          </form>
        }
      >
        {result.items.length === 0 ? (
          <EmptyState
            title="No bookings match"
            description="Try clearing the filter or searching for a different booking number."
          />
        ) : (
          <>
            <DataTable
              headers={[
                'Booking',
                'Customer',
                'Service',
                'Travel date',
                'Qty',
                'Amount',
                'Payment',
                'Status',
                'Created',
              ]}
              minWidth="64rem"
            >
              {result.items.map((booking) => (
                <tr key={booking.id} className="transition-colors hover:bg-muted/40">
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
                  <td className="py-3 pr-4">{booking.quantity}</td>
                  <td className="py-3 pr-4 font-medium">
                    {formatCurrency(booking.total, booking.currency)}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={booking.paymentStatus} />
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(booking.createdAt)}
                  </td>
                </tr>
              ))}
            </DataTable>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              basePath="/dashboard/bookings"
              searchParams={{ status, q: query }}
            />
          </>
        )}
      </AdminCard>
    </>
  );
}
