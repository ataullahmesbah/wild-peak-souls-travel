// src/app/api/contest/entries/route.ts
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders } from '@/lib/auth/session';
import { requireUser } from '@/lib/rbac/guard';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { deleteAsset, fetchAsset } from '@/lib/cloudinary';
import { cloudinaryConfigProblem, isCloudinaryConfigured } from '@/lib/env';
import { notifyStaffWithPermission } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { contestEntryCreateSchema } from '@/lib/validation/contest';
import { isAcceptingEntries } from '@/lib/contest/phase';
import { CONTEST_UPLOAD_FOLDER } from '@/lib/contest/constants';
import { ContestEntryStatus, NotificationType } from '@/generated/prisma';

/**
 * Accepts one contest entry.
 *
 * The interesting part is what happens to the uploaded file. The browser sends
 * a Cloudinary public id; everything else about that file — its size, its
 * length, its type, even whether it exists — is read back from Cloudinary here
 * rather than taken from the request. A page can claim a 40 MB video is 900 KB
 * and two seconds long, and without this check the contest rules would be
 * advisory.
 *
 * Anything that fails is deleted from Cloudinary before the error is returned,
 * so a rejected upload does not sit in the account consuming quota.
 */

function hashIp(ip: string): string {
  return createHash('sha256').update(`wps-contest:${ip}`).digest('hex').slice(0, 32);
}

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = contestEntryCreateSchema.parse(body);

  // Honeypot: answer as though it worked, write nothing.
  if (input.website) return apiSuccess({ received: true }, 201);

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';

  const limit = await rateLimit(`contest-entry:${user.id}`, RATE_LIMITS.PUBLIC_FORM);
  if (!limit.allowed) {
    return apiError(
      'You have submitted several entries already. Please wait before sending another.',
      429,
      { code: 'RATE_LIMITED' },
    );
  }

  const contest = await prisma.contest.findUnique({
    where: { id: input.contestId },
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
      allowImages: true,
      allowVideos: true,
      maxEntriesPerUser: true,
      maxImageBytes: true,
      maxVideoSeconds: true,
    },
  });

  if (!contest) throw new BusinessError('That contest is not available.', 'NOT_FOUND', 404);

  /** Removes an upload that will not be accepted, then reports why. */
  const rejectAndClean = async (message: string, code: string): Promise<never> => {
    await deleteAsset(input.publicId, input.kind).catch(() => undefined);
    throw new BusinessError(message, code, 422);
  };

  if (!isAcceptingEntries(contest)) {
    await rejectAndClean('This contest is not accepting entries.', 'CLOSED');
  }
  if (input.kind === 'image' && !contest.allowImages) {
    await rejectAndClean('This contest does not accept photos.', 'KIND_NOT_ALLOWED');
  }
  if (input.kind === 'video' && !contest.allowVideos) {
    await rejectAndClean('This contest does not accept videos.', 'KIND_NOT_ALLOWED');
  }

  // Rejected entries do not use up an allowance — only what still stands.
  const existing = await prisma.contestEntry.count({
    where: {
      contestId: contest.id,
      userId: user.id,
      status: { not: ContestEntryStatus.REJECTED },
    },
  });
  if (existing >= contest.maxEntriesPerUser) {
    await rejectAndClean(
      contest.maxEntriesPerUser === 1
        ? 'You have already entered this contest.'
        : `You have already submitted ${contest.maxEntriesPerUser} entries to this contest.`,
      'LIMIT_REACHED',
    );
  }

  // --- The upload itself, as Cloudinary sees it ----------------------------
  // Without credentials the asset cannot be verified, and an unverified upload
  // must never become an entry. Reported as 503 rather than letting the
  // Cloudinary client throw a bare error into a 500.
  if (!isCloudinaryConfigured()) {
    throw new BusinessError(
      cloudinaryConfigProblem() ?? 'Uploads are not configured.',
      'NOT_CONFIGURED',
      503,
    );
  }

  const asset = await fetchAsset(input.publicId, input.kind);
  if (!asset) {
    throw new BusinessError(
      'That upload could not be found. Please choose your file again.',
      'UPLOAD_MISSING',
      422,
    );
  }

  // The signature pinned the folder, but check it anyway: it costs nothing and
  // means a public id copied from elsewhere in the account cannot be attached
  // to an entry.
  const expectedFolder = `${CONTEST_UPLOAD_FOLDER}/${contest.id}`;
  if (!asset.folder.startsWith(expectedFolder) && !asset.publicId.includes(expectedFolder)) {
    await rejectAndClean('That file was not uploaded for this contest.', 'WRONG_FOLDER');
  }

  if (asset.resourceType !== input.kind) {
    await rejectAndClean('That file is not the type you said it was.', 'WRONG_TYPE');
  }

  if (input.kind === 'image') {
    if (asset.bytes > contest.maxImageBytes) {
      const mb = (contest.maxImageBytes / (1024 * 1024)).toFixed(0);
      await rejectAndClean(
        `Photos must be ${mb} MB or smaller. Yours is ${(asset.bytes / (1024 * 1024)).toFixed(1)} MB.`,
        'IMAGE_TOO_LARGE',
      );
    }
  } else {
    const duration = asset.durationSeconds;
    if (duration === null) {
      await rejectAndClean('That video could not be read. Please try another file.', 'VIDEO_UNREADABLE');
    } else if (duration > contest.maxVideoSeconds) {
      await rejectAndClean(
        `Videos must be ${contest.maxVideoSeconds} seconds or shorter. Yours is ${duration} seconds.`,
        'VIDEO_TOO_LONG',
      );
    }
  }

  // --- Accepted ------------------------------------------------------------
  const entry = await prisma.$transaction(async (tx) => {
    const media = await tx.mediaAsset.create({
      data: {
        provider: 'cloudinary',
        publicId: asset.publicId,
        url: asset.url,
        secureUrl: asset.secureUrl,
        type: asset.resourceType,
        mimeType: `${asset.resourceType}/${asset.format}`,
        width: asset.width,
        height: asset.height,
        size: asset.bytes,
        durationSeconds: asset.durationSeconds,
        altText: input.description.slice(0, 200),
        folder: expectedFolder,
        createdById: user.id,
      },
      select: { id: true },
    });

    return tx.contestEntry.create({
      data: {
        contestId: contest.id,
        userId: user.id,
        entrantName: input.entrantName,
        entrantEmail: input.entrantEmail,
        entrantPhone: input.entrantPhone,
        socialUrl: input.socialUrl ?? null,
        location: input.location,
        description: input.description,
        mediaId: media.id,
        status: ContestEntryStatus.PENDING,
        ipHash: hashIp(ip),
      },
      select: { id: true },
    });
  });

  await notifyStaffWithPermission(PERMISSIONS.CONTEST_ENTRIES_MODERATE, {
    type: NotificationType.SYSTEM,
    title: 'New contest entry awaiting review',
    message: `${input.entrantName} entered “${contest.title}” from ${input.location}`,
    link: `/dashboard/contests/${contest.id}/entries?status=PENDING`,
    targetType: 'ContestEntry',
    targetId: entry.id,
  });

  revalidateTag('contest', 'max');

  return apiSuccess({ received: true, status: 'PENDING' }, 201);
});
