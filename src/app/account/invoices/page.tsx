import type { Metadata } from 'next';
import Link from 'next/link';
import { Download } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { Panel } from '@/components/account/panels';
import { requireUserPage } from '@/lib/rbac/guard';
import { listMyInvoices } from '@/lib/data/account';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Invoices',
  robots: { index: false, follow: false },
};

export default async function MyInvoicesPage() {
  const user = await requireUserPage();
  const invoices = await listMyInvoices(user.id);

  return (
    <Panel
      title="Invoices"
      description="An invoice is issued once a payment has been verified by our team."
    >
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Invoices appear here as soon as a payment on one of your bookings is verified."
          actionLabel="View my bookings"
          actionHref="/account/bookings"
        />
      ) : (
        <ul className="divide-y divide-border">
          {invoices.map((invoice) => (
            <li
              key={invoice.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{invoice.invoiceNumber}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <Link
                    href={`/account/bookings/${invoice.booking.id}`}
                    className="text-primary hover:underline"
                  >
                    {invoice.booking.bookingNumber}
                  </Link>{' '}
                  · {invoice.booking.productTitle} · issued {formatDate(invoice.issuedAt)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </span>
                <ButtonLink
                  href={`/api/invoices/${invoice.booking.id}`}
                  variant="outline"
                  size="sm"
                  prefetch={false}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
