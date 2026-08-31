// src/app/api/dashboard/contests/prizes/route.ts
import type { z } from 'zod';

import { createHandler, type CrudConfig } from '@/lib/crud/factory';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import {
  contestPrizeCreateSchema,
  contestPrizeUpdateSchema,
} from '@/lib/validation/contest';

export const prizeCrud: CrudConfig<
  z.infer<typeof contestPrizeCreateSchema>,
  z.infer<typeof contestPrizeUpdateSchema>
> = {
  model: 'contestPrize',
  label: 'Contest prize',
  createSchema: contestPrizeCreateSchema,
  updateSchema: contestPrizeUpdateSchema,
  permissions: {
    create: PERMISSIONS.CONTEST_MANAGE,
    update: PERMISSIONS.CONTEST_MANAGE,
    delete: PERMISSIONS.CONTEST_MANAGE,
  },
  tags: ['contest'],
};

export const POST = createHandler(prizeCrud);
