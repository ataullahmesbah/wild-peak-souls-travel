import type { NextRequest } from 'next/server';

import { AuthError } from '@/lib/rbac/guard';
import { apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { getAccountsLedger, reportingWindow } from '@/lib/data/admin';
import { toNumber } from '@/lib/utils';

/**
 * Downloadable reports.
 *
 * Not wrapped in apiHandler because that returns JSON, and this returns a file.
 * The same guards still apply — permission first, then a closed list of report
 * names so a query string cannot select an arbitrary table.
 *
 * Exports are audited. A CSV of every customer's name, email and what they paid
 * is a copy of the business leaving the building, so who took one and when is
 * worth knowing.
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.REPORTS_READ);

    const url = new URL(request.url);
    const report = url.searchParams.get('report') ?? 'accounts';
    const days = Math.min(730, Math.max(1, Number(url.searchParams.get('days')) || 90));
    const { from, to } = reportingWindow(days);

    let rows: string[][];
    let filename: string;

    if (report === 'accounts') {
      const { rows: ledger } = await getAccountsLedger(from, to);
      filename = `accounts-${days}d`;
      rows = [
        [
          'Booking',
          'Created',
          'Customer',
          'Email',
          'Product',
          'Currency',
          'Billed',
          'Received',
          'Awaiting verification',
          'Refunded',
          'Outstanding',
          'Booking status',
          'Payment status',
        ],
        ...ledger.map((row) => [
          row.bookingNumber,
          row.createdAt.toISOString().slice(0, 10),
          row.customerName,
          row.customerEmail,
          row.productTitle,
          row.currency,
          row.total.toFixed(2),
          row.received.toFixed(2),
          row.awaiting.toFixed(2),
          row.refunded.toFixed(2),
          row.outstanding.toFixed(2),
          row.status,
          row.paymentStatus,
        ]),
      ];
    } else if (report === 'transactions') {
      const transactions = await prisma.financialTransaction.findMany({
        where: { transactionDate: { gte: from, lte: to } },
        select: {
          transactionDate: true,
          type: true,
          category: true,
          amount: true,
          currency: true,
          description: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { transactionDate: 'desc' },
      });
      filename = `transactions-${days}d`;
      rows = [
        ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Description', 'Recorded by'],
        ...transactions.map((row) => [
          row.transactionDate.toISOString().slice(0, 10),
          row.type,
          row.category ?? '',
          toNumber(row.amount).toFixed(2),
          row.currency,
          row.description ?? '',
          row.createdBy?.name ?? '',
        ]),
      ];
    } else if (report === 'bookings') {
      const bookings = await prisma.booking.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: {
          bookingNumber: true,
          createdAt: true,
          productType: true,
          productTitle: true,
          startDate: true,
          guests: true,
          total: true,
          currency: true,
          status: true,
          paymentStatus: true,
          contactName: true,
          contactEmail: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      filename = `bookings-${days}d`;
      rows = [
        [
          'Booking',
          'Created',
          'Type',
          'Product',
          'Departure',
          'Guests',
          'Total',
          'Currency',
          'Status',
          'Payment',
          'Customer',
          'Email',
        ],
        ...bookings.map((row) => [
          row.bookingNumber,
          row.createdAt.toISOString().slice(0, 10),
          row.productType,
          row.productTitle,
          row.startDate ? row.startDate.toISOString().slice(0, 10) : '',
          String(row.guests),
          toNumber(row.total).toFixed(2),
          row.currency,
          row.status,
          row.paymentStatus,
          row.contactName,
          row.contactEmail,
        ]),
      ];
    } else {
      return apiError('Unknown report.', 400, { code: 'UNKNOWN_REPORT' });
    }

    await recordAudit({
      actorId: staff.id,
      action: 'reports.exported',
      entityType: 'Report',
      metadata: { report, days, rows: rows.length - 1 },
    });

    const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');

    return new Response(`﻿${csv}`, {
      headers: {
        // The BOM is what makes Excel read UTF-8 correctly; without it Bangla
        // names and the ৳ sign arrive as mojibake.
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return apiError(error.message, error.status);
    console.error('[reports] export failed', error);
    return apiError('The report could not be generated.', 500);
  }
}

/**
 * Quotes a cell for CSV, and defuses formula injection.
 *
 * A cell beginning =, +, - or @ is executed as a formula when the file is
 * opened in Excel, and these cells contain names and notes typed by the public.
 * Prefixing a quote makes the value display as text instead of running.
 */
function escapeCell(value: string): string {
  const text = value ?? '';
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
