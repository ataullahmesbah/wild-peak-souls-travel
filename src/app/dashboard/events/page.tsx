import type { Metadata } from 'next';

import { StatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';
import { EmptyState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { AdminCard, AdminPageHeader, DataTable, TabLinks } from '@/components/admin/admin-ui';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminEvents } from '@/lib/data/admin';
import { cn, formatCurrency, formatDateRange, parsePageParam, toNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Events',
  robots: { index: false, follow: false },
};

const TABS = [
  { value: '', label: 'All' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SOLD_OUT', label: 'Sold out' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.EVENTS_READ);

  const params = await searchParams;
  const status = first(params.status) ?? '';
  const page = parsePageParam(first(params.page));

  const result = await listAdminEvents({ page, status: status || undefined });

  return (
    <>
      <AdminPageHeader
        title="Events"
        description="Fixed-date departures. Seat counts here are live — they reflect the same reservedSeats value the booking transaction guards against."
        actions={
          hasPermission(staff, PERMISSIONS.EVENTS_CREATE) ? (
            <ButtonLink href="/dashboard/events/new" size="sm">
              New event
            </ButtonLink>
          ) : undefined
        }
      />

      <TabLinks tabs={TABS} current={status} basePath="/dashboard/events" />

      <AdminCard title={`${result.total} event${result.total === 1 ? '' : 's'}`}>
        {result.items.length === 0 ? (
          <EmptyState
            title="No events in this state"
            description="Events created in the CMS will be listed here with their live capacity."
          />
        ) : (
          <>
            <DataTable
              headers={['Event', 'Destination', 'Dates', 'Capacity', 'Price', 'Status', '']}
              minWidth="58rem"
            >
              {result.items.map((event) => {
                const available = Math.max(0, event.capacity - event.reservedSeats);
                const fillRate =
                  event.capacity > 0
                    ? Math.round((event.reservedSeats / event.capacity) * 100)
                    : 0;

                return (
                  <tr key={event.id} className="transition-colors hover:bg-muted/40">
                    <td className="py-3 pr-4">
                      <p className="max-w-56 truncate font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">/{event.slug}</p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {event.destination?.name ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDateRange(event.startAt, event.endAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-sm">
                        {event.reservedSeats} / {event.capacity}
                      </p>
                      <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            fillRate >= 100
                              ? 'bg-destructive'
                              : fillRate >= 80
                                ? 'bg-warning'
                                : 'bg-primary',
                          )}
                          style={{ width: `${Math.min(100, fillRate)}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {available} left
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">
                        {formatCurrency(event.discountPrice ?? event.price)}
                      </p>
                      {event.discountPrice &&
                        toNumber(event.discountPrice) < toNumber(event.price) && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(event.price)}
                          </p>
                        )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={event.status} />
                        {event.featured && (
                          <span className="rounded-full bg-accent/12 px-2 py-0.5 text-xs text-accent">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <RowActions
                        editHref={`/dashboard/events/${event.id}`}
                        deleteEndpoint={`/api/dashboard/events/${event.id}`}
                        label={event.title}
                        canDelete={hasPermission(staff, PERMISSIONS.EVENTS_DELETE)}
                        previewHref={`/events/${event.slug}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </DataTable>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              basePath="/dashboard/events"
              searchParams={{ status }}
            />
          </>
        )}
      </AdminCard>
    </>
  );
}
