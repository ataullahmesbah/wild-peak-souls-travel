// src/lib/rbac/page-access.ts
import { headers } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { ADMIN_NAV } from '@/lib/rbac/nav';
import type { RoleName } from '@/generated/prisma';

/**
 * Per-role access to individual dashboard pages.
 *
 * Permissions decide what a role can *do*; this decides which screens a role
 * is shown at all. It narrows, never widens: ticking a page on for a role that
 * lacks the underlying permission changes nothing, because every page still
 * calls requirePermissionPage and every API still checks its own permission.
 * That ordering matters — if this could grant access, an editing mistake here
 * would be a privilege escalation rather than a cosmetic one.
 */

export interface DashboardPageRow {
  id: string;
  key: string;
  label: string;
  group: string;
  path: string;
  permission: string;
  sortOrder: number;
}

/** Flattens the nav (including sub-pages) into the pages access can be set on. */
function declaredPages() {
  const pages: Array<Omit<DashboardPageRow, 'id'>> = [];
  let order = 0;

  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      pages.push({
        key: item.href,
        label: item.label,
        group: group.label,
        path: item.href,
        permission: item.permissions[0] ?? '',
        sortOrder: order++,
      });
      for (const child of item.children ?? []) {
        pages.push({
          key: child.href,
          label: `${item.label} — ${child.label}`,
          group: group.label,
          path: child.href,
          permission: child.permissions[0] ?? '',
          sortOrder: order++,
        });
      }
    }
  }
  return pages;
}

/** Creates rows for pages added to the nav since the last sync. */
export async function syncDashboardPages(): Promise<void> {
  const declared = declaredPages();
  const existing = await prisma.dashboardPage.findMany({ select: { key: true } });
  const present = new Set(existing.map((row) => row.key));
  const missing = declared.filter((page) => !present.has(page.key));
  if (missing.length === 0) return;

  await prisma.dashboardPage.createMany({ data: missing, skipDuplicates: true });
}

export async function listPageAccessMatrix() {
  await syncDashboardPages();

  const [pages, roles, access] = await Promise.all([
    prisma.dashboardPage.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, label: true } }),
    prisma.rolePageAccess.findMany(),
  ]);

  // Absent means allowed. Only an explicit deny is stored, so a new page is
  // visible by default rather than invisible to everyone until someone
  // remembers to tick it on.
  const denied = new Set(
    access.filter((row) => !row.allowed).map((row) => `${row.roleId}:${row.pageId}`),
  );

  return { pages, roles, denied };
}

/**
 * Whether these roles may open this dashboard path.
 *
 * Matches the longest declared path that prefixes the request, so
 * /dashboard/events/new is governed by the /dashboard/events row rather than
 * silently falling through to allowed.
 */
export async function isPageAllowed(
  roleNames: RoleName[],
  pathname: string,
): Promise<boolean> {
  // The owner is never locked out of their own dashboard by a configuration
  // mistake — that is the one door that must always open.
  if (roleNames.includes('SUPER_ADMIN' as RoleName)) return true;

  const pages = await prisma.dashboardPage.findMany({
    select: { id: true, path: true },
  });

  let match: { id: string; path: string } | null = null;
  for (const page of pages) {
    if (pathname === page.path || pathname.startsWith(`${page.path}/`)) {
      if (!match || page.path.length > match.path.length) match = page;
    }
  }
  if (!match) return true;

  const denials = await prisma.rolePageAccess.findMany({
    where: {
      pageId: match.id,
      allowed: false,
      role: { name: { in: roleNames } },
    },
    select: { roleId: true },
  });

  // Holding several roles, any one of which still permits the page, is enough.
  const roleCount = await prisma.role.count({ where: { name: { in: roleNames } } });
  return denials.length < roleCount;
}

/**
 * The dashboard paths these roles are explicitly denied, so the sidebar can
 * leave them out rather than offering a link that redirects.
 *
 * Returned as a set of paths, looked up once per request rather than once per
 * nav item.
 */
export async function deniedPathsFor(roleNames: RoleName[]): Promise<Set<string>> {
  if (roleNames.includes('SUPER_ADMIN' as RoleName)) return new Set();

  const roleCount = await prisma.role.count({ where: { name: { in: roleNames } } });
  if (roleCount === 0) return new Set();

  const denials = await prisma.rolePageAccess.findMany({
    where: { allowed: false, role: { name: { in: roleNames } } },
    select: { pageId: true, page: { select: { path: true } } },
  });

  // Someone holding two roles keeps a page if either role still permits it.
  const countByPage = new Map<string, { path: string; denials: number }>();
  for (const row of denials) {
    const current = countByPage.get(row.pageId);
    if (current) current.denials += 1;
    else countByPage.set(row.pageId, { path: row.page.path, denials: 1 });
  }

  return new Set(
    [...countByPage.values()]
      .filter((entry) => entry.denials >= roleCount)
      .map((entry) => entry.path),
  );
}

/** The path of the page being rendered, as set by the middleware. */
export async function currentPathname(): Promise<string> {
  const store = await headers();
  return store.get('x-pathname') ?? '';
}
