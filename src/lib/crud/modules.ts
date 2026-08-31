import 'server-only';

import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import type { CrudConfig } from '@/lib/crud/factory';
import {
  activityCreateSchema,
  activityUpdateSchema,
  destinationCreateSchema,
  destinationUpdateSchema,
  tourCreateSchema,
  tourUpdateSchema,
  visaCountryCreateSchema,
  visaCountryUpdateSchema,
  visaTypeCreateSchema,
  visaTypeUpdateSchema,
} from '@/lib/validation/catalogue';

/**
 * One config per catalogue module. The factory turns each into POST / PATCH /
 * DELETE handlers with permission checks, validation, audit and cache
 * revalidation already wired.
 *
 * `archiveInsteadOfDeleteWhen` returns a human reason when a record is
 * referenced by something that must outlive it — a booking, a customer request.
 * The factory then archives instead of destroying, so history stays intact.
 */

/** Strips the nested arrays the factory writes separately. */
function scalarsOnly<T extends Record<string, unknown>>(
  input: T,
  nested: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (nested.includes(key)) continue;
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export const destinationConfig: CrudConfig<
  typeof destinationCreateSchema._output,
  typeof destinationUpdateSchema._output
> = {
  model: 'destination',
  label: 'Destination',
  createSchema: destinationCreateSchema,
  updateSchema: destinationUpdateSchema,
  permissions: {
    create: PERMISSIONS.DESTINATIONS_MANAGE,
    update: PERMISSIONS.DESTINATIONS_MANAGE,
    delete: PERMISSIONS.DESTINATIONS_DELETE,
  },
  tags: ['destinations:list', 'destination::id', 'home:sections'],
  archiveInsteadOfDeleteWhen: async (id) => {
    const record = await prisma.destination.findUnique({
      where: { id },
      select: {
        _count: {
          select: { events: true, tours: true, activities: true, accommodations: true },
        },
      },
    });
    const total =
      (record?._count.events ?? 0) +
      (record?._count.tours ?? 0) +
      (record?._count.activities ?? 0) +
      (record?._count.accommodations ?? 0);
    return total > 0
      ? `${total} item${total === 1 ? ' is' : 's are'} attached to this destination`
      : null;
  },
};

export const tourConfig: CrudConfig<
  typeof tourCreateSchema._output,
  typeof tourUpdateSchema._output
> = {
  model: 'tour',
  label: 'Tour',
  createSchema: tourCreateSchema,
  updateSchema: tourUpdateSchema,
  permissions: {
    create: PERMISSIONS.TOURS_MANAGE,
    update: PERMISSIONS.TOURS_MANAGE,
    delete: PERMISSIONS.TOURS_DELETE,
  },
  tags: ['tours:list', 'tour::id', 'home:sections'],
  toCreateData: (input) => scalarsOnly(input, ['itinerary']),
  toUpdateData: (input) => scalarsOnly(input, ['itinerary']),
  afterWrite: async (tx, id, input) => {
    const itinerary = (input as { itinerary?: unknown[] }).itinerary;
    if (!itinerary) return;
    // Replace wholesale: reordering and deleting rows is far simpler to reason
    // about than diffing, and the set is small.
    await tx.tourItinerary.deleteMany({ where: { tourId: id } });
    if (itinerary.length > 0) {
      await tx.tourItinerary.createMany({
        data: (itinerary as Array<{ dayNumber: number; title: string; description?: string }>).map(
          (day, index) => ({
            tourId: id,
            dayNumber: day.dayNumber,
            title: day.title,
            description: day.description ?? null,
            sortOrder: index,
          }),
        ),
      });
    }
  },
  archiveInsteadOfDeleteWhen: async (id) => {
    const bookings = await prisma.booking.count({
      where: { productType: 'TOUR', productId: id },
    });
    return bookings > 0
      ? `${bookings} booking${bookings === 1 ? '' : 's'} reference this tour`
      : null;
  },
};

export const activityConfig: CrudConfig<
  typeof activityCreateSchema._output,
  typeof activityUpdateSchema._output
> = {
  model: 'activity',
  label: 'Activity',
  createSchema: activityCreateSchema,
  updateSchema: activityUpdateSchema,
  permissions: {
    create: PERMISSIONS.ACTIVITIES_MANAGE,
    update: PERMISSIONS.ACTIVITIES_MANAGE,
    delete: PERMISSIONS.ACTIVITIES_DELETE,
  },
  tags: ['activities:list', 'activity::id', 'home:sections'],
  archiveInsteadOfDeleteWhen: async (id) => {
    const bookings = await prisma.booking.count({
      where: { productType: 'ACTIVITY', productId: id },
    });
    return bookings > 0
      ? `${bookings} booking${bookings === 1 ? '' : 's'} reference this activity`
      : null;
  },
};

export const visaCountryConfig: CrudConfig<
  typeof visaCountryCreateSchema._output,
  typeof visaCountryUpdateSchema._output
> = {
  model: 'visaCountry',
  label: 'Visa country',
  createSchema: visaCountryCreateSchema,
  updateSchema: visaCountryUpdateSchema,
  permissions: {
    create: PERMISSIONS.VISA_MANAGE,
    update: PERMISSIONS.VISA_MANAGE,
    delete: PERMISSIONS.VISA_DELETE,
  },
  tags: ['visa:list', 'visa-country::id'],
  archiveInsteadOfDeleteWhen: async (id) => {
    const types = await prisma.visaType.count({ where: { countryId: id } });
    return types > 0
      ? `${types} visa type${types === 1 ? '' : 's'} belong to this country`
      : null;
  },
};

export const visaTypeConfig: CrudConfig<
  typeof visaTypeCreateSchema._output,
  typeof visaTypeUpdateSchema._output
> = {
  model: 'visaType',
  label: 'Visa type',
  createSchema: visaTypeCreateSchema,
  updateSchema: visaTypeUpdateSchema,
  permissions: {
    create: PERMISSIONS.VISA_MANAGE,
    update: PERMISSIONS.VISA_MANAGE,
    delete: PERMISSIONS.VISA_DELETE,
  },
  tags: ['visa:list', 'visa-type::id'],
  // Slugs are unique per country, not globally — every country is allowed its
  // own "tourist-visa". The URL is /visa/[country]/[type], so that reads right.
  slugScope: (input) =>
    'countryId' in input && typeof input.countryId === 'string'
      ? { countryId: input.countryId }
      : undefined,
  archiveInsteadOfDeleteWhen: async (id) => {
    const requests = await prisma.visaRequest.count({ where: { visaTypeId: id } });
    return requests > 0
      ? `${requests} customer request${requests === 1 ? '' : 's'} reference this visa type`
      : null;
  },
};
