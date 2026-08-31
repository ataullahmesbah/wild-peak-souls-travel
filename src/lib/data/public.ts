import 'server-only';

import { cache } from 'react';

import { prisma } from '@/lib/prisma';
import {
  ContentStatus,
  EventStatus,
  ReviewStatus,
  type Prisma,
  type ProductType,
} from '@/generated/prisma';

/**
 * Read layer for the public website.
 *
 * Two rules hold everywhere in this file:
 *  1. Only PUBLISHED/APPROVED rows are ever returned — status filtering happens
 *     here, not in the component, so a new page cannot accidentally leak drafts.
 *  2. Every query uses an explicit `select`. No customer PII, staff notes or
 *     internal fields are in any projection, so nothing private can reach the
 *     browser even by mistake.
 */

const PAGE_SIZE = 12;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// --- Destinations -----------------------------------------------------------

const destinationCardSelect = {
  id: true,
  name: true,
  slug: true,
  country: true,
  region: true,
  shortDescription: true,
  coverMedia: { select: { secureUrl: true, url: true, altText: true } },
  _count: { select: { events: true, tours: true, activities: true } },
} satisfies Prisma.DestinationSelect;

export type DestinationCard = Prisma.DestinationGetPayload<{
  select: typeof destinationCardSelect;
}>;

export const getFeaturedDestinations = cache(
  async (limit = 6): Promise<DestinationCard[]> =>
    prisma.destination
      .findMany({
        where: { status: ContentStatus.PUBLISHED, featured: true },
        select: destinationCardSelect,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: limit,
      })
      .catch(() => []),
);

