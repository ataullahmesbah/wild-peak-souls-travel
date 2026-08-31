// src/lib/transport/refresh.ts
import 'server-only';

import { prisma } from '@/lib/prisma';

/**
 * Refreshes the stored flight schedules from a provider.
 *
 * The public flight page already prefers live data when a provider answers.
 * This is the other half: it writes what the provider returns back into
 * FlightRoute, so the schedules keep working when the provider is slow, down,
 * or out of quota — and so the dashboard shows the same timings the site does.
 *
 * Three rules it follows, all of them about not destroying an operator's work:
 *
 *  - A route the provider does not mention is left alone, never deleted. A
 *    provider gap is not evidence that a flight stopped existing, and routes
 *    entered by hand must survive a refresh.
 *  - Only timings and duration are overwritten. `indicativePrice` and
 *    `baggage` are the agency's own numbers and the provider does not supply
 *    them; overwriting those with nulls would quietly empty the page.
 *  - `source` and `sourceUpdatedAt` are stamped, so the public page can say
 *    where each timing came from and how old it is.
 */

export interface RefreshResult {
  ok: boolean;
  reason?: string;
  checked: number;
  updated: number;
  created: number;
}

interface AviationStackFlight {
  airline?: { name?: string };
  flight?: { iata?: string; number?: string };
  departure?: { iata?: string; scheduled?: string };
  arrival?: { iata?: string; scheduled?: string };
}

const TIMEOUT_MS = 8000;

export function isFlightProviderConfigured(): boolean {
  return Boolean(process.env.FLIGHT_API_KEY);
}

export async function refreshFlightSchedules(): Promise<RefreshResult> {
  if (!isFlightProviderConfigured()) {
    return {
      ok: false,
      reason:
        'No flight provider is configured. Add FLIGHT_API_KEY to the environment to enable live refresh.',
      checked: 0,
      updated: 0,
      created: 0,
    };
  }

  // Refresh the pairs we actually publish, rather than crawling an airline's
  // whole network. It keeps the request count — and the bill — proportional to
  // what the site shows.
  const pairs = await prisma.flightRoute.findMany({
    where: { active: true },
    select: { originIata: true, destinationIata: true },
    distinct: ['originIata', 'destinationIata'],
  });

  let checked = 0;
  let updated = 0;
  let created = 0;

  for (const pair of pairs) {
    const flights = await fetchPair(pair.originIata, pair.destinationIata);
    if (!flights) continue;
    checked += flights.length;

    for (const flight of flights) {
      const flightNumber = flight.flight?.iata ?? flight.flight?.number;
      const departureTime = hhmm(flight.departure?.scheduled);
      const arrivalTime = hhmm(flight.arrival?.scheduled);
      if (!flightNumber || !departureTime || !arrivalTime) continue;

      const durationMinutes = minutesBetween(
        flight.departure?.scheduled,
        flight.arrival?.scheduled,
      );
      if (durationMinutes <= 0) continue;

      const existing = await prisma.flightRoute.findUnique({
        where: {
          flightNumber_originIata_destinationIata: {
            flightNumber,
            originIata: pair.originIata,
            destinationIata: pair.destinationIata,
          },
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.flightRoute.update({
          where: { id: existing.id },
          // Timings only. Price and baggage stay as the agency set them.
          data: {
            departureTime,
            arrivalTime,
            durationMinutes,
            source: 'LIVE_FEED',
            sourceUpdatedAt: new Date(),
          },
        });
        updated += 1;
      } else {
        await prisma.flightRoute.create({
          data: {
            airline: flight.airline?.name ?? 'Unknown airline',
            flightNumber,
            originIata: pair.originIata,
            destinationIata: pair.destinationIata,
            departureTime,
            arrivalTime,
            durationMinutes,
            source: 'LIVE_FEED',
            sourceUpdatedAt: new Date(),
            // New routes arrive inactive. Someone should look at a schedule a
            // provider invented before it goes on the public page.
            active: false,
          },
        });
        created += 1;
      }
    }
  }

  return { ok: true, checked, updated, created };
}

async function fetchPair(
  origin: string,
  destination: string,
): Promise<AviationStackFlight[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL('https://api.aviationstack.com/v1/flights');
    url.searchParams.set('access_key', process.env.FLIGHT_API_KEY ?? '');
    url.searchParams.set('dep_iata', origin);
    url.searchParams.set('arr_iata', destination);
    url.searchParams.set('limit', '50');

    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) return null;

    const body = (await response.json()) as { data?: AviationStackFlight[] };
    return Array.isArray(body.data) ? body.data : null;
  } catch {
    // Timeout, network failure or malformed response. One pair failing must
    // not abandon the rest of the refresh.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function hhmm(iso: string | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return iso.slice(11, 16);
}

function minutesBetween(from: string | undefined, to: string | undefined): number {
  if (!from || !to) return 0;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 60000);
}

/**
 * Trains have no provider.
 *
 * Bangladesh Railway publishes no open API, and scraping their booking site
 * would break the moment it changed and is not something to build a business
 * page on. What this does instead is honest: it re-stamps sourceUpdatedAt on
 * the schedules an operator has confirmed, so the public page's "last
 * confirmed" label reflects a real human check rather than the date a row was
 * first created.
 */
export async function markTrainSchedulesReviewed(): Promise<RefreshResult> {
  const result = await prisma.trainSchedule.updateMany({
    where: { active: true },
    data: { sourceUpdatedAt: new Date() },
  });

  return { ok: true, checked: result.count, updated: result.count, created: 0 };
}
