import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { assertSlugAvailable } from '@/lib/crud/factory';
import { stayCreateSchema } from '@/lib/validation/catalogue';
import { Prisma } from '@/generated/prisma';

export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.STAYS_MANAGE);
  const body = await request.json().catch(() => ({}));
  const input = stayCreateSchema.parse(body);

  await assertSlugAvailable('accommodation', input.slug);

  const stay = await prisma.accommodation.create({
    data: {
      name: input.name,
      slug: input.slug,
      type: input.type,
      destinationId: input.destinationId ?? null,
      coverMediaId: input.coverMediaId ?? null,
      address: input.address ?? null,
      shortDescription: input.shortDescription ?? null,
      description: input.description ?? null,
      amenities: input.amenities ?? null,
      rules: input.rules ?? null,
      policies: input.policies ?? null,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
      featured: input.featured,
      status: input.status,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      roomTypes: {
        create: input.roomTypes.map((room) => ({
          name: room.name,
          description: room.description ?? null,
          capacity: room.capacity,
          price: new Prisma.Decimal(room.price.toFixed(2)),
          totalUnits: room.totalUnits,
          amenities: room.amenities ?? null,
          coverMediaId: room.coverMediaId ?? null,
          status: room.status,
        })),
      },
    },
    select: { id: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'stays.created',
    entityType: 'Accommodation',
    entityId: stay.id,
    metadata: { name: input.name, rooms: input.roomTypes.length },
  });

  revalidateTag('stays:list', 'max');
  revalidateTag('home:sections', 'max');
  return apiSuccess({ id: stay.id }, 201);
});
