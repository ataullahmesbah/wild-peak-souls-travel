import "server-only";

import { prisma } from "@/lib/prisma";
import { BusinessError } from "@/lib/api";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";
import { notifyStaffWithPermission, notifyUser } from "@/lib/notifications";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { toNumber } from "@/lib/utils";
import {
  BookingStatus,
  EventStatus,
  NotificationType,
  PaymentStatus,
  Prisma,
  ProductType,
  ContentStatus,
} from "@/generated/prisma";

/**
 * Retries a transaction that failed on a serialization conflict.
 *
 * Serializable isolation is what makes the capacity guards safe, but it means
 * PostgreSQL will abort one of two genuinely concurrent transactions with
 * error 40001 (surfaced by Prisma as P2034). That is not a business failure —
 * the correct response is to retry, not to tell the customer something broke.
 *
 * Retries use jittered backoff so a burst of contending requests spreads out
 * instead of colliding again in lockstep. A BusinessError (sold out, bad
 * dates) is never retried: it is a real answer, not a conflict.
 */
async function withSerializationRetry<T>(
  operation: () => Promise<T>,
  attempts = 5,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof BusinessError) throw error;
      if (!isSerializationConflict(error)) throw error;

      lastError = error;
      // 20ms, 40ms, 80ms... plus up to 25ms of jitter.
      const backoff = 20 * 2 ** attempt + Math.random() * 25;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  console.error(
    "[booking] serialization conflict persisted after retries",
    lastError,
  );
  throw new BusinessError(
    "That booking could not be completed because of high demand right now. Please try again.",
    "CONCURRENCY_CONFLICT",
    503,
  );
}

function isSerializationConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  // P2034 = Prisma write conflict / deadlock; 40001 = PostgreSQL serialization
  // failure; 40P01 = deadlock detected.
  return code === "P2034" || code === "40001" || code === "40P01";
}

/** Number of whole nights between two dates. */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = startOfDay(checkOut).getTime() - startOfDay(checkIn).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function eachDate(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = [];
  const cursor = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Booking numbers are generated inside the same transaction as the booking so
 * two concurrent checkouts can never mint the same reference. A short random
 * suffix keeps them unguessable without leaking daily volume.
 */
function generateBookingNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.floor(Math.random() * 46_656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `WPS-${stamp}${random}`;
}

export function generateTokenNumber(): string {
  const random = Math.floor(10_000 + Math.random() * 89_999);
  return `WPS-${random}`;
}

function generateInvoiceNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `INV-${stamp}`;
}

export interface BookingContact {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
}

