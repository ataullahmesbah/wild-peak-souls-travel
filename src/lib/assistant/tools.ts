import 'server-only';

import { prisma } from '@/lib/prisma';
import { markdownToPlainText } from '@/lib/markdown';
import { siteUrl } from '@/lib/env';
import { toNumber } from '@/lib/utils';
import { ContentStatus, EventStatus } from '@/generated/prisma';
import { SETTING_KEYS, getPublicSettings, settingString } from '@/lib/settings';

/**
 * The complete set of things the travel assistant can look at.
 *
 * This file is the security boundary, and it is written to be read as one: the
 * assistant has no database client, no session and no network of its own. It
 * can only call the handlers below, and every one of them is a hand-written
 * query that filters to PUBLISHED content and selects named columns.
 *
 * Consequences of that, spelled out because they are the point:
 *  - There is no tool that reads User, Booking, Payment, Session, AuditLog,
 *    Setting secrets, leads or support tickets. Not filtered — absent.
 *  - Nothing here takes a user id, a booking reference or an email. A prompt
 *    that talks the model into asking for someone's booking has nothing to
 *    call, which is a stronger guarantee than a model instructed to refuse.
 *  - No handler writes. The assistant cannot create, update or delete anything.
 *
 * Adding a tool here widens what a stranger on the internet can reach through
 * a chat box, so each one should be justified the same way a public API
 * endpoint would be.
 */

export interface AssistantTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: false;
  };
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

const str = (value: unknown, max = 120): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const RESULT_LIMIT = 8;

