import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/audit';
import { assertSlugAvailable } from '@/lib/crud/factory';
import { eventCreateSchema } from '@/lib/validation/catalogue';
import { Prisma } from '@/generated/prisma';

/**
 * Creates an event with its itinerary, add-ons, policies, activities and
 * gallery in one transaction.
 *
 * `reservedSeats` is absent from the schema by design — it is owned by the
 * booking engine. A new event always starts at zero reserved.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.EVENTS_CREATE);
  const body = await request.json().catch(() => ({}));
  const input = eventCreateSchema.parse(body);

  await assertSlugAvailable('event', input.slug);

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        title: input.title,
        slug: input.slug,
        shortDescription: input.shortDescription ?? null,
        description: input.description ?? null,
        destinationId: input.destinationId ?? null,
        eventType: input.eventType ?? null,
        coverMediaId: input.coverMediaId ?? null,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        duration: input.duration ?? null,
        capacity: input.capacity,
        price: new Prisma.Decimal(input.price.toFixed(2)),
        discountPrice:
          input.discountPrice != null
            ? new Prisma.Decimal(input.discountPrice.toFixed(2))
            : null,
        bookingDeadline: input.bookingDeadline ? new Date(input.bookingDeadline) : null,
        difficulty: input.difficulty,
        meetingPoint: input.meetingPoint ?? null,
        transport: input.transport ?? null,
        accommodation: input.accommodation ?? null,
        meals: input.meals ?? null,
        travelTips: input.travelTips ?? null,
        additionalInfo: input.additionalInfo ?? null,
        featured: input.featured,
        status: input.status,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        itinerary: {
          create: input.itinerary.map((day, index) => ({
            dayNumber: day.dayNumber,
            title: day.title,
            description: day.description ?? null,
            sortOrder: index,
          })),
        },
        options: {
          create: input.options.map((option, index) => ({
            title: option.title,
            description: option.description ?? null,
            price: new Prisma.Decimal(option.price.toFixed(2)),
            sortOrder: index,
          })),
        },
        policies: {
          create: input.policies.map((policy, index) => ({
            title: policy.title,
            content: policy.content,
            sortOrder: index,
          })),
        },
        eventActivities: {
          create: input.activityIds.map((activityId) => ({ activityId })),
        },
        gallery: {
          create: input.galleryMediaIds.map((mediaId, index) => ({
            mediaId,
            sortOrder: index,
          })),
        },
      },
      select: { id: true },
    });
    return created;
  });

  await recordAudit({
    actorId: staff.id,
    action: AUDIT_ACTIONS.EVENT_CREATED,
    entityType: 'Event',
    entityId: event.id,
    metadata: { title: input.title, status: input.status },
  });

  revalidateTag('events:list', 'max');
  revalidateTag('home:sections', 'max');

  return apiSuccess({ id: event.id }, 201);
});
