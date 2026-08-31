import type { NextRequest } from 'next/server';

import { BusinessError, apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { hasPermission, requireUser } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { supportMessageSchema } from '@/lib/validation/leads';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { notifyStaffWithPermission, notifyUser } from '@/lib/notifications';
import { MessageType, NotificationType, SupportStatus } from '@/generated/prisma';

/**
 * Posts a reply on a support token.
 *
 * Two access paths: the owning customer, or a staff member with
 * `support.manage`. Only staff may post an INTERNAL_NOTE, and internal notes
 * are filtered out of the customer's view by the account data layer.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = supportMessageSchema.parse(body);

  const limit = await rateLimit(`support-msg:${user.id}`, RATE_LIMITS.MESSAGE_SEND);
  if (!limit.allowed) {
    return apiError('You are sending messages very quickly. Please slow down.', 429, {
      code: 'RATE_LIMITED',
    });
  }

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

  const isOwner = token.customerId === user.id;
  const isAgent = hasPermission(user, PERMISSIONS.SUPPORT_MANAGE);

  if (!isOwner && !isAgent) {
    throw new BusinessError('Support token not found.', 'NOT_FOUND', 404);
  }

  if (token.status === SupportStatus.CLOSED) {
    throw new BusinessError(
      'This token is closed. Please open a new one.',
      'TOKEN_CLOSED',
    );
  }

  // A customer can never write an internal note, whatever they post.
  const internal = isAgent && input.internal;
  const messageType = internal
    ? MessageType.INTERNAL_NOTE
    : isAgent
      ? MessageType.STAFF
      : MessageType.CUSTOMER;

  await prisma.supportMessage.create({
    data: {
      tokenId: token.id,
      senderId: user.id,
      body: input.body,
      messageType,
    },
  });

  await prisma.supportToken.update({
    where: { id: token.id },
    data: {
      // A staff reply moves a pending token into progress; a customer reply
      // does not change the workflow state.
      status:
        isAgent && !internal && token.status === SupportStatus.PENDING
          ? SupportStatus.IN_PROGRESS
          : token.status,
      updatedAt: new Date(),
    },
  });

  if (internal) {
    return apiSuccess({ posted: true, internal: true }, 201);
  }

  if (isAgent) {
    await notifyUser({
      userId: token.customerId,
      type: NotificationType.SUPPORT,
      title: `Reply on ${token.tokenNumber}`,
      message: 'Our support team has replied to your token.',
      link: `/account/support/${token.id}`,
      targetType: 'SupportToken',
      targetId: token.id,
    });
  } else {
    await notifyStaffWithPermission(PERMISSIONS.SUPPORT_READ, {
      type: NotificationType.SUPPORT,
      title: `Customer replied on ${token.tokenNumber}`,
      message: input.body.slice(0, 120),
      link: `/dashboard/support/${token.id}`,
      targetType: 'SupportToken',
      targetId: token.id,
    });
  }

  return apiSuccess({ posted: true }, 201);
});