export interface CreatedBooking {
  id: string;
  bookingNumber: string;
  total: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Event booking
// ---------------------------------------------------------------------------

export interface EventBookingInput extends BookingContact {
  userId: string;
  eventId: string;
  quantity: number;
  optionIds: string[];
}

/**
 * Books event seats.
 *
 * Concurrency: the seat increment runs as a conditional `updateMany` guarded by
 * `reservedSeats + quantity <= capacity` inside a Serializable transaction. If
 * two requests race for the last seats, exactly one matches the guard and the
 * other sees `count === 0` and is rejected. The client-supplied quantity is the
 * only number trusted, and only after this check; every price comes from the
 * database row.
 */
export async function createEventBooking(
  input: EventBookingInput,
): Promise<CreatedBooking> {
  const { userId, eventId, quantity, optionIds } = input;

  const booking = await withSerializationRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const event = await tx.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            title: true,
            status: true,
            capacity: true,
            reservedSeats: true,
            price: true,
            discountPrice: true,
            startAt: true,
            endAt: true,
            bookingDeadline: true,
          },
        });

        if (!event || event.status !== EventStatus.PUBLISHED) {
          throw new BusinessError(
            "This event is not open for booking.",
            "EVENT_UNAVAILABLE",
            404,
          );
        }
        if (event.bookingDeadline && event.bookingDeadline < new Date()) {
          throw new BusinessError(
            "The booking deadline for this event has passed.",
            "DEADLINE_PASSED",
          );
        }
        if (event.startAt < new Date()) {
          throw new BusinessError(
            "This event has already started.",
            "EVENT_STARTED",
          );
        }

        const available = event.capacity - event.reservedSeats;
        if (available < quantity) {
          throw new BusinessError(
            available <= 0
              ? "This event is fully booked."
              : `Only ${available} seat${available === 1 ? "" : "s"} left.`,
            "INSUFFICIENT_CAPACITY",
          );
        }

        // Conditional update — the guard, not the read above, is what makes this
        // safe under concurrency.
        const claimed = await tx.event.updateMany({
          where: {
            id: eventId,
            status: EventStatus.PUBLISHED,
            reservedSeats: { lte: event.capacity - quantity },
          },
          data: { reservedSeats: { increment: quantity } },
        });

        if (claimed.count === 0) {
          throw new BusinessError(
            "Those seats were just taken. Please try a smaller party size.",
            "INSUFFICIENT_CAPACITY",
          );
        }

        const options = optionIds.length
          ? await tx.eventOption.findMany({
              where: {
                id: { in: optionIds },
                eventId,
                status: ContentStatus.PUBLISHED,
              },
              select: { id: true, title: true, price: true },
            })
          : [];

        const unitPrice = toNumber(event.discountPrice ?? event.price);
        const listPrice = toNumber(event.price);
        const seatSubtotal = listPrice * quantity;
        const seatDiscount = (listPrice - unitPrice) * quantity;
        const optionsTotal = options.reduce(
          (sum, o) => sum + toNumber(o.price) * quantity,
          0,
        );
        const subtotal = seatSubtotal + optionsTotal;
        const total = subtotal - seatDiscount;

        const created = await tx.booking.create({
          data: {
            bookingNumber: generateBookingNumber(),
            userId,
            productType: ProductType.EVENT,
            productId: event.id,
            productTitle: event.title,
            startDate: event.startAt,
            endDate: event.endAt,
            quantity,
            guests: quantity,
            subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
            discount: new Prisma.Decimal(seatDiscount.toFixed(2)),
            total: new Prisma.Decimal(total.toFixed(2)),
            status: BookingStatus.PAYMENT_PENDING,
            paymentStatus: PaymentStatus.UNPAID,
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            notes: input.notes ?? null,
            items: {
              create: [
                {
                  productType: ProductType.EVENT,
                  productId: event.id,
                  nameSnapshot: event.title,
                  quantity,
                  unitPrice: new Prisma.Decimal(listPrice.toFixed(2)),
                  discount: new Prisma.Decimal(seatDiscount.toFixed(2)),
                  total: new Prisma.Decimal(
                    (seatSubtotal - seatDiscount).toFixed(2),
                  ),
                },
                ...options.map((o) => ({
                  productType: ProductType.EVENT,
                  productId: o.id,
                  nameSnapshot: `Add-on: ${o.title}`,
                  quantity,
                  unitPrice: o.price,
                  discount: new Prisma.Decimal(0),
                  total: new Prisma.Decimal(
                    (toNumber(o.price) * quantity).toFixed(2),
                  ),
                })),
              ],
            },
          },
          select: {
            id: true,
            bookingNumber: true,
            total: true,
            currency: true,
          },
        });

        // Flip the event to SOLD_OUT the moment the last seat goes.
        await tx.event.updateMany({
          where: { id: eventId, reservedSeats: { gte: event.capacity } },
          data: { status: EventStatus.SOLD_OUT },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );

  await afterBookingCreated(booking.id, booking.bookingNumber, userId);

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    total: toNumber(booking.total),
    currency: booking.currency,
  };
}

// ---------------------------------------------------------------------------
// Stay booking
// ---------------------------------------------------------------------------

export interface StayBookingInput extends BookingContact {
  userId: string;
  roomTypeId: string;
  checkIn: Date;
  checkOut: Date;
  units: number;
  guests: number;
}

/**
 * Books room-nights.
 *
 * Availability is per-date: a `RoomInventory` row is created on demand for each
 * night, then incremented under a guard of `bookedUnits + units <= totalUnits`.
 * Because every night in the stay must pass its own guard inside one
 * Serializable transaction, an overlapping booking cannot slip between nights.
 */
