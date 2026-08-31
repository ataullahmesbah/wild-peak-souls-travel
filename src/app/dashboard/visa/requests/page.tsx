import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { LeadStatusForm } from '@/components/admin/lead-status-form';
import { requirePermissionPage, hasPermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminVisaRequests } from '@/lib/data/admin';
import { formatDate, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Visa Requests',
  robots: { index: false, follow: false },
};

const VISA_STATUSES = [
  'NEW',
  'CONTACTED',
  'DOCUMENTS_REQUESTED',
  'DOCUMENTS_RECEIVED',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
];

export default async function AdminVisaRequestsPage() {
  const staff = await requirePermissionPage(PERMISSIONS.VISA_READ);
  const requests = await listAdminVisaRequests();
  const canManage = hasPermission(staff, PERMISSIONS.VISA_REQUESTS_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="Visa requests"
        description="Assistance requests submitted from visa detail pages, with the workflow state for each."
      />

      <AdminCard title={`${requests.length} request${requests.length === 1 ? '' : 's'}`}>
        {requests.length === 0 ? (
          <EmptyState
            title="No visa requests yet"
            description="Requests submitted from the public visa pages land here."
          />
        ) : (
          <DataTable
            headers={['Applicant', 'Visa', 'Nationality', 'Message', 'Received', 'Status', '', canManage ? 'Update' : '']}
            minWidth="66rem"
          >
            {requests.map((request) => (
              <tr key={request.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="max-w-36 truncate font-medium">{request.name}</p>
                  <p className="max-w-36 truncate text-xs text-muted-foreground">
                    {request.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{request.phone}</p>
                </td>
                <td className="py-3 pr-4">
                  {request.visaType
                    ? `${request.visaType.country.name} — ${request.visaType.name}`
                    : 'General enquiry'}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{request.nationality}</td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {request.message ? truncate(request.message, 70) : '—'}
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {formatDate(request.createdAt)}
                  {request.assignedTo && (
                    <p className="mt-0.5">with {request.assignedTo.name}</p>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={request.status} />
                </td>
                <td className="py-3 pr-4">
                  <Link
                    href={`/dashboard/visa/requests/${request.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    View
                  </Link>
                </td>
                {canManage && (
                  <td className="py-3">
                    <LeadStatusForm
                      endpoint="/api/dashboard/leads/visa"
                      idField="requestId"
                      id={request.id}
                      currentStatus={request.status}
                      statuses={VISA_STATUSES}
                    />
                  </td>
                )}
              </tr>
            ))}
          </DataTable>
        )}
      </AdminCard>
    </>
  );
}
