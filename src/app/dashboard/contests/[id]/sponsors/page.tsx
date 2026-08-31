// src/app/dashboard/contests/[id]/sponsors/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Handshake } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { getAdminContest, listContestChildren } from '@/lib/data/admin-contest';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contest Sponsors',
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

  const rows = children.sponsors;

  return (
    <>
      <AdminPageHeader
        title={`Sponsors — ${contest.title}`}
        description="Partners backing the contest. Their logos link out as sponsored links."
        actions={
          <div className="flex gap-2">
            <ButtonLink href={`/dashboard/contests/${id}`} size="sm" variant="outline">
              Back to contest
            </ButtonLink>
            <ButtonLink href={`/dashboard/contests/${id}/sponsors/new`} size="sm">
              Add sponsor
            </ButtonLink>
          </div>
        }
      />

      <AdminCard title={`${rows.length} sponsor${rows.length === 1 ? '' : 's'}`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="Nothing here yet"
            description="Add sponsors to credit them on the contest page."
            actionLabel="Add sponsor"
            actionHref={`/dashboard/contests/${id}/sponsors/new`}
          />
        ) : (
          <DataTable headers={['Name', 'Tier', 'Website', 'Order', '']} minWidth="46rem">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4 font-medium">{row.name}</td>
                <td className="py-3 pr-4 text-muted-foreground">{row.tier ?? '—'}</td>
                <td className="py-3 pr-4 truncate text-xs text-muted-foreground">{row.websiteUrl ?? '—'}</td>
                <td className="py-3 pr-4 tabular-nums">{row.sortOrder}</td>
                <td className="py-3">
                  <RowActions
                    editHref={`/dashboard/contests/${id}/sponsors/${row.id}`}
                    deleteEndpoint={`/api/dashboard/contests/sponsors/${row.id}`}
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
