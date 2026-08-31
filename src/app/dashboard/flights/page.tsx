// src/app/dashboard/flights/page.tsx
import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { RowActions } from '@/components/admin/row-actions';
import { RefreshSchedulesButton } from '@/components/admin/refresh-schedules-button';
import { prisma } from '@/lib/prisma';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { formatCurrency, minutesToDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Flight routes',
  robots: { index: false, follow: false },
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function daysLabel(value: string): string {
  const days = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((day) => day >= 1 && day <= 7);
  if (days.length === 7) return 'Daily';
  if (days.length === 0) return '—';
  return days.map((day) => DAY_LABELS[day - 1]).join(', ');
}

export default async function AdminFlightsPage() {
  const staff = await requirePermissionPage(PERMISSIONS.FLIGHTS_MANAGE);

  const routes = await prisma.flightRoute.findMany({
    orderBy: [{ originIata: 'asc' }, { departureTime: 'asc' }],
    take: 200,
  });

  return (
    <>
      <AdminPageHeader
        title="Flight routes"
        description="Schedules shown on the public flights page. These are indicative timings maintained here; where an airline feed is reachable, live data is shown instead and labelled as such."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshSchedulesButton kind="flights" />
            <ButtonLink href="/dashboard/flights/new" size="sm">
              New flight route
            </ButtonLink>
          </div>
        }
      />

      <AdminCard title={`${routes.length} route${routes.length === 1 ? '' : 's'}`}>
        {routes.length === 0 ? (
          <EmptyState
            title="No flight routes"
            description="Add a route so travellers can compare timings on the flights page."
          />
        ) : (
          <DataTable
            headers={['Flight', 'Route', 'Times', 'Duration', 'Days', 'From', 'Status', '']}
            minWidth="64rem"
          >
            {routes.map((route) => (
              <tr key={route.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="font-medium">{route.flightNumber}</p>
                  <p className="text-xs text-muted-foreground">{route.airline}</p>
                </td>
                <td className="py-3 pr-4 font-medium">
                  {route.originIata} → {route.destinationIata}
                </td>
                <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                  {route.departureTime} – {route.arrivalTime}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {minutesToDuration(route.durationMinutes)}
                  {route.stops > 0 && (
                    <span className="ml-1 text-xs">
                      · {route.stops} stop{route.stops === 1 ? '' : 's'}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {daysLabel(route.daysOfWeek)}
                </td>
                <td className="py-3 pr-4">
                  {route.indicativePrice ? formatCurrency(route.indicativePrice) : '—'}
                </td>
                <td className="py-3 pr-4">
                  {route.active ? (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Hidden
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/flights/${route.id}`}
                    deleteEndpoint={`/api/dashboard/flight-routes/${route.id}`}
                    label={`${route.flightNumber} (${route.originIata}–${route.destinationIata})`}
                    canDelete={hasPermission(staff, PERMISSIONS.FLIGHTS_MANAGE)}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminCard>
    </>
  );
}
