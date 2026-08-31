'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { ChevronDown, LogOut, Menu, Mountain, PanelLeftClose, Search } from 'lucide-react';

import { NotificationBell } from '@/components/layout/notification-bell';
import { ThemeToggle } from '@/components/layout/theme-provider';
import { cn, initials } from '@/lib/utils';

export interface ShellNavChild {
  label: string;
  href: string;
  exact?: boolean;
}

export interface ShellNavItem extends ShellNavChild {
  children?: ShellNavChild[];
}

export interface ShellNavGroup {
  label: string;
  items: ShellNavItem[];
}

/**
 * Icons are resolved on the client from the item label so the server can send
 * a plain serialisable nav tree (React components cannot cross that boundary).
 */
const ICON_BY_LABEL: Record<string, Icons.LucideIcon> = {
  Dashboard: Icons.LayoutDashboard,
  Notifications: Icons.Bell,
  Destinations: Icons.MapPin,
  Events: Icons.CalendarRange,
  Tours: Icons.Mountain,
  Activities: Icons.Waves,
  Stays: Icons.Ticket,
  Bookings: Icons.ClipboardList,
  Payments: Icons.Receipt,
  Visa: Icons.FileCheck2,
  Flights: Icons.Plane,
  'Train schedule': Icons.Train,
  Leads: Icons.MessageSquare,
  'Users & roles': Icons.Users,
  Support: Icons.LifeBuoy,
  Reviews: Icons.Star,
  'Home banner': Icons.Presentation,
  Notices: Icons.Megaphone,
  Advertisements: Icons.Image,
  Accounts: Icons.Wallet,
  Finance: Icons.BadgeDollarSign,
  Reports: Icons.FileBarChart,
  Media: Icons.Image,
  'Audit log': Icons.ScrollText,
  Settings: Icons.Settings,
};

export function AdminShell({
  brandName,
  nav,
  unreadCount,
  user,
  children,
}: {
  brandName: string;
  nav: ShellNavGroup[];
  unreadCount: number;
  user: { name: string; email: string; roleLabel: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Collapsing the sidebar on a laptop buys back roughly 190px of table width,
  // which is the difference between a readable bookings table and a scrolling
  // one. The choice is remembered for the session.
  const [collapsed, setCollapsed] = React.useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  const sidebar = (
    <Sidebar
      brandName={brandName}
      nav={nav}
      user={user}
      pathname={pathname}
      collapsed={collapsed}
      onNavigate={closeDrawer}
    />
  );

  return (
    <div className="flex min-h-dvh bg-muted/25">
      <aside
        className={cn(
          'hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 lg:block',
          collapsed ? 'w-[4.5rem]' : 'w-64',
        )}
      >
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="wps-animate-in absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] border-r border-border bg-card">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-field hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
            className="hidden h-10 w-10 items-center justify-center rounded-field text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
          >
            <PanelLeftClose
              className={cn('h-[1.15rem] w-[1.15rem] transition-transform', collapsed && 'rotate-180')}
              aria-hidden="true"
            />
          </button>

          <form action="/dashboard/search" className="relative hidden max-w-sm flex-1 sm:block">
            <label htmlFor="admin-search" className="sr-only">
              Search the dashboard
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="admin-search"
              name="q"
              type="search"
              placeholder="Search bookings, customers…"
              className="h-10 w-full rounded-field border border-border bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25"
            />
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell initialUnread={unreadCount} />
            <ThemeToggle />
            <Link
              href="/"
              className="hidden rounded-field px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:block"
            >
              View site
            </Link>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary lg:hidden"
              title={user.name}
            >
              {initials(user.name)}
            </span>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  brandName,
  nav,
  user,
  pathname,
  collapsed,
  onNavigate,
}: {
  brandName: string;
  nav: ShellNavGroup[];
  user: { name: string; email: string; roleLabel: string };
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Dashboard" className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2.5 border-b border-border',
          collapsed ? 'justify-center px-2' : 'px-5',
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-primary text-primary-foreground">
          <Mountain className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold leading-tight">
              {brandName}
            </span>
            <span className="block truncate text-[0.7rem] text-muted-foreground">
              Control centre
            </span>
          </span>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-3">
        {nav.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <NavEntry
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  isActive={isActive}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-field py-2',
            collapsed ? 'justify-center px-0' : 'px-3',
          )}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
            title={collapsed ? `${user.name} — ${user.roleLabel}` : undefined}
          >
            {initials(user.name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground" title={user.email}>
                {user.email}
              </p>
              <p className="mt-1 inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-[0.65rem] font-medium text-primary">
                {user.roleLabel}
              </p>
            </div>
          )}
        </div>

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className={cn(
              'mt-1 flex w-full items-center gap-2.5 rounded-field py-2 text-sm text-destructive transition-colors hover:bg-destructive-soft',
              collapsed ? 'justify-center px-0' : 'px-3',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {collapsed ? <span className="sr-only">Sign out</span> : 'Sign out'}
          </button>
        </form>
      </div>
    </nav>
  );
}

function NavEntry({
  item,
  collapsed,
  isActive,
  onNavigate,
}: {
  item: ShellNavItem;
  collapsed: boolean;
  isActive: (href: string, exact?: boolean) => boolean;
  onNavigate: () => void;
}) {
  const Icon = ICON_BY_LABEL[item.label] ?? Icons.Circle;
  const children = item.children ?? [];
  const sectionActive =
    isActive(item.href, item.exact) || children.some((child) => isActive(child.href));

  // A section starts open when you are inside it, and can then be toggled shut.
  // Navigating into it re-opens it: comparing against the previous value during
  // render is React's pattern for state that follows a prop without an effect.
  const [open, setOpen] = React.useState(sectionActive);
  const [wasActive, setWasActive] = React.useState(sectionActive);
  if (sectionActive !== wasActive) {
    setWasActive(sectionActive);
    if (sectionActive) setOpen(true);
  }

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-2.5 rounded-field py-2 text-sm transition-colors',
      collapsed ? 'justify-center px-0' : 'px-3',
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  return (
    <li>
      <div className="flex items-center gap-1">
        <Link
          href={item.href}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
          className={cn(linkClass(isActive(item.href, item.exact)), 'flex-1')}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>

        {children.length > 0 && !collapsed && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} ${item.label} pages`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {children.length > 0 && open && !collapsed && (
        <ul className="mt-0.5 space-y-0.5 border-l border-border pl-3 ml-5">
          {children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onNavigate}
                aria-current={isActive(child.href, child.exact) ? 'page' : undefined}
                className={cn(
                  'block rounded-field px-3 py-1.5 text-sm transition-colors',
                  isActive(child.href, child.exact)
                    ? 'bg-primary-soft font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
