import type { Metadata } from 'next';
import { BadgeDollarSign, Receipt, TrendingDown, TrendingUp } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable, MetricCard } from '@/components/admin/admin-ui';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { getFinanceOverview, reportingWindow } from '@/lib/data/admin';
import { cn, formatCurrency, formatDate, toNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Finance',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const RANGES = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermissionPage(PERMISSIONS.FINANCE_READ);

  const params = await searchParams;
  const days = Number(first(params.days)) || 30;
  const { from, to } = reportingWindow(days);

  const overview = await getFinanceOverview(from, to);

  // Revenue and operating expenses stay separate — never netted into a single
  // "sales" figure — so a profit-and-loss read is honest.
  const incomeCategories = overview.byCategory.filter((c) => c.type === 'INCOME');
  const expenseCategories = overview.byCategory.filter((c) => c.type === 'EXPENSE');

  return (
    <>
      <AdminPageHeader
        title="Finance"
        description={`Income and operating expenses from ${formatDate(from)} to ${formatDate(to)}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <ButtonLink
            href={`/api/dashboard/reports/export?report=transactions&days=${days}`}
            variant="outline"
            size="sm"
          >
            Export CSV
          </ButtonLink>
          <form action="/dashboard/finance" className="flex gap-2">
            <label htmlFor="finance-range" className="sr-only">
              Date range
            </label>
            <select
              id="finance-range"
              name="days"
              defaultValue={String(days)}
              className="h-9 rounded-field border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none"
            >
              {RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-field bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Apply
            </button>
          </form>
          </div>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={TrendingUp}
            label="Revenue"
            value={formatCurrency(overview.revenue)}
            hint={`${overview.incomeCount} transaction${overview.incomeCount === 1 ? '' : 's'}`}
            tone="success"
          />
          <MetricCard
            icon={TrendingDown}
            label="Operating expenses"
            value={formatCurrency(overview.cost)}
            hint={`${overview.expenseCount} transaction${overview.expenseCount === 1 ? '' : 's'}`}
            tone="destructive"
          />
          <MetricCard
            icon={BadgeDollarSign}
            label="Net result"
            value={formatCurrency(overview.net)}
            hint={overview.net >= 0 ? 'Profit' : 'Loss'}
            tone={overview.net >= 0 ? 'success' : 'destructive'}
          />
          <MetricCard
            icon={Receipt}
            label="Expenses to approve"
            value={overview.pendingExpenses}
            tone={overview.pendingExpenses > 0 ? 'warning' : 'primary'}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminCard title="Income by category">
            {incomeCategories.length === 0 ? (
              <EmptyState title="No income recorded" description="Verified payments create income transactions automatically." />
            ) : (
              <ul className="space-y-3">
                {incomeCategories.map((row) => {
                  const amount = toNumber(row._sum.amount);
                  const share = overview.revenue > 0 ? (amount / overview.revenue) * 100 : 0;
                  return (
                    <li key={`${row.category}-${row.type}`}>
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">
                          {row.category.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-success" style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>

          <AdminCard title="Expenses by category">
            {expenseCategories.length === 0 ? (
              <EmptyState title="No expenses recorded" description="Record salaries, conveyance, marketing and office costs here." />
            ) : (
              <ul className="space-y-3">
                {expenseCategories.map((row) => {
                  const amount = toNumber(row._sum.amount);
                  const share = overview.cost > 0 ? (amount / overview.cost) * 100 : 0;
                  return (
                    <li key={`${row.category}-${row.type}`}>
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">
                          {row.category.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-destructive" style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>
        </div>

        <AdminCard title="Recent transactions">
          {overview.recent.length === 0 ? (
            <EmptyState title="No transactions in this period" description="Try a wider date range." />
          ) : (
            <DataTable headers={['Date', 'Type', 'Category', 'Description', 'Recorded by', 'Amount']}>
              {overview.recent.map((transaction) => (
                <tr key={transaction.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 pr-4 text-muted-foreground">
                    {formatDate(transaction.transactionDate)}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        transaction.type === 'INCOME'
                          ? 'bg-success-soft text-success'
                          : 'bg-destructive-soft text-destructive',
                      )}
                    >
                      {transaction.type.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">
                    {transaction.category.replace(/_/g, ' ').toLowerCase()}
                  </td>
                  <td className="py-3 pr-4 max-w-64 truncate">
                    {transaction.description ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {transaction.createdBy?.name ?? 'System'}
                  </td>
                  <td
                    className={cn(
                      'py-3 text-right font-medium',
                      transaction.type === 'INCOME' ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {transaction.type === 'INCOME' ? '+' : '−'}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </AdminCard>
      </div>
    </>
  );
}
