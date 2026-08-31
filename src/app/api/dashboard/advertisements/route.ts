import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { adCreateSchema } from '@/lib/validation/catalogue';

const TAGS = ['ads'];

export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.ADS_MANAGE);
  const body = await request.json().catch(() => ({}));
  const input = adCreateSchema.parse(body);

  const record = await prisma.advertisement.create({
    data: {
      ...input,
      startAt: input.startAt ? new Date(input.startAt) : null,
      endAt: input.endAt ? new Date(input.endAt) : null,
    } as never,
    select: { id: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'advertisement.created',
    entityType: 'Advertisement',
    entityId: record.id,
  });

  for (const tag of TAGS) revalidateTag(tag, 'max');
  return apiSuccess({ id: record.id }, 201);
});
