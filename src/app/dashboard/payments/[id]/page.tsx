import { redirect } from 'next/navigation';

import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

/**
 * Payment notifications link here, but everything a reviewer needs — the
 * customer, the price breakdown and the verify action — lives on the booking
 * page, so this resolves the payment and forwards there.
 */
export default async function AdminPaymentRedirect({ params }: { params: Params }) {
  await requirePermissionPage(PERMISSIONS.PAYMENTS_READ);
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { bookingId: true },
  });

  redirect(payment ? `/dashboard/bookings/${payment.bookingId}` : '/dashboard/payments');
}
