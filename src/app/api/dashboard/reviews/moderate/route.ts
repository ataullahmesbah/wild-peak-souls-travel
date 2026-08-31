import type { NextRequest } from 'next/server';

import { z } from 'zod';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { NotificationType, ReviewStatus } from '@/generated/prisma';

const schema = z.object({
  reviewId: z.string().min(1),
  status: z.nativeEnum(ReviewStatus),
  // The form posts this as a string, so coerce rather than requiring a boolean.
  featured: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true'),
  note: z.string().trim().max(500).optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.REVIEWS_MODERATE);
  const body = await request.json().catch(() => ({}));
  const input = schema.parse(body);

  const review = await prisma.review.findUnique({
    where: { id: input.reviewId },
    select: { id: true, userId: true, status: true, rating: true },
  });

  if (!review) {
    throw new BusinessError('Review not found.', 'NOT_FOUND', 404);
  }

  await prisma.review.update({
    where: { id: review.id },
    data: {
      status: input.status,
      // Only an approved review can be featured on the homepage.
      featured: input.status === ReviewStatus.APPROVED ? input.featured : false,
      moderationNote: input.note ?? null,
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: AUDIT_ACTIONS.REVIEW_MODERATED,
    entityType: 'Review',
    entityId: review.id,
    metadata: { from: review.status, to: input.status, note: input.note },
  });

  if (input.status === ReviewStatus.APPROVED) {
    await notifyUser({
      userId: review.userId,
      type: NotificationType.SYSTEM,
      title: 'Your review is live',
      message: 'Thank you — your review is now published on the site.',
      link: '/account/reviews',
    });
  } else if (input.status === ReviewStatus.REJECTED) {
    await notifyUser({
      userId: review.userId,
      type: NotificationType.SYSTEM,
      title: 'Your review was not published',
      message:
        input.note ??
        'Your review did not meet our publishing guidelines. Contact support if you would like to discuss it.',
      link: '/account/reviews',
    });
  }

  return apiSuccess({ updated: true, status: input.status });
});
