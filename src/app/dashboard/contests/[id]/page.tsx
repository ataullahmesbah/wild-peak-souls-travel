// src/app/dashboard/contests/[id]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink, Gavel, Handshake, Images, Trophy, Users } from 'lucide-react';

import { AdminCard, AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { contestFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { listContestChildren } from '@/lib/data/admin-contest';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { contestPhase, phaseLabel } from '@/lib/contest/phase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit contest',
  robots: { index: false, follow: false },
};

/** The child collections, each a link out to its own small manager. */
function ChildLinks({ id, counts }: { id: string; counts: Record<string, number> }) {
  const links = [
    { href: `entries`, label: 'Entries', icon: Users, count: counts.entries },
    { href: `prizes`, label: 'Prizes', icon: Trophy, count: counts.prizes },
    { href: `judges`, label: 'Judges', icon: Gavel, count: counts.judges },
    { href: `sponsors`, label: 'Sponsors', icon: Handshake, count: counts.sponsors },
    { href: `gallery`, label: 'Gallery', icon: Images, count: counts.gallery },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {links.map((link) => (
        <Link
          key={link.href}
          href={`/dashboard/contests/${id}/${link.href}`}
          className="flex items-center gap-3 rounded-field border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-primary/5"
        >
          <link.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{link.label}</span>
            <span className="block text-xs text-muted-foreground">
              {link.count} {link.count === 1 ? 'item' : 'items'}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function EditContestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.CONTEST_MANAGE);
  const { id } = await params;

  const [record, children] = await Promise.all([
    loadForEdit('contest', id),
    listContestChildren(id),
  ]);

  const slug = String(record.slug ?? '');
  const published = record.status === 'PUBLISHED';
  const phase = contestPhase({
    status: String(record.status),
    startAt: new Date(String(record.startAt)),
    entryDeadline: new Date(String(record.entryDeadline)),
    votingStartAt: record.votingStartAt ? new Date(String(record.votingStartAt)) : null,
    votingEndAt: record.votingEndAt ? new Date(String(record.votingEndAt)) : null,
    resultsAt: record.resultsAt ? new Date(String(record.resultsAt)) : null,
  });

  return (
    <>
      <AdminPageHeader
        title={String(record.title ?? 'Edit contest')}
        description={`Right now this contest is: ${phaseLabel(phase).toLowerCase()}. That follows from the dates below — there is nothing to switch on.`}
        actions={
          published ? (
            <Link
              href={`/contest/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View on the site
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null
        }
      />

      <AdminCard title="Sections" className="mb-6">
        <ChildLinks
          id={id}
          counts={{
            entries: 0,
            prizes: children.prizes.length,
            judges: children.judges.length,
            sponsors: children.sponsors.length,
            gallery: children.gallery.length,
          }}
        />
      </AdminCard>

      <ResourceForm
        endpoint={`/api/dashboard/contests/${id}`}
        method="PATCH"
        groups={contestFields()}
        values={toFormValues(record)}
        cancelHref="/dashboard/contests"
        redirectTo="/dashboard/contests"
        successMessage="Contest updated."
      />
    </>
  );
}
