import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, BadgeDollarSign, Clock, RotateCcw } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import {
  AdminCard,
  AdminPageHeader,
  DataTable,
  MetricCard,
  TabLinks,
} from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { getAccountsLedger, reportingWindow } from '@/lib/data/admin';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Accounts',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const RANGES = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

const VIEWS = [
  { value: '', label: 'All bookings' },
  { value: 'outstanding', label: 'Money owed' },
  { value: 'awaiting', label: 'Waiting to be checked' },
  { value: 'refunded', label: 'Refunded' },
];

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermissionPage(PERMISSIONS.FINANCE_READ);

  const params = await searchParams;
  const days = Number(first(params.days)) || 90;
  const view = first(params.view) ?? '';
  const { from, to } = reportingWindow(days);

  const { rows, totals } = await getAccountsLedger(from, to);

  const visible = rows.filter((row) => {
    if (view === 'outstanding') return row.outstanding > 0;
    if (view === 'awaiting') return row.awaiting > 0;
    if (view === 'refunded') return row.refunded > 0;
    return true;
  });

  const counts = {
    '': rows.length,
    outstanding: rows.filter((row) => row.outstanding > 0).length,
    awaiting: rows.filter((row) => row.awaiting > 0).length,
    refunded: rows.filter((row) => row.refunded > 0).length,
  };

  return (
    <>
      <AdminPageHeader
        title="Accounts"
        description="What each booking was billed, what has actually been received, and what is still owed. Amounts are computed from verified payments rather than from a status flag, so this is what the bank will agree with."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href={`/api/dashboard/reports/export?report=accounts&days=${days}`}
              variant="outline"
              size="sm"
            >
              Export CSV
            </ButtonLink>
            {RANGES.map((range) => (
              <ButtonLink
                key={range.value}
                href={`/dashboard/accounts?days=${range.value}${view ? `&view=${view}` : ''}`}
                variant={String(days) === range.value ? 'primary' : 'outline'}
                size="sm"
              >
                {range.label}
              </ButtonLink>
            ))}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={BadgeDollarSign}
          label="Billed"
          value={formatCurrency(totals.billed)}
          hint={`${rows.length} booking${rows.length === 1 ? '' : 's'}`}
        />
        <MetricCard
          icon={BadgeDollarSign}
          label="Received"
          value={formatCurrency(totals.received)}
          hint="Verified payments only"
          tone="success"
        />
        <MetricCard
          icon={Clock}
          label="Waiting to be checked"
          value={formatCurrency(totals.awaiting)}
          hint="Claimed but not yet verified"
          tone={totals.awaiting > 0 ? 'warning' : 'primary'}
          href="/dashboard/payments"
        />
        <MetricCard
          icon={AlertCircle}
          label="Still owed"
          value={formatCurrency(totals.outstanding)}
          hint={`${counts.outstanding} booking${counts.outstanding === 1 ? '' : 's'}`}
          tone={totals.outstanding > 0 ? 'destructive' : 'success'}
        />
      </div>

      {totals.refunded > 0 && (
        <p className="mb-6 flex items-center gap-2 rounded-field border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
          {formatCurrency(totals.refunded)} refunded in this period, across{' '}
          {counts.refunded} booking{counts.refunded === 1 ? '' : 's'}.
        </p>
      )}

      <TabLinks
        tabs={VIEWS.map((tab) => ({
          ...tab,
          count: counts[tab.value as keyof typeof counts],
        }))}
        current={view}
        basePath={`/dashboard/accounts?days=${days}`}
        paramName="view"
      />

      <AdminCard title={`${visible.length} booking${visible.length === 1 ? '' : 's'}`}>
        {visible.length === 0 ? (
          <EmptyState
            title="Nothing in this view"
            description="Try a wider date range, or switch to all bookings."
          />
        ) : (
          <DataTable
            headers={[
              'Booking',
              'Customer',
              'Billed',
              'Received',
              'Awaiting',
              'Owed',
              'Status',
              '',
            ]}
            minWidth="72rem"
          >
            {visible.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pr-4">
                  <p className="font-medium">{row.bookingNumber}</p>
                  <p className="max-w-48 truncate text-xs text-muted-foreground">
                    {row.productTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <p className="max-w-36 truncate text-sm">{row.customerName}</p>
                  <p className="max-w-36 truncate text-xs text-muted-foreground">
                    {row.customerEmail}
                  </p>
                </td>
                <td className="py-3 pr-4 tabular-nums">{formatCurrency(row.total)}</td>
                {/* The colour belongs to the amount, not to the placeholder —
                    a green dash reads as a figure that is not there. */}
                <td className="py-3 pr-4 tabular-nums">
                  {row.received > 0 ? (
                    <span className="text-success">{formatCurrency(row.received)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-3 pr-4 tabular-nums">
                  {row.awaiting > 0 ? (
                    <span className="text-warning">{formatCurrency(row.awaiting)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-3 pr-4 tabular-nums font-medium">
                  {row.outstanding > 0 ? (
                    <span className="text-destructive">
                      {formatCurrency(row.outstanding)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Settled</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={row.paymentStatus} />
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/dashboard/bookings/${row.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminCard>
    </>
  );
}
