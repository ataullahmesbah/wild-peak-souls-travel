import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ActivityCard } from '@/components/cards';
import { Container, Section } from '@/components/ui/section';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filter-bar';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { listActivities } from '@/lib/data/public';
import { parsePageParam } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Activities & Experiences',
  description:
    'Trekking, camping, waterfalls, boat rides, photography walks and cultural experiences.',
  alternates: { canonical: '/activities' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ActivitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = parsePageParam(first(params.page));

  return (
    <>
      <PageHeader
        eyebrow="Experiences"
        title="Activities"
        description="Add these to any trip, or book the bookable ones on their own. Difficulty, age limits and safety notes are listed on every activity."
        breadcrumbs={[{ label: 'Activities' }]}
      >
        <FilterBar searchPlaceholder="Search activities…" filters={[]} />
      </PageHeader>

      <Section>
        <Container>
          <h2 className="sr-only">Activities</h2>
          <Suspense key={JSON.stringify(params)} fallback={<CardGridSkeleton />}>
            <ActivityResults
              page={page}
              query={first(params.q)}
              destination={first(params.destination)}
              params={params}
            />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function ActivityResults({
  page,
  query,
  destination,
  params,
}: {
  page: number;
  query?: string;
  destination?: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const result = await listActivities({ page, query, destination });

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="No activities found"
        description="Try a different search, or browse our tours to see what is included."
        actionLabel="Browse tours"
        actionHref="/tours"
      />
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        {result.total} activit{result.total === 1 ? 'y' : 'ies'}
      </p>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {result.items.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/activities"
        searchParams={Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
