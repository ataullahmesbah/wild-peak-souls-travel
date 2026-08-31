import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { PaymentForm, type PaymentOption } from '@/components/checkout/payment-form';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import {
  SETTING_KEYS,
  getPublicSettings,
  settingBool,
} from '@/lib/settings';
import { formatCurrency, formatDateRange, toNumber } from '@/lib/utils';
import { PaymentStatus } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

type Params = Promise<{ bookingId: string }>;

export default async function CheckoutPage({ params }: { params: Params }) {
  const { bookingId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/${bookingId}`)}`);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      bookingNumber: true,
      productTitle: true,
      productType: true,
      startDate: true,
      endDate: true,
      quantity: true,
      guests: true,
      subtotal: true,
      discount: true,
      fees: true,
      total: true,
      currency: true,
      status: true,
      paymentStatus: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      items: {
        select: {
          id: true,
          nameSnapshot: true,
          descriptionSnapshot: true,
          quantity: true,
          unitPrice: true,
          total: true,
        },
      },
      payments: {
        select: {
          id: true,
          method: true,
          status: true,
          transactionId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  // A 404 rather than a 403 — a customer must not be able to confirm that
  // another customer's booking id exists.
  if (!booking || booking.userId !== user.id) notFound();

  const settings = await getPublicSettings();

  const paymentOptions: PaymentOption[] = [
    {
      method: 'BKASH',
      label: 'bKash',
      number: settings[SETTING_KEYS.PAYMENT_BKASH_NUMBER] ?? null,
      instructions: settings[SETTING_KEYS.PAYMENT_BKASH_INSTRUCTIONS] ?? null,
      available: settingBool(settings, SETTING_KEYS.PAYMENT_BKASH_ENABLED),
    },
    {
      method: 'NAGAD',
      label: 'Nagad',
      number: settings[SETTING_KEYS.PAYMENT_NAGAD_NUMBER] ?? null,
      instructions: settings[SETTING_KEYS.PAYMENT_NAGAD_INSTRUCTIONS] ?? null,
      available: settingBool(settings, SETTING_KEYS.PAYMENT_NAGAD_ENABLED),
    },
    {
      method: 'SSLCOMMERZ',
      label: 'Card / SSLCommerz',
      number: null,
      instructions:
        'Card payments are processed through SSLCommerz. Our team will send you a secure payment link.',
      available: settingBool(settings, SETTING_KEYS.PAYMENT_SSLCOMMERZ_ENABLED),
    },
  ];

  const pendingPayment = booking.payments[0];
  const isPaid = booking.paymentStatus === PaymentStatus.PAID;
  const isAwaitingVerification =
    booking.paymentStatus === PaymentStatus.PENDING_VERIFICATION;

  return (
    <Section className="py-10">
      <Container>
        <Breadcrumbs
          items={[
            { label: 'My bookings', href: '/account/bookings' },
            { label: booking.bookingNumber },
          ]}
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {isPaid ? 'Booking confirmed' : 'Complete your payment'}
          </h1>
          <StatusBadge status={booking.status} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
          {/* Order summary */}
          <div className="wps-card p-6">
            <h2 className="font-display text-lg font-semibold">Order summary</h2>

            <dl className="mt-5 space-y-3 border-b border-border pb-5 text-sm">
              <Row label="Booking number" value={booking.bookingNumber} />
              <Row label="Service" value={booking.productTitle} />
              {booking.startDate && (
                <Row
                  label="Dates"
                  value={formatDateRange(booking.startDate, booking.endDate)}
                />
              )}
              <Row
                label={booking.productType === 'ACCOMMODATION' ? 'Rooms' : 'Travellers'}
                value={String(booking.quantity)}
              />
              <Row label="Lead contact" value={booking.contactName} />
              <Row label="Phone" value={booking.contactPhone} />
            </dl>

            <ul className="mt-5 space-y-3">
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

            <dl className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
              <Row label="Subtotal" value={formatCurrency(booking.subtotal)} />
              {toNumber(booking.discount) > 0 && (
                <Row
                  label="Discount"
                  value={`−${formatCurrency(booking.discount)}`}
                  tone="success"
                />
              )}
              {toNumber(booking.fees) > 0 && (
                <Row label="Fees" value={formatCurrency(booking.fees)} />
              )}
              <div className="flex justify-between border-t border-border pt-3 font-display text-lg font-semibold">
                <dt>Total</dt>
                <dd>{formatCurrency(booking.total, booking.currency)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs text-muted-foreground">
              These prices were snapshotted when you booked and will not change if our
              catalogue prices do.
            </p>
          </div>

          {/* Payment panel */}
          <aside>
            {isPaid ? (
              <div className="wps-card p-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold">
                  Payment verified
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your booking is confirmed. We have emailed the details and your invoice
                  is available in your account.
                </p>
                <div className="mt-5 space-y-2">
                  <ButtonLink href={`/account/bookings/${booking.id}`} className="w-full">
                    View booking
                  </ButtonLink>
                  <ButtonLink href="/events" variant="outline" className="w-full">
                    Browse more trips
                  </ButtonLink>
                </div>
              </div>
            ) : isAwaitingVerification ? (
              <div className="wps-card p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft text-warning">
                  <Clock className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold">
                  Awaiting verification
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We have your transaction details and our team is matching them against
                  our merchant account. You will be notified as soon as it is confirmed.
                </p>
                {pendingPayment && (
                  <dl className="mt-4 space-y-2 rounded-field bg-muted/60 p-4 text-sm">
                    <Row label="Method" value={pendingPayment.method} />
                    <Row
                      label="Transaction ID"
                      value={pendingPayment.transactionId ?? '—'}
                    />
                  </dl>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Entered the wrong transaction ID?{' '}
                  <Link href="/contact" className="text-primary hover:underline">
                    Tell us
                  </Link>{' '}
                  and we will correct it.
                </p>
              </div>
            ) : (
              <PaymentForm
                bookingId={booking.id}
                bookingNumber={booking.bookingNumber}
                total={toNumber(booking.total)}
                options={paymentOptions}
              />
            )}
          </aside>
        </div>
      </Container>
    </Section>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success';
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={tone === 'success' ? 'text-success' : 'text-right font-medium'}>
        {value}
      </dd>
    </div>
  );
}
