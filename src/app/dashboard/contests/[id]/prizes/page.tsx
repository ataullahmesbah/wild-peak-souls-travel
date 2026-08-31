// src/app/dashboard/contests/[id]/prizes/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Trophy } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { getAdminContest, listContestChildren } from '@/lib/data/admin-contest';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contest Prizes',
  robots: { index: false, follow: false },
};

export default async function ContestChildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.CONTEST_MANAGE);
  const { id } = await params;

  const [contest, children] = await Promise.all([
    getAdminContest(id),
    listContestChildren(id),
  ]);
  if (!contest) notFound();

  const rows = children.prizes;

  return (
    <>
      <AdminPageHeader
        title={`Prizes — ${contest.title}`}
        description="What the winners receive. Give first, second and third a placing so they line up with the podium."
        actions={
          <div className="flex gap-2">
            <ButtonLink href={`/dashboard/contests/${id}`} size="sm" variant="outline">
              Back to contest
            </ButtonLink>
            <ButtonLink href={`/dashboard/contests/${id}/prizes/new`} size="sm">
              Add prize
            </ButtonLink>
          </div>
        }
      />

      <AdminCard title={`${rows.length} prize${rows.length === 1 ? '' : 's'}`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Nothing here yet"
            description="Add the prizes so entrants can see what they are competing for."
            actionLabel="Add prize"
            actionHref={`/dashboard/contests/${id}/prizes/new`}
          />
        ) : (
          <DataTable headers={['Prize', 'Placing', 'Value', 'Order', '']} minWidth="46rem">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4 font-medium">{row.title}</td>
                <td className="py-3 pr-4 text-muted-foreground">{row.position > 0 ? row.position : '—'}</td>
                <td className="py-3 pr-4 text-muted-foreground">{row.value ?? '—'}</td>
                <td className="py-3 pr-4 tabular-nums">{row.sortOrder}</td>
                <td className="py-3">
                  <RowActions
                    editHref={`/dashboard/contests/${id}/prizes/${row.id}`}
                    deleteEndpoint={`/api/dashboard/contests/prizes/${row.id}`}
                    label={row.title}
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
