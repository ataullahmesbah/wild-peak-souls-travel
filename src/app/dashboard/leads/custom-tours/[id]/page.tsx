import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LeadDetail, type DetailField } from '@/components/admin/lead-detail';
import { LeadWorkspace } from '@/components/admin/lead-workspace';
import { prisma } from '@/lib/prisma';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { formatCurrency, formatDate, toNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Custom tour request',
  robots: { index: false, follow: false },
};

const STATUSES = [
  'NEW',
  'CONTACTED',
  'QUOTED',
  'NEGOTIATING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

export default async function CustomTourLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.LEADS_READ);
  const { id } = await params;

  const lead = await prisma.customTourRequest.findUnique({
    where: { id },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
  if (!lead) notFound();

  const quoted = toNumber(lead.quotedAmount);

  const fields: DetailField[] = [
    { label: 'Destination', value: lead.destination ?? 'Not specified' },
    { label: 'Travellers', value: lead.travelers },
    { label: 'Preferred date', value: lead.preferredDate ? formatDate(lead.preferredDate) : 'Flexible' },
    { label: 'Duration', value: lead.duration ?? 'Not specified' },
    { label: 'Budget', value: lead.budget ?? 'Not specified' },
    { label: 'Travel style', value: lead.travelStyle ?? 'Not specified' },
    { label: 'Accommodation', value: lead.accommodationPreference ?? 'Not specified' },
    { label: 'Transport', value: lead.transport ?? 'Not specified' },
    { label: 'Activities', value: lead.activities ?? 'Not specified', wide: true },
    {
      label: 'Quoted so far',
      value: quoted > 0 ? formatCurrency(quoted) : 'Not yet quoted',
      wide: true,
    },
  ];

  return (
    <LeadDetail
      backHref="/dashboard/leads"
      backLabel="Back to leads"
      title={`Custom tour for ${lead.name}`}
      status={lead.status}
      createdAt={lead.createdAt}
      contact={{ name: lead.name, email: lead.email, phone: lead.phone }}
      fields={fields}
      message={lead.notes}
      aside={
        hasPermission(staff, PERMISSIONS.LEADS_MANAGE) ? (
          <LeadWorkspace
            endpoint="/api/dashboard/leads/custom-tour"
            id={lead.id}
            currentStatus={lead.status}
            statuses={STATUSES}
            staffNotes={lead.staffNotes}
            quotedAmount={quoted > 0 ? quoted : null}
            showQuote
            assignedToName={lead.assignedTo?.name}
            assignedToMe={lead.assignedTo?.id === staff.id}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            You can read this request but not change it.
          </p>
        )
      }
    />
  );
}
