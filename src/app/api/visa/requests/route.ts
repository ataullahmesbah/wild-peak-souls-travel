import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, clientIpFromHeaders } from '@/lib/auth/session';
import { visaRequestSchema } from '@/lib/validation/leads';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { notifyStaffWithPermission, notifyUser } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { ContentStatus, NotificationType } from '@/generated/prisma';

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = visaRequestSchema.parse(body);

  if (input.website) return apiSuccess({ received: true });

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`visa-request:${ip}`, RATE_LIMITS.PUBLIC_FORM);
  if (!limit.allowed) {
    return apiError('Too many requests. Please try again later.', 429, {
      code: 'RATE_LIMITED',
    });
  }

  // Confirm the referenced visa type exists and is published, so a request
  // cannot be attached to a draft or deleted record.
  let visaTypeId: string | null = null;
  let label = 'General visa enquiry';

  if (input.visaTypeId) {
    const visaType = await prisma.visaType.findFirst({
      where: { id: input.visaTypeId, status: ContentStatus.PUBLISHED },
      select: { id: true, name: true, country: { select: { name: true } } },
    });
    if (visaType) {
      visaTypeId = visaType.id;
      label = `${visaType.country.name} — ${visaType.name}`;
    }
  }

  const user = await getCurrentUser();

  const visaRequest = await prisma.visaRequest.create({
    data: {
      userId: user?.id ?? null,
      visaTypeId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      nationality: input.nationality,
      message: input.message ?? null,
    },
    select: { id: true },
  });

  await notifyStaffWithPermission(PERMISSIONS.VISA_REQUESTS_MANAGE, {
    type: NotificationType.VISA,
    title: 'New visa assistance request',
    message: `${input.name} · ${label}`,
    link: `/dashboard/visa/requests/${visaRequest.id}`,
    targetType: 'VisaRequest',
    targetId: visaRequest.id,
  });

  if (user) {
    await notifyUser({
      userId: user.id,
      type: NotificationType.VISA,
      title: 'Visa request received',
      message: `We have your request for ${label}. A specialist will contact you.`,
      link: '/account/requests',
    });
  }

  return apiSuccess({ received: true }, 201);
});
