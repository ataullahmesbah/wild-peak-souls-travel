// src/components/contest/sections.tsx
import Link from 'next/link';
import { Award, CalendarClock, Check, Gavel, Handshake, Trophy } from 'lucide-react';

import { CoverImage } from '@/components/ui/media';
import { EntryMedia, VideoBadge } from '@/components/contest/entry-media';
import { formatDateTime } from '@/lib/utils';
import { type ContestPhase, phaseLabel } from '@/lib/contest/phase';
import type { ContestDetail, PublicContestEntry } from '@/lib/data/contest';

/** Section heading used down the contest page. */
export function ContestSection({
  id,
  title,
  description,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  icon?: typeof Trophy;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2 id={`${id}-heading`} className="flex items-center gap-2 font-display text-2xl font-semibold">
        {Icon && <Icon className="h-6 w-6 text-primary" aria-hidden="true" />}
        {title}
      </h2>
      {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * The timeline.
 *
 * Every date the contest runs on, in one place, with the current phase marked.
 * A contest is a promise about dates, and the commonest complaint on any
 * contest page is not knowing whether it is still open — so the answer is
 * stated rather than left to be worked out from a deadline.
 */
export function ContestTimeline({
  contest,
  phase,
}: {
  contest: Pick<
    ContestDetail,
    'startAt' | 'entryDeadline' | 'votingStartAt' | 'votingEndAt' | 'resultsAt'
  >;
  phase: ContestPhase;
}) {
  const allSteps: Array<{ key: ContestPhase; label: string; at: Date | null }> = [
    { key: 'ACCEPTING', label: 'Entries open', at: contest.startAt },
    { key: 'REVIEW', label: 'Entries close', at: contest.entryDeadline },
    { key: 'VOTING', label: 'Public voting opens', at: contest.votingStartAt },
    { key: 'JUDGING', label: 'Voting closes', at: contest.votingEndAt },
    { key: 'COMPLETED', label: 'Winners announced', at: contest.resultsAt },
  ];
  // A contest without a voting round simply has no voting dates, and those
  // steps drop out rather than showing as blanks.
  const steps = allSteps.filter(
    (step): step is { key: ContestPhase; label: string; at: Date } => step.at !== null,
  );

  const order: ContestPhase[] = ['UPCOMING', 'ACCEPTING', 'REVIEW', 'VOTING', 'JUDGING', 'COMPLETED'];
  const currentIndex = order.indexOf(phase);

  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((step) => {
        const done = order.indexOf(step.key) <= currentIndex;
        return (
          <li
            key={step.label}
            className={`rounded-card border p-4 ${
              done ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
              aria-hidden="true"
            >
              {done ? <Check className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            </span>
            <p className="mt-3 text-sm font-medium">{step.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(step.at)}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function ContestPhaseBadge({ phase }: { phase: ContestPhase }) {
  const tone =
    phase === 'ACCEPTING'
      ? 'bg-success text-white'
      : phase === 'VOTING'
        ? 'bg-primary text-primary-foreground'
        : phase === 'COMPLETED'
          ? 'bg-accent text-accent-foreground'
          : 'bg-muted text-muted-foreground';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {phaseLabel(phase)}
    </span>
  );
}

export function PrizeGrid({ prizes }: { prizes: ContestDetail['prizes'] }) {
  if (prizes.length === 0) return null;

  const medal = (position: number) =>
    position === 1 ? 'text-accent' : position === 2 ? 'text-muted-foreground' : 'text-primary';

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {prizes.map((prize) => (
        <li key={prize.id} className="overflow-hidden rounded-card border border-border bg-card">
          {prize.media && (
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
              <CoverImage media={prize.media} alt={prize.title} sizes="(max-width: 1024px) 100vw, 380px" />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-center gap-2">
              <Trophy className={`h-5 w-5 ${medal(prize.position)}`} aria-hidden="true" />
              {prize.position > 0 && (
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {prize.position === 1
                    ? 'First place'
                    : prize.position === 2
                      ? 'Second place'
                      : prize.position === 3
                        ? 'Third place'
                        : `Place ${prize.position}`}
                </span>
              )}
            </div>
            <h3 className="mt-2 font-display text-lg font-semibold">{prize.title}</h3>
            {prize.value && <p className="mt-1 font-medium text-primary">{prize.value}</p>}
            {prize.description && (
              <p className="mt-2 text-sm text-muted-foreground">{prize.description}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function JudgePanel({ judges }: { judges: ContestDetail['judges'] }) {
  if (judges.length === 0) return null;

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {judges.map((judge) => (
        <li key={judge.id} className="rounded-card border border-border bg-card p-5 text-center">
          <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-muted">
            <CoverImage media={judge.media} alt={judge.name} sizes="96px" />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold">{judge.name}</h3>
          {judge.role && <p className="mt-0.5 text-xs text-muted-foreground">{judge.role}</p>}
          {judge.bio && <p className="mt-2 text-sm text-muted-foreground">{judge.bio}</p>}
          {judge.profileUrl && (
            <a
              href={judge.profileUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
            >
              Profile
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SponsorStrip({ sponsors }: { sponsors: ContestDetail['sponsors'] }) {
  if (sponsors.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-6">
      {sponsors.map((sponsor) => {
        const inner = (
          <>
            <div className="relative h-16 w-32 overflow-hidden rounded-field bg-muted">
              <CoverImage media={sponsor.media} alt={sponsor.name} sizes="128px" />
            </div>
            <span className="mt-2 block text-center text-sm font-medium">{sponsor.name}</span>
            {sponsor.tier && (
              <span className="block text-center text-xs text-muted-foreground">{sponsor.tier}</span>
            )}
          </>
        );

        return (
          <li key={sponsor.id}>
            {sponsor.websiteUrl ? (
              <a
                href={sponsor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="block rounded-field p-2 transition-colors hover:bg-muted"
              >
                {inner}
              </a>
            ) : (
              <div className="p-2">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ContestGallery({ gallery }: { gallery: ContestDetail['gallery'] }) {
  if (gallery.length === 0) return null;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {gallery.map((item) => (
        <li key={item.id} className="overflow-hidden rounded-card border border-border bg-card">
          <div className="relative aspect-square overflow-hidden bg-muted">
            <CoverImage
              media={item.media}
              alt={item.caption ?? 'Contest gallery'}
              sizes="(max-width: 640px) 50vw, 280px"
            />
          </div>
          {item.caption && (
            <p className="p-3 text-xs text-muted-foreground">{item.caption}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The results. Only rendered once the data layer has decided they are public. */
export function WinnersPodium({ winners }: { winners: PublicContestEntry[] }) {
  if (winners.length === 0) return null;

  const place = (rank: number | null) =>
    rank === 1 ? 'First place' : rank === 2 ? 'Second place' : rank === 3 ? 'Third place' : 'Winner';

  return (
    <ul className="grid gap-6 md:grid-cols-3">
      {winners.map((winner) => (
        <li
          key={winner.id}
          className={`overflow-hidden rounded-card border-2 bg-card ${
            winner.rank === 1 ? 'border-accent md:-mt-4' : 'border-border'
          }`}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <EntryMedia media={winner.media} alt={`Winning entry by ${winner.entrantName}`} />
            {winner.media?.type === 'video' && <VideoBadge />}
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Award className="h-3.5 w-3.5" aria-hidden="true" />
              {place(winner.rank)}
            </span>
          </div>
          <div className="p-5">
            <h3 className="font-display text-lg font-semibold">{winner.entrantName}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{winner.location}</p>
            <p className="mt-2 text-sm text-muted-foreground">{winner.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {winner.voteCount} public {winner.voteCount === 1 ? 'vote' : 'votes'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A sample of approved entries while the contest is running. */
export function EntryShowcase({ entries }: { entries: PublicContestEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {entries.map((entry) => (
        <li key={entry.id} className="overflow-hidden rounded-card border border-border bg-card">
          <div className="relative aspect-square overflow-hidden bg-muted">
            <EntryMedia
              media={entry.media}
              alt={`Entry by ${entry.entrantName}`}
              sizes="(max-width: 640px) 50vw, 280px"
            />
            {entry.media?.type === 'video' && <VideoBadge />}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-medium">{entry.entrantName}</p>
            <p className="truncate text-xs text-muted-foreground">{entry.location}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export { Gavel, Handshake };
export function SignInPrompt({ slug }: { slug: string }) {
  return (
    <div className="rounded-card border border-border bg-muted/40 p-6">
      <h3 className="font-display text-lg font-semibold">Sign in to enter</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Entries are tied to an account so we can reach you if you win, and so that one person
        cannot enter many times over.
      </p>
      <Link
        href={`/login?next=/contest/${slug}`}
        className="mt-4 inline-flex rounded-field bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Sign in or create an account
      </Link>
    </div>
  );
}
