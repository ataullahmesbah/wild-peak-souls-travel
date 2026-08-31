import type { NextRequest } from 'next/server';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { updateBookingStatusSchema } from '@/lib/validation/booking';
import { releaseBookingInventory } from '@/lib/booking';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { BookingStatus, NotificationType, PaymentStatus } from '@/generated/prisma';

/** Statuses that put the held seats or room-nights back into the pool. */
const RELEASES_INVENTORY: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.EXPIRED,
];

export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.BOOKINGS_UPDATE);
  const body = await request.json().catch(() => ({}));
  const input = updateBookingStatusSchema.parse(body);

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      userId: true,
      bookingNumber: true,
      productTitle: true,
      status: true,
    },
  });

  if (!booking) {
    throw new BusinessError('Booking not found.', 'NOT_FOUND', 404);
  }

  const nextStatus = input.status as BookingStatus;
  if (nextStatus === booking.status) {
    return apiSuccess({ updated: false, status: nextStatus });
  }

  const releasing =
    RELEASES_INVENTORY.includes(nextStatus) &&
    !RELEASES_INVENTORY.includes(booking.status);

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: nextStatus,
      ...(nextStatus === BookingStatus.CANCELLED
        ? { cancelledAt: new Date(), cancelReason: input.reason ?? null }
        : {}),
      ...(nextStatus === BookingStatus.REFUNDED
        ? { paymentStatus: PaymentStatus.REFUNDED }
        : {}),
    },
  });

  if (releasing) {
    await releaseBookingInventory(booking.id);
  }

  await recordAudit({
    actorId: staff.id,
    action: AUDIT_ACTIONS.BOOKING_STATUS_UPDATED,
    entityType: 'Booking',
    entityId: booking.id,
    metadata: {
      bookingNumber: booking.bookingNumber,
      from: booking.status,
      to: nextStatus,
      reason: input.reason,
      inventoryReleased: releasing,
    },
  });

  await notifyUser({
    userId: booking.userId,
    type: NotificationType.BOOKING,
    title: `Booking ${booking.bookingNumber} updated`,
    message: `Your booking for ${booking.productTitle} is now ${nextStatus
      .toLowerCase()
      .replace(/_/g, ' ')}.${input.reason ? ` ${input.reason}` : ''}`,
    link: `/account/bookings/${booking.id}`,
    targetType: 'Booking',
    targetId: booking.id,
  });

  return apiSuccess({ updated: true, status: nextStatus });
});
