// src/components/layout/site-header.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut, Menu, Mountain, User, X } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/section';
import { NotificationBell } from '@/components/layout/notification-bell';
import { ThemeToggle } from '@/components/layout/theme-provider';
import { cn } from '@/lib/utils';

export interface HeaderUser {
  /** Unread notifications, so signed-in visitors get the bell too. */
  unreadCount?: number;
  name: string;
  email: string;
  isStaff: boolean;
}

interface NavItem {
  label: string;
  href: string;
  children?: Array<{ label: string; href: string; description?: string }>;
}

const NAV: NavItem[] = [
  { label: 'Destinations', href: '/destinations' },
  {
    label: 'Travel',
    href: '/tours',
    children: [
      { label: 'Tours & Packages', href: '/tours', description: 'Curated multi-day journeys' },
      { label: 'Events', href: '/events', description: 'Fixed-date group departures' },
      { label: 'Activities', href: '/activities', description: 'Treks, camps and experiences' },
      { label: 'Stays', href: '/stays', description: 'Resorts, homestays and camps' },
      { label: 'Custom Tour', href: '/custom-tour', description: 'Tell us your dream trip' },
    ],
  },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: 'Visa Assistance', href: '/visa', description: 'Country and visa-type guidance' },
      { label: 'Flight Explorer', href: '/flights', description: 'Search and request a booking' },
      { label: 'Train Schedule', href: '/train-schedule', description: 'Bangladesh Railway timings' },
      { label: 'All Services', href: '/services', description: 'How the agency can help' },
    ],
  },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/** NAV with the contest slotted in beside the blog, when one is live. */
function navItems(contestSlug: string | null | undefined): NavItem[] {
  if (!contestSlug) return NAV;
  const index = NAV.findIndex((item) => item.href === '/blog');
  const withContest = [...NAV];
  withContest.splice(index + 1, 0, { label: 'Contest', href: '/contest' });
  return withContest;
}

export function SiteHeader({
  user,
  brandName,
  contestSlug,
}: {
  user: HeaderUser | null;
  brandName: string;
  /**
   * The running contest, if there is one. The Contest link is inserted only
   * when this is set, so the navbar follows the contest's own dates instead of
   * a setting somebody has to remember to turn off afterwards.
   */
  contestSlug?: string | null;
}) {
  const pathname = usePathname();
  const items = navItems(contestSlug);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  // Closing on click (rather than in an effect watching the pathname) keeps the
  // menu state a direct consequence of the user's action.
  const closeMenus = () => {
    setMobileOpen(false);
    setOpenMenu(null);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-all duration-300',
        scrolled
          ? 'border-border bg-background/85 backdrop-blur-xl'
          : 'border-transparent bg-background',
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <Container>
        <div className="flex h-16 items-center justify-between gap-4 lg:h-18">
          {/*
            min-w-0 plus a truncating name, rather than shrink-0: the brand was
            refusing to give up any width, so once the notification bell joined
            the actions on the right the row grew past a 390px viewport and gave
            every public page a horizontal scrollbar. A long brand name now
            ellipsises on a phone instead of pushing the page sideways.
          */}
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Mountain className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">
              {brandName}
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
            {items.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(item.label)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button
                    type="button"
                    aria-expanded={openMenu === item.label}
                    aria-haspopup="true"
                    onClick={() =>
                      setOpenMenu(openMenu === item.label ? null : item.label)
                    }
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        openMenu === item.label && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {openMenu === item.label && (
                    <div className="absolute left-0 top-full w-72 pt-2">
                      <div className="wps-card wps-animate-in p-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={closeMenus}
                            className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                          >
                            <span className="block text-sm font-medium">{child.label}</span>
                            {child.description && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {child.description}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            {user && (
              <NotificationBell
                initialUnread={user.unreadCount ?? 0}
                allHref="/account/notifications"
              />
            )}
            {user ? (
              <div className="hidden items-center gap-2 sm:flex">
                {user.isStaff && (
                  <ButtonLink href="/dashboard" variant="outline" size="sm">
                    Dashboard
                  </ButtonLink>
                )}
                <ButtonLink href="/account" variant="ghost" size="sm">
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span className="max-w-24 truncate">{user.name.split(' ')[0]}</span>
                </ButtonLink>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <ButtonLink href="/login" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/register" size="sm">
                  Get started
                </ButtonLink>
              </div>
            )}

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="wps-animate-in border-t border-border bg-background lg:hidden"
        >
          <Container className="space-y-1 py-4">
            {items.map((item) => (
              <div key={item.label}>
                <Link
                  href={item.href}
                  onClick={closeMenus}
                  className={cn(
                    'block rounded-xl px-3 py-2.5 text-sm font-medium',
                    isActive(item.href) ? 'bg-primary-soft text-primary' : 'hover:bg-muted',
                  )}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-3 border-l border-border pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={closeMenus}
                        className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <ThemeToggle />
              {user ? (
                <div className="flex gap-2">
                  {user.isStaff && (
                    <ButtonLink href="/dashboard" variant="outline" size="sm">
                      Dashboard
                    </ButtonLink>
                  )}
                  <ButtonLink href="/account" size="sm">
                    My account
                  </ButtonLink>
                </div>
              ) : (
                <div className="flex gap-2">
                  <ButtonLink href="/login" variant="outline" size="sm">
                    Sign in
                  </ButtonLink>
                  <ButtonLink href="/register" size="sm">
                    Get started
                  </ButtonLink>
                </div>
              )}
            </div>

            {user && (
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive-soft"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </form>
            )}
          </Container>
        </div>
      )}
    </header>
  );
}
