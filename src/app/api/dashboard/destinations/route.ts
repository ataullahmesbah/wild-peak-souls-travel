import { createHandler } from '@/lib/crud/factory';
import { destinationConfig } from '@/lib/crud/modules';

export const POST = createHandler(destinationConfig);
