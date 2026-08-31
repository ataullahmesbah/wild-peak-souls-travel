import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { requireUser } from '@/lib/rbac/guard';
import { clientIpFromHeaders } from '@/lib/auth/session';
import { createEventBooking } from '@/lib/booking';
import { createEventBookingSchema } from '@/lib/validation/booking';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';

/**
 * Creates an event booking.
 *
 * The client sends only what it is allowed to choose — event, quantity,
 * add-ons and contact details. Prices, discounts and totals are never accepted
 * from the browser; `createEventBooking` derives them from the catalogue and
 * claims seats inside a serializable transaction.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`booking:${user.id}:${ip}`, RATE_LIMITS.BOOKING_CREATE);
  if (!limit.allowed) {
    return apiError(
      'You are creating bookings very quickly. Please wait a moment and try again.',
      429,
      { code: 'RATE_LIMITED' },
    );
  }

  const body = await request.json().catch(() => ({}));
  const input = createEventBookingSchema.parse(body);

  const booking = await createEventBooking({
    userId: user.id,
    eventId: input.eventId,
    quantity: input.quantity,
    optionIds: input.optionIds ?? [],
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    notes: input.notes,
  });

  return apiSuccess(booking, 201);
});
