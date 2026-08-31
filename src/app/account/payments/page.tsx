import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Panel } from '@/components/account/panels';
import { requireUserPage } from '@/lib/rbac/guard';
import { listMyPayments } from '@/lib/data/account';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Payments',
  robots: { index: false, follow: false },
};

export default async function MyPaymentsPage() {
  const user = await requireUserPage();
  const payments = await listMyPayments(user.id);

  return (
    <Panel
      title="Payments"
      description="Every payment you have submitted, and whether our team has verified it."
    >
      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Payments you submit against a booking will be listed here with their verification status."
          actionLabel="View my bookings"
          actionHref="/account/bookings"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <caption className="sr-only">Your payment history</caption>
            <thead className="border-b border-border text-left">
              <tr>
                <th scope="col" className="pb-3 font-medium">Booking</th>
                <th scope="col" className="pb-3 font-medium">Method</th>
                <th scope="col" className="pb-3 font-medium">Transaction ID</th>
                <th scope="col" className="pb-3 font-medium">Submitted</th>
                <th scope="col" className="pb-3 text-right font-medium">Amount</th>
                <th scope="col" className="pb-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="py-3.5">
                    <Link
                      href={`/account/bookings/${payment.booking.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {payment.booking.bookingNumber}
                    </Link>
                    <p className="mt-0.5 max-w-56 truncate text-xs text-muted-foreground">
                      {payment.booking.productTitle}
                    </p>
                  </td>
                  <td className="py-3.5">{payment.method}</td>
                  <td className="py-3.5 font-mono text-xs">
                    {payment.transactionId ?? '—'}
                  </td>
                  <td className="py-3.5 text-muted-foreground">
                    {formatDateTime(payment.createdAt)}
                  </td>
                  <td className="py-3.5 text-right font-medium">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="py-3.5 text-right">
                    <StatusBadge status={payment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
