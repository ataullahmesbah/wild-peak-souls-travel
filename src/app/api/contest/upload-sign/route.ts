// src/app/api/contest/upload-sign/route.ts
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { BusinessError, apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders } from '@/lib/auth/session';
import { requireUser } from '@/lib/rbac/guard';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { cloudinaryConfigProblem, isCloudinaryConfigured } from '@/lib/env';
import { signUploadFor } from '@/lib/cloudinary';
import { contestUploadSignSchema } from '@/lib/validation/contest';
import { isAcceptingEntries } from '@/lib/contest/phase';
import { CONTEST_UPLOAD_FOLDER } from '@/lib/contest/constants';

/**
 * Hands a signed upload to somebody entering the contest.
 *
 * This is the only place on the site where a member of the public can put a
 * file into our Cloudinary account, so it is deliberately narrow:
 *
 *  - they must be signed in, so an entry is always attached to an account;
 *  - the contest must be published and inside its entry window;
 *  - the contest must actually allow that kind of file;
 *  - the folder is pinned server-side and included in the signature, so a
 *    signature cannot be replayed to write anywhere else in the account;
 *  - it is rate limited per user.
 *
 * A signature still only permits an upload. What was uploaded is checked
 * against the contest's size and length rules when the entry is submitted —
 * see ../entries/route.ts — because nothing the browser says about a file can
 * be believed.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = contestUploadSignSchema.parse(body);

  const limit = await rateLimit(`contest-upload:${user.id}`, RATE_LIMITS.PUBLIC_FORM);
  if (!limit.allowed) {
    return apiError(
      'You have started several uploads already. Please wait a moment before trying again.',
      429,
      { code: 'RATE_LIMITED' },
    );
  }

  const contest = await prisma.contest.findUnique({
    where: { id: input.contestId },
    select: {
      id: true,
      status: true,
      startAt: true,
      entryDeadline: true,
      votingStartAt: true,
      votingEndAt: true,
      resultsAt: true,
      allowImages: true,
      allowVideos: true,
    },
  });

  if (!contest) throw new BusinessError('That contest is not available.', 'NOT_FOUND', 404);

  if (!isAcceptingEntries(contest)) {
    throw new BusinessError('This contest is not accepting entries.', 'CLOSED', 422);
  }

  if (input.kind === 'image' && !contest.allowImages) {
    throw new BusinessError('This contest does not accept photos.', 'KIND_NOT_ALLOWED', 422);
  }
  if (input.kind === 'video' && !contest.allowVideos) {
    throw new BusinessError('This contest does not accept videos.', 'KIND_NOT_ALLOWED', 422);
  }

  // Checked after the contest itself, so somebody arriving at a closed contest
  // is told it is closed rather than being handed a hosting error that is not
  // their problem and not the reason they cannot enter.
  if (!isCloudinaryConfigured()) {
    throw new BusinessError(
      cloudinaryConfigProblem() ?? 'Uploads are not configured.',
      'NOT_CONFIGURED',
      503,
    );
  }

  // Per contest, so one contest's signature cannot be used to drop a file into
  // another contest's folder.
  const folder = `${CONTEST_UPLOAD_FOLDER}/${contest.id}`;

  // Not audited: signing is not yet an action on anything. The entry that
  // follows is what gets recorded.
  void clientIpFromHeaders(await headers());

  return apiSuccess(signUploadFor(folder, input.kind));
});
