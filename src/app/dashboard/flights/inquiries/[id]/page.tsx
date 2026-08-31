import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LeadDetail, type DetailField } from '@/components/admin/lead-detail';
import { LeadWorkspace } from '@/components/admin/lead-workspace';
import { prisma } from '@/lib/prisma';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { formatCurrency, formatDate, formatDateTime, toNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Flight enquiry',
  robots: { index: false, follow: false },
};

const STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default async function FlightInquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.LEADS_READ);
  const { id } = await params;

  const lead = await prisma.flightInquiry.findUnique({
    where: { id },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
  if (!lead) notFound();

  const shown = toNumber(lead.displayedPrice);

  const fields: DetailField[] = [
    { label: 'Route', value: `${lead.origin} → ${lead.destination}` },
    { label: 'Passengers', value: lead.passengers },
    { label: 'Outbound', value: lead.departureDate ? formatDate(lead.departureDate) : 'Flexible' },
    { label: 'Return', value: lead.returnDate ? formatDate(lead.returnDate) : 'One way' },
    { label: 'Airline', value: lead.airline ?? 'No preference' },
    { label: 'Flight', value: lead.flightNumber ?? '—' },
  ];

  if (shown > 0) {
    fields.push({
      label: 'Fare shown to the customer',
      value: (
        <>
          {formatCurrency(shown)}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {lead.source ? `via ${lead.source}` : 'indicative'}
            {lead.sourceTimestamp && `, ${formatDateTime(lead.sourceTimestamp)}`}
          </span>
        </>
      ),
      wide: true,
    });
  }

  return (
    <LeadDetail
      backHref="/dashboard/leads"
      backLabel="Back to leads"
      title={`${lead.origin} → ${lead.destination} for ${lead.name}`}
      status={lead.status}
      createdAt={lead.createdAt}
      contact={{ name: lead.name, email: lead.email, phone: lead.phone }}
      fields={fields}
      message={lead.message}
      aside={
        hasPermission(staff, PERMISSIONS.FLIGHTS_MANAGE) ? (
          <LeadWorkspace
            endpoint="/api/dashboard/leads/flight"
            id={lead.id}
            currentStatus={lead.status}
            statuses={STATUSES}
            showNotes={false}
            assignedToName={lead.assignedTo?.name}
            assignedToMe={lead.assignedTo?.id === staff.id}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Working this enquiry needs the flights permission.
          </p>
        )
      }
    />
  );
}
