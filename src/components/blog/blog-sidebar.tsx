// src/components/blog/blog-sidebar.tsx
import Link from 'next/link';
import { Flame, Folder, Tag } from 'lucide-react';

import { BlogMiniCard } from '@/components/blog/blog-card';
import { getBlogCategories, getBlogTags, getTrendingPosts } from '@/lib/data/blog';

/**
 * The blog sidebar: trending posts, categories and tags.
 *
 * It is a server component that fetches its own data, so every page that wants
 * a sidebar gets a consistent one without threading three more props through.
 * The three queries are cached per request, so rendering it on both the
 * listing and the article page costs one round trip, not two.
 */

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Flame;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export async function BlogSidebar({ activeCategory }: { activeCategory?: string }) {
  const [trending, categories, tags] = await Promise.all([
    getTrendingPosts(5),
    getBlogCategories(),
    getBlogTags(14),
  ]);

  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      {trending.length > 0 && (
        <Panel title="Trending now" icon={Flame}>
          <ol className="space-y-4">
            {trending.map((post, index) => (
              <BlogMiniCard key={post.id} post={post} rank={index + 1} />
            ))}
          </ol>
        </Panel>
      )}

      {categories.length > 0 && (
        <Panel title="Categories" icon={Folder}>
          <ul className="space-y-1">
            <li>
              <Link
                href="/blog"
                aria-current={activeCategory ? undefined : 'page'}
                className={`flex items-center justify-between rounded-field px-3 py-2 text-sm transition-colors ${
                  activeCategory
                    ? 'hover:bg-muted'
                    : 'bg-primary/10 font-medium text-primary'
                }`}
              >
                All posts
              </Link>
            </li>
            {categories.map((category) => {
              const active = activeCategory === category.slug;
              return (
                <li key={category.id}>
                  <Link
                    href={`/blog/category/${category.slug}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between gap-2 rounded-field px-3 py-2 text-sm transition-colors ${
                      active ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">{category.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {category._count.posts}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {tags.length > 0 && (
        <Panel title="Topics" icon={Tag}>
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.name}>
                <Link
                  href={`/blog?tag=${encodeURIComponent(tag.name)}`}
                  className="inline-flex rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary"
                >
                  {tag.name}
                  <span className="sr-only"> — {tag.count} posts</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </aside>
  );
}
