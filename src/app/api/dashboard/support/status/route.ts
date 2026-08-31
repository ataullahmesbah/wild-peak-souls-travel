import type { NextRequest } from 'next/server';

import { z } from 'zod';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { NotificationType, SupportStatus } from '@/generated/prisma';

const schema = z.object({
  tokenId: z.string().min(1),
  status: z.nativeEnum(SupportStatus),
  assignToMe: z.boolean().optional().default(true),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.SUPPORT_MANAGE);
  const body = await request.json().catch(() => ({}));
  const input = schema.parse(body);

  const token = await prisma.supportToken.findUnique({
    where: { id: input.tokenId },
    select: {
      id: true,
      tokenNumber: true,
      customerId: true,
      status: true,
      assignedToId: true,
    },
  });

  if (!token) {
    throw new BusinessError('Support token not found.', 'NOT_FOUND', 404);
  }

  await prisma.supportToken.update({
    where: { id: token.id },
    data: {
      status: input.status,
      // Acting on an unassigned token claims it, so queues do not stall on
      // "who is handling this?".
      ...(input.assignToMe && !token.assignedToId ? { assignedToId: staff.id } : {}),
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'support.status.updated',
    entityType: 'SupportToken',
    entityId: token.id,
    metadata: { tokenNumber: token.tokenNumber, from: token.status, to: input.status },
  });

  await notifyUser({
    userId: token.customerId,
    type: NotificationType.SUPPORT,
    title: `${token.tokenNumber} is now ${input.status.toLowerCase().replace(/_/g, ' ')}`,
    message: 'Open the token to see the latest update from our team.',
    link: `/account/support/${token.id}`,
    targetType: 'SupportToken',
    targetId: token.id,
  });

  return apiSuccess({ updated: true, status: input.status });
});
