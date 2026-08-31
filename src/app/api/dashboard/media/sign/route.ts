// src/app/api/dashboard/media/sign/route.ts
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { cloudinaryConfigProblem, isCloudinaryConfigured } from '@/lib/env';
import { signUpload } from '@/lib/cloudinary';

const schema = z.object({
  // A closed list, not free text: an attacker who could name the folder could
  // scatter files anywhere in the account.
  folder: z
    .enum(['destinations', 'events', 'tours', 'activities', 'stays', 'hero', 'ads', 'blog', 'contest', 'misc'])
    .default('misc'),
});

/**
 * Returns a short-lived signature so the browser can upload straight to
 * Cloudinary. The API secret is used to sign here and never leaves the server.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  await requirePermission(PERMISSIONS.MEDIA_UPLOAD);

  if (!isCloudinaryConfigured()) {
    // Name the variable that is actually missing. "Not configured" on an
    // account the owner knows is connected sends them looking in the wrong
    // place — usually they pasted CLOUDINARY_URL, which is what Cloudinary's
    // dashboard shows first.
    throw new BusinessError(
      cloudinaryConfigProblem() ??
        'Image hosting is not configured yet. Add the Cloudinary credentials in the environment first.',
      'NOT_CONFIGURED',
      503,
    );
  }

  const body = await request.json().catch(() => ({}));
  const { folder } = schema.parse(body);

  return apiSuccess(signUpload(`wild-peak-souls/${folder}`));
});
