import { createHandler } from '@/lib/crud/factory';
import { tourConfig } from '@/lib/crud/modules';

export const POST = createHandler(tourConfig);