export async function listDestinations(options: {
  page?: number;
  country?: string;
  query?: string;
}): Promise<Paginated<DestinationCard>> {
  const page = options.page ?? 1;
  const where: Prisma.DestinationWhereInput = {
    status: ContentStatus.PUBLISHED,
    ...(options.country ? { country: options.country } : {}),
    ...(options.query
      ? {
          OR: [
            { name: { contains: options.query, mode: 'insensitive' } },
            { region: { contains: options.query, mode: 'insensitive' } },
            { shortDescription: { contains: options.query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.destination.findMany({
      where,
      select: destinationCardSelect,
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.destination.count({ where }),
  ]);

  return paginate(items, total, page, PAGE_SIZE);
}

export const getDestinationBySlug = cache(async (slug: string) =>
  prisma.destination.findFirst({
    where: { slug, status: ContentStatus.PUBLISHED },
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      region: true,
      shortDescription: true,
      description: true,
      bestTimeToVisit: true,
      travelTips: true,
      latitude: true,
      longitude: true,
      seoTitle: true,
      seoDescription: true,
      coverMedia: { select: { secureUrl: true, url: true, altText: true } },
      gallery: {
        select: {
          media: { select: { secureUrl: true, url: true, altText: true } },
        },
        orderBy: { sortOrder: 'asc' },
        take: 12,
      },
    },
  }),
);

// --- Events -----------------------------------------------------------------

const eventCardSelect = {
  id: true,
  title: true,
  slug: true,
  shortDescription: true,
  startAt: true,
  endAt: true,
  duration: true,
  capacity: true,
  reservedSeats: true,
  price: true,
  discountPrice: true,
  difficulty: true,
  status: true,
  coverMedia: { select: { secureUrl: true, url: true, altText: true } },
  destination: { select: { name: true, slug: true, region: true } },
} satisfies Prisma.EventSelect;

export type EventCard = Prisma.EventGetPayload<{ select: typeof eventCardSelect }>;

/** Events open for sale: published, sold-out included, but never past. */
const liveEventWhere: Prisma.EventWhereInput = {
  status: { in: [EventStatus.PUBLISHED, EventStatus.SOLD_OUT] },
  startAt: { gte: new Date(0) },
};

export const getUpcomingEvents = cache(
  async (limit = 6): Promise<EventCard[]> =>
    prisma.event
      .findMany({
        where: { ...liveEventWhere, startAt: { gte: new Date() } },
        select: eventCardSelect,
        orderBy: { startAt: 'asc' },
        take: limit,
      })
      .catch(() => []),
);

export async function listEvents(options: {
  page?: number;
  destination?: string;
  difficulty?: string;
  query?: string;
  includePast?: boolean;
}): Promise<Paginated<EventCard>> {
  const page = options.page ?? 1;
  const where: Prisma.EventWhereInput = {
    status: { in: [EventStatus.PUBLISHED, EventStatus.SOLD_OUT] },
    ...(options.includePast ? {} : { startAt: { gte: new Date() } }),
    ...(options.destination ? { destination: { slug: options.destination } } : {}),
    ...(options.difficulty
      ? { difficulty: options.difficulty as Prisma.EnumDifficultyFilter['equals'] }
      : {}),
    ...(options.query
      ? {
          OR: [
            { title: { contains: options.query, mode: 'insensitive' } },
            { shortDescription: { contains: options.query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      select: eventCardSelect,
      orderBy: { startAt: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.event.count({ where }),
  ]);

  return paginate(items, total, page, PAGE_SIZE);
}

export const getEventBySlug = cache(async (slug: string) =>
  prisma.event.findFirst({
    where: { slug, status: { in: [EventStatus.PUBLISHED, EventStatus.SOLD_OUT] } },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      description: true,
      eventType: true,
      startAt: true,
      endAt: true,
      duration: true,
      capacity: true,
      reservedSeats: true,
      price: true,
      discountPrice: true,
      bookingDeadline: true,
      difficulty: true,
      meetingPoint: true,
      transport: true,
      accommodation: true,
      meals: true,
      travelTips: true,
      additionalInfo: true,
      status: true,
      seoTitle: true,
      seoDescription: true,
      coverMedia: { select: { secureUrl: true, url: true, altText: true } },
      destination: { select: { name: true, slug: true, country: true } },
      gallery: {
        select: { media: { select: { secureUrl: true, url: true, altText: true } } },
        orderBy: { sortOrder: 'asc' },
        take: 12,
      },
      itinerary: {
        select: { id: true, dayNumber: true, title: true, description: true },
        orderBy: [{ dayNumber: 'asc' }, { sortOrder: 'asc' }],
      },
      options: {
        where: { status: ContentStatus.PUBLISHED },
        select: { id: true, title: true, description: true, price: true },
        orderBy: { sortOrder: 'asc' },
      },
      policies: {
        select: { id: true, title: true, content: true },
        orderBy: { sortOrder: 'asc' },
      },
      eventActivities: {
        select: {
          activity: {
            select: { id: true, name: true, slug: true, duration: true, difficulty: true },
          },
        },
      },
    },
  }),
);

// --- Tours ------------------------------------------------------------------

const tourCardSelect = {
  id: true,
  title: true,
  slug: true,
  shortDescription: true,
  duration: true,
  durationDays: true,
  basePrice: true,
  discountPrice: true,
  difficulty: true,
  tourType: true,
  coverMedia: { select: { secureUrl: true, url: true, altText: true } },
  destination: { select: { name: true, slug: true } },
} satisfies Prisma.TourSelect;

export type TourCard = Prisma.TourGetPayload<{ select: typeof tourCardSelect }>;

export const getFeaturedTours = cache(
  async (limit = 6): Promise<TourCard[]> =>
    prisma.tour
      .findMany({
        where: { status: ContentStatus.PUBLISHED, featured: true },
        select: tourCardSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      .catch(() => []),
);

export async function listTours(options: {
  page?: number;
  destination?: string;
  query?: string;
  maxPrice?: number;
}): Promise<Paginated<TourCard>> {
  const page = options.page ?? 1;
  const where: Prisma.TourWhereInput = {
    status: ContentStatus.PUBLISHED,
    ...(options.destination ? { destination: { slug: options.destination } } : {}),
    ...(options.maxPrice ? { basePrice: { lte: options.maxPrice } } : {}),
    ...(options.query
      ? {
          OR: [
            { title: { contains: options.query, mode: 'insensitive' } },
            { shortDescription: { contains: options.query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.tour.findMany({
      where,
      select: tourCardSelect,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.tour.count({ where }),
  ]);

  return paginate(items, total, page, PAGE_SIZE);
}

export const getTourBySlug = cache(async (slug: string) =>
  prisma.tour.findFirst({
    where: { slug, status: ContentStatus.PUBLISHED },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      description: true,
      tourType: true,
      duration: true,
      durationDays: true,
      basePrice: true,
      discountPrice: true,
      highlights: true,
      inclusions: true,
      exclusions: true,
      accommodation: true,
      transport: true,
      policies: true,
      maxGroupSize: true,
      difficulty: true,
      seoTitle: true,
      seoDescription: true,
      coverMedia: { select: { secureUrl: true, url: true, altText: true } },
      destination: { select: { name: true, slug: true, country: true } },
      itinerary: {
        select: { id: true, dayNumber: true, title: true, description: true },
        orderBy: [{ dayNumber: 'asc' }, { sortOrder: 'asc' }],
      },
    },
  }),
);

// --- Activities -------------------------------------------------------------

const activityCardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  duration: true,
  price: true,
  difficulty: true,
  bookable: true,
  coverMedia: { select: { secureUrl: true, url: true, altText: true } },
  destination: { select: { name: true, slug: true } },
} satisfies Prisma.ActivitySelect;

export type ActivityCard = Prisma.ActivityGetPayload<{
  select: typeof activityCardSelect;
}>;

export const getTrendingActivities = cache(
  async (limit = 8): Promise<ActivityCard[]> =>
    prisma.activity
      .findMany({
        where: { status: ContentStatus.PUBLISHED, trending: true },
        select: activityCardSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      .catch(() => []),
);

export async function listActivities(options: {
  page?: number;
  destination?: string;
  query?: string;
}): Promise<Paginated<ActivityCard>> {
  const page = options.page ?? 1;
  const where: Prisma.ActivityWhereInput = {
    status: ContentStatus.PUBLISHED,
    ...(options.destination ? { destination: { slug: options.destination } } : {}),
    ...(options.query
      ? { name: { contains: options.query, mode: 'insensitive' } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      select: activityCardSelect,
      orderBy: [{ trending: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activity.count({ where }),
  ]);

  return paginate(items, total, page, PAGE_SIZE);
}

export const getActivityBySlug = cache(async (slug: string) =>
  prisma.activity.findFirst({
    where: { slug, status: ContentStatus.PUBLISHED },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      duration: true,
      price: true,
      difficulty: true,
      minAge: true,
      maxAge: true,
      included: true,
      excluded: true,
      safetyInfo: true,
      bookable: true,
      coverMedia: { select: { secureUrl: true, url: true, altText: true } },
      destination: { select: { name: true, slug: true } },
    },
  }),
);

// --- Stays ------------------------------------------------------------------

const stayCardSelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  shortDescription: true,
  address: true,
  coverMedia: { select: { secureUrl: true, url: true, altText: true } },
  destination: { select: { name: true, slug: true } },
  roomTypes: {
    where: { status: ContentStatus.PUBLISHED },
    select: { price: true, capacity: true },
    orderBy: { price: 'asc' as const },
    take: 1,
  },
} satisfies Prisma.AccommodationSelect;

export type StayCard = Prisma.AccommodationGetPayload<{
  select: typeof stayCardSelect;
}>;

export const getPopularStays = cache(
  async (limit = 6): Promise<StayCard[]> =>
    prisma.accommodation
      .findMany({
        where: { status: ContentStatus.PUBLISHED, featured: true },
        select: stayCardSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      .catch(() => []),
);

/**
 * Hotels and resorts specifically, for the home page's hotel strip.
 *
 * Returns an empty list when there are none, which is the signal the home page
 * uses to leave the whole section out rather than render a heading over
 * nothing. A section promising hotels above an empty row reads as a broken
 * page, not an empty one.
 */
export const getHotels = cache(
  async (limit = 6): Promise<StayCard[]> =>
    prisma.accommodation
      .findMany({
        where: {
          status: ContentStatus.PUBLISHED,
          type: { in: ['HOTEL', 'RESORT'] },
        },
        select: stayCardSelect,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      })
      .catch(() => []),
);

export async function listStays(options: {
  page?: number;
  destination?: string;
  type?: string;
  query?: string;
}): Promise<Paginated<StayCard>> {
  const page = options.page ?? 1;
  const where: Prisma.AccommodationWhereInput = {
    status: ContentStatus.PUBLISHED,
    ...(options.destination ? { destination: { slug: options.destination } } : {}),
    ...(options.type
      ? { type: options.type as Prisma.EnumAccommodationTypeFilter['equals'] }
      : {}),
    ...(options.query
      ? { name: { contains: options.query, mode: 'insensitive' } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.accommodation.findMany({
      where,
      select: stayCardSelect,
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.accommodation.count({ where }),
  ]);

  return paginate(items, total, page, PAGE_SIZE);
}

export const getStayBySlug = cache(async (slug: string) =>
  prisma.accommodation.findFirst({
    where: { slug, status: ContentStatus.PUBLISHED },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      address: true,
      shortDescription: true,
      description: true,
      amenities: true,
      rules: true,
      policies: true,
      checkInTime: true,
      checkOutTime: true,
      seoTitle: true,
      seoDescription: true,
      coverMedia: { select: { secureUrl: true, url: true, altText: true } },
      destination: { select: { name: true, slug: true } },
      roomTypes: {
        where: { status: ContentStatus.PUBLISHED },
        select: {
          id: true,
          name: true,
          description: true,
          capacity: true,
          price: true,
          totalUnits: true,
          amenities: true,
          coverMedia: { select: { secureUrl: true, url: true, altText: true } },
        },
        orderBy: { price: 'asc' },
      },
    },
  }),
);

// --- Visa -------------------------------------------------------------------

export const getVisaCountries = cache(async () =>
  prisma.visaCountry
    .findMany({
      where: { status: ContentStatus.PUBLISHED },
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
        description: true,
        flagMedia: { select: { secureUrl: true, url: true, altText: true } },
        visaTypes: {
          where: { status: ContentStatus.PUBLISHED },
          select: { id: true, name: true, slug: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    .catch(() => []),
);

export const getVisaCountry = cache(async (countrySlug: string) =>
  prisma.visaCountry.findFirst({
    where: { slug: countrySlug, status: ContentStatus.PUBLISHED },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      description: true,
      flagMedia: { select: { secureUrl: true, url: true, altText: true } },
      visaTypes: {
        where: { status: ContentStatus.PUBLISHED },
        select: {
          id: true,
          name: true,
          slug: true,
          title: true,
          summary: true,
          serviceFee: true,
          processingInfo: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  }),
);

export const getVisaType = cache(
  async (countrySlug: string, typeSlug: string) =>
    prisma.visaType.findFirst({
      where: {
        slug: typeSlug,
        status: ContentStatus.PUBLISHED,
        country: { slug: countrySlug, status: ContentStatus.PUBLISHED },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        title: true,
        summary: true,
        importantNotes: true,
        generalDocuments: true,
        businessOwnerDocuments: true,
        studentDocuments: true,
        otherApplicantDocuments: true,
        softCopyInstructions: true,
        hardCopyInstructions: true,
        processingInfo: true,
        additionalInfo: true,
        serviceFee: true,
        seoTitle: true,
        seoDescription: true,
        country: {
          select: {
            name: true,
            slug: true,
            flagMedia: { select: { secureUrl: true, url: true } },
          },
        },
      },
    }),
);

// --- Flights & trains (informational) ---------------------------------------

export async function searchFlights(params: {
  origin?: string;
  destination?: string;
  date?: string;
}) {
  if (!params.origin || !params.destination) return [];

  const routes = await prisma.flightRoute
    .findMany({
      where: {
        active: true,
        originIata: params.origin.toUpperCase(),
        destinationIata: params.destination.toUpperCase(),
      },
      select: {
        id: true,
        airline: true,
        flightNumber: true,
        originIata: true,
        destinationIata: true,
        departureTime: true,
        arrivalTime: true,
        durationMinutes: true,
        stops: true,
        baggage: true,
        indicativePrice: true,
        daysOfWeek: true,
        source: true,
        sourceUpdatedAt: true,
      },
      orderBy: { departureTime: 'asc' },
      take: 40,
    })
    .catch(() => []);

  if (!params.date) return routes;

  // Filter by weekday so a Friday-only route does not appear on a Tuesday.
  const parsed = new Date(params.date);
  if (Number.isNaN(parsed.getTime())) return routes;
  const isoWeekday = parsed.getUTCDay() === 0 ? 7 : parsed.getUTCDay();
  return routes.filter((route) =>
    route.daysOfWeek.split(',').includes(String(isoWeekday)),
  );
}

export const getAirports = cache(async () =>
  prisma.airport
    .findMany({
      where: { active: true },
      select: { iata: true, name: true, city: true, country: true },
      orderBy: { city: 'asc' },
    })
    .catch(() => []),
);

export async function searchTrains(params: {
  origin?: string;
  destination?: string;
}) {
  const where: Prisma.TrainScheduleWhereInput = {
    active: true,
    ...(params.origin
      ? { originStation: { contains: params.origin, mode: 'insensitive' } }
      : {}),
    ...(params.destination
      ? { destinationStation: { contains: params.destination, mode: 'insensitive' } }
      : {}),
  };

  return prisma.trainSchedule
    .findMany({
      where,
      select: {
        id: true,
        trainName: true,
        trainNumber: true,
        originStation: true,
        destinationStation: true,
        departureTime: true,
        arrivalTime: true,
        durationMinutes: true,
        offDay: true,
        routeStops: true,
        classesAvailable: true,
        source: true,
        sourceUpdatedAt: true,
      },
      orderBy: { departureTime: 'asc' },
      take: 60,
    })
    .catch(() => []);
}

export const getTrainStations = cache(async (): Promise<string[]> => {
  const rows = await prisma.trainSchedule
    .findMany({
      where: { active: true },
      select: { originStation: true, destinationStation: true },
    })
    .catch(() => []);
  const set = new Set<string>();
  for (const row of rows) {
    set.add(row.originStation);
    set.add(row.destinationStation);
  }
  return Array.from(set).sort();
});

// --- Content ----------------------------------------------------------------

export const getServices = cache(async () =>
  prisma.service
    .findMany({
      where: { status: ContentStatus.PUBLISHED },
      select: { id: true, title: true, slug: true, icon: true, summary: true, description: true },
      orderBy: { sortOrder: 'asc' },
    })
    .catch(() => []),
);

export const getApprovedReviews = cache(async (limit = 6) =>
  prisma.review
    .findMany({
      where: { status: ReviewStatus.APPROVED },
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        // Only the display name — never the reviewer's email or phone.
        user: { select: { name: true, image: true } },
        booking: { select: { productTitle: true } },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
    .catch(() => []),
);

/**
 * Approved reviews for one product, with its average rating.
 *
 * Only APPROVED reviews are ever returned, and only the reviewer's display
 * name — never their email. The average is computed over the same filtered set
 * that is shown, so the star rating on the page and the reviews under it can
 * never disagree.
 */
export const getProductReviews = cache(
  async (productType: ProductType, productId: string, limit = 12) => {
    const [reviews, aggregate] = await Promise.all([
      prisma.review
        .findMany({
          where: { status: ReviewStatus.APPROVED, productType, productId },
          select: {
            id: true,
            rating: true,
            title: true,
            body: true,
            createdAt: true,
            user: { select: { name: true, image: true } },
          },
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          take: limit,
        })
        .catch(() => []),
      prisma.review
        .aggregate({
          where: { status: ReviewStatus.APPROVED, productType, productId },
          _avg: { rating: true },
          _count: true,
        })
        .catch(() => null),
    ]);

    return {
      reviews,
      count: aggregate?._count ?? 0,
      average: aggregate?._avg.rating ?? 0,
    };
  },
);

export const getLegalPage = cache(async (slug: string) =>
  prisma.legalPage.findFirst({
    where: { slug, status: ContentStatus.PUBLISHED },
    select: { title: true, body: true, updatedAt: true },
  }),
);

export const getFaqItems = cache(async () =>
  prisma.faqItem
    .findMany({
      where: { status: ContentStatus.PUBLISHED },
      select: { id: true, question: true, answer: true, category: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })
    .catch(() => []),
);

export const getActiveNotices = cache(async () => {
  const now = new Date();
  return prisma.notice
    .findMany({
      where: {
        active: true,
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      select: { id: true, title: true, message: true, type: true, ctaText: true, ctaUrl: true },
      orderBy: { priority: 'desc' },
      take: 3,
    })
    .catch(() => []);
});

export const getActiveAds = cache(async (placement: string) => {
  const now = new Date();
  return prisma.advertisement
    .findMany({
      where: {
        active: true,
        placement: placement as Prisma.EnumAdPlacementFilter['equals'],
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        ctaText: true,
        ctaUrl: true,
        // The cap travels with the creative so the slot can enforce it without
        // a second round trip.
        frequency: true,
        frequencyWindow: true,
        media: { select: { secureUrl: true, url: true, altText: true } },
      },
      orderBy: { priority: 'desc' },
      take: 2,
    })
    .catch(() => []);
});

export const getHomeSections = cache(async () => {
  const rows = await prisma.homeSection
    .findMany({
      where: { enabled: true },
      select: { key: true, title: true, subtitle: true, body: true, config: true },
      orderBy: { sortOrder: 'asc' },
    })
    .catch(() => []);
  return new Map(rows.map((row) => [row.key, row]));
});

/**
 * Slides for the home page banner, filtered to those actually live right now.
 *
 * The schedule is applied here rather than in the browser so an expired slide
 * is never sent to the page at all — a slide that flashes up and then vanishes
 * on hydration is worse than one that never appeared.
 */
export const getHeroSlides = cache(async () => {
  const now = new Date();
  return prisma.heroSlide
    .findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      select: {
        id: true,
        title: true,
        subtitle: true,
        body: true,
        overlayOpacity: true,
        textAlign: true,
        primaryCtaText: true,
        primaryCtaUrl: true,
        secondaryCtaText: true,
        secondaryCtaUrl: true,
        showSearch: true,
        media: { select: { url: true, secureUrl: true, altText: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 8,
    })
    .catch(() => []);
});

/** Headline counters for the homepage "why us" band. */
export const getPlatformStats = cache(async () => {
  try {
    const [destinations, events, tours, travellers] = await Promise.all([
      prisma.destination.count({ where: { status: ContentStatus.PUBLISHED } }),
      prisma.event.count({ where: { status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] } } }),
      prisma.tour.count({ where: { status: ContentStatus.PUBLISHED } }),
      prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
    ]);
    return { destinations, events, tours, travellers };
  } catch {
    return { destinations: 0, events: 0, tours: 0, travellers: 0 };
  }
});
