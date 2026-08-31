import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AlertTriangle, Plane } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/states';
import { TableSkeleton } from '@/components/ui/skeleton';
import { FlightSearchForm } from '@/components/flights/flight-search-form';
import { FlightResults } from '@/components/flights/flight-results';
import { getAirports } from '@/lib/data/public';
import { DataProvenance } from '@/components/transport/data-provenance';
import { searchFlightSchedules } from '@/lib/transport/flights';


export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Flight Explorer',
  description:
    'Browse indicative flight routes and timings, then send Wild Peak Souls a booking request. Fares and availability are confirmed by our team.',
  alternates: { canonical: '/flights' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FlightsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const airports = await getAirports();

  const from = first(params.from);
  const to = first(params.to);
  const date = first(params.date);
  const passengers = Number(first(params.passengers)) || 1;
  const hasSearch = Boolean(from && to);

  return (
    <>
      <PageHeader
        eyebrow="Flights"
        title="Flight explorer"
        description="Search routes we work with, compare timings, then send us a booking request. We are not a ticketing engine — a person confirms the live fare and seat before anything is paid."
        breadcrumbs={[{ label: 'Flights' }]}
      >
        <FlightSearchForm
          airports={airports}
          defaults={{ from, to, date, passengers: String(passengers) }}
        />
      </PageHeader>

      {/* This disclosure is not optional — the PRD requires that informational
          flight data is never presented as confirmed availability. */}
      <Container className="pt-8">
        <div className="flex gap-3 rounded-card border border-warning/30 bg-warning-soft p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-warning">
              Schedules and prices shown here are indicative, not live inventory.
            </p>
            <p className="mt-1 text-foreground/80">
              Wild Peak Souls does not issue tickets from this page. Final fare,
              baggage allowance and seat availability are confirmed by our team
              against the airline before you pay anything.
            </p>
          </div>
        </div>
      </Container>

      <Section className="pt-8">
        <Container>
          {!hasSearch ? (
            <EmptyState
              icon={Plane}
              title="Choose an origin and destination"
              description="Pick where you are flying from and to, and we will show the routes we can book for you."
            />
          ) : (
            <Suspense key={`${from}-${to}-${date}`} fallback={<TableSkeleton rows={5} cols={6} />}>
              <Results from={from!} to={to!} date={date} passengers={passengers} />
            </Suspense>
          )}
        </Container>
      </Section>
    </>
  );
}

async function Results({
  from,
  to,
  date,
  passengers,
}: {
  from: string;
  to: string;
  date?: string;
  passengers: number;
}) {
  const { results: routes, source, liveAvailable } = await searchFlightSchedules({
    origin: from,
    destination: to,
    date,
  });

  if (routes.length === 0) {
    return (
      <EmptyState
        icon={Plane}
        title="No routes listed for that pair"
        description="We may still be able to arrange this flight. Send us the details and our team will quote you directly."
        actionLabel="Send a flight request"
        actionHref="/contact"
      />
    );
  }

  return (
    <>
      <div className="mb-5">
        <DataProvenance
          source={source}
          updatedAt={routes[0]?.updatedAt}
          liveAvailable={liveAvailable}
          what="flight timings"
        />
      </div>
      <FlightResults
        routes={routes.map((route) => ({
          id: route.id,
          airline: route.airline,
          airlineIata: route.airlineIata,
          flightNumber: route.flightNumber,
          originIata: route.originIata,
          destinationIata: route.destinationIata,
          originAirport: route.originAirport,
          destinationAirport: route.destinationAirport,
          departureTime: route.departureTime,
          arrivalTime: route.arrivalTime,
          departureEstimated: route.departureEstimated,
          arrivalEstimated: route.arrivalEstimated,
          departureTerminal: route.departureTerminal,
          departureGate: route.departureGate,
          arrivalTerminal: route.arrivalTerminal,
          arrivalGate: route.arrivalGate,
          arrivalBaggageBelt: route.arrivalBaggageBelt,
          departureDelayMinutes: route.departureDelayMinutes,
          arrivalDelayMinutes: route.arrivalDelayMinutes,
          status: route.status,
          aircraftType: route.aircraftType,
          flightDate: route.flightDate,
          operatedBy: route.operatedBy,
          durationMinutes: route.durationMinutes,
          stops: route.stops,
          baggage: route.baggage,
          indicativePrice: route.indicativePrice,
          source: route.source,
          sourceUpdatedAt: route.updatedAt.toISOString(),
        }))}
        searchDate={date ?? null}
        passengers={passengers}
      />
    </>
  );
}
