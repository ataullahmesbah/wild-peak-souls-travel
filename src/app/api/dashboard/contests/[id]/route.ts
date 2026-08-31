// src/app/api/dashboard/contests/[id]/route.ts
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { assertSlugAvailable } from '@/lib/crud/factory';
import { contestUpdateSchema } from '@/lib/validation/contest';
import { CONTEST_TAGS, toContestData } from '../route';
import { ContestStatus } from '@/generated/prisma';

export const PATCH = apiHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const input = contestUpdateSchema.parse(body) as Record<string, unknown>;

    const existing = await prisma.contest.findUnique({
      where: { id },
      select: { id: true, status: true, title: true },
    });
    if (!existing) throw new BusinessError('Contest not found.', 'NOT_FOUND', 404);

    // Editing a live contest needs publish rights too — its dates and rules
    // are a promise to everyone who has already entered.
    const touchesLive =
      input.status === ContestStatus.PUBLISHED || existing.status === ContestStatus.PUBLISHED;
    const staff = await requirePermission(
      touchesLive ? PERMISSIONS.CONTEST_PUBLISH : PERMISSIONS.CONTEST_MANAGE,
    );

    if (typeof input.slug === 'string') {
      await assertSlugAvailable('contest', input.slug, id);
    }

    await prisma.contest.update({
      where: { id },
      data: toContestData(input) as never,
    });

    await recordAudit({
      actorId: staff.id,
      action: 'contest.updated',
      entityType: 'Contest',
      entityId: id,
      metadata: { changed: Object.keys(input) },
    });

    for (const tag of CONTEST_TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.CONTEST_DELETE);
    const { id } = await context.params;

    const existing = await prisma.contest.findUnique({
      where: { id },
      select: { id: true, title: true, _count: { select: { entries: true } } },
    });
    if (!existing) throw new BusinessError('Contest not found.', 'NOT_FOUND', 404);

    // Deleting cascades to every entry and every vote. Once people have
    // entered, that is somebody's photograph and somebody's ballot, so the
    // contest is archived instead and stays recoverable.
    if (existing._count.entries > 0) {
      await prisma.contest.update({
        where: { id },
        data: { status: ContestStatus.ARCHIVED },
      });

      await recordAudit({
        actorId: staff.id,
        action: 'contest.archived',
        entityType: 'Contest',
        entityId: id,
        metadata: { reason: `${existing._count.entries} entries` },
      });

      for (const tag of CONTEST_TAGS) revalidateTag(tag, 'max');
      return apiSuccess({
        id,
        archived: true,
        reason: 'This contest has entries, so it was archived rather than deleted.',
      });
    }

    await prisma.contest.delete({ where: { id } });

    await recordAudit({
      actorId: staff.id,
      action: 'contest.deleted',
      entityType: 'Contest',
      entityId: id,
      metadata: { title: existing.title },
    });

    for (const tag of CONTEST_TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id, deleted: true });
  },
);
