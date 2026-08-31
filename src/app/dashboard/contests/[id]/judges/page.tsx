// src/app/dashboard/contests/[id]/judges/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Gavel } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { getAdminContest, listContestChildren } from '@/lib/data/admin-contest';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contest Judges',
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

  const rows = children.judges;

  return (
    <>
      <AdminPageHeader
        title={`Judges — ${contest.title}`}
        description="The people deciding the result. Shown on the contest page with their photo and role."
        actions={
          <div className="flex gap-2">
            <ButtonLink href={`/dashboard/contests/${id}`} size="sm" variant="outline">
              Back to contest
            </ButtonLink>
            <ButtonLink href={`/dashboard/contests/${id}/judges/new`} size="sm">
              Add judge
            </ButtonLink>
          </div>
        }
      />

      <AdminCard title={`${rows.length} judge${rows.length === 1 ? '' : 's'}`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="Nothing here yet"
            description="Add the judges so entrants know who is deciding."
            actionLabel="Add judge"
            actionHref={`/dashboard/contests/${id}/judges/new`}
          />
        ) : (
          <DataTable headers={['Name', 'Role', 'Profile', 'Order', '']} minWidth="46rem">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4 font-medium">{row.name}</td>
                <td className="py-3 pr-4 text-muted-foreground">{row.role ?? '—'}</td>
                <td className="py-3 pr-4 truncate text-xs text-muted-foreground">{row.profileUrl ?? '—'}</td>
                <td className="py-3 pr-4 tabular-nums">{row.sortOrder}</td>
                <td className="py-3">
                  <RowActions
                    editHref={`/dashboard/contests/${id}/judges/${row.id}`}
                    deleteEndpoint={`/api/dashboard/contests/judges/${row.id}`}
                    label={row.name}
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
