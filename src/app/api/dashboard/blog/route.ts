// src/app/api/dashboard/blog/route.ts
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS, type PermissionKey } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { assertSlugAvailable } from '@/lib/crud/factory';
import { postCreateSchema } from '@/lib/validation/blog';
import { estimateReadMinutes } from '@/lib/markdown';
import { ContentStatus } from '@/generated/prisma';

export const BLOG_TAGS = ['blog', 'posts', 'home'];

/**
 * Turns validated form input into a Prisma payload.
 *
 * Two fields are computed here rather than trusted from the form:
 *   - `readMinutes` when the writer left it blank, from the body itself;
 *   - `publishedAt`, which is stamped the moment a post first goes live and
 *     never re-stamped, so editing a published post does not shuffle it back
 *     to the top of the feed.
 */
export function toPostData(
  input: Record<string, unknown>,
  options: { previousPublishedAt?: Date | null } = {},
): Record<string, unknown> {
  const data: Record<string, unknown> = { ...input };
  const body = typeof input.body === 'string' ? input.body : '';

  if (body && (data.readMinutes === undefined || data.readMinutes === 0)) {
    data.readMinutes = estimateReadMinutes(body);
  }

  if (typeof data.publishedAt === 'string' && data.publishedAt) {
    data.publishedAt = new Date(data.publishedAt);
  } else if (data.status === ContentStatus.PUBLISHED) {
    data.publishedAt = options.previousPublishedAt ?? new Date();
  } else if (data.publishedAt === '' || data.publishedAt === null) {
    data.publishedAt = options.previousPublishedAt ?? null;
  } else {
    delete data.publishedAt;
  }

  return data;
}

/**
 * Publishing is a separate permission from writing, so a role can be allowed
 * to draft without being able to put anything on the live site.
 */
async function requirePostWrite(status: unknown, base: PermissionKey) {
  const needsPublish = status === ContentStatus.PUBLISHED;
  return requirePermission(needsPublish ? PERMISSIONS.BLOG_PUBLISH : base);
}

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = postCreateSchema.parse(body);

  const staff = await requirePostWrite(input.status, PERMISSIONS.BLOG_MANAGE);

  await assertSlugAvailable('post', input.slug);

  const record = await prisma.post.create({
    data: {
      ...toPostData(input),
      // Taken from the session, never from the form: a byline the submitter
      // could choose is not a byline.
      authorId: staff.id,
      authorName: staff.name,
    } as never,
    select: { id: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'post.created',
    entityType: 'Post',
    entityId: record.id,
    metadata: { title: input.title, status: input.status },
  });

  for (const tag of BLOG_TAGS) revalidateTag(tag, 'max');
  return apiSuccess({ id: record.id }, 201);
});
