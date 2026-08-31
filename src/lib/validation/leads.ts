import { z } from 'zod';

import {
  cuidSchema,
  emailSchema,
  nameSchema,
  optionalText,
  phoneSchema,
  requiredText,
} from '@/lib/validation/common';

export const contactRequestSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  subject: optionalText(150),
  description: requiredText(10, 3000),
  // Honeypot: bots fill hidden fields, humans leave them empty.
  website: z.string().max(0).optional().or(z.literal('')),
});

export const visaRequestSchema = z.object({
  visaTypeId: cuidSchema.optional(),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  nationality: z.string().trim().min(2, 'Nationality is required').max(80),
  message: optionalText(1500),
  website: z.string().max(0).optional().or(z.literal('')),
});

export const customTourRequestSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  destination: optionalText(150),
  preferredDate: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Enter a valid date'),
  travelers: z.coerce.number().int().min(1).max(200).default(1),
  budget: optionalText(80),
  duration: optionalText(80),
  travelStyle: optionalText(120),
  accommodationPreference: optionalText(120),
  activities: optionalText(500),
  transport: optionalText(120),
  notes: optionalText(2000),
  website: z.string().max(0).optional().or(z.literal('')),
});

export const flightInquirySchema = z.object({
  airline: optionalText(100),
  flightNumber: optionalText(20),
  origin: z.string().trim().min(2, 'Select an origin').max(80),
  destination: z.string().trim().min(2, 'Select a destination').max(80),
  departureDate: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Enter a valid date'),
  passengers: z.coerce.number().int().min(1).max(20).default(1),
  // Price is informational only and is re-labelled as indicative on save.
  displayedPrice: z.coerce.number().min(0).max(10_000_000).optional(),
  source: optionalText(80),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  message: optionalText(1500),
  website: z.string().max(0).optional().or(z.literal('')),
});

export const supportTokenSchema = z.object({
  subject: z.string().trim().min(5, 'Give your request a short subject').max(150),
  description: requiredText(15, 4000),
  category: z
    .enum(['GENERAL', 'BOOKING', 'PAYMENT', 'VISA', 'TECHNICAL', 'COMPLAINT'])
    .default('GENERAL'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

export const supportMessageSchema = z.object({
  tokenId: cuidSchema,
  body: requiredText(1, 4000),
  internal: z.boolean().optional().default(false),
});

export const reviewSchema = z.object({
  bookingId: cuidSchema,
  rating: z.coerce.number().int().min(1, 'Choose a rating').max(5),
  title: optionalText(120),
  body: requiredText(10, 3000),
});

export const newsletterSchema = z.object({
  email: emailSchema,
  website: z.string().max(0).optional().or(z.literal('')),
});

export const wishlistToggleSchema = z.object({
  itemType: z.enum(['DESTINATION', 'EVENT', 'TOUR', 'ACTIVITY', 'ACCOMMODATION']),
  itemId: cuidSchema,
});
