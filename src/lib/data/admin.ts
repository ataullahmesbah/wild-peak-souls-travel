import 'server-only';

import { prisma } from '@/lib/prisma';
import { toNumber } from '@/lib/utils';
import {
  BookingStatus,
  ContentStatus,
  EventStatus,
  ExpenseStatus,
  PaymentStatus,
  Prisma,
  ReviewStatus,
  SupportStatus,
  TransactionType,
} from '@/generated/prisma';

/** Aggregates for the dashboard home. Each tile maps to a permission-gated page. */
export async function getDashboardMetrics() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalBookings,
    pendingBookings,
    upcomingEvents,
    newVisaRequests,
    newLeads,
    openTokens,
    pendingPayments,
    pendingReviews,
    revenueAgg,
    expenseAgg,
    capacityRows,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({
      where: {
        status: { in: [BookingStatus.PENDING, BookingStatus.PAYMENT_PENDING] },
      },
    }),
    prisma.event.count({
      where: { status: EventStatus.PUBLISHED, startAt: { gte: now } },
    }),
    prisma.visaRequest.count({ where: { status: 'NEW' } }),
    prisma.customTourRequest.count({ where: { status: 'NEW' } }),
    prisma.supportToken.count({
      where: { status: { in: [SupportStatus.PENDING, SupportStatus.IN_PROGRESS] } },
    }),
    prisma.payment.count({ where: { status: PaymentStatus.PENDING_VERIFICATION } }),
    prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
    prisma.financialTransaction.aggregate({
      where: { type: TransactionType.INCOME, transactionDate: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { type: TransactionType.EXPENSE, transactionDate: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED, startAt: { gte: now } },
      select: { capacity: true, reservedSeats: true },
    }),
  ]);

  const revenue = toNumber(revenueAgg._sum.amount);
  const expenses = toNumber(expenseAgg._sum.amount);
  const availableCapacity = capacityRows.reduce(
    (sum, e) => sum + Math.max(0, e.capacity - e.reservedSeats),
    0,
  );

  return {
    totalBookings,
    pendingBookings,
    upcomingEvents,
    availableCapacity,
    newVisaRequests,
    newLeads,
    openTokens,
    pendingPayments,
    pendingReviews,
    revenue,
    expenses,
    net: revenue - expenses,
  };
}

