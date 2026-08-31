// src/app/api/dashboard/blog/categories/route.ts
import type { z } from 'zod';

import { createHandler, type CrudConfig } from '@/lib/crud/factory';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import {
  postCategoryCreateSchema,
  postCategoryUpdateSchema,
} from '@/lib/validation/blog';

export const CATEGORY_CRUD: CrudConfig<
  z.infer<typeof postCategoryCreateSchema>,
  z.infer<typeof postCategoryUpdateSchema>
> = {
  model: 'postCategory',
  label: 'Blog category',
  createSchema: postCategoryCreateSchema,
  updateSchema: postCategoryUpdateSchema,
  permissions: {
    create: PERMISSIONS.BLOG_CATEGORIES_MANAGE,
    update: PERMISSIONS.BLOG_CATEGORIES_MANAGE,
    // Deleting a category is an admin action: it silently un-files every post
    // in it (the relation is SET NULL), which a category editor should not be
    // able to do by accident.
    delete: PERMISSIONS.BLOG_DELETE,
  },
  tags: ['blog', 'posts'],
};

export const POST = createHandler(CATEGORY_CRUD);
