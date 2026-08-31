import { createHandler } from '@/lib/crud/factory';
import { visaTypeConfig } from '@/lib/crud/modules';

export const POST = createHandler(visaTypeConfig);
