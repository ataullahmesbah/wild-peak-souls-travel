// src/app/api/dashboard/contests/gallery/route.ts
import type { z } from 'zod';

import { createHandler, type CrudConfig } from '@/lib/crud/factory';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import {
  contestGalleryCreateSchema,
  contestGalleryUpdateSchema,
} from '@/lib/validation/contest';

export const galleryCrud: CrudConfig<
  z.infer<typeof contestGalleryCreateSchema>,
  z.infer<typeof contestGalleryUpdateSchema>
> = {
  model: 'contestGalleryItem',
  label: 'Contest gallery',
  createSchema: contestGalleryCreateSchema,
  updateSchema: contestGalleryUpdateSchema,
  permissions: {
    create: PERMISSIONS.CONTEST_MANAGE,
    update: PERMISSIONS.CONTEST_MANAGE,
    delete: PERMISSIONS.CONTEST_MANAGE,
  },
  tags: ['contest'],
};

export const POST = createHandler(galleryCrud);
