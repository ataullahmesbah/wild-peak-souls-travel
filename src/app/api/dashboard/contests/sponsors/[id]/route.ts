// src/app/api/dashboard/contests/sponsors/[id]/route.ts
import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { sponsorCrud } from '../route';

export const PATCH = updateHandler(sponsorCrud);
export const DELETE = deleteHandler(sponsorCrud);
