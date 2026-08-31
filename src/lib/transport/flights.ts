// src/lib/transport/flights.ts
import 'server-only';

import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { toNumber } from '@/lib/utils';

/**
 * Flight schedules, live where a provider is reachable and agency-maintained
 * otherwise.
 *
 * The rule this module exists to enforce: a traveller must always be able to
 * tell where a timing came from and how old it is. A live result that silently
 * degrades to a stale one is worse than no result — someone plans a connection
 * around a timing they believe is current.
 *
 * The provider quotes schedules, never fares. Where a live flight matches a
 * route the agency maintains, that route's own indicative price and baggage
 * allowance are attached; everything else says "price on request" rather than
 * showing a number nobody stands behind.
 */

export type FlightSource = 'live' | 'agency';

export interface FlightResult {
  id: string;
  airline: string;
  airlineIata: string | null;
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  originAirport: string | null;
  destinationAirport: string | null;
  departureTime: string;
  arrivalTime: string;
  /** Local time the provider now expects, when it differs from the schedule. */
  departureEstimated: string | null;
  arrivalEstimated: string | null;
  departureTerminal: string | null;
  departureGate: string | null;
  arrivalTerminal: string | null;
  arrivalGate: string | null;
  arrivalBaggageBelt: string | null;
  departureDelayMinutes: number | null;
  arrivalDelayMinutes: number | null;
  /** scheduled | active | landed | cancelled | incident | diverted */
  status: string | null;
  aircraftType: string | null;
  flightDate: string | null;
  /** Set when this row is a codeshare marketed under another airline's number. */
  operatedBy: string | null;
  durationMinutes: number;
  stops: number;
  baggage: string | null;
  indicativePrice: number | null;
  source: FlightSource;
  /** When this timing was last confirmed, for the freshness label. */
  updatedAt: Date;
}

export interface FlightSearch {
  origin?: string;
  destination?: string;
  date?: string;
}

export interface FlightSearchResult {
  results: FlightResult[];
  source: FlightSource;
  liveAvailable: boolean;
  /**
   * False when the rows describe the route's current schedule rather than the
   * day the traveller asked for. The page must say so: presenting today's
   * departures as next month's is the kind of quiet lie that gets someone to
   * the airport on the wrong day.
   */
  dateExact: boolean;
}

/**
 * How long a live answer is reused before the provider is asked again.
 *
 * Deliberately long. aviationstack's free plan allows roughly 100 calls a
 * month, which is about three searches a day — without a cache a single
 * visitor refreshing the page would exhaust the month's quota in an afternoon.
 */
const LIVE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; results: FlightResult[] }>();

/** The shape of an agency route this module needs for pricing a live flight. */
type PricedRoute = {
  flightNumber: string;
  indicativePrice: Prisma.Decimal | number | string | null;
  baggage: string | null;
};

export function isLiveFlightDataConfigured(): boolean {
  return Boolean(process.env.FLIGHT_API_KEY);
}

export async function searchFlightSchedules(
  params: FlightSearch,
): Promise<FlightSearchResult> {
  const origin = params.origin?.trim().toUpperCase();
  const destination = params.destination?.trim().toUpperCase();

  if (!origin || !destination || origin.length !== 3 || destination.length !== 3) {
    return {
      results: [],
      source: 'agency',
      liveAvailable: isLiveFlightDataConfigured(),
      dateExact: true,
    };
  }

  // The agency's own routes are loaded either way: as the fallback, and as the
  // source of prices and baggage for live results.
  const routes = await prisma.flightRoute
    .findMany({
      where: { active: true, originIata: origin, destinationIata: destination },
      orderBy: { departureTime: 'asc' },
      take: 40,
    })
    .catch(() => []);

  if (isLiveFlightDataConfigured()) {
    const live = await fetchLive(origin, destination, params.date);
    // An empty live answer falls through rather than being shown as "no
    // flights": the provider not knowing a route is not the same as the route
    // not existing.
    if (live && live.results.length > 0) {
      return {
        results: attachAgencyPricing(live.results, routes),
        source: 'live',
        liveAvailable: true,
        dateExact: live.dateExact,
      };
    }
  }

  const results: FlightResult[] = routes.map((route) => ({
    id: route.id,
    airline: route.airline,
    airlineIata: null,
    flightNumber: route.flightNumber,
    originIata: route.originIata,
    destinationIata: route.destinationIata,
    originAirport: null,
    destinationAirport: null,
    departureTime: route.departureTime,
    arrivalTime: route.arrivalTime,
    departureEstimated: null,
    arrivalEstimated: null,
    departureTerminal: null,
    departureGate: null,
    arrivalTerminal: null,
    arrivalGate: null,
    arrivalBaggageBelt: null,
    departureDelayMinutes: null,
    arrivalDelayMinutes: null,
    status: null,
    aircraftType: null,
    flightDate: null,
    operatedBy: null,
    durationMinutes: route.durationMinutes,
    stops: route.stops,
    baggage: route.baggage,
    indicativePrice: route.indicativePrice ? toNumber(route.indicativePrice) : null,
    source: 'agency',
    updatedAt: route.sourceUpdatedAt,
  }));

  return {
    // An agency route carries the weekdays it operates, so this answer really
    // is for the day that was asked for.
    results: filterByWeekday(results, params.date, routes),
    source: 'agency',
    liveAvailable: isLiveFlightDataConfigured(),
    dateExact: true,
  };
}

