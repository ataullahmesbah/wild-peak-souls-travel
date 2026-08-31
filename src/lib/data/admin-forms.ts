// src/lib/data/admin-forms.ts
import 'server-only';

import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import type { ResourceValues } from '@/components/admin/resource-form';

/**
 * Loading helpers for the dashboard's create and edit screens.
 *
 * A form can only receive plain, serialisable values, but Prisma hands back
 * Decimal and Date objects. Everything here flattens a record into strings and
 * numbers so the client component never has to know that.
 */

export type SelectOption = { value: string; label: string };

export async function destinationOptions(): Promise<SelectOption[]> {
  const rows = await prisma.destination.findMany({
    where: { status: { not: 'ARCHIVED' } },
    select: { id: true, name: true, country: true },
    orderBy: { name: 'asc' },
  });
  return rows.map((row) => ({ value: row.id, label: `${row.name} — ${row.country}` }));
}

export async function visaCountryOptions(): Promise<SelectOption[]> {
  const rows = await prisma.visaCountry.findMany({
    where: { status: { not: 'ARCHIVED' } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return rows.map((row) => ({ value: row.id, label: row.name }));
}

export async function postCategoryOptions(): Promise<SelectOption[]> {
  const rows = await prisma.postCategory.findMany({
    where: { status: { not: 'ARCHIVED' } },
    select: { id: true, name: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
  return rows.map((row) => ({ value: row.id, label: row.name }));
}

/** Turns Decimals into numbers and Dates into ISO strings, dropping the rest. */
export function toFormValues(record: Record<string, unknown>): ResourceValues {
  const out: ResourceValues = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) continue;
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else if (typeof value === 'object' && 'toNumber' in value) {
      out[key] = (value as { toNumber: () => number }).toNumber();
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      out[key] = value;
    }
    // Anything else (nested relations, arrays) is handled by the page itself.
  }

  // The image field looks for `<name>Url` to render its preview. Deriving it
  // here means every edit page gets the preview without knowing about images.
  for (const [idKey, relationKey] of [
    ['coverMediaId', 'coverMedia'],
    ['mediaId', 'media'],
    ['flagMediaId', 'flagMedia'],
  ] as const) {
    const relation = record[relationKey];
    if (record[idKey] && relation && typeof relation === 'object') {
      const media = relation as { url?: string; secureUrl?: string | null };
      const url = media.secureUrl ?? media.url;
      if (url) out[`${idKey}Url`] = url;
    }
  }

  return out;
}

type Delegate = {
  findUnique: (args: {
    where: { id: string };
    include?: Record<string, unknown>;
  }) => Promise<Record<string, unknown> | null>;
};

/**
 * Models that carry a cover image, and the relation that holds it.
 *
 * The edit form needs the image's URL to show a preview, not just its id, so
 * the record is loaded with the relation attached wherever one exists.
 */
const COVER_RELATION: Partial<Record<string, string>> = {
  destination: 'coverMedia',
  event: 'coverMedia',
  tour: 'coverMedia',
  activity: 'coverMedia',
  accommodation: 'coverMedia',
  advertisement: 'media',
  heroSlide: 'media',
  visaCountry: 'flagMedia',
  post: 'coverMedia',
  contest: 'coverMedia',
  contestPrize: 'media',
  contestJudge: 'media',
  contestSponsor: 'media',
  contestGalleryItem: 'media',
};

/**
 * Loads one record for editing, or renders the 404 page.
 *
 * A missing id and an id the viewer may not see are deliberately the same
 * outcome: neither confirms that a record exists.
 */
export async function loadForEdit(
  model:
    | 'destination'
    | 'event'
    | 'tour'
    | 'activity'
    | 'accommodation'
    | 'visaCountry'
    | 'visaType'
    | 'notice'
    | 'advertisement'
    | 'heroSlide'
    | 'flightRoute'
    | 'trainSchedule'
    | 'post'
    | 'postCategory'
    | 'contest'
    | 'contestPrize'
    | 'contestJudge'
    | 'contestSponsor'
    | 'contestGalleryItem',
  id: string,
): Promise<Record<string, unknown>> {
  const client = prisma as unknown as Record<string, Delegate>;
  const relation = COVER_RELATION[model];

  const record = await client[model]?.findUnique({
    where: { id },
    ...(relation
      ? { include: { [relation]: { select: { url: true, secureUrl: true } } } }
      : {}),
  });
  if (!record) notFound();
  return record;
}

/** Dates a datetime-local input can read back, in the site's own timezone. */
export function toLocalInput(value: unknown): string | undefined {
  if (!(value instanceof Date)) return undefined;
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}
