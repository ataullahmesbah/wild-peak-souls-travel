// src/lib/data/contest.ts
import 'server-only';

import { cache } from 'react';

import { prisma } from '@/lib/prisma';
import { ContestEntryStatus, ContestStatus, type Prisma } from '@/generated/prisma';
import { areResultsPublic, contestPhase, isVotingOpen } from '@/lib/contest/phase';

/**
 * Read layer for the public contest pages.
 *
 * The rule that matters here is about entrants' personal data. An entry
 * carries a name, an email address, a phone number and a home location,
 * because the agency needs to reach a winner. Only the name and the location
 * are ever projected for the public; `entrantEmail`, `entrantPhone`, `ipHash`
 * and the moderation fields are not in any select in this file, so a component
 * cannot render them by accident.
 *
 * Entries are also only ever public once a human has approved them. A PENDING
 * entry — which is to say, an arbitrary image a stranger uploaded — never
 * reaches a page.
 */

const publicEntrySelect = {
  id: true,
  entrantName: true,
  location: true,
  description: true,
  voteCount: true,
  rank: true,
  status: true,
  createdAt: true,
  media: {
    select: { secureUrl: true, url: true, altText: true, type: true, width: true, height: true },
  },
} satisfies Prisma.ContestEntrySelect;

export type PublicContestEntry = Prisma.ContestEntryGetPayload<{
  select: typeof publicEntrySelect;
}>;

const contestDetailSelect = {
  id: true,
  title: true,
  slug: true,
  tagline: true,
  description: true,
  theme: true,
  rules: true,
  prizeSummary: true,
  status: true,
  startAt: true,
  entryDeadline: true,
  votingStartAt: true,
  votingEndAt: true,
  resultsAt: true,
  allowImages: true,
  allowVideos: true,
  maxEntriesPerUser: true,
  maxImageBytes: true,
  maxVideoSeconds: true,
  publicVoteWeight: true,
  shortlistSize: true,
  seoTitle: true,
  seoDescription: true,
  coverMedia: { select: { secureUrl: true, url: true, altText: true } },
  prizes: {
    select: {
      id: true,
      position: true,
      title: true,
      description: true,
      value: true,
      media: { select: { secureUrl: true, url: true, altText: true } },
    },
    orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
  },
  judges: {
    select: {
      id: true,
      name: true,
      role: true,
      bio: true,
      profileUrl: true,
      media: { select: { secureUrl: true, url: true, altText: true } },
    },
    orderBy: { sortOrder: 'asc' },
  },
  sponsors: {
    select: {
      id: true,
      name: true,
      tier: true,
      websiteUrl: true,
      media: { select: { secureUrl: true, url: true, altText: true } },
    },
    orderBy: { sortOrder: 'asc' },
  },
  gallery: {
    select: {
      id: true,
      caption: true,
      media: { select: { secureUrl: true, url: true, altText: true } },
    },
    orderBy: { sortOrder: 'asc' },
  },
  _count: { select: { entries: { where: { status: { not: ContestEntryStatus.REJECTED } } } } },
} satisfies Prisma.ContestSelect;

export type ContestDetail = Prisma.ContestGetPayload<{ select: typeof contestDetailSelect }>;

/** Published contests only — a draft is invisible to the public entirely. */
function livePublished(): Prisma.ContestWhereInput {
  return { status: ContestStatus.PUBLISHED };
}

export const getContestBySlug = cache(async (slug: string): Promise<ContestDetail | null> =>
  prisma.contest
    .findFirst({ where: { slug, ...livePublished() }, select: contestDetailSelect })
    .catch(() => null),
);

/**
 * The contest the navbar links to and the home page shows.
 *
 * "Current" means published and not yet finished — results not out, or out so
 * recently that people are still arriving to look at them. A contest whose
 * results appeared months ago should not still be occupying the navbar, so
 * anything past its results date by more than a fortnight drops out.
 */