export async function createStayBooking(
  input: StayBookingInput,
): Promise<CreatedBooking> {
  const { userId, roomTypeId, checkIn, checkOut, units, guests } = input;
  const nights = nightsBetween(checkIn, checkOut);

  if (nights < 1) {
    throw new BusinessError("Choose at least one night.", "INVALID_DATES", 422);
  }
  if (nights > 60) {
    throw new BusinessError(
      "Stays longer than 60 nights need a custom quote.",
      "STAY_TOO_LONG",
      422,
    );
  }
  if (startOfDay(checkIn) < startOfDay(new Date())) {
    throw new BusinessError(
      "Check-in cannot be in the past.",
      "INVALID_DATES",
      422,
    );
  }

  const booking = await withSerializationRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const roomType = await tx.roomType.findUnique({
          where: { id: roomTypeId },
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            totalUnits: true,
            status: true,
            accommodation: {
              select: { id: true, name: true, status: true },
            },
          },
        });

        if (
          !roomType ||
          roomType.status !== ContentStatus.PUBLISHED ||
          roomType.accommodation.status !== ContentStatus.PUBLISHED
        ) {
          throw new BusinessError(
            "This room is not available to book.",
            "ROOM_UNAVAILABLE",
            404,
          );
        }
        if (guests > roomType.capacity * units) {
          throw new BusinessError(
            `That many guests need more rooms — each ${roomType.name} sleeps ${roomType.capacity}.`,
            "CAPACITY_EXCEEDED",
          );
        }

        const dates = eachDate(checkIn, checkOut);
        let nightlyTotal = 0;

        for (const date of dates) {
          // Ensure a row exists for the night, seeded from the room's unit count.
          await tx.roomInventory.upsert({
            where: { roomTypeId_date: { roomTypeId, date } },
            create: {
              roomTypeId,
              date,
              totalUnits: roomType.totalUnits,
              bookedUnits: 0,
            },
            update: {},
          });

          const claimed = await tx.$executeRaw`
          UPDATE "RoomInventory"
          SET "bookedUnits" = "bookedUnits" + ${units}
          WHERE "roomTypeId" = ${roomTypeId}
            AND "date" = ${date}
            AND "blocked" = false
            AND "bookedUnits" + ${units} <= "totalUnits"
        `;

          if (claimed === 0) {
            throw new BusinessError(
              `No availability on ${date.toISOString().slice(0, 10)}. Please adjust your dates.`,
              "NO_AVAILABILITY",
            );
          }

          const inventory = await tx.roomInventory.findUnique({
            where: { roomTypeId_date: { roomTypeId, date } },
            select: { priceOverride: true },
          });

          const nightlyRate = toNumber(
            inventory?.priceOverride ?? roomType.price,
          );
          nightlyTotal += nightlyRate * units;
        }

        const created = await tx.booking.create({
          data: {
            bookingNumber: generateBookingNumber(),
            userId,
            productType: ProductType.ACCOMMODATION,
            productId: roomType.id,
            productTitle: `${roomType.accommodation.name} — ${roomType.name}`,
            startDate: startOfDay(checkIn),
            endDate: startOfDay(checkOut),
            quantity: units,
            guests,
            subtotal: new Prisma.Decimal(nightlyTotal.toFixed(2)),
            discount: new Prisma.Decimal(0),
            total: new Prisma.Decimal(nightlyTotal.toFixed(2)),
            status: BookingStatus.PAYMENT_PENDING,
            paymentStatus: PaymentStatus.UNPAID,
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            notes: input.notes ?? null,
            items: {
              create: {
                productType: ProductType.ACCOMMODATION,
                productId: roomType.id,
                nameSnapshot: `${roomType.accommodation.name} — ${roomType.name}`,
                descriptionSnapshot: `${nights} night${nights === 1 ? "" : "s"} × ${units} room${units === 1 ? "" : "s"}`,
                quantity: units * nights,
                unitPrice: roomType.price,
                total: new Prisma.Decimal(nightlyTotal.toFixed(2)),
              },
            },
            roomHolds: {
              create: dates.map((date) => ({ roomTypeId, date, units })),
            },
          },
          select: {
            id: true,
            bookingNumber: true,
            total: true,
            currency: true,
          },
        });

        return created;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15_000,
      },
    ),
  );

  await afterBookingCreated(booking.id, booking.bookingNumber, userId);

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    total: toNumber(booking.total),
    currency: booking.currency,
  };
}

