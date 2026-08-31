// src/app/api/dashboard/blog/categories/[id]/route.ts
import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { CATEGORY_CRUD } from '../route';

export const PATCH = updateHandler(CATEGORY_CRUD);
export const DELETE = deleteHandler(CATEGORY_CRUD);
