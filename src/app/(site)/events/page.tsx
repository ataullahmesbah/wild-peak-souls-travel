import type { Metadata } from 'next';
import { Suspense } from 'react';

import { EventCard } from '@/components/cards';
import { Container, Section } from '@/components/ui/section';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filter-bar';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { listEvents } from '@/lib/data/public';
import { parsePageParam } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Group Events & Fixed Departures',
  description:
    'Fixed-date group trips with set prices and limited seats. Live availability, held at booking.',
  alternates: { canonical: '/events' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = parsePageParam(first(params.page));

  return (
    <>
      <PageHeader
        eyebrow="Fixed departures"
        title="Group events"
        description="Join a set-date departure with a fixed price and a capped group size. Seat counts shown here are checked against live capacity, and confirmed again when you book."
        breadcrumbs={[{ label: 'Events' }]}
      >
        <FilterBar
          searchPlaceholder="Search events…"
          filters={[
            {
              name: 'difficulty',
              label: 'Difficulty',
              options: [
                { value: 'EASY', label: 'Easy' },
                { value: 'MODERATE', label: 'Moderate' },
                { value: 'CHALLENGING', label: 'Challenging' },
                { value: 'EXTREME', label: 'Extreme' },
              ],
            },
          ]}
        />
      </PageHeader>

      <Section>
        <Container>
          <h2 className="sr-only">Departures</h2>
          <Suspense key={JSON.stringify(params)} fallback={<CardGridSkeleton />}>
            <EventResults
              page={page}
              query={first(params.q)}
              difficulty={first(params.difficulty)}
              destination={first(params.destination)}
              params={params}
            />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function EventResults({
  page,
  query,
  difficulty,
  destination,
  params,
}: {
  page: number;
  query?: string;
  difficulty?: string;
  destination?: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const result = await listEvents({ page, query, difficulty, destination });

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="No upcoming events match"
        description="New departures are announced regularly. Tell us what you are looking for and we will build it."
        actionLabel="Request a custom trip"
        actionHref="/custom-tour"
      />
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        {result.total} upcoming departure{result.total === 1 ? '' : 's'}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/events"
        searchParams={Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
