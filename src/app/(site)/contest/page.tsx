// src/app/(site)/contest/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Trophy } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { CoverImage } from '@/components/ui/media';
import { EmptyState } from '@/components/ui/states';
import { ContestPhaseBadge } from '@/components/contest/sections';
import { getCurrentContest, listPublishedContests } from '@/lib/data/contest';
import { contestPhase } from '@/lib/contest/phase';
import { siteUrl } from '@/lib/env';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contest',
  description:
    'Enter the Wild Peak Souls photo and video contest — send in your best shot from the road and win a place on one of our trips.',
  alternates: { canonical: '/contest' },
  openGraph: {
    type: 'website',
    title: 'Wild Peak Souls Contest',
    description: 'Send in your best photo or video from the road.',
    url: `${siteUrl()}/contest`,
  },
};

/**
 * The contest index.
 *
 * With one contest running there is nothing to choose between, so this goes
 * straight to it — a listing of one is a page nobody wanted. The list only
 * earns its place once past contests have accumulated.
 */
export default async function ContestIndexPage() {
  const [current, all] = await Promise.all([getCurrentContest(), listPublishedContests()]);

  if (current && all.length <= 1) {
    redirect(`/contest/${current.slug}`);
  }

  if (all.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Contest"
          title="No contest running just now"
          description="We run photo and video contests through the year. Follow us or join the newsletter and we will let you know when the next one opens."
          breadcrumbs={[{ label: 'Contest' }]}
        />
        <Section>
          <Container>
            <EmptyState
              icon={Trophy}
              title="Nothing open at the moment"
              description="In the meantime, have a look at where we go."
              actionLabel="Browse destinations"
              actionHref="/destinations"
            />
          </Container>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Contest"
        title="Contests"
        description="Send in your best shot from the road. Our judges and the public pick the winners together."
        breadcrumbs={[{ label: 'Contest' }]}
      />

      <Section>
        <Container>
          <h2 className="sr-only">All contests</h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {all.map((contest) => (
              <li
                key={contest.id}
                className="group overflow-hidden rounded-card border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <Link href={`/contest/${contest.slug}`} className="block">
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    <CoverImage
                      media={contest.coverMedia}
                      alt={contest.title}
                      sizes="(max-width: 640px) 100vw, 380px"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <ContestPhaseBadge phase={contestPhase(contest)} />
                    <h3 className="mt-3 font-display text-lg font-semibold group-hover:text-primary">
                      {contest.title}
                    </h3>
                    {contest.tagline && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {contest.tagline}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Entries close {formatDate(contest.entryDeadline)} ·{' '}
                      {contest._count.entries} {contest._count.entries === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
