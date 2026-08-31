import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { trainScheduleCreateSchema } from '@/lib/validation/catalogue';

const TAGS = ['trains'];

export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.TRAINS_MANAGE);
  const body = await request.json().catch(() => ({}));
  const input = trainScheduleCreateSchema.parse(body);

  const record = await prisma.trainSchedule.create({
    data: {
      ...input,
    } as never,
    select: { id: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'trainSchedule.created',
    entityType: 'Train schedule',
    entityId: record.id,
  });

  for (const tag of TAGS) revalidateTag(tag, 'max');
  return apiSuccess({ id: record.id }, 201);
});
