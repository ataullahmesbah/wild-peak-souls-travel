// src/app/api/dashboard/contests/sponsors/route.ts
import type { z } from 'zod';

import { createHandler, type CrudConfig } from '@/lib/crud/factory';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import {
  contestSponsorCreateSchema,
  contestSponsorUpdateSchema,
} from '@/lib/validation/contest';

export const sponsorCrud: CrudConfig<
  z.infer<typeof contestSponsorCreateSchema>,
  z.infer<typeof contestSponsorUpdateSchema>
> = {
  model: 'contestSponsor',
  label: 'Contest sponsor',
  createSchema: contestSponsorCreateSchema,
  updateSchema: contestSponsorUpdateSchema,
  permissions: {
    create: PERMISSIONS.CONTEST_MANAGE,
    update: PERMISSIONS.CONTEST_MANAGE,
    delete: PERMISSIONS.CONTEST_MANAGE,
  },
  tags: ['contest'],
};

export const POST = createHandler(sponsorCrud);
