import type { Metadata } from 'next';
import { Suspense } from 'react';

import { TourCard } from '@/components/cards';
import { Container, Section } from '@/components/ui/section';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filter-bar';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { listTours } from '@/lib/data/public';
import { parsePageParam } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tour Packages',
  description:
    'Multi-day itineraries with transport, stays, guides and activities already arranged.',
  alternates: { canonical: '/tours' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ToursPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = parsePageParam(first(params.page));

  return (
    <>
      <PageHeader
        eyebrow="Tour packages"
        title="Ready-made journeys"
        description="Fixed itineraries you can book as they are, or use as the starting point for something custom. Every package lists exactly what is included and what is not."
        breadcrumbs={[{ label: 'Tours' }]}
      >
        <FilterBar
          searchPlaceholder="Search tours…"
          filters={[
            {
              name: 'maxPrice',
              label: 'Budget (per person)',
              options: [
                { value: '10000', label: 'Under ৳10,000' },
                { value: '25000', label: 'Under ৳25,000' },
                { value: '50000', label: 'Under ৳50,000' },
                { value: '100000', label: 'Under ৳1,00,000' },
              ],
            },
          ]}
        />
      </PageHeader>

      <Section>
        <Container>
          <h2 className="sr-only">Tours</h2>
          <Suspense key={JSON.stringify(params)} fallback={<CardGridSkeleton />}>
            <TourResults
              page={page}
              query={first(params.q)}
              destination={first(params.destination)}
              maxPrice={Number(first(params.maxPrice)) || undefined}
              params={params}
            />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function TourResults({
  page,
  query,
  destination,
  maxPrice,
  params,
}: {
  page: number;
  query?: string;
  destination?: string;
  maxPrice?: number;
  params: Record<string, string | string[] | undefined>;
}) {
  const result = await listTours({ page, query, destination, maxPrice });

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="No tours match those filters"
        description="Widen your budget or search, or let us design something to fit."
        actionLabel="Request a custom tour"
        actionHref="/custom-tour"
      />
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        {result.total} tour package{result.total === 1 ? '' : 's'}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((tour) => (
          <TourCard key={tour.id} tour={tour} />
        ))}
      </div>
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/tours"
        searchParams={Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
