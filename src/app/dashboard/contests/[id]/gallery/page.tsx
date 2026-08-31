// src/app/dashboard/contests/[id]/gallery/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Images } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { getAdminContest, listContestChildren } from '@/lib/data/admin-contest';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contest Gallery',
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

  const rows = children.gallery;

  return (
    <>
      <AdminPageHeader
        title={`Gallery — ${contest.title}`}
        description="Pictures you add yourself — the location, last year\u2019s winners, the prizes. Nothing entrants upload appears here."
        actions={
          <div className="flex gap-2">
            <ButtonLink href={`/dashboard/contests/${id}`} size="sm" variant="outline">
              Back to contest
            </ButtonLink>
            <ButtonLink href={`/dashboard/contests/${id}/gallery/new`} size="sm">
              Add gallery image
            </ButtonLink>
          </div>
        }
      />

      <AdminCard title={`${rows.length} gallery image${rows.length === 1 ? '' : 's'}`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Nothing here yet"
            description="Add a few pictures to show what the contest is about."
            actionLabel="Add gallery image"
            actionHref={`/dashboard/contests/${id}/gallery/new`}
          />
        ) : (
          <DataTable headers={['Caption', 'Order', '']} minWidth="46rem">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">{row.caption ?? '—'}</td>
                <td className="py-3 pr-4 tabular-nums">{row.sortOrder}</td>
                <td className="py-3">
                  <RowActions
                    editHref={`/dashboard/contests/${id}/gallery/${row.id}`}
                    deleteEndpoint={`/api/dashboard/contests/gallery/${row.id}`}
                    label={row.caption ?? 'Gallery image'}
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
