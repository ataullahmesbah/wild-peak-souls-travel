import type { Metadata } from 'next';
import { FileCheck2, Plane, Send, Sparkles } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { Panel } from '@/components/account/panels';
import { requireUserPage } from '@/lib/rbac/guard';
import { listMyRequests } from '@/lib/data/account';
import { formatCurrency, formatDate, formatDateTime, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Requests',
  robots: { index: false, follow: false },
};

export default async function MyRequestsPage() {
  const user = await requireUserPage();
  const { visa, customTours, flights, contacts } = await listMyRequests(user.id);

  const total = visa.length + customTours.length + flights.length + contacts.length;

  if (total === 0) {
    return (
      <Panel title="My requests">
        <EmptyState
          icon={Send}
          title="No requests yet"
          description="Visa assistance, custom trips, flight enquiries and contact messages you send will be tracked here."
          actionLabel="Request a custom trip"
          actionHref="/custom-tour"
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {visa.length > 0 && (
        <Panel
          title="Visa requests"
          description="Assistance requests and where each one has reached."
        >
          <ul className="divide-y divide-border">
            {visa.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {request.visaType
                        ? `${request.visaType.country.name} — ${request.visaType.name}`
                        : 'General visa enquiry'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.nationality} · submitted {formatDate(request.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {customTours.length > 0 && (
        <Panel title="Custom tour requests">
          <ul className="divide-y divide-border">
            {customTours.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {request.destination ?? 'Destination flexible'} · {request.travelers}{' '}
                      traveller{request.travelers === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.preferredDate
                        ? `Preferred ${formatDate(request.preferredDate)} · `
                        : ''}
                      submitted {formatDate(request.createdAt)}
                      {request.quotedAmount
                        ? ` · quoted ${formatCurrency(request.quotedAmount)}`
                        : ''}
                    </p>
                  </div>
                </div>
                <StatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {flights.length > 0 && (
        <Panel
          title="Flight enquiries"
          description="Requests are quoted against the live airline fare before anything is charged."
        >
          <ul className="divide-y divide-border">
            {flights.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Plane className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {request.origin} → {request.destination}
                      {request.airline ? ` · ${request.airline}` : ''}
                      {request.flightNumber ? ` ${request.flightNumber}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.passengers} passenger{request.passengers === 1 ? '' : 's'}
                      {request.departureDate
                        ? ` · ${formatDate(request.departureDate)}`
                        : ''}{' '}
                      · submitted {formatDate(request.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {contacts.length > 0 && (
        <Panel title="Contact messages">
          <ul className="divide-y divide-border">
            {contacts.map((request) => (
              <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {request.subject ?? 'General enquiry'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {truncate(request.description, 110)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(request.createdAt)}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Start something new">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/custom-tour" size="sm">
            Custom trip
          </ButtonLink>
          <ButtonLink href="/visa" variant="outline" size="sm">
            Visa assistance
          </ButtonLink>
          <ButtonLink href="/flights" variant="outline" size="sm">
            Flight enquiry
          </ButtonLink>
        </div>
      </Panel>
    </div>
  );
}
