import { NextResponse } from 'next/server';

import { apiError, apiHandler } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/rbac/guard';
import { hasPermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SETTING_KEYS, getPublicSettings, settingString } from '@/lib/settings';

/**
 * Serves an invoice as a self-contained HTML document that prints to PDF from
 * the browser — no PDF dependency, and the layout stays themeable.
 *
 * Access is either the owning customer or a staff member with `payments.read`.
 */
export const GET = apiHandler(
  async (
    _request: Request,
    context: { params: Promise<{ bookingId: string }> },
  ) => {
    const user = await requireUser();
    const { bookingId } = await context.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        bookingNumber: true,
        productTitle: true,
        total: true,
        subtotal: true,
        discount: true,
        currency: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            nameSnapshot: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
        invoice: {
          select: { invoiceNumber: true, issuedAt: true, paidAt: true },
        },
      },
    });

    const isOwner = booking?.userId === user.id;
    const isStaffViewer = hasPermission(user, PERMISSIONS.PAYMENTS_READ);

    if (!booking || (!isOwner && !isStaffViewer)) {
      return apiError('Invoice not found.', 404);
    }
    if (!booking.invoice) {
      return apiError(
        'No invoice has been issued for this booking yet. Invoices are created once payment is verified.',
        404,
      );
    }

    const settings = await getPublicSettings();
    const brand = settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls');
    const address = settingString(settings, SETTING_KEYS.CONTACT_ADDRESS);
    const email = settingString(settings, SETTING_KEYS.CONTACT_EMAIL);
    const phone = settingString(settings, SETTING_KEYS.CONTACT_PHONE);

    const rows = booking.items
      .map(
        (item) => `
        <tr>
          <td>${escapeHtml(item.nameSnapshot)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${formatCurrency(item.unitPrice, booking.currency)}</td>
          <td class="num">${formatCurrency(item.total, booking.currency)}</td>
        </tr>`,
      )
      .join('');

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(booking.invoice.invoiceNumber)} — ${escapeHtml(brand)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; padding: 40px 24px; color: #0d1b12; background: #fff; }
  .sheet { max-width: 760px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; border-bottom: 2px solid #14724a; padding-bottom: 24px; }
  h1 { font-size: 26px; margin: 0 0 4px; color: #14724a; }
  .muted { color: #5b6b5f; font-size: 13px; line-height: 1.6; margin: 0; }
  .meta { text-align: right; font-size: 13px; }
  .meta strong { display: block; font-size: 18px; }
  section { margin-top: 32px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #5b6b5f; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 14px; }
  th { text-align: left; border-bottom: 1px solid #dfe8e0; padding: 10px 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #5b6b5f; }
  td { padding: 12px 8px; border-bottom: 1px solid #eef3ee; }
  .num { text-align: right; }
  .totals { margin-left: auto; width: 280px; margin-top: 16px; font-size: 14px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 8px; }
  .totals .grand { border-top: 2px solid #14724a; margin-top: 6px; padding-top: 12px; font-size: 18px; font-weight: 700; }
  .paid { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 999px; background: #e1f4ea; color: #16794f; font-size: 12px; font-weight: 600; }
  footer { margin-top: 48px; border-top: 1px solid #dfe8e0; padding-top: 16px; font-size: 12px; color: #5b6b5f; }
  .print { margin-top: 24px; }
  .print button { background: #14724a; color: #fff; border: 0; border-radius: 8px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
  @media print { .print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div>
      <h1>${escapeHtml(brand)}</h1>
      <p class="muted">
        ${escapeHtml(address)}<br>
        ${escapeHtml(email)} · ${escapeHtml(phone)}
      </p>
    </div>
    <div class="meta">
      <span class="muted">Invoice</span>
      <strong>${escapeHtml(booking.invoice.invoiceNumber)}</strong>
      <p class="muted">
        Issued ${formatDate(booking.invoice.issuedAt)}<br>
        Booking ${escapeHtml(booking.bookingNumber)}
      </p>
      ${booking.invoice.paidAt ? '<span class="paid">PAID</span>' : ''}
    </div>
  </header>

  <section>
    <h2>Billed to</h2>
    <p class="muted">
      ${escapeHtml(booking.contactName)}<br>
      ${escapeHtml(booking.contactEmail)}<br>
      ${escapeHtml(booking.contactPhone)}
    </p>
  </section>

  <section>
    <h2>${escapeHtml(booking.productTitle)}</h2>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${formatCurrency(booking.subtotal, booking.currency)}</span></div>
      <div><span>Discount</span><span>−${formatCurrency(booking.discount, booking.currency)}</span></div>
      <div class="grand"><span>Total</span><span>${formatCurrency(booking.total, booking.currency)}</span></div>
    </div>
  </section>

  <footer>
    <p>Thank you for travelling with ${escapeHtml(brand)}. This invoice was generated on ${formatDate(new Date())}.</p>
    <p>Questions about this invoice? Reply to ${escapeHtml(email)} quoting ${escapeHtml(booking.bookingNumber)}.</p>
  </footer>

  <div class="print"><button onclick="window.print()">Print or save as PDF</button></div>
</div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    });
  },
);

/** Invoice values are interpolated into HTML, so they must be escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
