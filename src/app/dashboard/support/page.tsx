import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable, TabLinks } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { listAdminSupportTokens } from '@/lib/data/admin';
import { relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Support',
  robots: { index: false, follow: false },
};

const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: '', label: 'All' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermissionPage(PERMISSIONS.SUPPORT_READ);

  const params = await searchParams;
  const status = first(params.status) ?? 'PENDING';
  const tokens = await listAdminSupportTokens(status || undefined);

  return (
    <>
      <AdminPageHeader
        title="Support tokens"
        description="Customer support queue, ordered by priority. Internal notes on a token are never shown to the customer."
      />

      <TabLinks tabs={TABS} current={status} basePath="/dashboard/support" />

      <AdminCard title={`${tokens.length} token${tokens.length === 1 ? '' : 's'}`}>
        {tokens.length === 0 ? (
          <EmptyState
            title="Nothing in this queue"
            description="Support tokens opened by customers appear here."
          />
        ) : (
          <DataTable
            headers={['Token', 'Customer', 'Subject', 'Category', 'Priority', 'Assigned', 'Updated', 'Status']}
            minWidth="70rem"
          >
            {tokens.map((token) => (
              <tr key={token.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <Link
                    href={`/dashboard/support/${token.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {token.tokenNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {token._count.messages} message{token._count.messages === 1 ? '' : 's'}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <p className="max-w-36 truncate">{token.customer.name}</p>
                  <p className="max-w-36 truncate text-xs text-muted-foreground">
                    {token.customer.email}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <Link
                    href={`/dashboard/support/${token.id}`}
                    className="block max-w-56 truncate hover:text-primary"
                  >
                    {token.subject}
                  </Link>
                </td>
                <td className="py-3 pr-4 capitalize text-muted-foreground">
                  {token.category.toLowerCase()}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={token.priority} />
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {token.assignedTo?.name ?? 'Unassigned'}
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {relativeTime(token.updatedAt)}
                </td>
                <td className="py-3">
                  <StatusBadge status={token.status} />
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminCard>
    </>
  );
}
