import type { NextRequest } from 'next/server';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/rbac/guard';
import { releaseBookingInventory } from '@/lib/booking';
import { cancelBookingSchema } from '@/lib/validation/booking';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyStaffWithPermission } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { BookingStatus, NotificationType, PaymentStatus } from '@/generated/prisma';

/** Statuses a customer may cancel from on their own. */
const CUSTOMER_CANCELLABLE: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.CONFIRMED,
];

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = cancelBookingSchema.parse(body);

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      userId: true,
      bookingNumber: true,
      status: true,
      paymentStatus: true,
      startDate: true,
    },
  });

  // Ownership is checked here, not just in the UI: a customer must never be
  // able to cancel another customer's booking by guessing an id.
  if (!booking || booking.userId !== user.id) {
    throw new BusinessError('Booking not found.', 'NOT_FOUND', 404);
  }

  if (!CUSTOMER_CANCELLABLE.includes(booking.status)) {
    throw new BusinessError(
      `A booking that is ${booking.status.toLowerCase().replace(/_/g, ' ')} cannot be cancelled here. Contact support.`,
      'INVALID_STATE',
    );
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: input.reason,
    },
  });

  // Free the seats or room-nights so someone else can take them.
  await releaseBookingInventory(booking.id);

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.BOOKING_STATUS_UPDATED,
    entityType: 'Booking',
    entityId: booking.id,
    metadata: {
      from: booking.status,
      to: BookingStatus.CANCELLED,
      reason: input.reason,
      by: 'customer',
    },
  });

  await notifyStaffWithPermission(PERMISSIONS.BOOKINGS_READ, {
    type: NotificationType.BOOKING,
    title: `Booking ${booking.bookingNumber} cancelled`,
    message:
      booking.paymentStatus === PaymentStatus.PAID
        ? 'A paid booking was cancelled by the customer — a refund may be due.'
        : 'The customer cancelled before payment was verified.',
    link: `/dashboard/bookings/${booking.id}`,
    targetType: 'Booking',
    targetId: booking.id,
  });

  return apiSuccess({ cancelled: true });
});
