import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { assertSlugAvailable } from '@/lib/crud/factory';
import { stayUpdateSchema } from '@/lib/validation/catalogue';
import { ContentStatus, Prisma } from '@/generated/prisma';

function revalidateStay(id: string) {
  revalidateTag('stays:list', 'max');
  revalidateTag(`stay:${id}`, 'max');
  revalidateTag('home:sections', 'max');
}

export const PATCH = apiHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.STAYS_MANAGE);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const input = stayUpdateSchema.parse(body);

    const existing = await prisma.accommodation.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!existing) throw new BusinessError('Property not found.', 'NOT_FOUND', 404);

    if (input.slug && input.slug !== existing.slug) {
      await assertSlugAvailable('accommodation', input.slug, id);
    }

    await prisma.$transaction(async (tx) => {
      await tx.accommodation.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.slug !== undefined && { slug: input.slug }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.destinationId !== undefined && { destinationId: input.destinationId ?? null }),
          ...(input.coverMediaId !== undefined && { coverMediaId: input.coverMediaId ?? null }),
          ...(input.address !== undefined && { address: input.address ?? null }),
          ...(input.shortDescription !== undefined && {
            shortDescription: input.shortDescription ?? null,
          }),
          ...(input.description !== undefined && { description: input.description ?? null }),
          ...(input.amenities !== undefined && { amenities: input.amenities ?? null }),
          ...(input.rules !== undefined && { rules: input.rules ?? null }),
          ...(input.policies !== undefined && { policies: input.policies ?? null }),
          ...(input.checkInTime !== undefined && { checkInTime: input.checkInTime }),
          ...(input.checkOutTime !== undefined && { checkOutTime: input.checkOutTime }),
          ...(input.featured !== undefined && { featured: input.featured }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle ?? null }),
          ...(input.seoDescription !== undefined && {
            seoDescription: input.seoDescription ?? null,
          }),
        },
      });

      if (!input.roomTypes) return;

      const submittedIds = input.roomTypes
        .map((room) => room.id)
        .filter((roomId): roomId is string => Boolean(roomId));

      // A room with future bookings cannot simply vanish — the room-night holds
      // point at it. Removed rooms are archived; only untouched ones are deleted.
      const removable = await tx.roomType.findMany({
        where: { accommodationId: id, id: { notIn: submittedIds } },
        select: { id: true, _count: { select: { inventory: true } } },
      });

      for (const room of removable) {
        if (room._count.inventory > 0) {
          await tx.roomType.update({
            where: { id: room.id },
            data: { status: ContentStatus.ARCHIVED },
          });
        } else {
          await tx.roomType.delete({ where: { id: room.id } });
        }
      }

      for (const room of input.roomTypes) {
        const data = {
          name: room.name,
          description: room.description ?? null,
          capacity: room.capacity,
          price: new Prisma.Decimal(room.price.toFixed(2)),
          totalUnits: room.totalUnits,
          amenities: room.amenities ?? null,
          coverMediaId: room.coverMediaId ?? null,
          status: room.status,
        };

        if (room.id) {
          // Reducing units below what is already booked on any night would
          // oversell that night, so it is refused with the conflicting date.
          const conflict = await tx.roomInventory.findFirst({
            where: {
              roomTypeId: room.id,
              bookedUnits: { gt: room.totalUnits },
              date: { gte: new Date() },
            },
            select: { date: true, bookedUnits: true },
          });
          if (conflict) {
            throw new BusinessError(
              `"${room.name}" already has ${conflict.bookedUnits} unit(s) booked on ${conflict.date
                .toISOString()
                .slice(0, 10)}. Reduce the date's bookings before lowering the unit count.`,
              'UNITS_BELOW_BOOKED',
              422,
            );
          }
          await tx.roomType.update({ where: { id: room.id }, data });
        } else {
          await tx.roomType.create({ data: { ...data, accommodationId: id } });
        }
      }
    });

    await recordAudit({
      actorId: staff.id,
      action: 'stays.updated',
      entityType: 'Accommodation',
      entityId: id,
      metadata: { changed: Object.keys(input) },
    });

    revalidateStay(id);
    return apiSuccess({ id });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.STAYS_DELETE);
    const { id } = await context.params;

    const existing = await prisma.accommodation.findUnique({
      where: { id },
      select: { id: true, name: true, roomTypes: { select: { id: true } } },
    });
    if (!existing) throw new BusinessError('Property not found.', 'NOT_FOUND', 404);

    const roomIds = existing.roomTypes.map((r) => r.id);
    const bookings = roomIds.length
      ? await prisma.booking.count({
          where: { productType: 'ACCOMMODATION', productId: { in: roomIds } },
        })
      : 0;

    if (bookings > 0) {
      await prisma.accommodation.update({
        where: { id },
        data: { status: ContentStatus.ARCHIVED },
      });
      await recordAudit({
        actorId: staff.id,
        action: 'stays.archived',
        entityType: 'Accommodation',
        entityId: id,
        metadata: { name: existing.name, bookings },
      });
      revalidateStay(id);
      return apiSuccess({
        id,
        archived: true,
        reason: `${bookings} booking${bookings === 1 ? '' : 's'} reference this property`,
      });
    }

    await prisma.accommodation.delete({ where: { id } });
    await recordAudit({
      actorId: staff.id,
      action: 'stays.deleted',
      entityType: 'Accommodation',
      entityId: id,
      metadata: { name: existing.name },
    });

    revalidateStay(id);
    return apiSuccess({ id, deleted: true });
  },
);
