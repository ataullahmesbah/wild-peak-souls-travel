import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, Receipt } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Panel, DetailRow } from '@/components/account/panels';
import { CancelBookingForm } from '@/components/account/cancel-booking-form';
import { requireUserPage } from '@/lib/rbac/guard';
import { getMyBooking } from '@/lib/data/account';
import { formatCurrency, formatDateRange, formatDateTime, toNumber } from '@/lib/utils';
import { BookingStatus, PaymentStatus } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Booking Details',
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

const CANCELLABLE: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.CONFIRMED,
];

export default async function BookingDetailPage({ params }: { params: Params }) {
  const user = await requireUserPage();
  const { id } = await params;

  // Scoped by userId inside the query — another customer's id resolves to null
  // and therefore a 404, never a 403 that would confirm it exists.
  const booking = await getMyBooking(user.id, id);
  if (!booking) notFound();

  const needsPayment =
    booking.paymentStatus === PaymentStatus.UNPAID ||
    booking.paymentStatus === PaymentStatus.FAILED;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{booking.productTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.bookingNumber} · booked {formatDateTime(booking.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={booking.paymentStatus} />
          <StatusBadge status={booking.status} />
        </div>
      </div>

      {needsPayment && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-warning/30 bg-warning-soft p-5">
          <div>
            <p className="font-medium text-warning">Payment is still outstanding</p>
            <p className="mt-1 text-sm text-foreground/80">
              Your place is held but not confirmed until payment is verified.
            </p>
          </div>
          <ButtonLink href={`/checkout/${booking.id}`}>Complete payment</ButtonLink>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Trip details">
          <dl className="divide-y divide-border">
            <DetailRow label="Booking number">{booking.bookingNumber}</DetailRow>
            <DetailRow label="Service type">
              {booking.productType.replace(/_/g, ' ').toLowerCase()}
            </DetailRow>
            <DetailRow label="Dates">
              {formatDateRange(booking.startDate, booking.endDate)}
            </DetailRow>
            <DetailRow label="Quantity">{booking.quantity}</DetailRow>
            <DetailRow label="Guests">{booking.guests}</DetailRow>
          </dl>
        </Panel>

        <Panel title="Contact on this booking">
          <dl className="divide-y divide-border">
            <DetailRow label="Name">{booking.contactName}</DetailRow>
            <DetailRow label="Email">{booking.contactEmail}</DetailRow>
            <DetailRow label="Phone">{booking.contactPhone}</DetailRow>
          </dl>
          {booking.notes && (
            <div className="mt-4 rounded-field bg-muted/60 p-4">
              <p className="text-xs font-medium text-muted-foreground">Your notes</p>
              <p className="mt-1 text-sm">{booking.notes}</p>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Price breakdown" description="Snapshotted at the time you booked.">
        <ul className="space-y-3">
          {booking.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 text-sm">
              <span className="min-w-0">
                <span className="block">{item.nameSnapshot}</span>
                {item.descriptionSnapshot && (
                  <span className="block text-xs text-muted-foreground">
                    {item.descriptionSnapshot}
                  </span>
                )}
                <span className="block text-xs text-muted-foreground">
                  {formatCurrency(item.unitPrice)} × {item.quantity}
                </span>
              </span>
              <span className="shrink-0 font-medium">{formatCurrency(item.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <DetailRow label="Subtotal">{formatCurrency(booking.subtotal)}</DetailRow>
          {toNumber(booking.discount) > 0 && (
            <DetailRow label="Discount">
              <span className="text-success">−{formatCurrency(booking.discount)}</span>
            </DetailRow>
          )}
          <div className="flex justify-between border-t border-border pt-3 font-display text-lg font-semibold">
            <dt>Total</dt>
            <dd>{formatCurrency(booking.total, booking.currency)}</dd>
          </div>
        </dl>
      </Panel>

      {booking.payments.length > 0 && (
        <Panel title="Payment history">
          <ul className="divide-y divide-border">
            {booking.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div>
                  <p className="text-sm font-medium">
                    {payment.method} · {formatCurrency(payment.amount)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {payment.transactionId ? `TrxID ${payment.transactionId} · ` : ''}
                    {formatDateTime(payment.createdAt)}
                  </p>
                  {payment.verificationNote && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Note: {payment.verificationNote}
                    </p>
                  )}
                </div>
                <StatusBadge status={payment.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {booking.invoice && (
        <Panel title="Invoice">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Receipt className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">{booking.invoice.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">
                  Issued {formatDateTime(booking.invoice.issuedAt)}
                </p>
              </div>
            </div>
            <ButtonLink
              href={`/api/invoices/${booking.id}`}
              variant="outline"
              size="sm"
              prefetch={false}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </ButtonLink>
          </div>
        </Panel>
      )}

      {booking.status === BookingStatus.COMPLETED && booking.reviews.length === 0 && (
        <Panel title="How was your trip?">
          <p className="text-sm text-muted-foreground">
            You travelled with us on this booking — a short review helps other
            travellers decide.
          </p>
          <ButtonLink href="/account/reviews" className="mt-4" size="sm">
            Write a review
          </ButtonLink>
        </Panel>
      )}

      {CANCELLABLE.includes(booking.status) && (
        <Panel
          title="Cancel this booking"
          description="Refund eligibility depends on how close to departure you cancel."
        >
          <CancelBookingForm bookingId={booking.id} />
          <p className="mt-3 text-xs text-muted-foreground">
            Read the{' '}
            <Link href="/policies/cancellation" className="text-primary hover:underline">
              cancellation policy
            </Link>{' '}
            before cancelling. Seats or rooms are released immediately.
          </p>
        </Panel>
      )}

      {booking.cancelledAt && (
        <Panel title="Cancellation">
          <dl className="divide-y divide-border">
            <DetailRow label="Cancelled on">{formatDateTime(booking.cancelledAt)}</DetailRow>
            {booking.cancelReason && (
              <DetailRow label="Reason">{booking.cancelReason}</DetailRow>
            )}
          </dl>
        </Panel>
      )}
    </div>
  );
}
