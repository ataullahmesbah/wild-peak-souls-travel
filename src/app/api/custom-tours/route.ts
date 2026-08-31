import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, clientIpFromHeaders } from '@/lib/auth/session';
import { customTourRequestSchema } from '@/lib/validation/leads';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { notifyStaffWithPermission, notifyUser } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { NotificationType } from '@/generated/prisma';

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = customTourRequestSchema.parse(body);

  if (input.website) return apiSuccess({ received: true });

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`custom-tour:${ip}`, RATE_LIMITS.PUBLIC_FORM);
  if (!limit.allowed) {
    return apiError('Too many requests. Please try again later.', 429, {
      code: 'RATE_LIMITED',
    });
  }

  const user = await getCurrentUser();

  const lead = await prisma.customTourRequest.create({
    data: {
      userId: user?.id ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone,
      destination: input.destination ?? null,
      preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
      travelers: input.travelers,
      budget: input.budget ?? null,
      duration: input.duration ?? null,
      travelStyle: input.travelStyle ?? null,
      accommodationPreference: input.accommodationPreference ?? null,
      activities: input.activities ?? null,
      transport: input.transport ?? null,
      notes: input.notes ?? null,
    },
    select: { id: true },
  });

  await notifyStaffWithPermission(PERMISSIONS.LEADS_READ, {
    type: NotificationType.SUPPORT,
    title: 'New custom tour request',
    message: `${input.name} · ${input.travelers} traveller${input.travelers === 1 ? '' : 's'} · ${input.destination ?? 'destination flexible'}`,
    link: `/dashboard/leads/custom-tours/${lead.id}`,
    targetType: 'CustomTourRequest',
    targetId: lead.id,
  });

  if (user) {
    await notifyUser({
      userId: user.id,
      type: NotificationType.SYSTEM,
      title: 'Custom trip request received',
      message: 'A planner will review your request and reply with an itinerary.',
      link: '/account/requests',
    });
  }

  return apiSuccess({ received: true }, 201);
});
