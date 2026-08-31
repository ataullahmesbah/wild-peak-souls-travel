// src/app/api/dashboard/contests/judges/[id]/route.ts
import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { judgeCrud } from '../route';

export const PATCH = updateHandler(judgeCrud);
export const DELETE = deleteHandler(judgeCrud);
