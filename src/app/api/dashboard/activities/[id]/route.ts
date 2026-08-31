import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { activityConfig } from '@/lib/crud/modules';

export const PATCH = updateHandler(activityConfig);
export const DELETE = deleteHandler(activityConfig);
