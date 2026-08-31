import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, clientIpFromHeaders } from '@/lib/auth/session';
import { contactRequestSchema } from '@/lib/validation/leads';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { notifyStaffWithPermission } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { NotificationType } from '@/generated/prisma';

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = contactRequestSchema.parse(body);

  // Honeypot: a filled hidden field means a bot. Return success so the bot
  // does not learn it was rejected, but write nothing.
  if (input.website) return apiSuccess({ received: true });

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';
  const limit = await rateLimit(`contact:${ip}`, RATE_LIMITS.PUBLIC_FORM);
  if (!limit.allowed) {
    return apiError(
      'You have sent several messages already. Please wait before sending another.',
      429,
      { code: 'RATE_LIMITED' },
    );
  }

  const user = await getCurrentUser();

  const contact = await prisma.contactRequest.create({
    data: {
      userId: user?.id ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject: input.subject ?? null,
      description: input.description,
    },
    select: { id: true },
  });

  await notifyStaffWithPermission(PERMISSIONS.LEADS_READ, {
    type: NotificationType.SUPPORT,
    title: 'New contact request',
    message: `${input.name}: ${input.subject ?? input.description.slice(0, 80)}`,
    link: `/dashboard/leads/contact/${contact.id}`,
    targetType: 'ContactRequest',
    targetId: contact.id,
  });

  return apiSuccess({ received: true }, 201);
});
