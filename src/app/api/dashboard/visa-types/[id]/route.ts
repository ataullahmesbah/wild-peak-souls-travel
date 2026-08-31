import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { visaTypeConfig } from '@/lib/crud/modules';

export const PATCH = updateHandler(visaTypeConfig);
export const DELETE = deleteHandler(visaTypeConfig);
