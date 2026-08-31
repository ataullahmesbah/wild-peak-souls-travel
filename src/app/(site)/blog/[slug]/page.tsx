// src/app/(site)/blog/[slug]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Eye, User } from 'lucide-react';

import { BlogCard } from '@/components/blog/blog-card';
import { BlogSidebar } from '@/components/blog/blog-sidebar';
import { CommentSection } from '@/components/blog/comment-section';
import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/components/ui/media';
import { Breadcrumbs } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import {
  getApprovedComments,
  getBlogPostBySlug,
  getRelatedPosts,
  recordPostView,
} from '@/lib/data/blog';
import { getCurrentUser } from '@/lib/auth/session';
import { siteUrl } from '@/lib/env';
import {
  estimateReadMinutes,
  markdownToPlainText,
  renderMarkdown,
} from '@/lib/markdown';
import { formatDate, toLines } from '@/lib/utils';
import { JsonLd } from '@/components/seo/json-ld';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Post not found', robots: { index: false, follow: false } };

  // Falls back through excerpt to the body itself, so a post always has a
  // description even if the writer left the SEO fields blank.
  const description =
    post.seoDescription ?? post.excerpt ?? markdownToPlainText(post.body, 155);
  const title = post.seoTitle ?? post.title;
  const image = post.coverMedia?.secureUrl ?? post.coverMedia?.url;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${siteUrl()}/blog/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      section: post.category?.name,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const [comments, related, viewer] = await Promise.all([
    getApprovedComments(post.id),
    getRelatedPosts(post.id, post.categoryId, 3),
    getCurrentUser(),
  ]);

  // Not awaited: the counter must never delay or fail the article.
  void recordPostView(post.id);

  const tags = toLines((post.tags ?? '').replace(/,/g, '\n'));
  const readMinutes = post.readMinutes > 0 ? post.readMinutes : estimateReadMinutes(post.body);
  const author = post.authorName ?? post.author?.name ?? 'Wild Peak Souls';
  const image = post.coverMedia?.secureUrl ?? post.coverMedia?.url;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? markdownToPlainText(post.body, 200),
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: image ?? undefined,
    articleSection: post.category?.name,
    keywords: tags.length > 0 ? tags.join(', ') : undefined,
    wordCount: markdownToPlainText(post.body).split(/\s+/).filter(Boolean).length,
    author: { '@type': 'Person', name: author },
    publisher: { '@type': 'Organization', name: 'Wild Peak Souls' },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl()}/blog/${post.slug}`,
    },
    commentCount: comments.reduce((n, c) => n + 1 + c.replies.length, 0),
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <Section className="pb-0 pt-8">
        <Container>
          <Breadcrumbs
            items={[
              { label: 'Blog', href: '/blog' },
              ...(post.category
                ? [{ label: post.category.name, href: `/blog/category/${post.category.slug}` }]
                : []),
              { label: post.title },
            ]}
          />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <article>
              <header>
                {post.category && (
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    {post.category.name}
                  </Link>
                )}

                {/* The page's only h1. Headings inside the body start at h2 —
                    see src/lib/markdown.tsx. */}
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                  {post.title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" aria-hidden="true" />
                    {author}
                  </span>
                  <time dateTime={post.publishedAt?.toISOString()}>
                    {formatDate(post.publishedAt)}
                  </time>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    {readMinutes} min read
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    {post.views} views
                  </span>
                </div>
              </header>

              {post.coverMedia && (
                <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-card">
                  <CoverImage
                    media={post.coverMedia}
                    alt={post.coverMedia.altText ?? post.title}
                    priority
                    sizes="(max-width: 1024px) 100vw, 760px"
                  />
                </div>
              )}

              {post.excerpt && (
                <p className="mt-8 border-l-4 border-primary pl-5 text-base font-medium leading-relaxed text-foreground/85">
                  {post.excerpt}
                </p>
              )}

              <div className="wps-prose mt-8 text-base">{renderMarkdown(post.body)}</div>

              {tags.length > 0 && (
                <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
                  <span className="text-sm text-muted-foreground">Tagged:</span>
                  {tags.map((tag) => (
                    <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                      <Badge tone="primary">{tag}</Badge>
                    </Link>
                  ))}
                </div>
              )}

              <CommentSection
                postId={post.id}
                comments={comments}
                commentsOpen={post.commentsOpen}
                viewerName={viewer?.name}
                viewerEmail={viewer?.email}
              />
            </article>

            <BlogSidebar activeCategory={post.category?.slug} />
          </div>

          {related.length > 0 && (
            <section aria-labelledby="related-heading" className="mt-16 border-t border-border pt-10">
              <h2 id="related-heading" className="font-display text-xl font-semibold">
                Keep reading
              </h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <BlogCard key={item.id} post={item} />
                ))}
              </div>
            </section>
          )}
        </Container>
      </Section>
    </>
  );
}
