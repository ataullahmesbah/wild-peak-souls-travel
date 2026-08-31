// src/app/api/dashboard/contests/judges/route.ts
import type { z } from 'zod';

import { createHandler, type CrudConfig } from '@/lib/crud/factory';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import {
  contestJudgeCreateSchema,
  contestJudgeUpdateSchema,
} from '@/lib/validation/contest';

export const judgeCrud: CrudConfig<
  z.infer<typeof contestJudgeCreateSchema>,
  z.infer<typeof contestJudgeUpdateSchema>
> = {
  model: 'contestJudge',
  label: 'Contest judge',
  createSchema: contestJudgeCreateSchema,
  updateSchema: contestJudgeUpdateSchema,
  permissions: {
    create: PERMISSIONS.CONTEST_MANAGE,
    update: PERMISSIONS.CONTEST_MANAGE,
    delete: PERMISSIONS.CONTEST_MANAGE,
  },
  tags: ['contest'],
};

export const POST = createHandler(judgeCrud);