export const getCurrentContest = cache(async () => {
  const now = new Date();
  const recentlyFinished = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  return prisma.contest
    .findFirst({
      where: {
        ...livePublished(),
        OR: [{ resultsAt: null }, { resultsAt: { gte: recentlyFinished } }],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        tagline: true,
        theme: true,
        prizeSummary: true,
        status: true,
        startAt: true,
        entryDeadline: true,
        votingStartAt: true,
        votingEndAt: true,
        resultsAt: true,
        featureOnHome: true,
        coverMedia: { select: { secureUrl: true, url: true, altText: true } },
        _count: {
          select: { entries: { where: { status: { not: ContestEntryStatus.REJECTED } } } },
        },
      },
      orderBy: [{ startAt: 'desc' }],
    })
    .catch(() => null);
});

export const listPublishedContests = cache(async () =>
  prisma.contest
    .findMany({
      where: livePublished(),
      select: {
        id: true,
        title: true,
        slug: true,
        tagline: true,
        status: true,
        startAt: true,
        entryDeadline: true,
        votingStartAt: true,
        votingEndAt: true,
        resultsAt: true,
        coverMedia: { select: { secureUrl: true, url: true, altText: true } },
        _count: {
          select: { entries: { where: { status: { not: ContestEntryStatus.REJECTED } } } },
        },
      },
      orderBy: [{ startAt: 'desc' }],
      take: 24,
    })
    .catch(() => []),
);

/**
 * The entries open for voting.
 *
 * Returns nothing unless voting is actually open — the shortlist is not a
 * secret, but publishing it early turns the review period into a campaign.
 * Ordered by name rather than by votes so the running order does not itself
 * push people toward whoever is already ahead.
 */
export async function getVotableEntries(contest: {
  id: string;
  status: string;
  startAt: Date;
  entryDeadline: Date;
  votingStartAt: Date | null;
  votingEndAt: Date | null;
  resultsAt: Date | null;
}): Promise<PublicContestEntry[]> {
  if (!isVotingOpen(contest)) return [];

  return prisma.contestEntry
    .findMany({
      where: {
        contestId: contest.id,
        status: { in: [ContestEntryStatus.SHORTLISTED, ContestEntryStatus.WINNER] },
      },
      select: publicEntrySelect,
      orderBy: [{ entrantName: 'asc' }],
      take: 100,
    })
    .catch(() => []);
}

/** The winners, once the results date has passed. Never before. */
export async function getWinners(contest: {
  id: string;
  status: string;
  startAt: Date;
  entryDeadline: Date;
  votingStartAt: Date | null;
  votingEndAt: Date | null;
  resultsAt: Date | null;
}): Promise<PublicContestEntry[]> {
  if (!areResultsPublic(contest)) return [];

  return prisma.contestEntry
    .findMany({
      where: {
        contestId: contest.id,
        status: ContestEntryStatus.WINNER,
        rank: { not: null },
      },
      select: publicEntrySelect,
      orderBy: [{ rank: 'asc' }],
      take: 10,
    })
    .catch(() => []);
}

/**
 * A sample of approved entries, for the "what people are sending in" strip.
 * Approved only, so nothing unreviewed is ever on display.
 */
export async function getApprovedEntryShowcase(
  contestId: string,
  limit = 12,
): Promise<PublicContestEntry[]> {
  return prisma.contestEntry
    .findMany({
      where: {
        contestId,
        status: {
          in: [
            ContestEntryStatus.APPROVED,
            ContestEntryStatus.SHORTLISTED,
            ContestEntryStatus.WINNER,
          ],
        },
      },
      select: publicEntrySelect,
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
    })
    .catch(() => []);
}

/** What this viewer has already done, so the page can say so. */
export async function getViewerContestState(
  contestId: string,
  userId: string | null,
): Promise<{ entryCount: number; votedEntryId: string | null }> {
  if (!userId) return { entryCount: 0, votedEntryId: null };

  const [entryCount, vote] = await Promise.all([
    prisma.contestEntry.count({
      where: { contestId, userId, status: { not: ContestEntryStatus.REJECTED } },
    }),
    prisma.contestVote.findUnique({
      where: { contestId_userId: { contestId, userId } },
      select: { entryId: true },
    }),
  ]);

  return { entryCount, votedEntryId: vote?.entryId ?? null };
}

export { contestPhase };