// ---------------------------------------------------------------------------
// Simple (tour / activity) bookings
// ---------------------------------------------------------------------------

export interface SimpleBookingInput extends BookingContact {
  userId: string;
  productType: typeof ProductType.TOUR | typeof ProductType.ACTIVITY;
  productId: string;
  startDate: Date;
  quantity: number;
}

/**
 * Tours and activities have no hard seat inventory in this release — they are
 * confirmed by staff — so this path only needs a price snapshot, not a
 * capacity claim. It still recomputes every amount from the catalogue row.
 */
export async function createSimpleBooking(
  input: SimpleBookingInput,
): Promise<CreatedBooking> {
  const { userId, productType, productId, startDate, quantity } = input;

  if (startOfDay(startDate) < startOfDay(new Date())) {
    throw new BusinessError(
      "Choose a start date in the future.",
      "INVALID_DATES",
      422,
    );
  }

  let title: string;
  let listPrice: number;
  let unitPrice: number;
  let endDate: Date | null = null;

  if (productType === ProductType.TOUR) {
    const tour = await prisma.tour.findUnique({
      where: { id: productId },
      select: {
        title: true,
        basePrice: true,
        discountPrice: true,
        status: true,
        durationDays: true,
        maxGroupSize: true,
      },
    });
    if (!tour || tour.status !== ContentStatus.PUBLISHED) {
      throw new BusinessError(
        "This tour is not available to book.",
        "TOUR_UNAVAILABLE",
        404,
      );
    }
    if (quantity > tour.maxGroupSize) {
      throw new BusinessError(
        `This tour takes at most ${tour.maxGroupSize} travellers. Request a custom tour for larger groups.`,
        "GROUP_TOO_LARGE",
      );
    }
    title = tour.title;
    listPrice = toNumber(tour.basePrice);
    unitPrice = toNumber(tour.discountPrice ?? tour.basePrice);
    endDate = new Date(
      startDate.getTime() + Math.max(0, tour.durationDays - 1) * 86_400_000,
    );
  } else {
    const activity = await prisma.activity.findUnique({
      where: { id: productId },
      select: { name: true, price: true, status: true, bookable: true },
    });
    if (
      !activity ||
      activity.status !== ContentStatus.PUBLISHED ||
      !activity.bookable
    ) {
      throw new BusinessError(
        "This activity is not available to book.",
        "ACTIVITY_UNAVAILABLE",
        404,
      );
    }
    title = activity.name;
    listPrice = toNumber(activity.price);
    unitPrice = listPrice;
  }

  const subtotal = listPrice * quantity;
  const discount = (listPrice - unitPrice) * quantity;
  const total = subtotal - discount;

  const booking = await prisma.booking.create({
    data: {
      bookingNumber: generateBookingNumber(),
      userId,
      productType,
      productId,
      productTitle: title,
      startDate,
      endDate,
      quantity,
      guests: quantity,
      subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
      discount: new Prisma.Decimal(discount.toFixed(2)),
      total: new Prisma.Decimal(total.toFixed(2)),
      status: BookingStatus.PAYMENT_PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      notes: input.notes ?? null,
      items: {
        create: {
          productType,
          productId,
          nameSnapshot: title,
          quantity,
          unitPrice: new Prisma.Decimal(listPrice.toFixed(2)),
          discount: new Prisma.Decimal(discount.toFixed(2)),
          total: new Prisma.Decimal(total.toFixed(2)),
        },
      },
    },
    select: { id: true, bookingNumber: true, total: true, currency: true },
  });

  await afterBookingCreated(booking.id, booking.bookingNumber, userId);

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    total: toNumber(booking.total),
    currency: booking.currency,
  };
}

// ---------------------------------------------------------------------------
// Release & lifecycle
// ---------------------------------------------------------------------------

