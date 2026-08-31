// src/lib/data/admin-contest.ts
import 'server-only';

import { prisma } from '@/lib/prisma';
import { ContestEntryStatus, type Prisma } from '@/generated/prisma';
import { combinedScore } from '@/lib/contest/phase';

/**
 * Read layer for the dashboard's contest screens.
 *
 * Unlike the public layer this one sees everything, including entrants'
 * contact details — that is the point of a moderation queue. It stays explicit
 * about its selects so that what reaches a screen is a decision rather than an
 * accident.
 */

export async function listAdminContests() {
  return prisma.contest.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      startAt: true,
      entryDeadline: true,
      votingStartAt: true,
      votingEndAt: true,
      resultsAt: true,
      publicVoteWeight: true,
      shortlistSize: true,
      coverMedia: { select: { secureUrl: true, url: true } },
      _count: { select: { entries: true, votes: true } },
    },
    orderBy: [{ startAt: 'desc' }],
    take: 50,
  });
}

export async function getAdminContest(id: string) {
  return prisma.contest.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      startAt: true,
      entryDeadline: true,
      votingStartAt: true,
      votingEndAt: true,
      resultsAt: true,
      publicVoteWeight: true,
      shortlistSize: true,
      maxEntriesPerUser: true,
      allowImages: true,
      allowVideos: true,
      maxImageBytes: true,
      maxVideoSeconds: true,
      _count: {
        select: { entries: true, votes: true, prizes: true, judges: true, sponsors: true, gallery: true },
      },
    },
  });
}

export interface AdminEntryRow {
  id: string;
  entrantName: string;
  entrantEmail: string;
  entrantPhone: string;
  socialUrl: string | null;
  location: string;
  description: string;
  status: ContestEntryStatus;
  judgeScore: number | null;
  rank: number | null;
  voteCount: number;
  combined: number;
  createdAt: Date;
  moderationNote: string | null;
  media: {
    secureUrl: string | null;
    url: string | null;
    altText: string | null;
    type: string | null;
    width: number | null;
    height: number | null;
    size: number | null;
    durationSeconds: number | null;
  } | null;
  user: { id: string; name: string; email: string } | null;
  moderatedBy: { name: string } | null;
}

/**
 * The entries queue, with each entry's combined score worked out.
 *
 * The score mixes the judges' mark with the public vote share, measured
 * against the most-voted entry in the same contest. That comparison needs the
 * top vote count, so it is fetched once here rather than recomputed per row.
 */
export async function listAdminEntries(
  contestId: string,
  options: { status?: string; query?: string } = {},
): Promise<{ rows: AdminEntryRow[]; counts: Record<string, number> }> {
  const where: Prisma.ContestEntryWhereInput = {
    contestId,
    ...(options.status
      ? { status: options.status as Prisma.EnumContestEntryStatusFilter['equals'] }
      : {}),
    ...(options.query
      ? {
          OR: [
            { entrantName: { contains: options.query, mode: 'insensitive' } },
            { entrantEmail: { contains: options.query, mode: 'insensitive' } },
            { location: { contains: options.query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, contest, top, grouped] = await Promise.all([
    prisma.contestEntry.findMany({
      where,
      select: {
        id: true,
        entrantName: true,
        entrantEmail: true,
        entrantPhone: true,
        socialUrl: true,
        location: true,
        description: true,
        status: true,
        judgeScore: true,
        rank: true,
        voteCount: true,
        createdAt: true,
        moderationNote: true,
        media: {
          select: {
            secureUrl: true,
            url: true,
            altText: true,
            type: true,
            width: true,
            height: true,
            size: true,
            durationSeconds: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
        moderatedBy: { select: { name: true } },
      },
      orderBy: [{ rank: 'asc' }, { voteCount: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    }),
    prisma.contest.findUnique({
      where: { id: contestId },
      select: { publicVoteWeight: true },
    }),
    prisma.contestEntry.aggregate({
      where: { contestId },
      _max: { voteCount: true },
    }),
    prisma.contestEntry.groupBy({
      by: ['status'],
      where: { contestId },
      _count: { _all: true },
    }),
  ]);

  const weight = contest?.publicVoteWeight ?? 25;
  const topVoteCount = top._max.voteCount ?? 0;

  const counts: Record<string, number> = { ALL: 0 };
  let total = 0;
  for (const group of grouped) {
    counts[group.status] = group._count._all;
    total += group._count._all;
  }
  counts.ALL = total;

  return {
    rows: rows.map((row) => ({
      ...row,
      combined: combinedScore({
        judgeScore: row.judgeScore,
        voteCount: row.voteCount,
        topVoteCount,
        publicVoteWeight: weight,
      }),
    })),
    counts,
  };
}

export async function listContestChildren(contestId: string) {
  const [prizes, judges, sponsors, gallery] = await Promise.all([
    prisma.contestPrize.findMany({
      where: { contestId },
      select: {
        id: true,
        position: true,
        title: true,
        value: true,
        description: true,
        sortOrder: true,
        media: { select: { secureUrl: true, url: true } },
      },
      orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.contestJudge.findMany({
      where: { contestId },
      select: {
        id: true,
        name: true,
        role: true,
        profileUrl: true,
        sortOrder: true,
        media: { select: { secureUrl: true, url: true } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.contestSponsor.findMany({
      where: { contestId },
      select: {
        id: true,
        name: true,
        tier: true,
        websiteUrl: true,
        sortOrder: true,
        media: { select: { secureUrl: true, url: true } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.contestGalleryItem.findMany({
      where: { contestId },
      select: {
        id: true,
        caption: true,
        sortOrder: true,
        media: { select: { secureUrl: true, url: true } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return { prizes, judges, sponsors, gallery };
}

/** Badge count for the sidebar. */
export async function countPendingEntries(): Promise<number> {
  return prisma.contestEntry
    .count({ where: { status: ContestEntryStatus.PENDING } })
    .catch(() => 0);
}
