import type { NextRequest } from 'next/server';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { verifyPaymentSchema } from '@/lib/validation/booking';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { ensureInvoice } from '@/lib/booking';
import {
  BookingStatus,
  NotificationType,
  PaymentStatus,
  TransactionType,
} from '@/generated/prisma';

/**
 * The trusted side of the payment flow.
 *
 * Only a staff member holding `payments.verify` can move a booking to PAID.
 * Verifying also records the income transaction and issues the invoice, so the
 * finance ledger and the booking can never disagree.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.PAYMENTS_VERIFY);
  const body = await request.json().catch(() => ({}));
  const input = verifyPaymentSchema.parse(body);

  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      method: true,
      booking: {
        select: {
          id: true,
          userId: true,
          bookingNumber: true,
          productTitle: true,
        },
      },
    },
  });

  if (!payment) {
    throw new BusinessError('Payment not found.', 'NOT_FOUND', 404);
  }
  if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
    throw new BusinessError(
      'This payment has already been processed.',
      'ALREADY_PROCESSED',
    );
  }

  const approving = input.decision === 'VERIFY';

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: approving ? PaymentStatus.PAID : PaymentStatus.FAILED,
        verifiedAt: new Date(),
        verifiedById: staff.id,
        verificationNote: input.note ?? null,
      },
    });

    await tx.booking.update({
      where: { id: payment.booking.id },
      data: approving
        ? {
            paymentStatus: PaymentStatus.PAID,
            status: BookingStatus.CONFIRMED,
          }
        : {
            paymentStatus: PaymentStatus.FAILED,
            status: BookingStatus.PAYMENT_PENDING,
          },
    });

    if (approving) {
      await tx.financialTransaction.create({
        data: {
          type: TransactionType.INCOME,
          category: 'BOOKING_PAYMENT',
          amount: payment.amount,
          currency: payment.currency,
          referenceType: 'Payment',
          referenceId: payment.id,
          description: `${payment.method} payment for ${payment.booking.bookingNumber}`,
          createdById: staff.id,
        },
      });
    }
  });

  if (approving) await ensureInvoice(payment.booking.id);

  await recordAudit({
    actorId: staff.id,
    action: approving
      ? AUDIT_ACTIONS.PAYMENT_VERIFIED
      : AUDIT_ACTIONS.PAYMENT_REJECTED,
    entityType: 'Payment',
    entityId: payment.id,
    metadata: {
      bookingNumber: payment.booking.bookingNumber,
      amount: payment.amount.toString(),
      note: input.note,
    },
  });

  await notifyUser({
    userId: payment.booking.userId,
    type: NotificationType.PAYMENT,
    title: approving
      ? `Booking ${payment.booking.bookingNumber} confirmed`
      : `Payment could not be verified — ${payment.booking.bookingNumber}`,
    message: approving
      ? `Your payment is verified and your place on ${payment.booking.productTitle} is confirmed.`
      : input.note ??
        'We could not match your transaction ID. Please check it and submit again.',
    link: `/account/bookings/${payment.booking.id}`,
    targetType: 'Booking',
    targetId: payment.booking.id,
  });

  return apiSuccess({ decision: input.decision });
});
