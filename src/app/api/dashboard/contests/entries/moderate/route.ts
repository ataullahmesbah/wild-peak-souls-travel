// src/app/api/dashboard/contests/entries/moderate/route.ts
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { contestEntryModerateSchema } from '@/lib/validation/contest';
import { ContestEntryStatus, NotificationType } from '@/generated/prisma';

/**
 * Approve, reject, shortlist or crown one entry.
 *
 * Rejecting is a state rather than a delete: the entrant's file stays until
 * someone deletes the contest, so a decision can be reversed and a pattern of
 * abuse from one account remains visible.
 *
 * The entrant is told when their entry is approved or rejected. Somebody who
 * has uploaded a photograph and heard nothing assumes it was lost.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.CONTEST_ENTRIES_MODERATE);
  const body = await request.json().catch(() => ({}));
  const input = contestEntryModerateSchema.parse(body);

  const entry = await prisma.contestEntry.findUnique({
    where: { id: input.entryId },
    select: {
      id: true,
      status: true,
      userId: true,
      entrantName: true,
      contest: { select: { id: true, title: true, slug: true, shortlistSize: true } },
    },
  });
  if (!entry) throw new BusinessError('Entry not found.', 'NOT_FOUND', 404);

  // Guard the shortlist against quietly growing past the number the contest
  // advertised — the size is a promise made on the public page.
  if (
    input.status === ContestEntryStatus.SHORTLISTED &&
    entry.status !== ContestEntryStatus.SHORTLISTED
  ) {
    const shortlisted = await prisma.contestEntry.count({
      where: {
        contestId: entry.contest.id,
        status: { in: [ContestEntryStatus.SHORTLISTED, ContestEntryStatus.WINNER] },
      },
    });
    if (shortlisted >= entry.contest.shortlistSize) {
      throw new BusinessError(
        `The shortlist is full at ${entry.contest.shortlistSize}. Remove an entry from it first, or raise the shortlist size in the contest settings.`,
        'SHORTLIST_FULL',
        422,
      );
    }
  }

  await prisma.contestEntry.update({
    where: { id: entry.id },
    data: {
      status: input.status,
      moderationNote: input.note ?? null,
      moderatedAt: new Date(),
      moderatedById: staff.id,
      // Dropping out of WINNER must take the placing with it, or a stale rank
      // would keep the entry on the podium.
      ...(input.status === ContestEntryStatus.WINNER ? {} : { rank: null }),
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'contest.entry.moderated',
    entityType: 'ContestEntry',
    entityId: entry.id,
    metadata: {
      from: entry.status,
      to: input.status,
      contest: entry.contest.slug,
      note: input.note,
    },
  });

  if (input.status === ContestEntryStatus.APPROVED) {
    await notifyUser({
      userId: entry.userId,
      type: NotificationType.SYSTEM,
      title: 'Your contest entry is approved',
      message: `Your entry to “${entry.contest.title}” is now live on the site. Good luck.`,
      link: `/contest/${entry.contest.slug}`,
    });
  } else if (input.status === ContestEntryStatus.SHORTLISTED) {
    await notifyUser({
      userId: entry.userId,
      type: NotificationType.SYSTEM,
      title: 'You are on the shortlist',
      message: `Your entry to “${entry.contest.title}” has been shortlisted and is open for public voting.`,
      link: `/contest/${entry.contest.slug}`,
    });
  } else if (input.status === ContestEntryStatus.REJECTED) {
    await notifyUser({
      userId: entry.userId,
      type: NotificationType.SYSTEM,
      title: 'Your contest entry was not accepted',
      message:
        input.note ??
        `Your entry to “${entry.contest.title}” did not meet the contest rules. Contact us if you would like to discuss it.`,
      link: `/contest/${entry.contest.slug}`,
    });
  }

  revalidateTag('contest', 'max');
  return apiSuccess({ updated: true, status: input.status });
});
