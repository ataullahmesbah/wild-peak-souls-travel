// src/components/contest/home-contest-banner.tsx
import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';

import { Container, Section } from '@/components/ui/section';
import { CoverImage } from '@/components/ui/media';
import { ContestPhaseBadge } from '@/components/contest/sections';
import { getCurrentContest } from '@/lib/data/contest';
import { contestPhase, nextMilestone } from '@/lib/contest/phase';
import { formatDate } from '@/lib/utils';

/**
 * The contest strip on the home page.
 *
 * Renders nothing at all unless a contest is published, running and marked to
 * feature — so the home page gains a section when a contest opens and loses it
 * again when the contest finishes, with nobody editing the page either time.
 *
 * The call to action follows the phase: enter while entries are open, vote
 * while voting is open, see the winners once results are out. A banner still
 * saying "enter now" a week after the deadline is the thing that makes a
 * contest look abandoned.
 */
export async function HomeContestBanner() {
  const contest = await getCurrentContest();
  if (!contest || !contest.featureOnHome) return null;

  const phase = contestPhase(contest);
  const milestone = nextMilestone(contest);

  const cta =
    phase === 'ACCEPTING'
      ? 'Enter the contest'
      : phase === 'VOTING'
        ? 'Vote for your favourite'
        : phase === 'COMPLETED'
          ? 'See the winners'
          : 'See the contest';

  return (
    <Section className="bg-secondary text-white">
      <Container>
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Contest
            </span>

            <h2 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
              {contest.title}
            </h2>

            {contest.tagline && (
              <p className="mt-3 max-w-xl text-white/80">{contest.tagline}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/75">
              <ContestPhaseBadge phase={phase} />
              {milestone && (
                <span>
                  {milestone.label}: {formatDate(milestone.at)}
                </span>
              )}
              {contest._count.entries > 0 && (
                <span>
                  {contest._count.entries}{' '}
                  {contest._count.entries === 1 ? 'entry' : 'entries'} so far
                </span>
              )}
            </div>

            {contest.prizeSummary && (
              <p className="mt-4 font-medium text-accent">{contest.prizeSummary}</p>
            )}

            <Link
              href={`/contest/${contest.slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-field bg-white px-5 py-3 text-sm font-semibold text-secondary transition-opacity hover:opacity-90"
            >
              {cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-card">
            <CoverImage
              media={contest.coverMedia}
              alt={contest.title}
              sizes="(max-width: 1024px) 100vw, 520px"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
