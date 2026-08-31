import type { Metadata } from 'next';
import { Suspense } from 'react';

import { StayCard } from '@/components/cards';
import { Container, Section } from '@/components/ui/section';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filter-bar';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { listStays } from '@/lib/data/public';
import { parsePageParam } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Stays — Resorts, Homestays & Camps',
  description:
    'Resorts, homestays, treehouses, cottages and camps with live per-night availability.',
  alternates: { canonical: '/stays' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function StaysPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = parsePageParam(first(params.page));

  return (
    <>
      <PageHeader
        eyebrow="Where you sleep"
        title="Stays"
        description="Properties we book into regularly. Availability is held per night, so the dates you pick are the dates that get blocked."
        breadcrumbs={[{ label: 'Stays' }]}
      >
        <FilterBar
          searchPlaceholder="Search stays…"
          filters={[
            {
              name: 'type',
              label: 'Property type',
              options: [
                { value: 'HOTEL', label: 'Hotel' },
                { value: 'RESORT', label: 'Resort' },
                { value: 'HOMESTAY', label: 'Homestay' },
                { value: 'TREEHOUSE', label: 'Treehouse' },
                { value: 'COTTAGE', label: 'Cottage' },
                { value: 'VILLA', label: 'Villa' },
                { value: 'HOSTEL', label: 'Hostel' },
                { value: 'GUEST_HOUSE', label: 'Guest house' },
                { value: 'CAMP', label: 'Camp' },
              ],
            },
          ]}
        />
      </PageHeader>

      <Section>
        <Container>
          <h2 className="sr-only">Places to stay</h2>
          <Suspense key={JSON.stringify(params)} fallback={<CardGridSkeleton />}>
            <StayResults
              page={page}
              query={first(params.q)}
              type={first(params.type)}
              destination={first(params.destination)}
              params={params}
            />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function StayResults({
  page,
  query,
  type,
  destination,
  params,
}: {
  page: number;
  query?: string;
  type?: string;
  destination?: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const result = await listStays({ page, query, type, destination });

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="No stays match those filters"
        description="We can also arrange accommodation that is not listed here — just ask."
        actionLabel="Contact us"
        actionHref="/contact"
      />
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        {result.total} propert{result.total === 1 ? 'y' : 'ies'}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((stay) => (
          <StayCard key={stay.id} stay={stay} />
        ))}
      </div>
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/stays"
        searchParams={Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
