import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { LeadStatusForm } from '@/components/admin/lead-status-form';
import { requirePermissionPage, hasPermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminLeads } from '@/lib/data/admin';
import { formatCurrency, formatDate, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Leads',
  robots: { index: false, follow: false },
};

const CONTACT_STATUSES = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const TOUR_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUOTED',
  'NEGOTIATING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];
const FLIGHT_STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default async function AdminLeadsPage() {
  const staff = await requirePermissionPage(PERMISSIONS.LEADS_READ);
  const { contacts, customTours, flights } = await listAdminLeads();

  const canManage = hasPermission(staff, PERMISSIONS.LEADS_MANAGE);
  const canManageFlights = hasPermission(staff, PERMISSIONS.FLIGHTS_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="Leads"
        description="Custom tour requests, contact messages and flight enquiries — everything a customer sent that is not yet a booking."
      />

      <div className="space-y-6">
        <AdminCard
          title="Custom tour requests"
          description="Plan and quote these directly with the customer."
        >
          {customTours.length === 0 ? (
            <EmptyState title="No custom tour requests" description="Requests from /custom-tour arrive here." />
          ) : (
            <DataTable
              headers={['Customer', 'Trip', 'Budget', 'Received', 'Quoted', 'Status', '', canManage ? 'Update' : '']}
              minWidth="66rem"
            >
              {customTours.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 pr-4">
                    <p className="max-w-36 truncate font-medium">{lead.name}</p>
                    <p className="max-w-36 truncate text-xs text-muted-foreground">{lead.email}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p>{lead.destination ?? 'Flexible'}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.travelers} traveller{lead.travelers === 1 ? '' : 's'}
                      {lead.preferredDate ? ` · ${formatDate(lead.preferredDate)}` : ''}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{lead.budget ?? '—'}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(lead.createdAt)}
                    {lead.assignedTo && <p className="mt-0.5">with {lead.assignedTo.name}</p>}
                  </td>
                  <td className="py-3 pr-4">
                    {lead.quotedAmount ? formatCurrency(lead.quotedAmount) : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/dashboard/leads/custom-tours/${lead.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                  {canManage && (
                    <td className="py-3">
                      <LeadStatusForm
                        endpoint="/api/dashboard/leads/custom-tour"
                        idField="requestId"
                        id={lead.id}
                        currentStatus={lead.status}
                        statuses={TOUR_STATUSES}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </DataTable>
          )}
        </AdminCard>

        <AdminCard title="Contact messages">
          {contacts.length === 0 ? (
            <EmptyState title="No contact messages" description="Submissions from /contact arrive here." />
          ) : (
            <DataTable
              headers={['From', 'Subject', 'Message', 'Received', 'Status', '', canManage ? 'Update' : '']}
              minWidth="62rem"
            >
              {contacts.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 pr-4">
                    <p className="max-w-36 truncate font-medium">{lead.name}</p>
                    <p className="max-w-36 truncate text-xs text-muted-foreground">{lead.email}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </td>
                  <td className="py-3 pr-4">{lead.subject ?? 'General enquiry'}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {truncate(lead.description, 90)}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/dashboard/leads/contact/${lead.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                  {canManage && (
                    <td className="py-3">
                      <LeadStatusForm
                        endpoint="/api/dashboard/leads/contact"
                        idField="requestId"
                        id={lead.id}
                        currentStatus={lead.status}
                        statuses={CONTACT_STATUSES}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </DataTable>
          )}
        </AdminCard>

        <AdminCard
          title="Flight enquiries"
          description="The price shown is what the customer saw on the site — always re-check the live fare before quoting."
        >
          {flights.length === 0 ? (
            <EmptyState title="No flight enquiries" description="Requests from the flight explorer arrive here." />
          ) : (
            <DataTable
              headers={['Customer', 'Route', 'Pax', 'Shown price', 'Received', 'Status', '', canManageFlights ? 'Update' : '']}
              minWidth="64rem"
            >
              {flights.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 pr-4">
                    <p className="max-w-36 truncate font-medium">{lead.name}</p>
                    <p className="max-w-36 truncate text-xs text-muted-foreground">{lead.email}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p>
                      {lead.origin} → {lead.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead.airline ?? '—'} {lead.flightNumber ?? ''}
                      {lead.departureDate ? ` · ${formatDate(lead.departureDate)}` : ''}
                    </p>
                  </td>
                  <td className="py-3 pr-4">{lead.passengers}</td>
                  <td className="py-3 pr-4">
                    {lead.displayedPrice ? (
                      <>
                        <span>{formatCurrency(lead.displayedPrice)}</span>
                        <p className="text-xs text-warning">indicative</p>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/dashboard/flights/inquiries/${lead.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                  {canManageFlights && (
                    <td className="py-3">
                      <LeadStatusForm
                        endpoint="/api/dashboard/leads/flight"
                        idField="requestId"
                        id={lead.id}
                        currentStatus={lead.status}
                        statuses={FLIGHT_STATUSES}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </DataTable>
          )}
        </AdminCard>
      </div>
    </>
  );
}
