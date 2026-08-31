import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { heroSlideUpdateSchema } from '@/lib/validation/catalogue';

const TAGS = ['home:hero','home:sections'];

export const PATCH = apiHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.HERO_MANAGE);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const input = heroSlideUpdateSchema.parse(body);

    const existing = await prisma.heroSlide.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new BusinessError('Hero slide not found.', 'NOT_FOUND', 404);

    await prisma.heroSlide.update({
      where: { id },
      data: {
        ...input,
        ...(input.startAt !== undefined && { startAt: input.startAt ? new Date(input.startAt) : null }),
        ...(input.endAt !== undefined && { endAt: input.endAt ? new Date(input.endAt) : null }),
      } as never,
    });

    await recordAudit({
      actorId: staff.id,
      action: 'heroSlide.updated',
      entityType: 'Hero slide',
      entityId: id,
      metadata: { changed: Object.keys(input) },
    });

    for (const tag of TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.HERO_MANAGE);
    const { id } = await context.params;

    const existing = await prisma.heroSlide.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new BusinessError('Hero slide not found.', 'NOT_FOUND', 404);

    await prisma.heroSlide.delete({ where: { id } });

    await recordAudit({
      actorId: staff.id,
      action: 'heroSlide.deleted',
      entityType: 'Hero slide',
      entityId: id,
    });

    for (const tag of TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id, deleted: true });
  },
);
