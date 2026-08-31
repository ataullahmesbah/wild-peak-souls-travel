// src/app/api/dashboard/contests/gallery/[id]/route.ts
import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { galleryCrud } from '../route';

export const PATCH = updateHandler(galleryCrud);
export const DELETE = deleteHandler(galleryCrud);
