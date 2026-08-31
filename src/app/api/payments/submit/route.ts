import type { NextRequest } from 'next/server';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/rbac/guard';
import { submitPaymentSchema } from '@/lib/validation/booking';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyStaffWithPermission } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import {
  SETTING_KEYS,
  getPublicSettings,
  settingBool,
} from '@/lib/settings';
import {
  BookingStatus,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
} from '@/generated/prisma';

/** Which dashboard toggle governs each method. */
const METHOD_TOGGLE: Record<PaymentMethod, string | null> = {
  BKASH: SETTING_KEYS.PAYMENT_BKASH_ENABLED,
  NAGAD: SETTING_KEYS.PAYMENT_NAGAD_ENABLED,
  SSLCOMMERZ: SETTING_KEYS.PAYMENT_SSLCOMMERZ_ENABLED,
  BANK_TRANSFER: null,
  CASH: null,
};

/**
 * Records a customer's claim that they have paid.
 *
 * This NEVER marks a booking as paid. The payment row is created as
 * PENDING_VERIFICATION and the amount is taken from the booking, not from the
 * request body — a customer cannot declare their own amount or mark themselves
 * settled. Only an authorised staff member's verification confirms payment.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = submitPaymentSchema.parse(body);

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      userId: true,
      bookingNumber: true,
      total: true,
      currency: true,
      status: true,
      paymentStatus: true,
    },
  });

  if (!booking || booking.userId !== user.id) {
    throw new BusinessError('Booking not found.', 'NOT_FOUND', 404);
  }

  if (booking.paymentStatus === PaymentStatus.PAID) {
    throw new BusinessError('This booking is already paid.', 'ALREADY_PAID');
  }
  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.EXPIRED
  ) {
    throw new BusinessError(
      'This booking is no longer active. Please create a new booking.',
      'INVALID_STATE',
    );
  }

  const method = input.method as PaymentMethod;
  const settings = await getPublicSettings();
  const toggle = METHOD_TOGGLE[method];
  if (toggle && !settingBool(settings, toggle)) {
    throw new BusinessError(
      'That payment method is not currently available.',
      'METHOD_DISABLED',
    );
  }

  // One pending claim per booking — a resubmission updates it rather than
  // creating duplicates for staff to reconcile.
  const existing = await prisma.payment.findFirst({
    where: { bookingId: booking.id, status: PaymentStatus.PENDING_VERIFICATION },
    select: { id: true },
  });

  const payment = existing
    ? await prisma.payment.update({
        where: { id: existing.id },
        data: {
          method,
          senderNumber: input.senderNumber ?? null,
          transactionId: input.transactionId,
          amount: booking.total,
        },
        select: { id: true },
      })
    : await prisma.payment.create({
        data: {
          bookingId: booking.id,
          method,
          // Amount comes from the booking record, never the client.
          amount: booking.total,
          currency: booking.currency,
          status: PaymentStatus.PENDING_VERIFICATION,
          senderNumber: input.senderNumber ?? null,
          transactionId: input.transactionId,
        },
        select: { id: true },
      });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: PaymentStatus.PENDING_VERIFICATION,
      status: BookingStatus.PAYMENT_PENDING,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.PAYMENT_SUBMITTED,
    entityType: 'Payment',
    entityId: payment.id,
    metadata: {
      bookingNumber: booking.bookingNumber,
      method,
      transactionId: input.transactionId,
    },
  });

  await notifyStaffWithPermission(PERMISSIONS.PAYMENTS_VERIFY, {
    type: NotificationType.PAYMENT,
    title: `Payment awaiting verification — ${booking.bookingNumber}`,
    message: `${method} · TrxID ${input.transactionId}`,
    link: `/dashboard/payments/${payment.id}`,
    targetType: 'Payment',
    targetId: payment.id,
  });

  return apiSuccess({ submitted: true, paymentId: payment.id }, 201);
});
