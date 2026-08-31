import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StatusBadge } from '@/components/ui/badge';
import { AdminCard, AdminPageHeader } from '@/components/admin/admin-ui';
import { DetailRow } from '@/components/account/panels';
import { BookingStatusForm } from '@/components/admin/booking-status-form';
import { PaymentVerifyForm } from '@/components/admin/payment-verify-form';
import { requirePermissionPage, hasPermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { getAdminBooking } from '@/lib/data/admin';
import { formatCurrency, formatDateRange, formatDateTime, toNumber } from '@/lib/utils';
import { PaymentStatus } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Booking Detail',
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function AdminBookingDetailPage({ params }: { params: Params }) {
  const staff = await requirePermissionPage(PERMISSIONS.BOOKINGS_READ);
  const { id } = await params;

  const booking = await getAdminBooking(id);
  if (!booking) notFound();

  const canUpdate = hasPermission(staff, PERMISSIONS.BOOKINGS_UPDATE);
  const canVerify = hasPermission(staff, PERMISSIONS.PAYMENTS_VERIFY);
  const pendingPayment = booking.payments.find(
    (p) => p.status === PaymentStatus.PENDING_VERIFICATION,
  );

  return (
    <>
      <AdminPageHeader
        title={booking.bookingNumber}
        description={booking.productTitle}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={booking.paymentStatus} />
            <StatusBadge status={booking.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          <AdminCard title="Booking details">
            <dl className="divide-y divide-border">
              <DetailRow label="Service type">
                {booking.productType.replace(/_/g, ' ').toLowerCase()}
              </DetailRow>
              <DetailRow label="Travel dates">
                {formatDateRange(booking.startDate, booking.endDate)}
              </DetailRow>
              <DetailRow label="Quantity">{booking.quantity}</DetailRow>
              <DetailRow label="Guests">{booking.guests}</DetailRow>
              <DetailRow label="Created">{formatDateTime(booking.createdAt)}</DetailRow>
              {booking.invoice && (
                <DetailRow label="Invoice">
                  <Link
                    href={`/api/invoices/${booking.id}`}
                    className="text-primary hover:underline"
                    prefetch={false}
                  >
                    {booking.invoice.invoiceNumber}
                  </Link>
                </DetailRow>
              )}
            </dl>

            {booking.notes && (
              <div className="mt-5 rounded-field bg-muted/60 p-4">
                <p className="text-xs font-medium text-muted-foreground">Customer notes</p>
                <p className="mt-1 whitespace-pre-line text-sm">{booking.notes}</p>
              </div>
            )}
            {booking.staffNotes && (
              <div className="mt-3 rounded-field border border-warning/30 bg-warning-soft p-4">
                <p className="text-xs font-medium text-warning">
                  Internal notes (not visible to the customer)
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">{booking.staffNotes}</p>
              </div>
            )}
          </AdminCard>

          <AdminCard
            title="Price breakdown"
            description="Snapshotted at booking time — catalogue changes do not affect it."
          >
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
            <dl className="mt-5 space-y-1 border-t border-border pt-4 text-sm">
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
          </AdminCard>

          <AdminCard title="Payment history">
            {booking.payments.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No payment has been submitted for this booking yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {booking.payments.map((payment) => (
                  <li key={payment.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {payment.method} · {formatCurrency(payment.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          TrxID{' '}
                          <span className="font-mono">{payment.transactionId ?? '—'}</span>
                          {payment.senderNumber ? ` · from ${payment.senderNumber}` : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Submitted {formatDateTime(payment.createdAt)}
                          {payment.verifiedAt && payment.verifiedBy
                            ? ` · reviewed by ${payment.verifiedBy.name} on ${formatDateTime(payment.verifiedAt)}`
                            : ''}
                        </p>
                        {payment.verificationNote && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Note: {payment.verificationNote}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={payment.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <aside className="space-y-6">
          <AdminCard title="Customer">
            <dl className="divide-y divide-border">
              <DetailRow label="Account">{booking.user.name}</DetailRow>
              <DetailRow label="Email">{booking.user.email}</DetailRow>
              <DetailRow label="Phone">{booking.user.phone ?? '—'}</DetailRow>
              <DetailRow label="Member since">
                {formatDateTime(booking.user.createdAt)}
              </DetailRow>
            </dl>
            <p className="mt-4 text-xs font-medium text-muted-foreground">
              Contact given on this booking
            </p>
            <dl className="divide-y divide-border">
              <DetailRow label="Name">{booking.contactName}</DetailRow>
              <DetailRow label="Email">{booking.contactEmail}</DetailRow>
              <DetailRow label="Phone">{booking.contactPhone}</DetailRow>
            </dl>
          </AdminCard>

          {canVerify && pendingPayment && (
            <AdminCard
              title="Verify payment"
              description="Confirm the transaction against the merchant account before approving."
            >
              <PaymentVerifyForm
                paymentId={pendingPayment.id}
                amount={formatCurrency(pendingPayment.amount)}
                transactionId={pendingPayment.transactionId ?? '—'}
                method={pendingPayment.method}
              />
            </AdminCard>
          )}

          {canUpdate && (
            <AdminCard
              title="Update status"
              description="Cancelling or refunding releases the held inventory."
            >
              <BookingStatusForm
                bookingId={booking.id}
                currentStatus={booking.status}
              />
            </AdminCard>
          )}
        </aside>
      </div>
    </>
  );
}
