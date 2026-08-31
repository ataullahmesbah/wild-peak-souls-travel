import type { Metadata } from 'next';
import Link from 'next/link';
import { FileCheck2, Globe2, Inbox } from 'lucide-react';

import { AdminPageHeader, MetricCard } from '@/components/admin/admin-ui';
import { prisma } from '@/lib/prisma';
import { requireStaffPage, hasAnyPermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Visa',
  robots: { index: false, follow: false },
};

/**
 * The visa workspace has three parts — the countries offered, the visa types
 * within each, and the requests customers send. This is the way in to all
 * three rather than a redirect, so someone who manages the content is not
 * dropped into the request queue they may not even have access to.
 */
export default async function AdminVisaPage() {
  const staff = await requireStaffPage();
  const canManage = hasAnyPermission(staff, [PERMISSIONS.VISA_READ, PERMISSIONS.VISA_MANAGE]);
  const canSeeRequests = hasAnyPermission(staff, [PERMISSIONS.VISA_REQUESTS_MANAGE]);

  const [countries, types, pending] = await Promise.all([
    prisma.visaCountry.count({ where: { status: { not: 'ARCHIVED' } } }),
    prisma.visaType.count({ where: { status: { not: 'ARCHIVED' } } }),
    canSeeRequests
      ? prisma.visaRequest.count({
          where: {
            status: {
              in: ['NEW', 'CONTACTED', 'DOCUMENTS_REQUESTED', 'DOCUMENTS_RECEIVED', 'PROCESSING'],
            },
          },
        })
      : Promise.resolve(0),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Visa"
        description="Countries, the visa types offered for each, and the requests customers have sent in."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canManage && (
          <>
            <MetricCard
              icon={Globe2}
              label="Countries"
              value={countries}
              hint="Manage the countries offered"
              href="/dashboard/visa/countries"
            />
            <MetricCard
              icon={FileCheck2}
              label="Visa types"
              value={types}
              hint="Requirements, fees and documents"
              href="/dashboard/visa/types"
              tone="info"
            />
          </>
        )}
        {canSeeRequests && (
          <MetricCard
            icon={Inbox}
            label="Open requests"
            value={pending}
            hint="Not yet completed or cancelled"
            href="/dashboard/visa/requests"
            tone={pending > 0 ? 'warning' : 'success'}
          />
        )}
      </div>

      {!canManage && !canSeeRequests && (
        <p className="mt-6 text-sm text-muted-foreground">
          You do not have access to any part of the visa workspace.{' '}
          <Link href="/dashboard" className="text-primary hover:underline">
            Back to the dashboard
          </Link>
        </p>
      )}
    </>
  );
}
