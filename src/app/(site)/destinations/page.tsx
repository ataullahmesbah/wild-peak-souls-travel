import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DestinationCard } from '@/components/cards';
import { Container, Section } from '@/components/ui/section';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filter-bar';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { listDestinations } from '@/lib/data/public';
import { parsePageParam } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Destinations',
  description:
    'Explore the regions we run trips in — with the tours, events, stays and activities available in each.',
  alternates: { canonical: '/destinations' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = parsePageParam(first(params.page));
  const query = first(params.q);
  const country = first(params.country);

  return (
    <>
      <PageHeader
        eyebrow="Where we go"
        title="Destinations"
        description="Every destination page pulls in the live trips, stays and activities we currently operate there."
        breadcrumbs={[{ label: 'Destinations' }]}
      >
        <FilterBar
          searchPlaceholder="Search destinations, regions…"
          filters={[
            {
              name: 'country',
              label: 'Country',
              options: [
                { value: 'Bangladesh', label: 'Bangladesh' },
                { value: 'Nepal', label: 'Nepal' },
                { value: 'India', label: 'India' },
                { value: 'Bhutan', label: 'Bhutan' },
                { value: 'Thailand', label: 'Thailand' },
              ],
            },
          ]}
        />
      </PageHeader>

      <Section>
        <Container>
          <h2 className="sr-only">Destinations</h2>
          <Suspense key={`${page}-${query}-${country}`} fallback={<CardGridSkeleton />}>
            <DestinationResults page={page} query={query} country={country} params={params} />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function DestinationResults({
  page,
  query,
  country,
  params,
}: {
  page: number;
  query?: string;
  country?: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const result = await listDestinations({ page, query, country });

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="No destinations match that search"
        description="Try a broader search, or tell us where you want to go and we will build the trip."
        actionLabel="Request a custom tour"
        actionHref="/custom-tour"
      />
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        {result.total} destination{result.total === 1 ? '' : 's'}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </div>
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/destinations"
        searchParams={Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
