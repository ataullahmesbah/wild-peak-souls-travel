// src/lib/data/blog.ts
import 'server-only';

import { cache } from 'react';

import { prisma } from '@/lib/prisma';
import { CommentStatus, ContentStatus, type Prisma } from '@/generated/prisma';

/**
 * Read layer for the public blog.
 *
 * Same two rules as the rest of the public read layer, and they matter more
 * here because the blog is the one place where members of the public write
 * into the database:
 *
 *  1. Only PUBLISHED posts with a `publishedAt` in the past, and only
 *     APPROVED comments, are ever returned. A draft or an unmoderated comment
 *     cannot leak through a component that forgets to filter, because the
 *     filter is not the component's to forget.
 *  2. Every query uses an explicit `select`. Notably, a comment's `authorEmail`
 *     and `ipHash` are never projected — the public page shows a name and a
 *     body, and nothing in this file can hand it anything more.
 */

export const BLOG_PAGE_SIZE = 9;

export interface BlogPaginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Published, and not scheduled for a future date. */
function livePostWhere(): Prisma.PostWhereInput {
  return { status: ContentStatus.PUBLISHED, publishedAt: { lte: new Date() } };
}

const cardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  readMinutes: true,
  publishedAt: true,
  views: true,
  featured: true,
  authorName: true,
  tags: true,
  category: { select: { name: true, slug: true } },
  coverMedia: { select: { secureUrl: true, url: true, altText: true } },
  _count: { select: { comments: { where: { status: CommentStatus.APPROVED } } } },
} satisfies Prisma.PostSelect;

export type BlogCard = Prisma.PostGetPayload<{ select: typeof cardSelect }>;

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export async function listBlogPosts(options: {
  page?: number;
  category?: string;
  query?: string;
  tag?: string;
}): Promise<BlogPaginated<BlogCard>> {
  const page = Math.max(1, options.page ?? 1);

  const where: Prisma.PostWhereInput = {
    ...livePostWhere(),
    ...(options.category ? { category: { slug: options.category } } : {}),
    ...(options.tag ? { tags: { contains: options.tag, mode: 'insensitive' } } : {}),
    ...(options.query
      ? {
          OR: [
            { title: { contains: options.query, mode: 'insensitive' } },
            { excerpt: { contains: options.query, mode: 'insensitive' } },
            { body: { contains: options.query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: cardSelect,
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * BLOG_PAGE_SIZE,
      take: BLOG_PAGE_SIZE,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: BLOG_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE)),
  };
}

/** Newest posts, for the home page strip. */
export const getLatestPosts = cache(async (limit = 3) =>
  prisma.post
    .findMany({
      where: livePostWhere(),
      select: cardSelect,
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
    })
    .catch(() => []),
);

/**
 * Sidebar "trending". Ranked by view count but restricted to the last 90 days,
 * so a single old post cannot occupy the slot forever. If nothing has been
 * published recently the window is dropped rather than showing an empty box.
 */
export const getTrendingPosts = cache(async (limit = 5) => {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const recent = await prisma.post
    .findMany({
      where: { ...livePostWhere(), publishedAt: { lte: new Date(), gte: since } },
      select: cardSelect,
      orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
    })
    .catch(() => []);

  if (recent.length > 0) return recent;

  return prisma.post
    .findMany({
      where: livePostWhere(),
      select: cardSelect,
      orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
    })
    .catch(() => []);
});

/** Categories that actually have something to show, with post counts. */
export const getBlogCategories = cache(async () =>
  prisma.postCategory
    .findMany({
      where: { status: ContentStatus.PUBLISHED },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { posts: { where: livePostWhere() } } },
      },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    })
    .then((rows) => rows.filter((row) => row._count.posts > 0))
    .catch(() => []),
);

export const getBlogCategoryBySlug = cache(async (slug: string) =>
  prisma.postCategory
    .findFirst({
      where: { slug, status: ContentStatus.PUBLISHED },
      select: { id: true, name: true, slug: true, description: true },
    })
    .catch(() => null),
);

/** Every tag in use, with counts, for the sidebar tag cloud. */
export const getBlogTags = cache(async (limit = 18) => {
  const rows = await prisma.post
    .findMany({ where: livePostWhere(), select: { tags: true } })
    .catch(() => []);

  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const raw of (row.tags ?? '').split(/[,\n]/)) {
      const tag = raw.trim();
      if (tag.length < 2 || tag.length > 40) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
});

// ---------------------------------------------------------------------------
// Single post
// ---------------------------------------------------------------------------

export const getBlogPostBySlug = cache(async (slug: string) =>
  prisma.post.findFirst({
    where: { slug, ...livePostWhere() },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      body: true,
      tags: true,
      readMinutes: true,
      views: true,
      commentsOpen: true,
      publishedAt: true,
      updatedAt: true,
      seoTitle: true,
      seoDescription: true,
      authorName: true,
      categoryId: true,
      category: { select: { name: true, slug: true } },
      author: { select: { name: true } },
      coverMedia: { select: { secureUrl: true, url: true, altText: true } },
    },
  }),
);

/**
 * Related reading: same category first, then anything recent, never the post
 * being read. Two queries rather than one so a post in a thin category still
 * fills its row instead of showing a lonely single card.
 */
export async function getRelatedPosts(
  postId: string,
  categoryId: string | null,
  limit = 3,
): Promise<BlogCard[]> {
  const base: Prisma.PostWhereInput = { ...livePostWhere(), id: { not: postId } };

  const sameCategory = categoryId
    ? await prisma.post
        .findMany({
          where: { ...base, categoryId },
          select: cardSelect,
          orderBy: [{ publishedAt: 'desc' }],
          take: limit,
        })
        .catch(() => [])
    : [];

  if (sameCategory.length >= limit) return sameCategory;

  const seen = new Set([postId, ...sameCategory.map((p) => p.id)]);
  const filler = await prisma.post
    .findMany({
      where: { ...base, id: { notIn: [...seen] } },
      select: cardSelect,
      orderBy: [{ publishedAt: 'desc' }],
      take: limit - sameCategory.length,
    })
    .catch(() => []);

  return [...sameCategory, ...filler];
}

/**
 * Bumps the view counter.
 *
 * Deliberately fire-and-forget and deliberately not awaited by the page: a
 * failed counter update must never turn a readable article into an error, and
 * the number is a popularity signal, not an accounting figure.
 */
export async function recordPostView(postId: string): Promise<void> {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: { views: { increment: 1 } },
      select: { id: true },
    });
  } catch {
    // Ignored on purpose — see above.
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export interface PublicComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
  replies: Array<{ id: string; authorName: string; body: string; createdAt: Date }>;
}

/**
 * Approved comments for one post, nested one level deep.
 *
 * `authorEmail` and `ipHash` are not in the projection at all. A reader's email
 * address is collected so staff can reply, never to be published, and the only
 * way to guarantee that is for the public query to be unable to read it.
 */
export async function getApprovedComments(postId: string): Promise<PublicComment[]> {
  const rows = await prisma.postComment
    .findMany({
      where: { postId, status: CommentStatus.APPROVED },
      select: {
        id: true,
        parentId: true,
        authorName: true,
        body: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
    .catch(() => []);

  const roots = rows.filter((row) => !row.parentId);
  const byParent = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }

  return roots.map((root) => ({
    id: root.id,
    authorName: root.authorName,
    body: root.body,
    createdAt: root.createdAt,
    replies: (byParent.get(root.id) ?? []).map((reply) => ({
      id: reply.id,
      authorName: reply.authorName,
      body: reply.body,
      createdAt: reply.createdAt,
    })),
  }));
}
