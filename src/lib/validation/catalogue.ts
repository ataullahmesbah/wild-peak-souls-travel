import { z } from 'zod';

import {
  cuidSchema,
  optionalText,
  partialForUpdate,
  slugSchema,
} from '@/lib/validation/common';

/**
 * Write schemas for every catalogue module.
 *
 * Two rules run through all of them:
 *  - Engine-owned fields (reservedSeats, bookedUnits, usedCount) never appear.
 *    They belong to the booking engine; a form must not be able to set them.
 *  - Money is `coerce.number` with a floor of 0, so a negative price cannot be
 *    posted to create a credit.
 */

const money = z.coerce.number().min(0).max(100_000_000);
const optionalMoney = z.coerce.number().min(0).max(100_000_000).optional().nullable();

const contentStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const eventStatus = z.enum([
  'DRAFT',
  'PUBLISHED',
  'SOLD_OUT',
  'CANCELLED',
  'COMPLETED',
  'ARCHIVED',
]);
const difficulty = z.enum(['EASY', 'MODERATE', 'CHALLENGING', 'EXTREME']);

const seo = {
  seoTitle: optionalText(160),
  seoDescription: optionalText(300),
};

// --- Destinations -----------------------------------------------------------

export const destinationCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  country: z.string().trim().min(2).max(80).default('Bangladesh'),
  region: optionalText(120),
  shortDescription: optionalText(400),
  description: optionalText(20_000),
  bestTimeToVisit: optionalText(500),
  travelTips: optionalText(4000),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  coverMediaId: cuidSchema.optional().nullable(),
  featured: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: contentStatus.default('DRAFT'),
  ...seo,
});
export const destinationUpdateSchema = partialForUpdate(destinationCreateSchema);

// --- Events -----------------------------------------------------------------

const itineraryDay = z.object({
  dayNumber: z.coerce.number().int().min(1).max(365),
  title: z.string().trim().min(1).max(200),
  description: optionalText(4000),
});

const eventOption = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(1000),
  price: money.default(0),
});

const eventPolicy = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(4000),
});

export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    slug: slugSchema,
    shortDescription: optionalText(400),
    description: optionalText(20_000),
    destinationId: cuidSchema.optional().nullable(),
    eventType: optionalText(80),
    coverMediaId: cuidSchema.optional().nullable(),
    startAt: z.string().trim().refine((v) => !Number.isNaN(Date.parse(v)), 'Choose a start date'),
    endAt: z.string().trim().refine((v) => !Number.isNaN(Date.parse(v)), 'Choose an end date'),
    duration: optionalText(80),
    // reservedSeats is deliberately absent — the booking engine owns it.
    capacity: z.coerce.number().int().min(0).max(10_000),
    price: money,
    discountPrice: optionalMoney,
    bookingDeadline: z.string().trim().optional().nullable(),
    difficulty: difficulty.default('MODERATE'),
    meetingPoint: optionalText(500),
    transport: optionalText(500),
    accommodation: optionalText(500),
    meals: optionalText(500),
    travelTips: optionalText(4000),
    additionalInfo: optionalText(4000),
    featured: z.coerce.boolean().default(false),
    status: eventStatus.default('DRAFT'),
    itinerary: z.array(itineraryDay).max(60).default([]),
    options: z.array(eventOption).max(30).default([]),
    policies: z.array(eventPolicy).max(30).default([]),
    activityIds: z.array(cuidSchema).max(50).default([]),
    galleryMediaIds: z.array(cuidSchema).max(30).default([]),
    ...seo,
  })
  .refine((d) => Date.parse(d.endAt) >= Date.parse(d.startAt), {
    message: 'The end date must be on or after the start date',
    path: ['endAt'],
  })
  .refine(
    (d) => !d.discountPrice || d.discountPrice <= d.price,
    { message: 'The discount price cannot exceed the regular price', path: ['discountPrice'] },
  );

export const eventUpdateSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  slug: slugSchema.optional(),
  shortDescription: optionalText(400),
  description: optionalText(20_000),
  destinationId: cuidSchema.optional().nullable(),
  eventType: optionalText(80),
  coverMediaId: cuidSchema.optional().nullable(),
  startAt: z.string().trim().optional(),
  endAt: z.string().trim().optional(),
  duration: optionalText(80),
  capacity: z.coerce.number().int().min(0).max(10_000).optional(),
  price: money.optional(),
  discountPrice: optionalMoney,
  bookingDeadline: z.string().trim().optional().nullable(),
  difficulty: difficulty.optional(),
  meetingPoint: optionalText(500),
  transport: optionalText(500),
  accommodation: optionalText(500),
  meals: optionalText(500),
  travelTips: optionalText(4000),
  additionalInfo: optionalText(4000),
  featured: z.coerce.boolean().optional(),
  status: eventStatus.optional(),
  itinerary: z.array(itineraryDay).max(60).optional(),
  options: z.array(eventOption).max(30).optional(),
  policies: z.array(eventPolicy).max(30).optional(),
  activityIds: z.array(cuidSchema).max(50).optional(),
  galleryMediaIds: z.array(cuidSchema).max(30).optional(),
  ...seo,
});

