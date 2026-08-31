import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Info, Train } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/states';
import { TableSkeleton } from '@/components/ui/skeleton';
import { TrainSearchForm } from '@/components/flights/train-search-form';
import { getTrainStations } from '@/lib/data/public';
import { DataProvenance } from '@/components/transport/data-provenance';
import { searchTrainSchedules } from '@/lib/transport/trains';
import { minutesToDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bangladesh Train Schedule',
  description:
    'Intercity train timings, off-days and route information for planning overland travel in Bangladesh. Informational only — no ticket booking.',
  alternates: { canonical: '/train-schedule' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TrainSchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const stations = await getTrainStations();
  const from = first(params.from);
  const to = first(params.to);

  return (
    <>
      <PageHeader
        eyebrow="Rail"
        title="Bangladesh train schedule"
        description="Intercity timings to help you plan overland legs of a trip. This module is informational — Wild Peak Souls does not sell rail tickets."
        breadcrumbs={[{ label: 'Train Schedule' }]}
      >
        <TrainSearchForm stations={stations} defaults={{ from, to }} />
      </PageHeader>

      <Container className="pt-8">
        <div className="flex gap-3 rounded-card border border-info/30 bg-info-soft p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-info">Informational schedule only.</p>
            <p className="mt-1 text-foreground/80">
              Timings are sourced from published Bangladesh Railway schedules and can
              change. Confirm with Bangladesh Railway before travelling. We do not
              issue or resell rail tickets.
            </p>
          </div>
        </div>
      </Container>

      <Section className="pt-8">
        <Container>
          <Suspense key={`${from}-${to}`} fallback={<TableSkeleton rows={6} cols={5} />}>
            <TrainResults from={from} to={to} />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function TrainResults({ from, to }: { from?: string; to?: string }) {
  const { results: trains, liveAvailable } = await searchTrainSchedules({
    origin: from,
    destination: to,
  });

  if (trains.length === 0) {
    return (
      <EmptyState
        icon={Train}
        title="No schedules match"
        description="Try a different station pair, or clear the filters to see every published route."
      />
    );
  }

  return (
    <>
      <div className="mb-4">
        <DataProvenance
          source="agency"
          updatedAt={trains[0]?.updatedAt}
          liveAvailable={liveAvailable}
          what="train schedules"
        />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {trains.length} scheduled service{trains.length === 1 ? '' : 's'}
      </p>
      <div className="wps-card overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <caption className="sr-only">Bangladesh intercity train schedule</caption>
          <thead className="border-b border-border bg-muted/50 text-left">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Train</th>
              <th scope="col" className="px-4 py-3 font-medium">Route</th>
              <th scope="col" className="px-4 py-3 font-medium">Departs</th>
              <th scope="col" className="px-4 py-3 font-medium">Arrives</th>
              <th scope="col" className="px-4 py-3 font-medium">Duration</th>
              <th scope="col" className="px-4 py-3 font-medium">Off day</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trains.map((train) => (
              <tr key={train.id} className="transition-colors hover:bg-muted/40">
                <td className="px-4 py-3">
                  <p className="font-medium">{train.trainName}</p>
                  {train.trainNumber && (
                    <p className="text-xs text-muted-foreground">{train.trainNumber}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p>
                    {train.originStation} → {train.destinationStation}
                  </p>
                  {train.routeStops && (
                    <p className="mt-0.5 max-w-64 truncate text-xs text-muted-foreground">
                      via {train.routeStops}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{train.departureTime}</td>
                <td className="px-4 py-3 font-medium">{train.arrivalTime}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {minutesToDuration(train.durationMinutes)}
                </td>
                <td className="px-4 py-3">
                  {train.offDay ? (
                    <Badge tone="warning">{train.offDay}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Daily</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
