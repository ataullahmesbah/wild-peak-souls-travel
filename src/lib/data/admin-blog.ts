// src/lib/data/admin-blog.ts
import 'server-only';

import { prisma } from '@/lib/prisma';
import { CommentStatus, type Prisma } from '@/generated/prisma';

/**
 * Read layer for the dashboard's blog screens.
 *
 * Unlike the public layer this one may see drafts and unmoderated comments —
 * that is the point of a dashboard. It is still explicit about its selects, so
 * that a comment's `ipHash` reaches a moderation screen only because it was
 * asked for, and never travels further.
 */

const POSTS_PER_PAGE = 25;

export async function listAdminPosts(options: {
  status?: string;
  query?: string;
  page?: number;
}) {
  const page = Math.max(1, options.page ?? 1);

  const where: Prisma.PostWhereInput = {
    ...(options.status
      ? { status: options.status as Prisma.EnumContentStatusFilter['equals'] }
      : {}),
    ...(options.query
      ? {
          OR: [
            { title: { contains: options.query, mode: 'insensitive' } },
            { excerpt: { contains: options.query, mode: 'insensitive' } },
            { authorName: { contains: options.query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        featured: true,
        views: true,
        publishedAt: true,
        updatedAt: true,
        authorName: true,
        readMinutes: true,
        category: { select: { name: true, slug: true } },
        coverMedia: { select: { secureUrl: true, url: true } },
        _count: {
          select: {
            comments: true,
            // A count of what is waiting, so the list can flag a post that
            // needs attention without a second query per row.
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)),
  };
}

export async function listAdminCategories() {
  return prisma.postCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      position: true,
      status: true,
      _count: { select: { posts: true } },
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
}

export async function listAdminComments(status?: string, query?: string) {
  const where: Prisma.PostCommentWhereInput = {
    ...(status ? { status: status as Prisma.EnumCommentStatusFilter['equals'] } : {}),
    ...(query
      ? {
          OR: [
            { authorName: { contains: query, mode: 'insensitive' } },
            { authorEmail: { contains: query, mode: 'insensitive' } },
            { body: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return prisma.postComment.findMany({
    where,
    select: {
      id: true,
      authorName: true,
      authorEmail: true,
      body: true,
      status: true,
      createdAt: true,
      moderatedAt: true,
      moderationNote: true,
      parentId: true,
      post: { select: { title: true, slug: true } },
      user: { select: { id: true, name: true } },
      moderatedBy: { select: { name: true } },
      parent: { select: { authorName: true, body: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
  });
}

/** Badge count for the sidebar and the dashboard overview. */
export async function countPendingComments(): Promise<number> {
  return prisma.postComment
    .count({ where: { status: CommentStatus.PENDING } })
    .catch(() => 0);
}
