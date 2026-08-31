import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { destinationConfig } from '@/lib/crud/modules';

export const PATCH = updateHandler(destinationConfig);
export const DELETE = deleteHandler(destinationConfig);