export async function getRecentBookings(limit = 8) {
  return prisma.booking.findMany({
    select: {
      id: true,
      bookingNumber: true,
      productTitle: true,
      productType: true,
      startDate: true,
      total: true,
      currency: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getPendingPaymentQueue(limit = 10) {
  return prisma.payment.findMany({
    where: { status: PaymentStatus.PENDING_VERIFICATION },
    select: {
      id: true,
      method: true,
      amount: true,
      currency: true,
      transactionId: true,
      senderNumber: true,
      createdAt: true,
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          productTitle: true,
          user: { select: { name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

const PAGE = 25;

export async function listAdminBookings(options: {
  page?: number;
  status?: string;
  paymentStatus?: string;
  query?: string;
}) {
  const page = options.page ?? 1;
  const where: Prisma.BookingWhereInput = {
    ...(options.status
      ? { status: options.status as Prisma.EnumBookingStatusFilter['equals'] }
      : {}),
    ...(options.paymentStatus
      ? {
          paymentStatus:
            options.paymentStatus as Prisma.EnumPaymentStatusFilter['equals'],
        }
      : {}),
    ...(options.query
      ? {
          OR: [
            { bookingNumber: { contains: options.query, mode: 'insensitive' } },
            { productTitle: { contains: options.query, mode: 'insensitive' } },
            { contactName: { contains: options.query, mode: 'insensitive' } },
            { contactEmail: { contains: options.query, mode: 'insensitive' } },
            { contactPhone: { contains: options.query } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: {
        id: true,
        bookingNumber: true,
        productTitle: true,
        productType: true,
        startDate: true,
        quantity: true,
        total: true,
        currency: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        contactName: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE)) };
}

export async function getAdminBooking(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
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
      staffNotes: true,
      cancelledAt: true,
      cancelReason: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
      },
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
          verifiedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      invoice: { select: { invoiceNumber: true, issuedAt: true } },
    },
  });
}

export async function listAdminUsers(options: {
  page?: number;
  role?: string;
  status?: string;
  query?: string;
}) {
  const page = options.page ?? 1;
  const where: Prisma.UserWhereInput = {
    ...(options.status
      ? { status: options.status as Prisma.EnumUserStatusFilter['equals'] }
      : {}),
    ...(options.role
      ? { roles: { some: { role: { name: options.role as never } } } }
      : {}),
    ...(options.query
      ? {
          OR: [
            { name: { contains: options.query, mode: 'insensitive' } },
            { email: { contains: options.query, mode: 'insensitive' } },
            { phone: { contains: options.query } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      // Deliberately no passwordHash in this projection.
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        roles: { select: { role: { select: { name: true, label: true } } } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE)) };
}

export async function listAdminEvents(options: { page?: number; status?: string }) {
  const page = options.page ?? 1;
  const where: Prisma.EventWhereInput = options.status
    ? { status: options.status as Prisma.EnumEventStatusFilter['equals'] }
    : {};

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        startAt: true,
        endAt: true,
        capacity: true,
        reservedSeats: true,
        price: true,
        discountPrice: true,
        status: true,
        featured: true,
        destination: { select: { name: true } },
      },
      orderBy: { startAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE)) };
}

export async function listAdminCatalogue() {
  const [destinations, tours, activities, stays] = await Promise.all([
    prisma.destination.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        status: true,
        featured: true,
        _count: { select: { events: true, tours: true, activities: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    prisma.tour.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        basePrice: true,
        duration: true,
        status: true,
        featured: true,
        destination: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.activity.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        status: true,
        trending: true,
        bookable: true,
        destination: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    prisma.accommodation.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        status: true,
        featured: true,
        destination: { select: { name: true } },
        _count: { select: { roomTypes: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    }),
  ]);

  return { destinations, tours, activities, stays };
}

export async function listAdminLeads() {
  const [contacts, customTours, flights] = await Promise.all([
    prisma.contactRequest.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        description: true,
        status: true,
        createdAt: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.customTourRequest.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        destination: true,
        travelers: true,
        budget: true,
        preferredDate: true,
        status: true,
        quotedAmount: true,
        createdAt: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.flightInquiry.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        origin: true,
        destination: true,
        airline: true,
        flightNumber: true,
        passengers: true,
        departureDate: true,
        displayedPrice: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return { contacts, customTours, flights };
}

export async function listAdminVisaRequests() {
  return prisma.visaRequest.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      nationality: true,
      message: true,
      status: true,
      createdAt: true,
      assignedTo: { select: { name: true } },
      visaType: {
        select: { name: true, country: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
}

export async function listAdminSupportTokens(status?: string) {
  return prisma.supportToken.findMany({
    where: status ? { status: status as Prisma.EnumSupportStatusFilter['equals'] } : {},
    select: {
      id: true,
      tokenNumber: true,
      subject: true,
      category: true,
      priority: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    take: 60,
  });
}

export async function getAdminSupportToken(tokenId: string) {
  return prisma.supportToken.findUnique({
    where: { id: tokenId },
    select: {
      id: true,
      tokenNumber: true,
      subject: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      createdAt: true,
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      assignedTo: { select: { id: true, name: true } },
      messages: {
        // Staff see everything, including internal notes.
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

export async function listAdminReviews(status?: string) {
  return prisma.review.findMany({
    where: status ? { status: status as Prisma.EnumReviewStatusFilter['equals'] } : {},
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      featured: true,
      moderationNote: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      booking: { select: { bookingNumber: true, productTitle: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
}

/** Resolves a "last N days" window server-side, so pages never read the clock during render. */
export function reportingWindow(days: number): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from, to };
}

export async function getFinanceOverview(from: Date, to: Date) {
  const [income, expenses, byCategory, recent, pendingExpenses] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: { type: TransactionType.INCOME, transactionDate: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financialTransaction.aggregate({
      where: { type: TransactionType.EXPENSE, transactionDate: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financialTransaction.groupBy({
      by: ['category', 'type'],
      where: { transactionDate: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.financialTransaction.findMany({
      where: { transactionDate: { gte: from, lte: to } },
      select: {
        id: true,
        type: true,
        category: true,
        amount: true,
        currency: true,
        description: true,
        transactionDate: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { transactionDate: 'desc' },
      take: 40,
    }),
    prisma.expense.count({ where: { status: ExpenseStatus.PENDING } }),
  ]);

  const revenue = toNumber(income._sum.amount);
  const cost = toNumber(expenses._sum.amount);

  return {
    revenue,
    cost,
    net: revenue - cost,
    incomeCount: income._count,
    expenseCount: expenses._count,
    byCategory,
    recent,
    pendingExpenses,
  };
}

export async function listAuditLogs(options: {
  page?: number;
  action?: string;
  query?: string;
}) {
  const page = options.page ?? 1;
  const where: Prisma.AuditLogWhereInput = {
    ...(options.action ? { action: options.action } : {}),
    ...(options.query
      ? {
          OR: [
            { action: { contains: options.query, mode: 'insensitive' } },
            { entityType: { contains: options.query, mode: 'insensitive' } },
            { entityId: { contains: options.query } },
            { actorLabel: { contains: options.query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
        actorLabel: true,
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 50,
      take: 50,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / 50)) };
}

export async function listMediaAssets(page = 1) {
  const [items, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      select: {
        id: true,
        url: true,
        secureUrl: true,
        publicId: true,
        altText: true,
        folder: true,
        type: true,
        width: true,
        height: true,
        size: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        // Every place an image can be attached, so the library can say where a
        // file is used and refuse to delete one still in use.
        _count: {
          select: {
            destinationCovers: true,
            destinationGallery: true,
            eventCovers: true,
            eventGallery: true,
            tourCovers: true,
            activityCovers: true,
            accommodationCovers: true,
            roomTypeCovers: true,
            visaCountryFlags: true,
            advertisements: true,
            expenseReceipts: true,
            postCovers: true,
            heroSlides: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 40,
      take: 40,
    }),
    prisma.mediaAsset.count(),
  ]);

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / 40)) };
}

/**
 * What the media library is costing in storage, and how much of it is doing
 * nothing.
 *
 * Cloudinary's own dashboard reports the account total; this reports what this
 * site is actually responsible for, which is the number worth acting on. The
 * unused count is the one that matters — those are files safe to remove.
 */
export async function getMediaUsage() {
  const [aggregate, byFolder, unusedIds] = await Promise.all([
    prisma.mediaAsset.aggregate({ _sum: { size: true }, _count: true }),
    prisma.mediaAsset.groupBy({
      by: ['folder'],
      _sum: { size: true },
      _count: true,
      orderBy: { _sum: { size: 'desc' } },
      take: 12,
    }),
    prisma.mediaAsset.findMany({
      where: {
        destinationCovers: { none: {} },
        destinationGallery: { none: {} },
        eventCovers: { none: {} },
        eventGallery: { none: {} },
        tourCovers: { none: {} },
        activityCovers: { none: {} },
        accommodationCovers: { none: {} },
        roomTypeCovers: { none: {} },
        visaCountryFlags: { none: {} },
        advertisements: { none: {} },
        expenseReceipts: { none: {} },
        postCovers: { none: {} },
        heroSlides: { none: {} },
      },
      select: { id: true, size: true },
    }),
  ]);

  return {
    totalFiles: aggregate._count,
    totalBytes: aggregate._sum.size ?? 0,
    unusedFiles: unusedIds.length,
    unusedBytes: unusedIds.reduce((sum, row) => sum + (row.size ?? 0), 0),
    byFolder: byFolder.map((row) => ({
      folder: row.folder ?? 'uncategorised',
      files: row._count,
      bytes: row._sum.size ?? 0,
    })),
  };
}

export async function listSettingsByCategory() {
  const rows = await prisma.setting.findMany({
    select: {
      key: true,
      value: true,
      type: true,
      category: true,
      isSecret: true,
      label: true,
      description: true,
      updatedAt: true,
    },
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = grouped.get(row.category) ?? [];
    list.push(row);
    grouped.set(row.category, list);
  }
  return grouped;
}

export async function getContentCounts() {
  const [drafts, published] = await Promise.all([
    prisma.event.count({ where: { status: EventStatus.DRAFT } }),
    prisma.event.count({ where: { status: EventStatus.PUBLISHED } }),
  ]);
  return { drafts, published, contentStatus: ContentStatus };
}

/**
 * How many accounts hold each role, for the tabs on the users screen.
 *
 * Counted with a grouped query rather than one count per role, so adding a
 * role does not add a round trip.
 */
export async function countUsersByRole(): Promise<{
  total: number;
  byRole: Record<string, number>;
}> {
  const [total, grouped] = await Promise.all([
    prisma.user.count(),
    prisma.userRole.groupBy({
      by: ['roleId'],
      _count: { userId: true },
    }),
  ]);

  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  const nameById = new Map(roles.map((role) => [role.id, role.name]));

  const byRole: Record<string, number> = {};
  for (const row of grouped) {
    const name = nameById.get(row.roleId);
    if (name) byRole[name] = row._count.userId;
  }

  return { total, byRole };
}

/**
 * The accounts view: what customers owe, what is waiting to be checked, and
 * what has been refunded.
 *
 * Owed is computed from verified payments against the booking total rather
 * than trusting the paymentStatus flag, because a flag is a summary someone
 * has to remember to update and money is not something to summarise. Payments
 * awaiting verification are shown separately and never counted as received —
 * a screenshot is a claim, not a payment.
 */
export async function getAccountsLedger(from: Date, to: Date) {
  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: [BookingStatus.CANCELLED, BookingStatus.EXPIRED] },
    },
    select: {
      id: true,
      bookingNumber: true,
      productTitle: true,
      productType: true,
      total: true,
      currency: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      contactName: true,
      contactEmail: true,
      user: { select: { id: true, name: true, email: true } },
      payments: { select: { amount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const rows = bookings.map((booking) => {
    const total = toNumber(booking.total);
    const received = booking.payments
      .filter((payment) => payment.status === PaymentStatus.PAID)
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const awaiting = booking.payments
      .filter((payment) => payment.status === PaymentStatus.PENDING_VERIFICATION)
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const refunded = booking.payments
      .filter((payment) => payment.status === PaymentStatus.REFUNDED)
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      productTitle: booking.productTitle,
      productType: booking.productType,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
      customerName: booking.user?.name ?? booking.contactName,
      customerEmail: booking.user?.email ?? booking.contactEmail,
      currency: booking.currency,
      total,
      received,
      awaiting,
      refunded,
      outstanding: Math.max(0, total - received),
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      billed: acc.billed + row.total,
      received: acc.received + row.received,
      awaiting: acc.awaiting + row.awaiting,
      refunded: acc.refunded + row.refunded,
      outstanding: acc.outstanding + row.outstanding,
    }),
    { billed: 0, received: 0, awaiting: 0, refunded: 0, outstanding: 0 },
  );

  return { rows, totals };
}
