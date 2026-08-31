import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LeadDetail, type DetailField } from '@/components/admin/lead-detail';
import { LeadWorkspace } from '@/components/admin/lead-workspace';
import { prisma } from '@/lib/prisma';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Visa request',
  robots: { index: false, follow: false },
};

const STATUSES = [
  'NEW',
  'CONTACTED',
  'DOCUMENTS_REQUESTED',
  'DOCUMENTS_RECEIVED',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
];

export default async function VisaRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.VISA_REQUESTS_MANAGE);
  const { id } = await params;

  const request = await prisma.visaRequest.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      visaType: { select: { name: true, slug: true, country: { select: { name: true, slug: true } } } },
    },
  });
  if (!request) notFound();

  const fields: DetailField[] = [
    { label: 'Nationality', value: request.nationality },
    {
      label: 'Visa applied for',
      value: request.visaType ? (
        <Link
          href={`/visa/${request.visaType.country.slug}/${request.visaType.slug}`}
          target="_blank"
          className="text-primary hover:underline"
        >
          {request.visaType.country.name} — {request.visaType.name}
        </Link>
      ) : (
        'Not specified'
      ),
      wide: true,
    },
  ];

  return (
    <LeadDetail
      backHref="/dashboard/visa/requests"
      backLabel="Back to visa requests"
      title={`Visa request from ${request.name}`}
      status={request.status}
      createdAt={request.createdAt}
      contact={{ name: request.name, email: request.email, phone: request.phone }}
      fields={fields}
      message={request.message}
      aside={
        hasPermission(staff, PERMISSIONS.VISA_REQUESTS_MANAGE) ? (
          <LeadWorkspace
            endpoint="/api/dashboard/leads/visa"
            id={request.id}
            currentStatus={request.status}
            statuses={STATUSES}
            staffNotes={request.staffNotes}
            assignedToName={request.assignedTo?.name}
            assignedToMe={request.assignedTo?.id === staff.id}
          />
        ) : null
      }
    />
  );
}
