import { createHandler } from '@/lib/crud/factory';
import { activityConfig } from '@/lib/crud/modules';

export const POST = createHandler(activityConfig);
