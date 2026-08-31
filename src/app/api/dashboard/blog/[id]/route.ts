// src/app/api/dashboard/blog/[id]/route.ts
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { assertSlugAvailable } from '@/lib/crud/factory';
import { postUpdateSchema } from '@/lib/validation/blog';
import { BLOG_TAGS, toPostData } from '../route';
import { ContentStatus } from '@/generated/prisma';

export const PATCH = apiHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const input = postUpdateSchema.parse(body);

    const existing = await prisma.post.findUnique({
      where: { id },
      select: { id: true, status: true, publishedAt: true, title: true },
    });
    if (!existing) throw new BusinessError('Post not found.', 'NOT_FOUND', 404);

    // Publishing rights are needed to put a post live AND to edit one that is
    // already live — otherwise a draft-only role could rewrite the front page.
    const touchesLive =
      input.status === ContentStatus.PUBLISHED ||
      existing.status === ContentStatus.PUBLISHED;
    const staff = await requirePermission(
      touchesLive ? PERMISSIONS.BLOG_PUBLISH : PERMISSIONS.BLOG_MANAGE,
    );

    if (input.slug) await assertSlugAvailable('post', input.slug, id);

    await prisma.post.update({
      where: { id },
      data: toPostData(input, { previousPublishedAt: existing.publishedAt }) as never,
    });

    await recordAudit({
      actorId: staff.id,
      action: 'post.updated',
      entityType: 'Post',
      entityId: id,
      metadata: { changed: Object.keys(input), status: input.status ?? existing.status },
    });

    for (const tag of BLOG_TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.BLOG_DELETE);
    const { id } = await context.params;

    const existing = await prisma.post.findUnique({
      where: { id },
      select: { id: true, title: true, _count: { select: { comments: true } } },
    });
    if (!existing) throw new BusinessError('Post not found.', 'NOT_FOUND', 404);

    // A post people have commented on is archived, not destroyed. Deleting it
    // would cascade away their comments with no way to get them back.
    if (existing._count.comments > 0) {
      await prisma.post.update({
        where: { id },
        data: { status: ContentStatus.ARCHIVED },
      });

      await recordAudit({
        actorId: staff.id,
        action: 'post.archived',
        entityType: 'Post',
        entityId: id,
        metadata: { reason: `${existing._count.comments} comments` },
      });

      for (const tag of BLOG_TAGS) revalidateTag(tag, 'max');
      return apiSuccess({
        id,
        archived: true,
        reason: 'This post has comments, so it was archived rather than deleted.',
      });
    }

    await prisma.post.delete({ where: { id } });

    await recordAudit({
      actorId: staff.id,
      action: 'post.deleted',
      entityType: 'Post',
      entityId: id,
      metadata: { title: existing.title },
    });

    for (const tag of BLOG_TAGS) revalidateTag(tag, 'max');
    return apiSuccess({ id, deleted: true });
  },
);