export const ASSISTANT_TOOLS: AssistantTool[] = [
  {
    name: 'search_trips',
    description:
      'Search published events, tours and activities by keyword, destination or month. Use this for any question about what trips are available, when something departs, or what a trip costs.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text, e.g. "Sajek" or "hiking"' },
        kind: {
          type: 'string',
          enum: ['event', 'tour', 'activity', 'any'],
          description: 'Narrow to one kind of trip. Events are fixed departures.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: async (input) => {
      const query = str(input.query, 80);
      const kind = str(input.kind, 20) || 'any';
      if (!query) return { results: [] };

      const like = { contains: query, mode: 'insensitive' as const };
      const base = siteUrl();
      const results: unknown[] = [];

      if (kind === 'any' || kind === 'event') {
        const events = await prisma.event.findMany({
          where: {
            status: EventStatus.PUBLISHED,
            startAt: { gte: new Date() },
            OR: [
              { title: like },
              { shortDescription: like },
              { destination: { name: like } },
            ],
          },
          select: {
            title: true,
            slug: true,
            shortDescription: true,
            startAt: true,
            endAt: true,
            price: true,
            discountPrice: true,
            capacity: true,
            reservedSeats: true,
            difficulty: true,
            destination: { select: { name: true } },
          },
          orderBy: { startAt: 'asc' },
          take: RESULT_LIMIT,
        });

        for (const event of events) {
          results.push({
            kind: 'event',
            title: event.title,
            url: `${base}/events/${event.slug}`,
            summary: event.shortDescription,
            destination: event.destination?.name ?? null,
            departs: event.startAt.toISOString().slice(0, 10),
            returns: event.endAt.toISOString().slice(0, 10),
            pricePerPersonBDT: toNumber(event.discountPrice ?? event.price),
            seatsLeft: Math.max(0, event.capacity - event.reservedSeats),
            difficulty: event.difficulty,
          });
        }
      }

      if (kind === 'any' || kind === 'tour') {
        const tours = await prisma.tour.findMany({
          where: {
            status: ContentStatus.PUBLISHED,
            OR: [{ title: like }, { shortDescription: like }, { destination: { name: like } }],
          },
          select: {
            title: true,
            slug: true,
            shortDescription: true,
            duration: true,
            basePrice: true,
            discountPrice: true,
            maxGroupSize: true,
            destination: { select: { name: true } },
          },
          take: RESULT_LIMIT,
        });

        for (const tour of tours) {
          results.push({
            kind: 'tour',
            title: tour.title,
            url: `${base}/tours/${tour.slug}`,
            summary: tour.shortDescription,
            destination: tour.destination?.name ?? null,
            duration: tour.duration,
            fromPriceBDT: toNumber(tour.discountPrice ?? tour.basePrice),
            maxGroupSize: tour.maxGroupSize,
          });
        }
      }

      if (kind === 'any' || kind === 'activity') {
        const activities = await prisma.activity.findMany({
          where: {
            status: ContentStatus.PUBLISHED,
            OR: [{ name: like }, { shortDescription: like }, { destination: { name: like } }],
          },
          select: {
            name: true,
            slug: true,
            shortDescription: true,
            duration: true,
            price: true,
            difficulty: true,
            destination: { select: { name: true } },
          },
          take: RESULT_LIMIT,
        });

        for (const activity of activities) {
          results.push({
            kind: 'activity',
            title: activity.name,
            url: `${base}/activities/${activity.slug}`,
            summary: activity.shortDescription,
            destination: activity.destination?.name ?? null,
            duration: activity.duration,
            priceBDT: toNumber(activity.price),
            difficulty: activity.difficulty,
          });
        }
      }

      return { results: results.slice(0, 12) };
    },
  },

  {
    name: 'get_trip_details',
    description:
      'Full published detail for one event or tour, by its URL slug. Use after search_trips when someone asks what is included, where it meets, or what the itinerary is.',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['event', 'tour'] },
        slug: { type: 'string' },
      },
      required: ['kind', 'slug'],
      additionalProperties: false,
    },
    handler: async (input) => {
      const slug = str(input.slug, 120);
      const base = siteUrl();

      if (str(input.kind) === 'tour') {
        const tour = await prisma.tour.findFirst({
          where: { slug, status: ContentStatus.PUBLISHED },
          select: {
            title: true,
            slug: true,
            description: true,
            highlights: true,
            inclusions: true,
            exclusions: true,
            accommodation: true,
            transport: true,
            policies: true,
            duration: true,
            basePrice: true,
            discountPrice: true,
            maxGroupSize: true,
            difficulty: true,
            itinerary: {
              select: { dayNumber: true, title: true, description: true },
              orderBy: { dayNumber: 'asc' },
            },
          },
        });
        if (!tour) return { found: false };
        return {
          found: true,
          ...tour,
          url: `${base}/tours/${tour.slug}`,
          basePrice: toNumber(tour.basePrice),
          discountPrice: tour.discountPrice ? toNumber(tour.discountPrice) : null,
        };
      }

      const event = await prisma.event.findFirst({
        where: { slug, status: EventStatus.PUBLISHED },
        select: {
          title: true,
          slug: true,
          description: true,
          startAt: true,
          endAt: true,
          price: true,
          discountPrice: true,
          capacity: true,
          reservedSeats: true,
          difficulty: true,
          meetingPoint: true,
          transport: true,
          accommodation: true,
          meals: true,
          travelTips: true,
          itinerary: {
            select: { dayNumber: true, title: true, description: true },
            orderBy: { dayNumber: 'asc' },
          },
          policies: { select: { title: true, content: true } },
          options: { select: { title: true, description: true, price: true } },
        },
      });
      if (!event) return { found: false };

      return {
        found: true,
        ...event,
        url: `${base}/events/${event.slug}`,
        price: toNumber(event.price),
        discountPrice: event.discountPrice ? toNumber(event.discountPrice) : null,
        seatsLeft: Math.max(0, event.capacity - event.reservedSeats),
        options: event.options.map((option) => ({
          ...option,
          price: toNumber(option.price),
        })),
      };
    },
  },

  {
    name: 'get_visa_information',
    description:
      'Published visa requirements for a country: documents needed, service fee and processing information.',
    input_schema: {
      type: 'object',
      properties: { country: { type: 'string' } },
      required: ['country'],
      additionalProperties: false,
    },
    handler: async (input) => {
      const country = str(input.country, 80);
      if (!country) return { found: false };

      const record = await prisma.visaCountry.findFirst({
        where: {
          status: ContentStatus.PUBLISHED,
          OR: [
            { name: { contains: country, mode: 'insensitive' } },
            { slug: { contains: country.toLowerCase() } },
          ],
        },
        select: {
          name: true,
          slug: true,
          description: true,
          visaTypes: {
            where: { status: ContentStatus.PUBLISHED },
            select: {
              name: true,
              slug: true,
              summary: true,
              generalDocuments: true,
              processingInfo: true,
              importantNotes: true,
              serviceFee: true,
            },
          },
        },
      });
      if (!record) return { found: false };

      const base = siteUrl();
      return {
        found: true,
        country: record.name,
        url: `${base}/visa/${record.slug}`,
        description: record.description,
        visaTypes: record.visaTypes.map((type) => ({
          ...type,
          url: `${base}/visa/${record.slug}/${type.slug}`,
          serviceFeeBDT: type.serviceFee ? toNumber(type.serviceFee) : null,
        })),
      };
    },
  },

  {
    name: 'list_destinations',
    description:
      'Every published destination with a one-line summary. Use for "where do you go?" style questions.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => {
      const base = siteUrl();
      const destinations = await prisma.destination.findMany({
        where: { status: ContentStatus.PUBLISHED },
        select: {
          name: true,
          slug: true,
          country: true,
          region: true,
          shortDescription: true,
          bestTimeToVisit: true,
        },
        orderBy: { name: 'asc' },
        take: 40,
      });
      return {
        destinations: destinations.map((item) => ({
          ...item,
          url: `${base}/destinations/${item.slug}`,
        })),
      };
    },
  },

  {
    name: 'search_help_articles',
    description:
      'Published FAQ answers about booking, payment, cancellation and travelling with us. Use before answering any policy question so the answer matches what the site says.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
      additionalProperties: false,
    },
    handler: async (input) => {
      const query = str(input.query, 80);
      const items = await prisma.faqItem.findMany({
        where: {
          status: ContentStatus.PUBLISHED,
          ...(query
            ? {
                OR: [
                  { question: { contains: query, mode: 'insensitive' as const } },
                  { answer: { contains: query, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
        select: { question: true, answer: true, category: true },
        take: 6,
      });
      return { answers: items };
    },
  },

  {
    name: 'search_blog',
    description:
      'Published blog articles: packing lists, seasonal advice, route notes and destination guides. Use when someone asks for advice or background rather than a trip to book. Always link to the article you used.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text, e.g. "what to pack" or "Sajek"' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: async (input) => {
      const query = str(input.query, 80);
      const base = siteUrl();

      // PUBLISHED and already past its publish date, exactly like the blog
      // page itself: the assistant must never surface a draft or a scheduled
      // post before its date.
      const posts = await prisma.post.findMany({
        where: {
          status: ContentStatus.PUBLISHED,
          publishedAt: { lte: new Date() },
          ...(query
            ? {
                OR: [
                  { title: { contains: query, mode: 'insensitive' as const } },
                  { excerpt: { contains: query, mode: 'insensitive' as const } },
                  { body: { contains: query, mode: 'insensitive' as const } },
                  { tags: { contains: query, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
        select: {
          title: true,
          slug: true,
          excerpt: true,
          body: true,
          publishedAt: true,
          readMinutes: true,
          category: { select: { name: true } },
        },
        orderBy: [{ publishedAt: 'desc' }],
        take: 4,
      });

      return {
        articles: posts.map((post) => ({
          title: post.title,
          url: `${base}/blog/${post.slug}`,
          category: post.category?.name ?? null,
          publishedAt: post.publishedAt,
          readMinutes: post.readMinutes,
          // A summary, not the article. Enough for the assistant to answer
          // from and cite, without pasting a whole post into the context.
          summary: post.excerpt ?? markdownToPlainText(post.body, 600),
        })),
      };
    },
  },

  {
    name: 'get_contact_details',
    description:
      'How to reach the agency: email, phone, office hours and the pages for contacting a human. Use when someone wants to speak to a person or book something.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => {
      const settings = await getPublicSettings();
      const base = siteUrl();
      return {
        brand: settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls'),
        email:
          settingString(settings, SETTING_KEYS.SUPPORT_EMAIL) ||
          settingString(settings, SETTING_KEYS.CONTACT_EMAIL),
        phone:
          settingString(settings, SETTING_KEYS.SUPPORT_PHONE) ||
          settingString(settings, SETTING_KEYS.CONTACT_PHONE),
        openingHours: settingString(settings, SETTING_KEYS.BUSINESS_HOURS),
        contactPage: `${base}/contact`,
        supportPage: `${base}/support`,
        customTourPage: `${base}/custom-tour`,
      };
    },
  },
];

export const ASSISTANT_TOOL_MAP = new Map(
  ASSISTANT_TOOLS.map((tool) => [tool.name, tool]),
);
