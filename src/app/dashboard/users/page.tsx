import type { Metadata } from 'next';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { AdminCard, AdminPageHeader, DataTable, TabLinks } from '@/components/admin/admin-ui';
import { UserRoleForm } from '@/components/admin/user-role-form';
import { requirePermissionPage, hasPermission } from '@/lib/rbac/guard';
import {
  PERMISSIONS,
  ROLE_LABELS,
  assignableRoles,
  canActOnUser,
} from '@/lib/rbac/permissions';
import { listAdminUsers, countUsersByRole } from '@/lib/data/admin';
import { formatDate, parsePageParam } from '@/lib/utils';
import { RoleName } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Users & Roles',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.USERS_READ);

  const params = await searchParams;
  const page = parsePageParam(first(params.page));
  const query = first(params.q);
  const role = first(params.role);
  const status = first(params.status);

  const [result, roleCounts] = await Promise.all([
    listAdminUsers({ page, query, role, status }),
    countUsersByRole(),
  ]);

  // One tab per role, so "show me the moderators" is a click rather than a
  // filter someone has to know exists.
  const roleTabs = [
    { value: '', label: 'Everyone', count: roleCounts.total },
    ...Object.values(RoleName).map((name) => ({
      value: name,
      label: ROLE_LABELS[name],
      count: roleCounts.byRole[name] ?? 0,
    })),
  ];

  // What this actor may hand out, computed once rather than per row.
  const grantable = assignableRoles(staff.roles);

  // Only SUPER_ADMIN-level permission may reassign roles or suspend accounts.
  const canManageRoles = hasPermission(staff, PERMISSIONS.USERS_ROLE_UPDATE);
  const canSuspend = hasPermission(staff, PERMISSIONS.USERS_SUSPEND);

  return (
    <>
      <AdminPageHeader
        title="Users & roles"
        description="Every account on the platform. You can only change an account that ranks below your own, and every role change or suspension is written to the audit log."
      />

      <TabLinks tabs={roleTabs} current={role ?? ''} basePath="/dashboard/users" paramName="role" />

      <AdminCard
        title={`${result.total} user${result.total === 1 ? '' : 's'}`}
        action={
          <form action="/dashboard/users" className="flex w-full gap-2 sm:w-auto">
            <label htmlFor="user-search" className="sr-only">
              Search users
            </label>
            <input
              id="user-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Name, email, phone…"
              className="h-9 w-full rounded-field border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none sm:w-56"
            />
            {role && <input type="hidden" name="role" value={role} />}
            <label htmlFor="user-status" className="sr-only">
              Filter by account status
            </label>
            <select
              id="user-status"
              name="status"
              defaultValue={status ?? ''}
              className="h-9 rounded-field border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </form>
        }
      >
        {result.items.length === 0 ? (
          <EmptyState title="No users match" description="Try a different search or filter." />
        ) : (
          <>
            <DataTable
              headers={['Name', 'Contact', 'Roles', 'Bookings', 'Joined', 'Last seen', 'Status', 'Actions']}
              minWidth="66rem"
            >
              {result.items.map((user) => {
                const userRoles = user.roles.map((r) => r.role.name);
                // Rank, not permission: an ADMIN holds users.suspend but still
                // may not touch a SUPER_ADMIN or a fellow ADMIN.
                const actionable = user.id === staff.id || canActOnUser(staff.roles, userRoles);

                return (
                <tr key={user.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 pr-4">
                    <p className="max-w-40 truncate font-medium">{user.name}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="max-w-48 truncate text-xs">{user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.phone ?? '—'}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map(({ role: r }) => (
                        <span
                          key={r.name}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4">{user._count.bookings}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="py-3">
                    {(canManageRoles || canSuspend) && actionable ? (
                      <UserRoleForm
                        userId={user.id}
                        userName={user.name}
                        currentRoles={userRoles}
                        currentStatus={user.status}
                        canManageRoles={canManageRoles}
                        canSuspend={canSuspend}
                        isSelf={user.id === staff.id}
                        assignableRoles={grantable}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {canManageRoles || canSuspend ? 'Outranks you' : 'View only'}
                      </span>
                    )}
                  </td>
                </tr>
                );
              })}
            </DataTable>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              basePath="/dashboard/users"
              searchParams={{ q: query, role, status }}
            />
          </>
        )}
      </AdminCard>
    </>
  );
}
