// src/app/(site)/blog/category/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BlogCard } from '@/components/blog/blog-card';
import { BlogSidebar } from '@/components/blog/blog-sidebar';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/states';
import { getBlogCategoryBySlug, listBlogPosts } from '@/lib/data/blog';
import { siteUrl } from '@/lib/env';
import { parsePageParam } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getBlogCategoryBySlug(slug);
  if (!category) return { title: 'Category not found', robots: { index: false, follow: false } };

  const description =
    category.description ?? `Articles filed under ${category.name} on the Wild Peak Souls blog.`;

  return {
    title: `${category.name} — Blog`,
    description,
    alternates: { canonical: `/blog/category/${category.slug}` },
    openGraph: {
      type: 'website',
      title: `${category.name} — Wild Peak Souls Blog`,
      description,
      url: `${siteUrl()}/blog/category/${category.slug}`,
    },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const category = await getBlogCategoryBySlug(slug);
  if (!category) notFound();

  const query = await searchParams;
  const page = parsePageParam(Array.isArray(query.page) ? query.page[0] : query.page);
  const result = await listBlogPosts({ page, category: category.slug });

  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title={category.name}
        description={
          category.description ??
          `Everything we have written about ${category.name.toLowerCase()}.`
        }
        breadcrumbs={[{ label: 'Blog', href: '/blog' }, { label: category.name }]}
      />

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <h2 className="sr-only">Articles in {category.name}</h2>

              {result.items.length === 0 ? (
                <EmptyState
                  title="Nothing in this category yet"
                  description="Try another category, or read the latest posts."
                  actionLabel="All posts"
                  actionHref="/blog"
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
                      basePath={`/blog/category/${category.slug}`}
                    />
                  </div>
                </>
              )}
            </div>

            <BlogSidebar activeCategory={category.slug} />
          </div>
        </Container>
      </Section>
    </>
  );
}
