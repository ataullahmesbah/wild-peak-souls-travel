import type { NextRequest } from 'next/server';

import { apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/rbac/guard';
import { supportTokenSchema } from '@/lib/validation/leads';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { notifyStaffWithPermission } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { generateTokenNumber } from '@/lib/booking';
import { MessageType, NotificationType, Priority } from '@/generated/prisma';

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = supportTokenSchema.parse(body);

  const limit = await rateLimit(`support:${user.id}`, RATE_LIMITS.SUPPORT_TOKEN);
  if (!limit.allowed) {
    return apiError(
      'You have opened several tokens recently. Please reply on an existing one instead.',
      429,
      { code: 'RATE_LIMITED' },
    );
  }

  const token = await prisma.supportToken.create({
    data: {
      tokenNumber: generateTokenNumber(),
      customerId: user.id,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority as Priority,
      messages: {
        create: {
          senderId: user.id,
          body: input.description,
          messageType: MessageType.CUSTOMER,
        },
      },
    },
    select: { id: true, tokenNumber: true },
  });

  await notifyStaffWithPermission(PERMISSIONS.SUPPORT_READ, {
    type: NotificationType.SUPPORT,
    title: `New support token ${token.tokenNumber}`,
    message: `${input.priority} · ${input.subject}`,
    link: `/dashboard/support/${token.id}`,
    targetType: 'SupportToken',
    targetId: token.id,
  });

  return apiSuccess({ id: token.id, tokenNumber: token.tokenNumber }, 201);
});
