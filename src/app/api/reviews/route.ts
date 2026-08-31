import type { NextRequest } from 'next/server';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/rbac/guard';
import { reviewSchema } from '@/lib/validation/leads';
import { notifyStaffWithPermission } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { BookingStatus, NotificationType, ReviewStatus } from '@/generated/prisma';

/**
 * Creates a review.
 *
 * Eligibility is enforced server-side: the booking must belong to the caller,
 * be COMPLETED, and not already have a review. That is what makes the public
 * review list trustworthy — a stranger cannot review a trip they never took.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = reviewSchema.parse(body);

  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, userId: user.id },
    select: {
      id: true,
      status: true,
      productType: true,
      productId: true,
      productTitle: true,
      reviews: { select: { id: true } },
    },
  });

  if (!booking) {
    throw new BusinessError('Booking not found.', 'NOT_FOUND', 404);
  }
  if (booking.status !== BookingStatus.COMPLETED) {
    throw new BusinessError(
      'You can review a trip once it is marked completed.',
      'NOT_ELIGIBLE',
    );
  }
  if (booking.reviews.length > 0) {
    throw new BusinessError(
      'You have already reviewed this booking.',
      'ALREADY_REVIEWED',
    );
  }

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      userId: user.id,
      productType: booking.productType,
      productId: booking.productId,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body,
      // Everything starts unpublished; a moderator decides.
      status: ReviewStatus.PENDING,
    },
    select: { id: true },
  });

  await notifyStaffWithPermission(PERMISSIONS.REVIEWS_MODERATE, {
    type: NotificationType.ADMIN,
    title: 'New review awaiting moderation',
    message: `${input.rating}★ on ${booking.productTitle}`,
    link: `/dashboard/reviews`,
    targetType: 'Review',
    targetId: review.id,
  });

  return apiSuccess({ submitted: true }, 201);
});
