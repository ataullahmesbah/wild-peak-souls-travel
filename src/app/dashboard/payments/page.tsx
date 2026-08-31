import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable, TabLinks } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDateTime, relativeTime } from '@/lib/utils';
import type { Prisma } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payments',
  robots: { index: false, follow: false },
};

const TABS = [
  { value: 'PENDING_VERIFICATION', label: 'Awaiting verification' },
  { value: 'PAID', label: 'Verified' },
  { value: 'FAILED', label: 'Rejected' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: '', label: 'All' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermissionPage(PERMISSIONS.PAYMENTS_READ);

  const params = await searchParams;
  const status = first(params.status) ?? 'PENDING_VERIFICATION';

  const payments = await prisma.payment.findMany({
    where: status
      ? { status: status as Prisma.EnumPaymentStatusFilter['equals'] }
      : {},
    select: {
      id: true,
      method: true,
      amount: true,
      currency: true,
      status: true,
      transactionId: true,
      senderNumber: true,
      createdAt: true,
      verifiedAt: true,
      verifiedBy: { select: { name: true } },
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          productTitle: true,
          user: { select: { name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: status === 'PENDING_VERIFICATION' ? { createdAt: 'asc' } : { createdAt: 'desc' },
    take: 60,
  });

  return (
    <>
      <AdminPageHeader
        title="Payments"
        description="Manual bKash and Nagad transactions are verified here. A payment is only trusted once a staff member confirms it against the merchant account."
      />

      <TabLinks tabs={TABS} current={status} basePath="/dashboard/payments" />

      <AdminCard title={`${payments.length} payment${payments.length === 1 ? '' : 's'}`}>
        {payments.length === 0 ? (
          <EmptyState
            title={
              status === 'PENDING_VERIFICATION'
                ? 'Nothing waiting for verification'
                : 'No payments in this state'
            }
            description="Submitted payments appear here as soon as a customer enters their transaction ID."
          />
        ) : (
          <DataTable
            headers={[
              'Booking',
              'Customer',
              'Method',
              'Transaction ID',
              'Amount',
              'Submitted',
              'Status',
              '',
            ]}
            minWidth="62rem"
          >
            {payments.map((payment) => (
              <tr key={payment.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <Link
                    href={`/dashboard/bookings/${payment.booking.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {payment.booking.bookingNumber}
                  </Link>
                  <p className="max-w-44 truncate text-xs text-muted-foreground">
                    {payment.booking.productTitle}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <p className="max-w-36 truncate">{payment.booking.user.name}</p>
                  <p className="max-w-36 truncate text-xs text-muted-foreground">
                    {payment.booking.user.phone ?? payment.booking.user.email}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <p>{payment.method}</p>
                  {payment.senderNumber && (
                    <p className="text-xs text-muted-foreground">
                      from {payment.senderNumber}
                    </p>
                  )}
                </td>
                <td className="py-3 pr-4 font-mono text-xs">
                  {payment.transactionId ?? '—'}
                </td>
                <td className="py-3 pr-4 font-medium">
                  {formatCurrency(payment.amount, payment.currency)}
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {relativeTime(payment.createdAt)}
                  {payment.verifiedAt && payment.verifiedBy && (
                    <p className="mt-0.5">
                      by {payment.verifiedBy.name} · {formatDateTime(payment.verifiedAt)}
                    </p>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={payment.status} />
                </td>
                <td className="py-3">
                  <Link
                    href={`/dashboard/bookings/${payment.booking.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminCard>
    </>
  );
}