/**
 * Puts the agency's price and baggage allowance onto matching live flights.
 *
 * Matched on flight number, which is the only thing the two sources reliably
 * share. A live flight the agency does not list keeps a null price and the
 * page says "price on request" — better than implying a fare exists for a
 * route nobody has quoted.
 */
function attachAgencyPricing(
  live: FlightResult[],
  routes: PricedRoute[],
): FlightResult[] {
  if (routes.length === 0) return live;

  const byNumber = new Map(
    routes.map((route) => [normaliseNumber(route.flightNumber), route]),
  );

  return live.map((flight) => {
    const match = byNumber.get(normaliseNumber(flight.flightNumber));
    if (!match) return flight;
    return {
      ...flight,
      indicativePrice: match.indicativePrice ? toNumber(match.indicativePrice) : null,
      baggage: match.baggage,
    };
  });
}

/** "BG  147" and "bg147" are the same flight to everyone except a Map key. */
function normaliseNumber(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/** Drops agency routes that do not operate on the requested weekday. */
function filterByWeekday(
  results: FlightResult[],
  date: string | undefined,
  routes?: Array<{ id: string; daysOfWeek: string }>,
): FlightResult[] {
  if (!date || !routes) return results;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return results;

  const isoWeekday = parsed.getUTCDay() === 0 ? 7 : parsed.getUTCDay();
  const daysById = new Map(routes.map((route) => [route.id, route.daysOfWeek]));

  return results.filter((result) => {
    const days = daysById.get(result.id);
    if (!days) return true;
    return days.split(',').map((day) => day.trim()).includes(String(isoWeekday));
  });
}

/**
 * Whether the provider can actually answer for this date.
 *
 * aviationstack's /v1/flights endpoint serves the current day. A past date
 * needs the paid historical plan and a future date belongs to a different
 * endpoint again; both answer an unsubscribed key with an empty array, which
 * is indistinguishable from "this route does not exist" and is why a search
 * for next month came back saying no routes were listed.
 *
 * Both the UTC and the server's local date count as today, because a traveller
 * in Dhaka picking "today" at 02:00 local is still on yesterday's UTC date.
 */
function providerServesDate(date: string | undefined): boolean {
  if (!date) return false;
  const now = new Date();
  const utcToday = now.toISOString().slice(0, 10);
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return date === utcToday || date === localToday;
}

interface AviationStackFlight {
  flight_date?: string;
  flight_status?: string;
  airline?: { name?: string; iata?: string };
  flight?: {
    iata?: string;
    number?: string;
    codeshared?: {
      airline_name?: string;
      flight_iata?: string;
    } | null;
  };
  aircraft?: { iata?: string; registration?: string } | null;
  departure?: {
    airport?: string;
    iata?: string;
    terminal?: string | null;
    gate?: string | null;
    delay?: number | null;
    scheduled?: string;
    estimated?: string | null;
  };
  arrival?: {
    airport?: string;
    iata?: string;
    terminal?: string | null;
    gate?: string | null;
    baggage?: string | null;
    delay?: number | null;
    scheduled?: string;
    estimated?: string | null;
  };
}

/**
 * Asks the configured provider, and returns null on any problem.
 *
 * Null rather than throwing, because the caller's job is to fall back quietly:
 * a provider outage should cost the traveller a freshness label, not the page.
 * The request is given a short timeout for the same reason — a hanging upstream
 * must not hold a page render open.
 *
 * The provider's own error body is logged rather than swallowed. Its failures
 * are quota and plan restrictions, which look identical to "no flights found"
 * from the outside and are the reason a working key appears to fail at random.
 */
async function fetchLive(
  origin: string,
  destination: string,
  date: string | undefined,
): Promise<{ results: FlightResult[]; dateExact: boolean } | null> {
  // Only a date the provider will actually honour goes into the query — and
  // therefore into the cache key, so an answer fetched without a date is not
  // reused as though it were for a specific day.
  const dateExact = providerServesDate(date);
  const queryDate = dateExact ? date : undefined;

  const key = `${origin}-${destination}-${queryDate ?? 'current'}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < LIVE_TTL_MS) {
    return { results: hit.results, dateExact };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = new URL('https://api.aviationstack.com/v1/flights');
    url.searchParams.set('access_key', process.env.FLIGHT_API_KEY ?? '');
    url.searchParams.set('dep_iata', origin);
    url.searchParams.set('arr_iata', destination);
    if (queryDate) {
      url.searchParams.set('flight_date', queryDate);
    }
    url.searchParams.set('limit', '100');

    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 1800 },
    });

    const body = (await response.json().catch(() => null)) as {
      data?: AviationStackFlight[];
      error?: { code?: string; message?: string };
    } | null;

    if (!response.ok || body?.error) {
      console.warn(
        `[flights] provider declined ${origin}-${destination}: ` +
        `${body?.error?.code ?? response.status} ${body?.error?.message ?? ''}`.trim(),
      );
      return null;
    }
    if (!Array.isArray(body?.data)) return null;

    const now = new Date();

    const mapped = body.data
      .map((row): FlightResult | null => {
        const departure = localTime(row.departure?.scheduled);
        const arrival = localTime(row.arrival?.scheduled);
        if (!departure || !arrival) return null;

        const number = row.flight?.iata ?? row.flight?.number ?? null;
        if (!number) return null;

        return {
          // Unique per flight AND per departure instant. Keying on the flight
          // number alone collided whenever the provider returned the same
          // service for more than one date, which React reports as two
          // children with the same key.
          id: `live-${row.flight_date ?? 'x'}-${number}-${row.departure?.scheduled ?? ''}`,
          airline: row.airline?.name ?? 'Unknown airline',
          airlineIata: row.airline?.iata ?? null,
          flightNumber: number,
          originIata: row.departure?.iata ?? origin,
          destinationIata: row.arrival?.iata ?? destination,
          originAirport: row.departure?.airport ?? null,
          destinationAirport: row.arrival?.airport ?? null,
          departureTime: departure,
          arrivalTime: arrival,
          departureEstimated: differentTime(row.departure?.scheduled, row.departure?.estimated),
          arrivalEstimated: differentTime(row.arrival?.scheduled, row.arrival?.estimated),
          departureTerminal: row.departure?.terminal ?? null,
          departureGate: row.departure?.gate ?? null,
          arrivalTerminal: row.arrival?.terminal ?? null,
          arrivalGate: row.arrival?.gate ?? null,
          arrivalBaggageBelt: row.arrival?.baggage ?? null,
          departureDelayMinutes: row.departure?.delay ?? null,
          arrivalDelayMinutes: row.arrival?.delay ?? null,
          status: row.flight_status ?? null,
          aircraftType: row.aircraft?.iata ?? null,
          flightDate: row.flight_date ?? null,
          operatedBy: row.flight?.codeshared?.airline_name ?? null,
          durationMinutes: minutesBetween(row.departure?.scheduled, row.arrival?.scheduled),
          stops: 0,
          baggage: null,
          // The provider quotes schedules, not fares. Inventing a price here
          // would be presenting a guess as a quote.
          indicativePrice: null,
          source: 'live',
          updatedAt: now,
        };
      })
      .filter((row): row is FlightResult => row !== null);

    const results = dedupe(mapped).sort((a, b) =>
      a.departureTime.localeCompare(b.departureTime),
    );

    cache.set(key, { at: Date.now(), results });
    return { results, dateExact };
  } catch {
    // Timeout, network failure or malformed response — all handled the same
    // way, because the caller's response to each is identical.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Collapses the several rows a provider returns for one physical departure.
 *
 * A codeshared flight comes back once per marketing airline, all with the same
 * aircraft, times and airports. Showing five of them is not five options. The
 * operating flight is kept and the marketing duplicates dropped.
 */
function dedupe(flights: FlightResult[]): FlightResult[] {
  const bySlot = new Map<string, FlightResult>();

  for (const flight of flights) {
    const slot = `${flight.originIata}-${flight.destinationIata}-${flight.departureTime}-${flight.arrivalTime}`;
    const held = bySlot.get(slot);

    if (!held) {
      bySlot.set(slot, flight);
      continue;
    }
    // Prefer the flight actually operating the aircraft over a codeshare.
    if (held.operatedBy !== null && flight.operatedBy === null) {
      bySlot.set(slot, flight);
    }
  }

  return [...bySlot.values()];
}

/** "2026-09-04T08:35:00+00:00" -> "08:35", in the airport's own local time. */
function localTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return iso.slice(11, 16);
}

/** The estimated time, but only when it actually differs from the schedule. */
function differentTime(
  scheduled: string | undefined,
  estimated: string | null | undefined,
): string | null {
  if (!estimated || !scheduled) return null;
  const a = localTime(scheduled);
  const b = localTime(estimated);
  return b && b !== a ? b : null;
}

function minutesBetween(from: string | undefined, to: string | undefined): number {
  if (!from || !to) return 0;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 60000);
}