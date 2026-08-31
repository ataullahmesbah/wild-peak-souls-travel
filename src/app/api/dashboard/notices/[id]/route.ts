import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { noticeUpdateSchema } from '@/lib/validation/catalogue';

const TAGS = ['notices'];

export const PATCH = apiHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.NOTICES_MANAGE);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const input = noticeUpdateSchema.parse(body);

    const existing = await prisma.notice.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new BusinessError('Notice not found.', 'NOT_FOUND', 404);

    await prisma.notice.update({
      where: { id },
      data: {
        ...input,
        ...(input.startAt !== undefined && { startAt: input.startAt ? new Date(input.startAt) : null }),
        ...(input.endAt !== undefined && { endAt: input.endAt ? new Date(input.endAt) : null }),
      } as never,
    });

    await recordAudit({
      actorId: staff.id,
      action: 'notice.updated',
      entityType: 'Notice',
      entityId: id,
      metadata: { changed: Object.keys(input) },
    });

    for (const tag of TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.NOTICES_DELETE);
    const { id } = await context.params;

    const existing = await prisma.notice.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new BusinessError('Notice not found.', 'NOT_FOUND', 404);

    await prisma.notice.delete({ where: { id } });

    await recordAudit({
      actorId: staff.id,
      action: 'notice.deleted',
      entityType: 'Notice',
      entityId: id,
    });

    for (const tag of TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id, deleted: true });
  },
);
