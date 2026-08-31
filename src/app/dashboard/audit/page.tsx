import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAuditLogs } from '@/lib/data/admin';
import { describeAudit } from '@/lib/audit-describe';
import { formatDateTime, parsePageParam, relativeTime, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Audit Log',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermissionPage(PERMISSIONS.AUDIT_READ);

  const params = await searchParams;
  const page = parsePageParam(first(params.page));
  const query = first(params.q);

  const result = await listAuditLogs({ page, query });

  return (
    <>
      <AdminPageHeader
        title="Audit log"
        description="An append-only record of security- and money-sensitive actions. These entries cannot be edited or deleted from the dashboard."
      />

      <AdminCard
        title={`${result.total.toLocaleString()} entr${result.total === 1 ? 'y' : 'ies'}`}
        action={
          <form action="/dashboard/audit" className="w-full sm:w-72">
            <label htmlFor="audit-search" className="sr-only">
              Search the audit log
            </label>
            <input
              id="audit-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Who, what or which record…"
              className="h-9 w-full rounded-field border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none"
            />
          </form>
        }
      >
        {result.items.length === 0 ? (
          <EmptyState
            title="No audit entries match"
            description="Actions like logins, role changes and payment verifications are recorded here as they happen."
          />
        ) : (
          <>
            <DataTable
              headers={['When', 'Who', 'What happened', 'Record', 'IP']}
              minWidth="62rem"
            >
              {result.items.map((entry) => {
                const described = describeAudit(entry.action, entry.metadata);
                return (
                <tr key={entry.id} className="transition-colors hover:bg-muted/40">
                  <td className="whitespace-nowrap py-3 pr-4 text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                    <p className="mt-0.5">{relativeTime(entry.createdAt)}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="max-w-36 truncate text-sm">
                      {entry.actor?.name ?? entry.actorLabel ?? 'System'}
                    </p>
                    {entry.actor?.email && (
                      <p className="max-w-36 truncate text-xs text-muted-foreground">
                        {entry.actor.email}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-sm font-medium">{described.summary}</p>
                    {described.detail && (
                      <p className="mt-0.5 max-w-80 text-xs text-muted-foreground">
                        {truncate(described.detail, 110)}
                      </p>
                    )}
                    <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
                      {entry.action}
                    </code>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {entry.entityType ?? '—'}
                    {entry.entityId && (
                      <p className="max-w-32 truncate font-mono">{entry.entityId}</p>
                    )}
                  </td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">
                    {entry.ipAddress ?? '—'}
                  </td>
                </tr>
                );
              })}
            </DataTable>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              basePath="/dashboard/audit"
              searchParams={{ q: query }}
            />
          </>
        )}
      </AdminCard>
    </>
  );
}
