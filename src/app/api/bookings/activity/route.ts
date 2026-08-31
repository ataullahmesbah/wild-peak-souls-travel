import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { requireUser } from '@/lib/rbac/guard';
import { clientIpFromHeaders } from '@/lib/auth/session';
import { createSimpleBooking } from '@/lib/booking';
import { createActivityBookingSchema } from '@/lib/validation/booking';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { ProductType } from '@/generated/prisma';

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`booking:${user.id}:${ip}`, RATE_LIMITS.BOOKING_CREATE);
  if (!limit.allowed) {
    return apiError('Please wait a moment before booking again.', 429, {
      code: 'RATE_LIMITED',
    });
  }

  const body = await request.json().catch(() => ({}));
  const input = createActivityBookingSchema.parse(body);

  const booking = await createSimpleBooking({
    userId: user.id,
    productType: ProductType.ACTIVITY,
    productId: input.activityId,
    startDate: new Date(input.startDate),
    quantity: input.quantity,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    notes: input.notes,
  });

  return apiSuccess(booking, 201);
});
