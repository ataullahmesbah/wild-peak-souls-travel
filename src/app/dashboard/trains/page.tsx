// src/app/dashboard/trains/page.tsx
import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';
import { RefreshSchedulesButton } from '@/components/admin/refresh-schedules-button';

import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { prisma } from '@/lib/prisma';
import { formatDateTime, minutesToDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Train Schedule',
  robots: { index: false, follow: false },
};

export default async function AdminTrainsPage() {
  const staff = await requirePermissionPage(PERMISSIONS.TRAINS_MANAGE);

  const trains = await prisma.trainSchedule.findMany({
    orderBy: [{ originStation: 'asc' }, { departureTime: 'asc' }],
    take: 200,
  });

  return (
    <>
      <AdminPageHeader
        title="Train schedule"
        description="Informational Bangladesh Railway timings shown on the public site. Keep the source timestamp current so travellers know how fresh the data is — we do not sell rail tickets."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshSchedulesButton kind="trains" />
            <ButtonLink href="/dashboard/trains/new" size="sm">
              New train service
            </ButtonLink>
          </div>
        }
      />

      <AdminCard title={`${trains.length} scheduled service${trains.length === 1 ? '' : 's'}`}>
        {trains.length === 0 ? (
          <EmptyState
            title="No train schedules loaded"
            description="Run the seed script or import a schedule to populate the public train page."
          />
        ) : (
          <DataTable
            headers={['Train', 'Route', 'Departs', 'Arrives', 'Duration', 'Off day', 'Source', 'Active', '']}
            minWidth="66rem"
          >
            {trains.map((train) => (
              <tr key={train.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="font-medium">{train.trainName}</p>
                  <p className="text-xs text-muted-foreground">{train.trainNumber ?? '—'}</p>
                </td>
                <td className="py-3 pr-4">
                  {train.originStation} → {train.destinationStation}
                </td>
                <td className="py-3 pr-4 font-medium">{train.departureTime}</td>
                <td className="py-3 pr-4 font-medium">{train.arrivalTime}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {minutesToDuration(train.durationMinutes)}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{train.offDay ?? 'Daily'}</td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  <p>{train.source.replace(/_/g, ' ').toLowerCase()}</p>
                  <p>{formatDateTime(train.sourceUpdatedAt)}</p>
                </td>
                <td className="py-3">
                  {train.active ? (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Hidden
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/trains/${train.id}`}
                    deleteEndpoint={`/api/dashboard/train-schedules/${train.id}`}
                    label={train.trainName}
                    canDelete={hasPermission(staff, PERMISSIONS.TRAINS_MANAGE)}
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
