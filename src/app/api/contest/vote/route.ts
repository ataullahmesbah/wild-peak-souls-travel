// src/app/api/contest/vote/route.ts
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders } from '@/lib/auth/session';
import { requireUser } from '@/lib/rbac/guard';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { contestVoteSchema } from '@/lib/validation/contest';
import { isVotingOpen } from '@/lib/contest/phase';
import { ContestEntryStatus } from '@/generated/prisma';

/** True for Prisma's unique-constraint failure, however the client was built. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Casts one vote.
 *
 * One signed-in person gets one vote per contest, and that is enforced by a
 * unique index on (contestId, userId) rather than by a "have they voted?"
 * query. The difference matters: two requests arriving together would both
 * pass a check-then-insert, and a contest decided partly by public vote is
 * exactly the thing people will try to game. The database refuses the second
 * write no matter how the requests interleave, and P2002 is translated into a
 * plain message here.
 *
 * The vote and the denormalised counter move together in one transaction, so
 * the number on the card can never drift from the number of rows.
 */

function hashIp(ip: string): string {
  return createHash('sha256').update(`wps-contest-vote:${ip}`).digest('hex').slice(0, 32);
}

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = contestVoteSchema.parse(body);

  const limit = await rateLimit(`contest-vote:${user.id}`, RATE_LIMITS.PUBLIC_FORM);
  if (!limit.allowed) {
    return apiError('Too many attempts. Please wait a moment.', 429, { code: 'RATE_LIMITED' });
  }

  const entry = await prisma.contestEntry.findUnique({
    where: { id: input.entryId },
    select: {
      id: true,
      status: true,
      contest: {
        select: {
          id: true,
          status: true,
          startAt: true,
          entryDeadline: true,
          votingStartAt: true,
          votingEndAt: true,
          resultsAt: true,
        },
      },
    },
  });

  if (!entry) throw new BusinessError('That entry is not available.', 'NOT_FOUND', 404);

  if (!isVotingOpen(entry.contest)) {
    throw new BusinessError('Voting is not open for this contest.', 'VOTING_CLOSED', 422);
  }

  // Only the shortlist is votable. Winners are shortlisted entries too, but by
  // the time they are marked WINNER the voting window has closed anyway.
  if (
    entry.status !== ContestEntryStatus.SHORTLISTED &&
    entry.status !== ContestEntryStatus.WINNER
  ) {
    throw new BusinessError('That entry is not in the voting round.', 'NOT_SHORTLISTED', 422);
  }

  const ip = clientIpFromHeaders(await headers()) ?? 'unknown';

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contestVote.create({
        data: {
          contestId: entry.contest.id,
          entryId: entry.id,
          userId: user.id,
          ipHash: hashIp(ip),
        },
        select: { id: true },
      });
      await tx.contestEntry.update({
        where: { id: entry.id },
        data: { voteCount: { increment: 1 } },
        select: { id: true },
      });
    });
  } catch (error) {
    // P2002 is the unique index doing its job: this person has already voted.
    //
    // Checked by reading `code` rather than with `instanceof`. The project has
    // both `@prisma/client` and a generated client under src/generated, and an
    // error raised through one is not an instance of the other's class — an
    // instanceof test here silently fell through to the generic "value already
    // in use" handler and returned 422 instead of a message about voting.
    if (isUniqueViolation(error)) {
      throw new BusinessError(
        'You have already voted in this contest. Each person gets one vote.',
        'ALREADY_VOTED',
        409,
      );
    }
    throw error;
  }

  revalidateTag('contest', 'max');

  const votes = await prisma.contestEntry.findUnique({
    where: { id: entry.id },
    select: { voteCount: true },
  });

  return apiSuccess({ voted: true, voteCount: votes?.voteCount ?? 0 }, 201);
});
