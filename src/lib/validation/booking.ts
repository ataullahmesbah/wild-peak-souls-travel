import { z } from 'zod';

import {
  cuidSchema,
  emailSchema,
  nameSchema,
  optionalText,
  phoneSchema,
} from '@/lib/validation/common';

/**
 * Note what the client is NOT allowed to send: unit price, discount, subtotal
 * or total. Every monetary value is recomputed server-side from the catalogue.
 */
export const createEventBookingSchema = z.object({
  eventId: cuidSchema,
  quantity: z.coerce.number().int().min(1, 'At least one seat').max(20),
  optionIds: z.array(cuidSchema).max(10).optional().default([]),
  contactName: nameSchema,
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  notes: optionalText(1000),
  acceptTerms: z
    .boolean()
    .refine((v) => v === true, 'You must accept the booking terms'),
});

export const createTourBookingSchema = z.object({
  tourId: cuidSchema,
  startDate: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Choose a valid start date'),
  travelers: z.coerce.number().int().min(1).max(40),
  contactName: nameSchema,
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  notes: optionalText(1000),
  acceptTerms: z.boolean().refine((v) => v === true, 'You must accept the booking terms'),
});

export const createActivityBookingSchema = z.object({
  activityId: cuidSchema,
  startDate: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Choose a valid date'),
  quantity: z.coerce.number().int().min(1).max(30),
  contactName: nameSchema,
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  notes: optionalText(1000),
  acceptTerms: z.boolean().refine((v) => v === true, 'You must accept the booking terms'),
});

export const createStayBookingSchema = z
  .object({
    roomTypeId: cuidSchema,
    checkIn: z.string().trim().refine((v) => !Number.isNaN(Date.parse(v)), 'Choose a check-in date'),
    checkOut: z.string().trim().refine((v) => !Number.isNaN(Date.parse(v)), 'Choose a check-out date'),
    units: z.coerce.number().int().min(1).max(10),
    guests: z.coerce.number().int().min(1).max(30),
    contactName: nameSchema,
    contactEmail: emailSchema,
    contactPhone: phoneSchema,
    notes: optionalText(1000),
    acceptTerms: z.boolean().refine((v) => v === true, 'You must accept the booking terms'),
  })
  .refine((d) => Date.parse(d.checkOut) > Date.parse(d.checkIn), {
    message: 'Check-out must be after check-in',
    path: ['checkOut'],
  });

export const submitPaymentSchema = z.object({
  bookingId: cuidSchema,
  method: z.enum(['BKASH', 'NAGAD', 'SSLCOMMERZ', 'BANK_TRANSFER', 'CASH']),
  senderNumber: z.string().trim().min(6).max(20).optional(),
  transactionId: z
    .string()
    .trim()
    .min(4, 'Enter the transaction ID from your payment app')
    .max(64),
});

export const verifyPaymentSchema = z.object({
  paymentId: cuidSchema,
  decision: z.enum(['VERIFY', 'REJECT']),
  note: optionalText(500),
});

export const updateBookingStatusSchema = z.object({
  bookingId: cuidSchema,
  status: z.enum([
    'PENDING',
    'PAYMENT_PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED',
    'EXPIRED',
  ]),
  reason: optionalText(500),
});

export const cancelBookingSchema = z.object({
  bookingId: cuidSchema,
  reason: z.string().trim().min(5, 'Tell us why you are cancelling').max(500),
});
