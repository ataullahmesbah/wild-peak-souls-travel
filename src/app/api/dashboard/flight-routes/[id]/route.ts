import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { flightRouteUpdateSchema } from '@/lib/validation/catalogue';

const TAGS = ['flights'];

export const PATCH = apiHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.FLIGHTS_MANAGE);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const input = flightRouteUpdateSchema.parse(body);

    const existing = await prisma.flightRoute.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new BusinessError('Flight route not found.', 'NOT_FOUND', 404);

    await prisma.flightRoute.update({
      where: { id },
      data: {
        ...input,
      } as never,
    });

    await recordAudit({
      actorId: staff.id,
      action: 'flightRoute.updated',
      entityType: 'Flight route',
      entityId: id,
      metadata: { changed: Object.keys(input) },
    });

    for (const tag of TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.FLIGHTS_MANAGE);
    const { id } = await context.params;

    const existing = await prisma.flightRoute.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new BusinessError('Flight route not found.', 'NOT_FOUND', 404);

    await prisma.flightRoute.delete({ where: { id } });

    await recordAudit({
      actorId: staff.id,
      action: 'flightRoute.deleted',
      entityType: 'Flight route',
      entityId: id,
    });

    for (const tag of TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id, deleted: true });
  },
);
