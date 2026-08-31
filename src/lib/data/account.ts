import 'server-only';

import { prisma } from '@/lib/prisma';
import { BookingStatus, ReviewStatus } from '@/generated/prisma';

/**
 * Read layer for the signed-in customer.
 *
 * Every function takes `userId` and scopes on it. There is no "get any
 * booking" helper here by design — the ownership filter is part of the query,
 * so a route cannot forget to apply it.
 */

export async function getAccountOverview(userId: string) {
  const [
    totalBookings,
    upcomingTrips,
    pendingPayments,
    openTokens,
    unreadNotifications,
    recentBookings,
  ] = await Promise.all([
    prisma.booking.count({ where: { userId } }),
    prisma.booking.count({
      where: {
        userId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
        startDate: { gte: new Date() },
      },
    }),
    prisma.booking.count({
      where: {
        userId,
        paymentStatus: { in: ['UNPAID', 'PENDING_VERIFICATION'] },
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.EXPIRED] },
      },
    }),
    prisma.supportToken.count({
      where: { customerId: userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.booking.findMany({
      where: { userId },
      select: {
        id: true,
        bookingNumber: true,
        productTitle: true,
        productType: true,
        startDate: true,
        endDate: true,
        total: true,
        currency: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    totalBookings,
    upcomingTrips,
    pendingPayments,
    openTokens,
    unreadNotifications,
    recentBookings,
  };
}

export async function listMyBookings(
  userId: string,
  filter: 'all' | 'upcoming' | 'past' | 'cancelled' = 'all',
) {
  const now = new Date();
  const where = {
    userId,
    ...(filter === 'upcoming'
      ? {
          startDate: { gte: now },
          status: { notIn: [BookingStatus.CANCELLED, BookingStatus.EXPIRED] },
        }
      : filter === 'past'
        ? {
            OR: [
              { startDate: { lt: now } },
              { status: BookingStatus.COMPLETED },
            ],
            status: { notIn: [BookingStatus.CANCELLED] },
          }
        : filter === 'cancelled'
          ? {
              status: {
                in: [
                  BookingStatus.CANCELLED,
                  BookingStatus.REFUNDED,
                  BookingStatus.EXPIRED,
                ],
              },
            }
          : {}),
  };

  return prisma.booking.findMany({
    where,
    select: {
      id: true,
      bookingNumber: true,
      productTitle: true,
      productType: true,
      productId: true,
      startDate: true,
      endDate: true,
      quantity: true,
      total: true,
      currency: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      reviews: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
}

/** Returns null (not a 403) when the booking belongs to someone else. */
export async function getMyBooking(userId: string, bookingId: string) {
  return prisma.booking.findFirst({
    where: { id: bookingId, userId },
    select: {
      id: true,
      bookingNumber: true,
      productTitle: true,
      productType: true,
      productId: true,
      startDate: true,
      endDate: true,
      quantity: true,
      guests: true,
      subtotal: true,
      discount: true,
      fees: true,
      total: true,
      currency: true,
      status: true,
      paymentStatus: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      notes: true,
      cancelledAt: true,
      cancelReason: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          nameSnapshot: true,
          descriptionSnapshot: true,
          quantity: true,
          unitPrice: true,
          discount: true,
          total: true,
        },
      },
      payments: {
        select: {
          id: true,
          method: true,
          amount: true,
          status: true,
          transactionId: true,
          senderNumber: true,
          verifiedAt: true,
          verificationNote: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      invoice: {
        select: { invoiceNumber: true, amount: true, issuedAt: true, paidAt: true },
      },
      reviews: { select: { id: true, rating: true, status: true } },
    },
  });
}

export async function listMyPayments(userId: string) {
  return prisma.payment.findMany({
    where: { booking: { userId } },
    select: {
      id: true,
      method: true,
      amount: true,
      currency: true,
      status: true,
      transactionId: true,
      verifiedAt: true,
      createdAt: true,
      booking: {
        select: { id: true, bookingNumber: true, productTitle: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
}

export async function listMyInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { booking: { userId } },
    select: {
      id: true,
      invoiceNumber: true,
      amount: true,
      currency: true,
      issuedAt: true,
      paidAt: true,
      booking: {
        select: { id: true, bookingNumber: true, productTitle: true },
      },
    },
    orderBy: { issuedAt: 'desc' },
    take: 60,
  });
}

/** Every lead type the customer has raised, merged into one timeline. */
export async function listMyRequests(userId: string) {
  const [visa, customTours, flights, contacts] = await Promise.all([
    prisma.visaRequest.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        nationality: true,
        createdAt: true,
        visaType: {
          select: { name: true, country: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.customTourRequest.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        destination: true,
        travelers: true,
        preferredDate: true,
        quotedAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.flightInquiry.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        origin: true,
        destination: true,
        airline: true,
        flightNumber: true,
        passengers: true,
        departureDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.contactRequest.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        subject: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
  ]);

  return { visa, customTours, flights, contacts };
}

export async function listMySupportTokens(userId: string) {
  return prisma.supportToken.findMany({
    where: { customerId: userId },
    select: {
      id: true,
      tokenNumber: true,
      subject: true,
      category: true,
      priority: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
}

export async function getMySupportToken(userId: string, tokenId: string) {
  return prisma.supportToken.findFirst({
    where: { id: tokenId, customerId: userId },
    select: {
      id: true,
      tokenNumber: true,
      subject: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      createdAt: true,
      assignedTo: { select: { name: true } },
      messages: {
        // Internal staff notes are excluded from the customer's view.
        where: { messageType: { not: 'INTERNAL_NOTE' } },
        select: {
          id: true,
          body: true,
          messageType: true,
          createdAt: true,
          sender: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function listMyNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
}

export async function listMyReviews(userId: string) {
  return prisma.review.findMany({
    where: { userId },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      booking: { select: { bookingNumber: true, productTitle: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });
}

/** Bookings the customer has completed but not yet reviewed. */
export async function listReviewableBookings(userId: string) {
  return prisma.booking.findMany({
    where: {
      userId,
      status: BookingStatus.COMPLETED,
      reviews: { none: {} },
    },
    select: {
      id: true,
      bookingNumber: true,
      productTitle: true,
      productType: true,
      productId: true,
      endDate: true,
    },
    orderBy: { endDate: 'desc' },
    take: 20,
  });
}

export async function listMyWishlist(userId: string) {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { id: true, itemType: true, itemId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  // Resolve each saved id to its current catalogue row so the wishlist reflects
  // live titles, prices and availability rather than a stale snapshot.
  const byType = {
    EVENT: items.filter((i) => i.itemType === 'EVENT').map((i) => i.itemId),
    TOUR: items.filter((i) => i.itemType === 'TOUR').map((i) => i.itemId),
    DESTINATION: items.filter((i) => i.itemType === 'DESTINATION').map((i) => i.itemId),
    ACTIVITY: items.filter((i) => i.itemType === 'ACTIVITY').map((i) => i.itemId),
    ACCOMMODATION: items
      .filter((i) => i.itemType === 'ACCOMMODATION')
      .map((i) => i.itemId),
  };

  const [events, tours, destinations, activities, stays] = await Promise.all([
    byType.EVENT.length
      ? prisma.event.findMany({
          where: { id: { in: byType.EVENT }, status: { in: ['PUBLISHED', 'SOLD_OUT'] } },
          select: { id: true, title: true, slug: true, startAt: true, price: true },
        })
      : [],
    byType.TOUR.length
      ? prisma.tour.findMany({
          where: { id: { in: byType.TOUR }, status: 'PUBLISHED' },
          select: { id: true, title: true, slug: true, basePrice: true, duration: true },
        })
      : [],
    byType.DESTINATION.length
      ? prisma.destination.findMany({
          where: { id: { in: byType.DESTINATION }, status: 'PUBLISHED' },
          select: { id: true, name: true, slug: true, country: true },
        })
      : [],
    byType.ACTIVITY.length
      ? prisma.activity.findMany({
          where: { id: { in: byType.ACTIVITY }, status: 'PUBLISHED' },
          select: { id: true, name: true, slug: true, price: true },
        })
      : [],
    byType.ACCOMMODATION.length
      ? prisma.accommodation.findMany({
          where: { id: { in: byType.ACCOMMODATION }, status: 'PUBLISHED' },
          select: { id: true, name: true, slug: true, type: true },
        })
      : [],
  ]);

  return { items, events, tours, destinations, activities, stays };
}

export async function getMyReviewEligibility(
  userId: string,
  bookingId: string,
): Promise<boolean> {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      userId,
      status: BookingStatus.COMPLETED,
      reviews: { none: {} },
    },
    select: { id: true },
  });
  return Boolean(booking);
}

export async function listApprovedReviewCount(userId: string): Promise<number> {
  return prisma.review.count({
    where: { userId, status: ReviewStatus.APPROVED },
  });
}
