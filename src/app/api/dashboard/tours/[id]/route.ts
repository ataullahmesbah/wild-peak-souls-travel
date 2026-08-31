import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { tourConfig } from '@/lib/crud/modules';

export const PATCH = updateHandler(tourConfig);
export const DELETE = deleteHandler(tourConfig);
