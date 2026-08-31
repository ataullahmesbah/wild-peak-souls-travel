import { createHandler } from '@/lib/crud/factory';
import { visaCountryConfig } from '@/lib/crud/modules';

export const POST = createHandler(visaCountryConfig);
