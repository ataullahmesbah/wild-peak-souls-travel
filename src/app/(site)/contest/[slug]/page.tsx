// src/app/(site)/contest/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Camera, Gavel, Handshake, Images, ListChecks, Trophy, Vote } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { CoverImage } from '@/components/ui/media';
import { JsonLd } from '@/components/seo/json-ld';
import { ContestEntryForm } from '@/components/contest/entry-form';
import { ContestVotePanel } from '@/components/contest/vote-panel';
import {
  ContestGallery,
  ContestPhaseBadge,
  ContestSection,
  ContestTimeline,
  EntryShowcase,
  JudgePanel,
  PrizeGrid,
  SignInPrompt,
  SponsorStrip,
  WinnersPodium,
} from '@/components/contest/sections';
import {
  getApprovedEntryShowcase,
  getContestBySlug,
  getViewerContestState,
  getVotableEntries,
  getWinners,
} from '@/lib/data/contest';
import { contestPhase, nextMilestone, phaseLabel } from '@/lib/contest/phase';
import { getCurrentUser } from '@/lib/auth/session';
import { siteUrl } from '@/lib/env';
import { markdownToPlainText, renderMarkdown } from '@/lib/markdown';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const contest = await getContestBySlug(slug);
  if (!contest) return { title: 'Contest not found', robots: { index: false, follow: false } };

  const description =
    contest.seoDescription ?? contest.tagline ?? markdownToPlainText(contest.description, 155);
  const title = contest.seoTitle ?? contest.title;
  const image = contest.coverMedia?.secureUrl ?? contest.coverMedia?.url;

  return {
    title,
    description,
    alternates: { canonical: `/contest/${contest.slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${siteUrl()}/contest/${contest.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * The whole contest on one page.
 *
 * Every section lives here and each is shown according to the phase the dates
 * put the contest in — the entry form only while entries are open, the voting
 * grid only while voting is open, the winners only once the results date has
 * passed. The alternative, separate pages per stage, means a visitor arriving
 * from a shared link lands somewhere that is no longer the point of the
 * contest.
 */
export default async function ContestPage({ params }: { params: Params }) {
  const { slug } = await params;
  const contest = await getContestBySlug(slug);
  if (!contest) notFound();

  const phase = contestPhase(contest);
  const milestone = nextMilestone(contest);

  const [viewer, votable, winners, showcase] = await Promise.all([
    getCurrentUser(),
    getVotableEntries(contest),
    getWinners(contest),
    getApprovedEntryShowcase(contest.id, 8),
  ]);

  const viewerState = await getViewerContestState(contest.id, viewer?.id ?? null);

  const accepting = phase === 'ACCEPTING';
  const voting = phase === 'VOTING' && votable.length > 0;
  const completed = phase === 'COMPLETED' && winners.length > 0;
  const canEnterAgain = viewerState.entryCount < contest.maxEntriesPerUser;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: contest.title,
    description: contest.tagline ?? markdownToPlainText(contest.description, 200),
    startDate: contest.startAt.toISOString(),
    endDate: (contest.resultsAt ?? contest.entryDeadline).toISOString(),
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    image: contest.coverMedia?.secureUrl ?? contest.coverMedia?.url ?? undefined,
    url: `${siteUrl()}/contest/${contest.slug}`,
    organizer: { '@type': 'Organization', name: 'Wild Peak Souls', url: siteUrl() },
    location: { '@type': 'VirtualLocation', url: `${siteUrl()}/contest/${contest.slug}` },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHeader
        eyebrow="Contest"
        title={contest.title}
        description={contest.tagline ?? undefined}
        breadcrumbs={[{ label: 'Contest', href: '/contest' }, { label: contest.title }]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <ContestPhaseBadge phase={phase} />
          {milestone && (
            <span className="text-sm text-muted-foreground">
              {milestone.label}: {formatDateTime(milestone.at)}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            {contest._count.entries} {contest._count.entries === 1 ? 'entry' : 'entries'} so far
          </span>
        </div>
      </PageHeader>

      {contest.coverMedia && (
        <Container className="mt-2">
          <div className="relative aspect-[21/9] overflow-hidden rounded-card">
            <CoverImage
              media={contest.coverMedia}
              alt={contest.title}
              priority
              sizes="(max-width: 1280px) 100vw, 1200px"
            />
          </div>
        </Container>
      )}

      <Section>
        <Container className="space-y-16">
          {/* --- What it is --- */}
          <ContestSection id="about" title="About this contest" icon={Camera}>
            {contest.theme && (
              <p className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                Theme: {contest.theme}
              </p>
            )}
            <div className="wps-prose max-w-3xl text-base">{renderMarkdown(contest.description)}</div>
          </ContestSection>

          {/* --- Dates --- */}
          <ContestSection
            id="timeline"
            title="Key dates"
            icon={ListChecks}
            description={`This contest is currently: ${phaseLabel(phase).toLowerCase()}.`}
          >
            <ContestTimeline contest={contest} phase={phase} />
          </ContestSection>

          {/* --- Prizes --- */}
          {contest.prizes.length > 0 && (
            <ContestSection
              id="prizes"
              title="Prizes"
              icon={Trophy}
              description={contest.prizeSummary ?? undefined}
            >
              <PrizeGrid prizes={contest.prizes} />
            </ContestSection>
          )}

          {/* --- Enter --- */}
          {accepting && (
            <ContestSection
              id="enter"
              title="Enter the contest"
              icon={Camera}
              description={
                contest.allowImages && contest.allowVideos
                  ? `Send a photo (up to ${(contest.maxImageBytes / (1024 * 1024)).toFixed(0)} MB) or a video (up to ${contest.maxVideoSeconds} seconds).`
                  : contest.allowVideos
                    ? `Send a video of up to ${contest.maxVideoSeconds} seconds.`
                    : `Send a photo of up to ${(contest.maxImageBytes / (1024 * 1024)).toFixed(0)} MB.`
              }
            >
              {!viewer ? (
                <SignInPrompt slug={contest.slug} />
              ) : canEnterAgain ? (
                <div className="rounded-card border border-border bg-card p-6">
                  <ContestEntryForm
                    contestId={contest.id}
                    allowImages={contest.allowImages}
                    allowVideos={contest.allowVideos}
                    maxImageBytes={contest.maxImageBytes}
                    maxVideoSeconds={contest.maxVideoSeconds}
                    defaultName={viewer.name}
                    defaultEmail={viewer.email}
                  />
                </div>
              ) : (
                <div className="rounded-card border border-success/40 bg-success-soft p-6">
                  <h3 className="font-display text-lg font-semibold text-success">
                    You are entered
                  </h3>
                  <p className="mt-2 text-sm text-foreground/80">
                    {contest.maxEntriesPerUser === 1
                      ? 'You have submitted your entry for this contest. We will be in touch after judging.'
                      : `You have used all ${contest.maxEntriesPerUser} of your entries for this contest.`}
                  </p>
                </div>
              )}
            </ContestSection>
          )}

          {/* --- Vote --- */}
          {voting && (
            <ContestSection
              id="vote"
              title="Vote for your favourite"
              icon={Vote}
              description={`These are the ${votable.length} entries that made the shortlist. The public vote carries ${contest.publicVoteWeight}% of the final score; our judges decide the rest.`}
            >
              <ContestVotePanel
                entries={votable}
                votedEntryId={viewerState.votedEntryId}
                isSignedIn={Boolean(viewer)}
                contestSlug={contest.slug}
              />
            </ContestSection>
          )}

          {/* --- Winners --- */}
          {completed && (
            <ContestSection
              id="winners"
              title="Winners"
              icon={Trophy}
              description="Chosen by our judges, with the public vote counted in. Congratulations to everyone who entered."
            >
              <WinnersPodium winners={winners} />
            </ContestSection>
          )}

          {/* --- Recent entries --- */}
          {!voting && !completed && showcase.length > 0 && (
            <ContestSection
              id="entries"
              title="Recent entries"
              icon={Images}
              description="A few of the entries our team has approved so far."
            >
              <EntryShowcase entries={showcase} />
            </ContestSection>
          )}

          {/* --- Rules --- */}
          {contest.rules && (
            <ContestSection id="rules" title="Rules and eligibility" icon={ListChecks}>
              <div className="wps-prose max-w-3xl text-base">{renderMarkdown(contest.rules)}</div>
            </ContestSection>
          )}

          {/* --- Judges --- */}
          {contest.judges.length > 0 && (
            <ContestSection id="judges" title="The judges" icon={Gavel}>
              <JudgePanel judges={contest.judges} />
            </ContestSection>
          )}

          {/* --- Gallery --- */}
          {contest.gallery.length > 0 && (
            <ContestSection id="gallery" title="Gallery" icon={Images}>
              <ContestGallery gallery={contest.gallery} />
            </ContestSection>
          )}

          {/* --- Sponsors --- */}
          {contest.sponsors.length > 0 && (
            <ContestSection id="sponsors" title="Sponsors" icon={Handshake}>
              <SponsorStrip sponsors={contest.sponsors} />
            </ContestSection>
          )}
        </Container>
      </Section>
    </>
  );
}
