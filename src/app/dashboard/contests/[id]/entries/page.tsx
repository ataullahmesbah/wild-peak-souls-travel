// src/app/dashboard/contests/[id]/entries/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Users } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, TabLinks } from '@/components/admin/admin-ui';
import { ContestEntryActions } from '@/components/admin/contest-entry-actions';
import { EntryMedia } from '@/components/contest/entry-media';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { getAdminContest, listAdminEntries } from '@/lib/data/admin-contest';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contest entries',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ContestEntriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.CONTEST_READ);
  const { id } = await params;
  const query = await searchParams;
  const status = first(query.status) ?? 'PENDING';
  const search = first(query.q);

  const contest = await getAdminContest(id);
  if (!contest) notFound();

  const { rows, counts } = await listAdminEntries(id, {
    status: status || undefined,
    query: search,
  });

  const canModerate = hasPermission(staff, PERMISSIONS.CONTEST_ENTRIES_MODERATE);
  const canJudge = hasPermission(staff, PERMISSIONS.CONTEST_JUDGE);

  const tabs = [
    { value: 'PENDING', label: `Pending (${counts.PENDING ?? 0})` },
    { value: 'APPROVED', label: `Approved (${counts.APPROVED ?? 0})` },
    { value: 'SHORTLISTED', label: `Shortlist (${counts.SHORTLISTED ?? 0})` },
    { value: 'WINNER', label: `Winners (${counts.WINNER ?? 0})` },
    { value: 'REJECTED', label: `Rejected (${counts.REJECTED ?? 0})` },
    { value: '', label: `All (${counts.ALL ?? 0})` },
  ];

  return (
    <>
      <AdminPageHeader
        title={`Entries — ${contest.title}`}
        description={`The public vote counts for ${contest.publicVoteWeight}% of the combined score; the judges' mark carries the rest. Shortlist up to ${contest.shortlistSize}.`}
        actions={
          <ButtonLink href={`/dashboard/contests/${id}`} size="sm" variant="outline">
            Contest settings
          </ButtonLink>
        }
      />

      <TabLinks tabs={tabs} current={status} basePath={`/dashboard/contests/${id}/entries`} />

      <AdminCard title={`${rows.length} shown`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nothing in this queue"
            description="Entries people submit arrive here for review before they appear on the site."
          />
        ) : (
          <ul className="space-y-6">
            {rows.map((entry) => (
              <li key={entry.id} className="rounded-field border border-border p-5">
                <div className="flex flex-col gap-5 lg:flex-row">
                  <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-field bg-muted lg:w-72">
                    <EntryMedia
                      media={entry.media}
                      alt={`Entry by ${entry.entrantName}`}
                      sizes="288px"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-base font-semibold">
                          {entry.entrantName}
                          {entry.rank !== null && (
                            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                              {entry.rank === 1 ? '1st' : entry.rank === 2 ? '2nd' : '3rd'} place
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entry.location} · {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm">{entry.description}</p>

                    <dl className="mt-4 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Email</dt>
                        <dd className="truncate">{entry.entrantEmail}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd>{entry.entrantPhone}</dd>
                      </div>
                      {entry.socialUrl && (
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">Profile</dt>
                          <dd className="truncate">
                            <a
                              href={entry.socialUrl}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="text-primary hover:underline"
                            >
                              {entry.socialUrl}
                            </a>
                          </dd>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Account</dt>
                        <dd className="truncate">{entry.user?.email ?? '—'}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">File</dt>
                        <dd>
                          {entry.media?.type === 'video'
                            ? `Video, ${entry.media.durationSeconds ?? '?'}s`
                            : 'Photo'}
                          {entry.media?.size
                            ? ` · ${(entry.media.size / (1024 * 1024)).toFixed(1)} MB`
                            : ''}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Public votes</dt>
                        <dd className="tabular-nums">{entry.voteCount}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Judges&rsquo; mark</dt>
                        <dd className="tabular-nums">{entry.judgeScore ?? '—'}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="font-medium">Combined score</dt>
                        <dd className="font-medium tabular-nums">{entry.combined}</dd>
                      </div>
                    </dl>

                    {entry.moderationNote && (
                      <p className="mt-3 text-xs text-warning">Note: {entry.moderationNote}</p>
                    )}
                    {entry.moderatedBy && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last decided by {entry.moderatedBy.name}
                      </p>
                    )}

                    {canModerate && (
                      <div className="mt-4 border-t border-border pt-4">
                        <ContestEntryActions
                          entryId={entry.id}
                          status={entry.status}
                          judgeScore={entry.judgeScore}
                          rank={entry.rank}
                          canJudge={canJudge}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </>
  );
}
