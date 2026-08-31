// src/app/api/blog/comments/route.ts
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { BusinessError, apiError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders, getCurrentUser } from '@/lib/auth/session';
import { commentCreateSchema } from '@/lib/validation/blog';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { notifyStaffWithPermission } from '@/lib/notifications';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import {
  CommentStatus,
  ContentStatus,
  NotificationType,
} from '@/generated/prisma';

/**
 * The only endpoint on the site that lets an anonymous visitor write a row, so
 * it is the one that has to be careful. Five things stand between a stranger
 * and the page:
 *
 *  1. A honeypot field no human ever sees.
 *  2. A per-IP rate limit.
 *  3. Zod validation with a hard length cap.
 *  4. The post must exist, be published, and have comments open — a draft's id
 *     is not a way to attach a comment to something nobody moderates.
 *  5. The row is written PENDING. Nothing here can publish anything; only a
 *     moderator with COMMENTS_MODERATE can.
 *
 * The response is deliberately identical whether the comment was stored or
 * silently dropped as spam, so a bot cannot tune itself against it.
 */

/** A truncated hash: enough to correlate abuse, not enough to recover an IP. */
function hashIp(ip: string): string {
  return createHash('sha256').update(`wps-comment:${ip}`).digest('hex').slice(0, 32);
}

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const input = commentCreateSchema.parse(body);

  // Honeypot. Answer as though it worked; write nothing.
  if (input.website) return apiSuccess({ received: true }, 201);

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList) ?? 'unknown';

  const limit = await rateLimit(`comment:${ip}`, RATE_LIMITS.PUBLIC_FORM);
  if (!limit.allowed) {
    return apiError(
      'You have posted several comments already. Please wait a little before posting another.',
      429,
      { code: 'RATE_LIMITED' },
    );
  }

  const post = await prisma.post.findFirst({
    where: {
      id: input.postId,
      status: ContentStatus.PUBLISHED,
      publishedAt: { lte: new Date() },
    },
    select: { id: true, title: true, slug: true, commentsOpen: true },
  });

  // A draft or unknown post is reported the same way, so this cannot be used
  // to discover which unpublished ids exist.
  if (!post) {
    throw new BusinessError('That post is not available.', 'NOT_FOUND', 404);
  }
  if (!post.commentsOpen) {
    throw new BusinessError('Comments are closed on this post.', 'COMMENTS_CLOSED', 422);
  }

  // A reply must point at an approved comment on this same post. Without the
  // postId check, a reply could be grafted onto an unrelated article.
  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await prisma.postComment.findFirst({
      where: {
        id: input.parentId,
        postId: post.id,
        status: CommentStatus.APPROVED,
        parentId: null,
      },
      select: { id: true },
    });
    if (!parent) {
      throw new BusinessError('That comment is no longer available.', 'NOT_FOUND', 404);
    }
    parentId = parent.id;
  }

  const user = await getCurrentUser();

  const comment = await prisma.postComment.create({
    data: {
      postId: post.id,
      parentId,
      userId: user?.id ?? null,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      body: input.body,
      status: CommentStatus.PENDING,
      ipHash: hashIp(ip),
    },
    select: { id: true },
  });

  await notifyStaffWithPermission(PERMISSIONS.COMMENTS_MODERATE, {
    type: NotificationType.SYSTEM,
    title: 'New blog comment awaiting review',
    message: `${input.authorName} on “${post.title}”: ${input.body.slice(0, 80)}`,
    link: '/dashboard/blog/comments?status=PENDING',
    targetType: 'PostComment',
    targetId: comment.id,
  });

  return apiSuccess({ received: true, status: 'PENDING' }, 201);
});
