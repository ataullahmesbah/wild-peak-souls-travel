// src/app/api/dashboard/contests/entries/score/route.ts
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { contestEntryScoreSchema } from '@/lib/validation/contest';
import { ContestEntryStatus, NotificationType } from '@/generated/prisma';

/**
 * Records the judges' mark and, when the time comes, the final placing.
 *
 * A separate permission from moderating: screening what the public uploaded is
 * a different job from deciding who wins, and the agency asked for the judges
 * to make the final call.
 *
 * Placings are unique per contest. Setting an entry to first place moves
 * whoever previously held it, inside one transaction, so the podium cannot
 * momentarily show two winners.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.CONTEST_JUDGE);
  const body = await request.json().catch(() => ({}));
  const input = contestEntryScoreSchema.parse(body);

  const entry = await prisma.contestEntry.findUnique({
    where: { id: input.entryId },
    select: {
      id: true,
      contestId: true,
      userId: true,
      status: true,
      rank: true,
      contest: { select: { title: true, slug: true } },
    },
  });
  if (!entry) throw new BusinessError('Entry not found.', 'NOT_FOUND', 404);

  const rank = input.rank ?? null;

  await prisma.$transaction(async (tx) => {
    if (rank !== null) {
      // Whoever held this placing loses it and drops back to shortlisted.
      await tx.contestEntry.updateMany({
        where: { contestId: entry.contestId, rank, id: { not: entry.id } },
        data: { rank: null, status: ContestEntryStatus.SHORTLISTED },
      });
    }

    await tx.contestEntry.update({
      where: { id: entry.id },
      data: {
        ...(input.judgeScore !== undefined ? { judgeScore: input.judgeScore } : {}),
        ...(input.rank !== undefined
          ? {
              rank,
              status: rank === null ? ContestEntryStatus.SHORTLISTED : ContestEntryStatus.WINNER,
            }
          : {}),
      },
    });
  });

  await recordAudit({
    actorId: staff.id,
    action: 'contest.entry.scored',
    entityType: 'ContestEntry',
    entityId: entry.id,
    metadata: { judgeScore: input.judgeScore, rank, contest: entry.contest.slug },
  });

  if (rank !== null && entry.rank !== rank) {
    await notifyUser({
      userId: entry.userId,
      type: NotificationType.SYSTEM,
      title: 'You have won a place in the contest',
      message: `Congratulations — your entry to “${entry.contest.title}” came ${
        rank === 1 ? 'first' : rank === 2 ? 'second' : 'third'
      }. We will be in touch about your prize.`,
      link: `/contest/${entry.contest.slug}`,
    });
  }

  revalidateTag('contest', 'max');
  return apiSuccess({ updated: true, rank });
});
