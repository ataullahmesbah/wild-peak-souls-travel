import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { requireStaffPage } from '@/lib/rbac/guard';
import { hasAnyPermission } from '@/lib/rbac/guard';
import { unreadNotificationCount } from '@/lib/notifications';
import { ADMIN_NAV } from '@/lib/rbac/nav';
import { currentPathname, deniedPathsFor, isPageAllowed } from '@/lib/rbac/page-access';
import { ROLE_LABELS } from '@/lib/rbac/permissions';
import { SETTING_KEYS, getPublicSettings, settingString } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side gate for the whole dashboard. Individual pages still call
  // requirePermissionPage for their own module.
  const user = await requireStaffPage();
  const pathname = await currentPathname();

  // Page-level access, applied once for the whole dashboard rather than page by
  // page. It only ever narrows what a permission already allows — each page
  // still runs its own requirePermissionPage underneath this.
  if (pathname && pathname !== '/dashboard/forbidden') {
    const allowed = await isPageAllowed(user.roles, pathname);
    if (!allowed) redirect('/dashboard/forbidden');
  }

  const [settings, unread, hidden] = await Promise.all([
    getPublicSettings(),
    unreadNotificationCount(user.id),
    deniedPathsFor(user.roles),
  ]);

  // The sidebar is filtered here, on the server, so a menu the user cannot use
  // is never sent to the browser at all.
  const nav = ADMIN_NAV.map((group) => ({
    label: group.label,
    items: group.items
      .filter(
        (item) => hasAnyPermission(user, item.permissions) && !hidden.has(item.href),
      )
      .map(({ icon: _icon, permissions: _permissions, children, ...rest }) => ({
        ...rest,
        children: children
          ?.filter(
            (child) =>
              hasAnyPermission(user, child.permissions) && !hidden.has(child.href),
          )
          .map(({ permissions: _childPermissions, ...child }) => child),
      })),
  })).filter((group) => group.items.length > 0);

  return (
    <AdminShell
      brandName={settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls')}
      nav={nav}
      unreadCount={unread}
      user={{
        name: user.name,
        email: user.email,
        roleLabel: user.roles.map((r) => ROLE_LABELS[r]).join(', '),
      }}
    >
      {children}
    </AdminShell>
  );
}
