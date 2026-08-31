// src/app/api/dashboard/contests/route.ts
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { assertSlugAvailable } from '@/lib/crud/factory';
import { contestCreateSchema } from '@/lib/validation/contest';
import { ContestStatus } from '@/generated/prisma';

export const CONTEST_TAGS = ['contest', 'home', 'nav'];

/** Turns the form's ISO strings into Dates, leaving absent fields absent. */
export function toContestData(input: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = { ...input };
  for (const key of ['startAt', 'entryDeadline', 'votingStartAt', 'votingEndAt', 'resultsAt']) {
    const value = data[key];
    if (value === undefined) continue;
    data[key] = typeof value === 'string' && value ? new Date(value) : null;
  }
  return data;
}

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = contestCreateSchema.parse(body);

  // Putting a contest live is a separate permission from drafting one, so a
  // role can prepare a contest without being able to open it to the public.
  const staff = await requirePermission(
    input.status === ContestStatus.PUBLISHED
      ? PERMISSIONS.CONTEST_PUBLISH
      : PERMISSIONS.CONTEST_MANAGE,
  );

  await assertSlugAvailable('contest', input.slug);

  const record = await prisma.contest.create({
    data: toContestData(input) as never,
    select: { id: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'contest.created',
    entityType: 'Contest',
    entityId: record.id,
    metadata: { title: input.title, status: input.status },
  });

  for (const tag of CONTEST_TAGS) revalidateTag(tag, 'max');
  return apiSuccess({ id: record.id }, 201);
});
