// src/app/(site)/blog/page.tsx
import type { Metadata } from 'next';

import { BlogCard } from '@/components/blog/blog-card';
import { BlogSidebar } from '@/components/blog/blog-sidebar';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/states';
import { getBlogCategories, listBlogPosts } from '@/lib/data/blog';
import { siteUrl } from '@/lib/env';
import { parsePageParam } from '@/lib/utils';
import { JsonLd } from '@/components/seo/json-ld';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Route notes, packing lists, seasonal advice and destination guides from the Wild Peak Souls team — written by the guides who run the trips.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    title: 'Wild Peak Souls Blog',
    description:
      'Route notes, packing lists, seasonal advice and destination guides from the team.',
    url: `${siteUrl()}/blog`,
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = parsePageParam(first(params.page));
  const query = first(params.q);
  const tag = first(params.tag);
  const category = first(params.category);

  const [result, categories] = await Promise.all([
    listBlogPosts({ page, query, tag, category }),
    getBlogCategories(),
  ]);

  // Listed so search engines and the AI assistant can read the feed without
  // executing anything.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Wild Peak Souls Blog',
    url: `${siteUrl()}/blog`,
    blogPost: result.items.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${siteUrl()}/blog/${post.slug}`,
      datePublished: post.publishedAt?.toISOString(),
      description: post.excerpt ?? undefined,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHeader
        eyebrow="Blog"
        title="Notes from the trail"
        description="Practical writing from the guides who actually run these routes — what to pack, when to go, and what nobody tells you until you are already there."
        breadcrumbs={[{ label: 'Blog' }]}
      >
        <FilterBar
          searchPlaceholder="Search the blog…"
          filters={[
            {
              name: 'category',
              label: 'Category',
              options: categories.map((item) => ({ value: item.slug, label: item.name })),
            },
          ]}
        />
      </PageHeader>

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <h2 className="sr-only">Articles</h2>

              {tag && (
                <p className="mb-6 text-sm text-muted-foreground">
                  Showing posts tagged <strong className="text-foreground">{tag}</strong>.
                </p>
              )}

              {result.items.length === 0 ? (
                <EmptyState
                  title="Nothing here yet"
                  description={
                    query || tag
                      ? 'No post matches that search. Try a different word.'
                      : 'Our team is writing the first set of articles.'
                  }
                  actionLabel="Browse destinations"
                  actionHref="/destinations"
                />
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {result.items.map((post, index) => (
                      <BlogCard key={post.id} post={post} priority={index < 2} />
                    ))}
                  </div>

                  <div className="mt-10">
                    <Pagination
                      page={result.page}
                      totalPages={result.totalPages}
                      basePath="/blog"
                      searchParams={{ q: query, tag, category }}
                    />
                  </div>
                </>
              )}
            </div>

            <BlogSidebar activeCategory={category} />
          </div>
        </Container>
      </Section>
    </>
  );
}
