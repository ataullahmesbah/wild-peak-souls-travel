// src/app/api/dashboard/blog/comments/moderate/route.ts
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { commentModerateSchema } from '@/lib/validation/blog';
import { CommentStatus } from '@/generated/prisma';

/**
 * Approve, reject or re-queue a comment.
 *
 * Rejecting is a state, not a delete: the row stays so a decision can be
 * reversed and so a pattern of abuse from one source is still visible in the
 * queue. Every decision is stamped with who made it and when, and written to
 * the audit log — moderation is exactly the kind of action that needs to be
 * attributable months later.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.COMMENTS_MODERATE);
  const body = await request.json().catch(() => ({}));
  const input = commentModerateSchema.parse(body);

  const comment = await prisma.postComment.findUnique({
    where: { id: input.commentId },
    select: {
      id: true,
      status: true,
      authorName: true,
      post: { select: { id: true, slug: true, title: true } },
    },
  });
  if (!comment) throw new BusinessError('Comment not found.', 'NOT_FOUND', 404);

  await prisma.postComment.update({
    where: { id: comment.id },
    data: {
      status: input.status,
      moderationNote: input.note ?? null,
      moderatedAt: new Date(),
      moderatedById: staff.id,
    },
  });

  // Approving a reply whose parent is not approved would put an orphan on the
  // page, so the parent is brought through with it.
  if (input.status === CommentStatus.APPROVED) {
    const child = await prisma.postComment.findUnique({
      where: { id: comment.id },
      select: { parentId: true },
    });
    if (child?.parentId) {
      await prisma.postComment.updateMany({
        where: { id: child.parentId, status: { not: CommentStatus.APPROVED } },
        data: {
          status: CommentStatus.APPROVED,
          moderatedAt: new Date(),
          moderatedById: staff.id,
        },
      });
    }
  }

  await recordAudit({
    actorId: staff.id,
    action: 'comment.moderated',
    entityType: 'PostComment',
    entityId: comment.id,
    metadata: {
      from: comment.status,
      to: input.status,
      post: comment.post.slug,
      note: input.note,
    },
  });

  revalidateTag('blog', 'max');
  return apiSuccess({ updated: true, status: input.status });
});

/** Permanently removes a comment. Separate, stronger permission than moderating. */
export const DELETE = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.COMMENTS_DELETE);
  const body = await request.json().catch(() => ({}));
  const input = commentModerateSchema.pick({ commentId: true }).parse(body);

  const comment = await prisma.postComment.findUnique({
    where: { id: input.commentId },
    select: { id: true, postId: true, authorName: true },
  });
  if (!comment) throw new BusinessError('Comment not found.', 'NOT_FOUND', 404);

  await prisma.postComment.delete({ where: { id: comment.id } });

  await recordAudit({
    actorId: staff.id,
    action: 'comment.deleted',
    entityType: 'PostComment',
    entityId: comment.id,
    metadata: { postId: comment.postId, author: comment.authorName },
  });

  revalidateTag('blog', 'max');
  return apiSuccess({ id: comment.id, deleted: true });
});