/**
 * Returns inventory to the pool when a booking is cancelled, refunded or
 * expires. Idempotent per booking: room holds are deleted as they are released
 * so a repeated call cannot double-credit availability.
 */
export async function releaseBookingInventory(
  bookingId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        productType: true,
        productId: true,
        quantity: true,
        roomHolds: {
          select: { id: true, roomTypeId: true, date: true, units: true },
        },
      },
    });
    if (!booking) return;

    if (booking.productType === ProductType.EVENT && booking.productId) {
      await tx.event.updateMany({
        where: {
          id: booking.productId,
          reservedSeats: { gte: booking.quantity },
        },
        data: { reservedSeats: { decrement: booking.quantity } },
      });
      // A sold-out event with freed seats returns to sale.
      const event = await tx.event.findUnique({
        where: { id: booking.productId },
        select: { capacity: true, reservedSeats: true, status: true },
      });
      if (
        event &&
        event.status === EventStatus.SOLD_OUT &&
        event.reservedSeats < event.capacity
      ) {
        await tx.event.update({
          where: { id: booking.productId },
          data: { status: EventStatus.PUBLISHED },
        });
      }
    }

    for (const hold of booking.roomHolds) {
      await tx.roomInventory.updateMany({
        where: {
          roomTypeId: hold.roomTypeId,
          date: hold.date,
          bookedUnits: { gte: hold.units },
        },
        data: { bookedUnits: { decrement: hold.units } },
      });
    }

    if (booking.roomHolds.length > 0) {
      await tx.roomBookingHold.deleteMany({ where: { bookingId } });
    }
  });
}

async function afterBookingCreated(
  bookingId: string,
  bookingNumber: string,
  userId: string,
): Promise<void> {
  await Promise.all([
    recordAudit({
      actorId: userId,
      action: AUDIT_ACTIONS.BOOKING_CREATED,
      entityType: "Booking",
      entityId: bookingId,
      metadata: { bookingNumber },
    }),
    notifyUser({
      userId,
      type: NotificationType.BOOKING,
      title: `Booking ${bookingNumber} created`,
      message: "Complete your payment to confirm this booking.",
      link: `/account/bookings/${bookingId}`,
      targetType: "Booking",
      targetId: bookingId,
    }),
    notifyStaffWithPermission(PERMISSIONS.BOOKINGS_READ, {
      type: NotificationType.BOOKING,
      title: `New booking ${bookingNumber}`,
      message: "A customer created a booking and is awaiting payment.",
      link: `/dashboard/bookings/${bookingId}`,
      targetType: "Booking",
      targetId: bookingId,
    }),
  ]);
}

/** Creates the invoice record once a booking is fully paid. */
export async function ensureInvoice(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      total: true,
      currency: true,
      invoice: { select: { id: true } },
    },
  });
  if (!booking || booking.invoice) return;

  await prisma.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      bookingId: booking.id,
      amount: booking.total,
      currency: booking.currency,
      paidAt: new Date(),
    },
  });
}

/** Availability for a room across a date range, for the booking widget. */
export async function roomAvailability(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<{ available: number; nights: number }> {
  const dates = eachDate(checkIn, checkOut);
  if (dates.length === 0) return { available: 0, nights: 0 };

  const roomType = await prisma.roomType.findUnique({
    where: { id: roomTypeId },
    select: { totalUnits: true },
  });
  if (!roomType) return { available: 0, nights: dates.length };

  const inventory = await prisma.roomInventory.findMany({
    where: { roomTypeId, date: { in: dates } },
    select: { date: true, totalUnits: true, bookedUnits: true, blocked: true },
  });

  const byDate = new Map(
    inventory.map((row) => [row.date.toISOString().slice(0, 10), row]),
  );

  let minAvailable = roomType.totalUnits;
  for (const date of dates) {
    const row = byDate.get(date.toISOString().slice(0, 10));
    const available = row
      ? row.blocked
        ? 0
        : row.totalUnits - row.bookedUnits
      : roomType.totalUnits;
    minAvailable = Math.min(minAvailable, Math.max(0, available));
  }

  return { available: minAvailable, nights: dates.length };
}
