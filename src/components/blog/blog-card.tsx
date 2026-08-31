// src/components/blog/blog-card.tsx
import Link from 'next/link';
import { Eye, MessageSquare } from 'lucide-react';

import { CoverImage } from '@/components/ui/media';
import { formatDate } from '@/lib/utils';
import type { BlogCard as BlogCardData } from '@/lib/data/blog';

/**
 * One post in the listing grid.
 *
 * The whole card is not a single link on purpose: the category chip is its own
 * destination, and nesting an anchor inside an anchor is invalid HTML that
 * screen readers announce unpredictably. The title carries the link, and the
 * image links to the same place with an empty alt so it is not announced twice.
 */
export function BlogCard({
  post,
  priority = false,
}: {
  post: BlogCardData;
  priority?: boolean;
}) {
  const href = `/blog/${post.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-border bg-card transition-shadow hover:shadow-lg">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/9] overflow-hidden">
        <CoverImage
          media={post.coverMedia}
          alt=""
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {post.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            Featured
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {post.category && (
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary hover:bg-primary/20"
            >
              {post.category.name}
            </Link>
          )}
          <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readMinutes} min read</span>
        </div>

        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">
          <Link href={href} className="hover:text-primary">
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
        )}

        <div className="mt-4 flex items-center gap-4 pt-1 text-xs text-muted-foreground">
          {post.authorName && <span className="truncate">By {post.authorName}</span>}
          <span className="ml-auto flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {post.views}
            <span className="sr-only"> views</span>
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {post._count.comments}
            <span className="sr-only"> comments</span>
          </span>
        </div>
      </div>
    </article>
  );
}

/** Compact row used in the sidebar's trending list. */
export function BlogMiniCard({ post, rank }: { post: BlogCardData; rank: number }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
        aria-hidden="true"
      >
        {rank}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-medium leading-snug">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(post.publishedAt)} · {post.readMinutes} min
        </p>
      </div>
    </li>
  );
}
