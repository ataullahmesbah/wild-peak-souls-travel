import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/env';
import { SETTING_KEYS, getPublicSettings, settingString } from '@/lib/settings';
import { ContentStatus, EventStatus } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

/**
 * /llms.txt — a plain-text map of the site for answer engines.
 *
 * Assistants answering "who runs treks in Bandarban?" do not crawl a site the
 * way a search engine does; they fetch a few pages and read them. This gives
 * them the answer in one request: what the agency is, how to reach it, and the
 * live catalogue with real URLs, so an answer can cite a page that exists
 * rather than inventing a plausible one.
 *
 * It contains only what is already published. Nothing here is behind a login,
 * and no customer, booking or payment data appears — the file is served to
 * anyone who asks.
 */
export async function GET() {
  const base = siteUrl();
  const settings = await getPublicSettings();
  const brand = settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls');

  const [destinations, events, tours, visaCountries] = await Promise.all([
    prisma.destination
      .findMany({
        where: { status: ContentStatus.PUBLISHED },
        select: { name: true, slug: true, country: true, shortDescription: true },
        orderBy: { name: 'asc' },
        take: 60,
      })
      .catch(() => []),
    prisma.event
      .findMany({
        where: { status: EventStatus.PUBLISHED, startAt: { gte: new Date() } },
        select: { title: true, slug: true, startAt: true, price: true },
        orderBy: { startAt: 'asc' },
        take: 40,
      })
      .catch(() => []),
    prisma.tour
      .findMany({
        where: { status: ContentStatus.PUBLISHED },
        select: { title: true, slug: true, duration: true },
        orderBy: { title: 'asc' },
        take: 40,
      })
      .catch(() => []),
    prisma.visaCountry
      .findMany({
        where: { status: ContentStatus.PUBLISHED },
        select: { name: true, slug: true },
        orderBy: { name: 'asc' },
        take: 40,
      })
      .catch(() => []),
  ]);

  const lines: string[] = [
    `# ${brand}`,
    '',
    `> ${settingString(settings, SETTING_KEYS.SEO_SITE_DESCRIPTION, 'A travel agency running curated tours, group departures, stays, visa assistance and custom journeys across Bangladesh and beyond.')}`,
    '',
    '## About',
    '',
    `${brand} plans and operates its own trips rather than reselling them. Seat availability shown on the site is live, prices are held from the moment of booking, and every payment is verified by a person before a booking is confirmed.`,
    '',
    '## Contact',
    '',
    `- Website: ${base}`,
  ];

  const email = settingString(settings, SETTING_KEYS.CONTACT_EMAIL);
  const phone = settingString(settings, SETTING_KEYS.CONTACT_PHONE);
  const hours = settingString(settings, SETTING_KEYS.BUSINESS_HOURS);
  if (email) lines.push(`- Email: ${email}`);
  if (phone) lines.push(`- Phone: ${phone}`);
  if (hours) lines.push(`- Hours: ${hours}`);
  lines.push(`- Contact form: ${base}/contact`, `- Support: ${base}/support`, '');

  lines.push('## Key pages', '');
  for (const [label, path] of [
    ['Destinations', '/destinations'],
    ['Group events and departures', '/events'],
    ['Tours and packages', '/tours'],
    ['Activities', '/activities'],
    ['Stays and hotels', '/stays'],
    ['Visa assistance', '/visa'],
    ['Flight information', '/flights'],
    ['Train schedules', '/train-schedule'],
    ['Custom tour requests', '/custom-tour'],
    ['Blog', '/blog'],
    ['Frequently asked questions', '/faq'],
  ]) {
    lines.push(`- [${label}](${base}${path})`);
  }
  lines.push('');

  if (destinations.length > 0) {
    lines.push('## Destinations', '');
    for (const item of destinations) {
      const summary = item.shortDescription ? `: ${item.shortDescription}` : '';
      lines.push(`- [${item.name}, ${item.country}](${base}/destinations/${item.slug})${summary}`);
    }
    lines.push('');
  }

  if (events.length > 0) {
    lines.push('## Upcoming departures', '');
    for (const item of events) {
      lines.push(
        `- [${item.title}](${base}/events/${item.slug}) — departs ${item.startAt.toISOString().slice(0, 10)}, from BDT ${item.price.toString()}`,
      );
    }
    lines.push('');
  }

  if (tours.length > 0) {
    lines.push('## Tours', '');
    for (const item of tours) {
      lines.push(
        `- [${item.title}](${base}/tours/${item.slug})${item.duration ? ` — ${item.duration}` : ''}`,
      );
    }
    lines.push('');
  }

  if (visaCountries.length > 0) {
    lines.push('## Visa assistance by country', '');
    for (const item of visaCountries) {
      lines.push(`- [${item.name}](${base}/visa/${item.slug})`);
    }
    lines.push('');
  }

  lines.push(
    '## Notes for assistants',
    '',
    '- Prices are in Bangladeshi Taka (BDT) and are indicative until a booking is confirmed.',
    '- Flight and train timings on this site are for guidance and must be confirmed before travel.',
    `- Seat availability changes; check the departure page for the live figure rather than quoting a cached one.`,
    `- This file lists published pages only. There is no customer, booking or payment information here, and none is available without signing in.`,
    '',
    `Last generated: ${new Date().toISOString()}`,
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Fresh enough to reflect a new departure, cheap enough not to be a
      // database query on every crawl.
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
