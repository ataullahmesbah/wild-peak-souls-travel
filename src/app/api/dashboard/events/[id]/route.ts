import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/audit';
import { assertSlugAvailable } from '@/lib/crud/factory';
import { eventUpdateSchema } from '@/lib/validation/catalogue';
import { EventStatus, Prisma } from '@/generated/prisma';

function revalidateEvent(id: string) {
  revalidateTag('events:list', 'max');
  revalidateTag(`event:${id}`, 'max');
  revalidateTag('home:sections', 'max');
}

export const PATCH = apiHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.EVENTS_UPDATE);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const input = eventUpdateSchema.parse(body);

    const existing = await prisma.event.findUnique({
      where: { id },
      select: { id: true, slug: true, capacity: true, reservedSeats: true, status: true },
    });
    if (!existing) throw new BusinessError('Event not found.', 'NOT_FOUND', 404);

    if (input.slug && input.slug !== existing.slug) {
      await assertSlugAvailable('event', input.slug, id);
    }

    // Capacity is shared with the booking engine. Dropping it below the seats
    // already sold would make availability negative and let the guard in
    // createEventBooking miscompute, so it is refused with the real number.
    if (input.capacity !== undefined && input.capacity < existing.reservedSeats) {
      throw new BusinessError(
        `Capacity cannot be lower than the ${existing.reservedSeats} seat${
          existing.reservedSeats === 1 ? '' : 's'
        } already booked.`,
        'CAPACITY_BELOW_RESERVED',
        422,
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.slug !== undefined && { slug: input.slug }),
          ...(input.shortDescription !== undefined && {
            shortDescription: input.shortDescription ?? null,
          }),
          ...(input.description !== undefined && { description: input.description ?? null }),
          ...(input.destinationId !== undefined && { destinationId: input.destinationId ?? null }),
          ...(input.eventType !== undefined && { eventType: input.eventType ?? null }),
          ...(input.coverMediaId !== undefined && { coverMediaId: input.coverMediaId ?? null }),
          ...(input.startAt && { startAt: new Date(input.startAt) }),
          ...(input.endAt && { endAt: new Date(input.endAt) }),
          ...(input.duration !== undefined && { duration: input.duration ?? null }),
          ...(input.capacity !== undefined && { capacity: input.capacity }),
          ...(input.price !== undefined && {
            price: new Prisma.Decimal(input.price.toFixed(2)),
          }),
          ...(input.discountPrice !== undefined && {
            discountPrice:
              input.discountPrice != null
                ? new Prisma.Decimal(input.discountPrice.toFixed(2))
                : null,
          }),
          ...(input.bookingDeadline !== undefined && {
            bookingDeadline: input.bookingDeadline ? new Date(input.bookingDeadline) : null,
          }),
          ...(input.difficulty && { difficulty: input.difficulty }),
          ...(input.meetingPoint !== undefined && { meetingPoint: input.meetingPoint ?? null }),
          ...(input.transport !== undefined && { transport: input.transport ?? null }),
          ...(input.accommodation !== undefined && { accommodation: input.accommodation ?? null }),
          ...(input.meals !== undefined && { meals: input.meals ?? null }),
          ...(input.travelTips !== undefined && { travelTips: input.travelTips ?? null }),
          ...(input.additionalInfo !== undefined && {
            additionalInfo: input.additionalInfo ?? null,
          }),
          ...(input.featured !== undefined && { featured: input.featured }),
          ...(input.status && { status: input.status }),
          ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle ?? null }),
          ...(input.seoDescription !== undefined && {
            seoDescription: input.seoDescription ?? null,
          }),
        },
      });

      if (input.itinerary) {
        await tx.eventItinerary.deleteMany({ where: { eventId: id } });
        if (input.itinerary.length > 0) {
          await tx.eventItinerary.createMany({
            data: input.itinerary.map((day, index) => ({
              eventId: id,
              dayNumber: day.dayNumber,
              title: day.title,
              description: day.description ?? null,
              sortOrder: index,
            })),
          });
        }
      }

      if (input.options) {
        await tx.eventOption.deleteMany({ where: { eventId: id } });
        if (input.options.length > 0) {
          await tx.eventOption.createMany({
            data: input.options.map((option, index) => ({
              eventId: id,
              title: option.title,
              description: option.description ?? null,
              price: new Prisma.Decimal(option.price.toFixed(2)),
              sortOrder: index,
            })),
          });
        }
      }

      if (input.policies) {
        await tx.eventPolicy.deleteMany({ where: { eventId: id } });
        if (input.policies.length > 0) {
          await tx.eventPolicy.createMany({
            data: input.policies.map((policy, index) => ({
              eventId: id,
              title: policy.title,
              content: policy.content,
              sortOrder: index,
            })),
          });
        }
      }

      if (input.activityIds) {
        await tx.eventActivity.deleteMany({ where: { eventId: id } });
        if (input.activityIds.length > 0) {
          await tx.eventActivity.createMany({
            data: input.activityIds.map((activityId) => ({ eventId: id, activityId })),
            skipDuplicates: true,
          });
        }
      }

      if (input.galleryMediaIds) {
        await tx.eventGallery.deleteMany({ where: { eventId: id } });
        if (input.galleryMediaIds.length > 0) {
          await tx.eventGallery.createMany({
            data: input.galleryMediaIds.map((mediaId, index) => ({
              eventId: id,
              mediaId,
              sortOrder: index,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    await recordAudit({
      actorId: staff.id,
      action: AUDIT_ACTIONS.EVENT_UPDATED,
      entityType: 'Event',
      entityId: id,
      metadata: { changed: Object.keys(input) },
    });

    revalidateEvent(id);
    return apiSuccess({ id });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.EVENTS_DELETE);
    const { id } = await context.params;

    const existing = await prisma.event.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!existing) throw new BusinessError('Event not found.', 'NOT_FOUND', 404);

    const bookings = await prisma.booking.count({
      where: { productType: 'EVENT', productId: id },
    });

    // Never destroy an event a customer has paid for — archive it so the
    // booking, invoice and audit trail all still resolve.
    if (bookings > 0) {
      await prisma.event.update({
        where: { id },
        data: { status: EventStatus.ARCHIVED },
      });
      await recordAudit({
        actorId: staff.id,
        action: 'events.archived',
        entityType: 'Event',
        entityId: id,
        metadata: { title: existing.title, bookings },
      });
      revalidateEvent(id);
      return apiSuccess({
        id,
        archived: true,
        reason: `${bookings} booking${bookings === 1 ? '' : 's'} reference this event`,
      });
    }

    await prisma.event.delete({ where: { id } });
    await recordAudit({
      actorId: staff.id,
      action: AUDIT_ACTIONS.EVENT_DELETED,
      entityType: 'Event',
      entityId: id,
      metadata: { title: existing.title },
    });

    revalidateEvent(id);
    return apiSuccess({ id, deleted: true });
  },
);