// --- Tours ------------------------------------------------------------------

export const tourCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slugSchema,
  shortDescription: optionalText(400),
  description: optionalText(20_000),
  destinationId: cuidSchema.optional().nullable(),
  tourType: z.enum(['FIXED_DATE', 'FLEXIBLE_DATE', 'CUSTOMIZABLE']).default('FLEXIBLE_DATE'),
  coverMediaId: cuidSchema.optional().nullable(),
  duration: optionalText(80),
  durationDays: z.coerce.number().int().min(1).max(365).default(1),
  basePrice: money,
  discountPrice: optionalMoney,
  highlights: optionalText(4000),
  inclusions: optionalText(4000),
  exclusions: optionalText(4000),
  accommodation: optionalText(1000),
  transport: optionalText(1000),
  policies: optionalText(8000),
  maxGroupSize: z.coerce.number().int().min(1).max(500).default(20),
  difficulty: difficulty.default('EASY'),
  featured: z.coerce.boolean().default(false),
  status: contentStatus.default('DRAFT'),
  itinerary: z.array(itineraryDay).max(60).default([]),
  ...seo,
});
export const tourUpdateSchema = partialForUpdate(tourCreateSchema);

// --- Activities -------------------------------------------------------------

export const activityCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: slugSchema,
  destinationId: cuidSchema.optional().nullable(),
  coverMediaId: cuidSchema.optional().nullable(),
  shortDescription: optionalText(400),
  description: optionalText(20_000),
  duration: optionalText(80),
  price: money.default(0),
  difficulty: difficulty.default('EASY'),
  minAge: z.coerce.number().int().min(0).max(120).optional().nullable(),
  maxAge: z.coerce.number().int().min(0).max(120).optional().nullable(),
  included: optionalText(4000),
  excluded: optionalText(4000),
  safetyInfo: optionalText(4000),
  bookable: z.coerce.boolean().default(false),
  trending: z.coerce.boolean().default(false),
  status: contentStatus.default('DRAFT'),
});
export const activityUpdateSchema = partialForUpdate(activityCreateSchema);

// --- Stays and hotels -------------------------------------------------------

const roomType = z.object({
  id: cuidSchema.optional(),
  name: z.string().trim().min(1).max(160),
  description: optionalText(2000),
  capacity: z.coerce.number().int().min(1).max(30).default(2),
  price: money,
  totalUnits: z.coerce.number().int().min(1).max(500).default(1),
  amenities: optionalText(2000),
  coverMediaId: cuidSchema.optional().nullable(),
  status: contentStatus.default('PUBLISHED'),
});

export const stayCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: slugSchema,
  type: z
    .enum([
      'HOTEL', 'RESORT', 'HOMESTAY', 'TREEHOUSE', 'COTTAGE',
      'VILLA', 'HOSTEL', 'GUEST_HOUSE', 'CAMP',
    ])
    .default('HOTEL'),
  destinationId: cuidSchema.optional().nullable(),
  coverMediaId: cuidSchema.optional().nullable(),
  address: optionalText(500),
  shortDescription: optionalText(400),
  description: optionalText(20_000),
  amenities: optionalText(4000),
  rules: optionalText(4000),
  policies: optionalText(8000),
  checkInTime: z.string().trim().max(10).default('14:00'),
  checkOutTime: z.string().trim().max(10).default('12:00'),
  featured: z.coerce.boolean().default(false),
  status: contentStatus.default('DRAFT'),
  roomTypes: z.array(roomType).max(40).default([]),
  ...seo,
});
export const stayUpdateSchema = partialForUpdate(stayCreateSchema);

// --- Visa -------------------------------------------------------------------

export const visaCountryCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  code: z.string().trim().max(4).optional().nullable(),
  description: optionalText(2000),
  flagMediaId: cuidSchema.optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: contentStatus.default('PUBLISHED'),
});
export const visaCountryUpdateSchema = partialForUpdate(visaCountryCreateSchema);

