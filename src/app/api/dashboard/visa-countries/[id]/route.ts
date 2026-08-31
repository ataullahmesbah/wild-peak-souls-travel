import { deleteHandler, updateHandler } from '@/lib/crud/factory';
import { visaCountryConfig } from '@/lib/crud/modules';

export const PATCH = updateHandler(visaCountryConfig);
export const DELETE = deleteHandler(visaCountryConfig);
