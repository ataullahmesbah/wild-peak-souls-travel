import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LeadDetail } from '@/components/admin/lead-detail';
import { LeadWorkspace } from '@/components/admin/lead-workspace';
import { prisma } from '@/lib/prisma';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact message',
  robots: { index: false, follow: false },
};

const STATUSES = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default async function ContactLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.LEADS_READ);
  const { id } = await params;

  const lead = await prisma.contactRequest.findUnique({
    where: { id },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
  if (!lead) notFound();

  return (
    <LeadDetail
      backHref="/dashboard/leads"
      backLabel="Back to leads"
      title={lead.subject || 'Contact message'}
      status={lead.status}
      createdAt={lead.createdAt}
      contact={{ name: lead.name, email: lead.email, phone: lead.phone }}
      fields={lead.subject ? [{ label: 'Subject', value: lead.subject, wide: true }] : []}
      message={lead.description}
      aside={
        hasPermission(staff, PERMISSIONS.LEADS_MANAGE) ? (
          <LeadWorkspace
            endpoint="/api/dashboard/leads/contact"
            id={lead.id}
            currentStatus={lead.status}
            statuses={STATUSES}
            staffNotes={lead.staffNotes}
            assignedToName={lead.assignedTo?.name}
            assignedToMe={lead.assignedTo?.id === staff.id}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            You can read this lead but not change it.
            {lead.assignedTo && ` It is owned by ${lead.assignedTo.name}.`}
          </p>
        )
      }
    />
  );
}