export const visaTypeCreateSchema = z.object({
  countryId: cuidSchema,
  name: z.string().trim().min(2).max(160),
  slug: slugSchema,
  title: optionalText(200),
  summary: optionalText(8000),
  importantNotes: optionalText(8000),
  generalDocuments: optionalText(8000),
  businessOwnerDocuments: optionalText(8000),
  studentDocuments: optionalText(8000),
  otherApplicantDocuments: optionalText(8000),
  softCopyInstructions: optionalText(4000),
  hardCopyInstructions: optionalText(4000),
  processingInfo: optionalText(4000),
  additionalInfo: optionalText(4000),
  serviceFee: optionalMoney,
  status: contentStatus.default('PUBLISHED'),
  ...seo,
});
export const visaTypeUpdateSchema = partialForUpdate(visaTypeCreateSchema);

// --- Marketing --------------------------------------------------------------

export const noticeCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  message: z.string().trim().min(2).max(1000),
  type: z.enum(['INFO', 'WARNING', 'SUCCESS', 'IMPORTANT', 'MAINTENANCE']).default('INFO'),
  ctaText: optionalText(60),
  ctaUrl: optionalText(500),
  startAt: z.string().trim().optional().nullable(),
  endAt: z.string().trim().optional().nullable(),
  priority: z.coerce.number().int().min(0).max(100).default(0),
  active: z.coerce.boolean().default(true),
});
export const noticeUpdateSchema = partialForUpdate(noticeCreateSchema);

export const adCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: optionalText(1000),
  mediaId: cuidSchema.optional().nullable(),
  imageUrl: optionalText(500),
  ctaText: optionalText(60),
  ctaUrl: optionalText(500),
  placement: z
    .enum(['HOME_BILLBOARD', 'HOME_MODAL', 'SIDEBAR', 'FOOTER', 'LISTING_BANNER'])
    .default('HOME_BILLBOARD'),
  // Frequency capping — how often one viewer may see this creative.
  frequency: z.coerce.number().int().min(0).max(100).default(1),
  frequencyWindow: z.enum(['SESSION', 'DAY', 'WEEK', 'EVER']).default('SESSION'),
  priority: z.coerce.number().int().min(0).max(100).default(0),
  startAt: z.string().trim().optional().nullable(),
  endAt: z.string().trim().optional().nullable(),
  active: z.coerce.boolean().default(true),
});
export const adUpdateSchema = partialForUpdate(adCreateSchema);

// --- Transport --------------------------------------------------------------

export const flightRouteCreateSchema = z.object({
  airline: z.string().trim().min(2).max(120),
  flightNumber: z.string().trim().min(2).max(20),
  originIata: z.string().trim().length(3).toUpperCase(),
  destinationIata: z.string().trim().length(3).toUpperCase(),
  departureTime: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  arrivalTime: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  durationMinutes: z.coerce.number().int().min(1).max(2000),
  stops: z.coerce.number().int().min(0).max(5).default(0),
  daysOfWeek: z.string().trim().max(20).default('1,2,3,4,5,6,7'),
  baggage: optionalText(200),
  indicativePrice: optionalMoney,
  active: z.coerce.boolean().default(true),
});
export const flightRouteUpdateSchema = partialForUpdate(flightRouteCreateSchema);

export const trainScheduleCreateSchema = z.object({
  trainName: z.string().trim().min(2).max(160),
  trainNumber: optionalText(20),
  originStation: z.string().trim().min(2).max(120),
  destinationStation: z.string().trim().min(2).max(120),
  departureTime: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  arrivalTime: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  durationMinutes: z.coerce.number().int().min(1).max(3000).optional().nullable(),
  offDay: optionalText(40),
  routeStops: optionalText(1000),
  classesAvailable: optionalText(200),
  active: z.coerce.boolean().default(true),
});
export const trainScheduleUpdateSchema = partialForUpdate(trainScheduleCreateSchema);

// --- Hero -------------------------------------------------------------------

export const heroSlideCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  subtitle: optionalText(300),
  body: optionalText(1000),
  mediaId: cuidSchema.optional().nullable(),
  overlayOpacity: z.coerce.number().int().min(0).max(90).default(40),
  textAlign: z.enum(['left', 'center', 'right']).default('center'),
  primaryCtaText: optionalText(60),
  primaryCtaUrl: optionalText(500),
  secondaryCtaText: optionalText(60),
  secondaryCtaUrl: optionalText(500),
  showSearch: z.coerce.boolean().default(true),
  startAt: z.string().trim().optional().nullable(),
  endAt: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.coerce.boolean().default(true),
});
export const heroSlideUpdateSchema = partialForUpdate(heroSlideCreateSchema);
