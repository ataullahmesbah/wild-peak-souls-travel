// src/app/dashboard/contests/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, Users } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { countPendingEntries, listAdminContests } from '@/lib/data/admin-contest';
import { contestPhase, phaseLabel } from '@/lib/contest/phase';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contests',
  robots: { index: false, follow: false },
};

export default async function AdminContestsPage() {
  const staff = await requirePermissionPage(PERMISSIONS.CONTEST_READ);
  const [contests, pending] = await Promise.all([listAdminContests(), countPendingEntries()]);

  const canManage = hasPermission(staff, PERMISSIONS.CONTEST_MANAGE);
  const canDelete = hasPermission(staff, PERMISSIONS.CONTEST_DELETE);

  return (
    <>
      <AdminPageHeader
        title="Contests"
        description="Photo and video contests. The dates decide what the public sees — the entry form, the voting round and the winners each appear on their own."
        actions={
          canManage ? (
            <ButtonLink href="/dashboard/contests/new" size="sm">
              New contest
            </ButtonLink>
          ) : null
        }
      />

      {pending > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-field border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
          <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {pending} {pending === 1 ? 'entry is' : 'entries are'} waiting for review.
          </span>
        </div>
      )}

      <AdminCard title={`${contests.length} contest${contests.length === 1 ? '' : 's'}`}>
        {contests.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No contests yet"
            description="Create one, set its dates, and the page builds itself from there."
            actionLabel={canManage ? 'New contest' : undefined}
            actionHref={canManage ? '/dashboard/contests/new' : undefined}
          />
        ) : (
          <DataTable
            headers={['Contest', 'Status', 'Phase now', 'Entries', 'Votes', 'Closes', '']}
            minWidth="62rem"
          >
            {contests.map((contest) => (
              <tr key={contest.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <Link
                    href={`/dashboard/contests/${contest.id}/entries`}
                    className="font-medium hover:text-primary"
                  >
                    {contest.title}
                  </Link>
                  <span className="block text-xs text-muted-foreground">/contest/{contest.slug}</span>
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={contest.status} />
                </td>
                <td className="py-3 pr-4 text-sm text-muted-foreground">
                  {phaseLabel(contestPhase(contest))}
                </td>
                <td className="py-3 pr-4 tabular-nums">{contest._count.entries}</td>
                <td className="py-3 pr-4 tabular-nums">{contest._count.votes}</td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {formatDate(contest.entryDeadline)}
                </td>
                <td className="py-3">
                  <RowActions
                    editHref={`/dashboard/contests/${contest.id}`}
                    deleteEndpoint={canDelete ? `/api/dashboard/contests/${contest.id}` : undefined}
                    canDelete={canDelete}
                    label={contest.title}
                    previewHref={contest.status === 'PUBLISHED' ? `/contest/${contest.slug}` : undefined}
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
