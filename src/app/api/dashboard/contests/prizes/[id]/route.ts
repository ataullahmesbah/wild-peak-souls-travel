// src/app/api/dashboard/contests/prizes/[id]/route.ts
import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { prizeCrud } from '../route';

export const PATCH = updateHandler(prizeCrud);
export const DELETE = deleteHandler(prizeCrud);
