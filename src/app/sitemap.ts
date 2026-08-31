// src/app/sitemap.ts
import type { MetadataRoute } from 'next';

import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/env';
import { ContentStatus, ContestStatus, EventStatus } from '@/generated/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const STATIC_PATHS = [
  { path: '', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/destinations', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/events', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/tours', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/activities', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/stays', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/visa', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/support', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/flights', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/train-schedule', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/custom-tour', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/services', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/blog', priority: 0.8, changeFrequency: 'daily' as const },
  { path: '/contest', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/faq', priority: 0.5, changeFrequency: 'monthly' as const },
];

/**
 * Only published content is listed. Account, admin, checkout and auth routes
 * are excluded entirely — they are private and marked noindex besides.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((item) => ({
    url: `${base}${item.path}`,
    lastModified: now,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  try {
    const [
      destinations,
      events,
      tours,
      activities,
      stays,
      visaCountries,
      visaTypes,
      posts,
      legal,
    ] =
      await Promise.all([
        prisma.destination.findMany({
          where: { status: ContentStatus.PUBLISHED },
          select: { slug: true, updatedAt: true },
        }),
        prisma.event.findMany({
          where: { status: { in: [EventStatus.PUBLISHED, EventStatus.SOLD_OUT] } },
          select: { slug: true, updatedAt: true },
        }),
        prisma.tour.findMany({
          where: { status: ContentStatus.PUBLISHED },
          select: { slug: true, updatedAt: true },
        }),
        prisma.activity.findMany({
          where: { status: ContentStatus.PUBLISHED },
          select: { slug: true, updatedAt: true },
        }),
        prisma.accommodation.findMany({
          where: { status: ContentStatus.PUBLISHED },
          select: { slug: true, updatedAt: true },
        }),
        prisma.visaCountry.findMany({
          where: { status: ContentStatus.PUBLISHED },
          select: { slug: true, updatedAt: true },
        }),
        prisma.visaType.findMany({
          where: {
            status: ContentStatus.PUBLISHED,
            country: { status: ContentStatus.PUBLISHED },
          },
          select: { slug: true, updatedAt: true, country: { select: { slug: true } } },
        }),
        prisma.post.findMany({
          where: { status: ContentStatus.PUBLISHED, publishedAt: { lte: now } },
          select: { slug: true, updatedAt: true },
        }),
        prisma.legalPage.findMany({
          where: { status: ContentStatus.PUBLISHED },
          select: { slug: true, updatedAt: true },
        }),
      ]);

    // Only categories that actually have a published post: listing an empty
    // category page invites a "soft 404" in Search Console.
    const contests = await prisma.contest.findMany({
      where: { status: ContestStatus.PUBLISHED },
      select: { slug: true, updatedAt: true },
    });

    const postCategories = await prisma.postCategory.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        posts: { some: { status: ContentStatus.PUBLISHED, publishedAt: { lte: now } } },
      },
      select: { slug: true, updatedAt: true },
    });

    const push = (prefix: string, rows: Array<{ slug: string; updatedAt: Date }>, priority: number) => {
      for (const row of rows) {
        entries.push({
          url: `${base}${prefix}/${row.slug}`,
          lastModified: row.updatedAt,
          changeFrequency: 'weekly',
          priority,
        });
      }
    };

    push('/destinations', destinations, 0.8);
    push('/events', events, 0.9);
    push('/tours', tours, 0.8);
    push('/activities', activities, 0.6);
    push('/stays', stays, 0.7);
    push('/blog', posts, 0.7);
    push('/contest', contests, 0.7);
    push('/blog/category', postCategories, 0.5);
    push('/policies', legal, 0.3);
    push('/visa', visaCountries, 0.7);

    for (const visaType of visaTypes) {
      entries.push({
        url: `${base}/visa/${visaType.country.slug}/${visaType.slug}`,
        lastModified: visaType.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch (error) {
    // A database outage must not break the sitemap — serve the static routes.
    console.error('[sitemap] could not load dynamic routes', error);
  }

  return entries;
}
