import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, clientIpFromHeaders } from '@/lib/auth/session';
import { flightInquirySchema } from '@/lib/validation/leads';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { notifyStaffWithPermission, notifyUser } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { NotificationType, Prisma } from '@/generated/prisma';

/**
 * Creates a flight *inquiry* — never a booking.
 *
 * The price the customer saw is recorded as `displayedPrice` alongside its
 * source and timestamp, so staff can see exactly what was shown without the
 * system ever treating it as a confirmed fare.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = flightInquirySchema.parse(body);

  if (input.website) return apiSuccess({ received: true });

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`flight-inquiry:${ip}`, RATE_LIMITS.PUBLIC_FORM);
  if (!limit.allowed) {
    return apiError('Too many requests. Please try again later.', 429, {
      code: 'RATE_LIMITED',
    });
  }

  const user = await getCurrentUser();

  const inquiry = await prisma.flightInquiry.create({
    data: {
      userId: user?.id ?? null,
      airline: input.airline ?? null,
      flightNumber: input.flightNumber ?? null,
      origin: input.origin,
      destination: input.destination,
      departureDate: input.departureDate ? new Date(input.departureDate) : null,
      passengers: input.passengers,
      displayedPrice:
        input.displayedPrice !== undefined
          ? new Prisma.Decimal(input.displayedPrice.toFixed(2))
          : null,
      source: input.source ?? null,
      sourceTimestamp: new Date(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message ?? null,
    },
    select: { id: true },
  });

  await notifyStaffWithPermission(PERMISSIONS.FLIGHTS_MANAGE, {
    type: NotificationType.BOOKING,
    title: 'New flight booking request',
    message: `${input.name} · ${input.origin} → ${input.destination} · ${input.passengers} pax`,
    link: `/dashboard/flights/inquiries/${inquiry.id}`,
    targetType: 'FlightInquiry',
    targetId: inquiry.id,
  });

  if (user) {
    await notifyUser({
      userId: user.id,
      type: NotificationType.BOOKING,
      title: 'Flight request received',
      message:
        'Our team is confirming the live fare with the airline and will reply with a quote.',
      link: '/account/requests',
    });
  }

  return apiSuccess({ received: true }, 201);
});
