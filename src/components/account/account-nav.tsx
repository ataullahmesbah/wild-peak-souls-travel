'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CreditCard,
  FileText,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Send,
  Star,
  Ticket,
  User,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/account/bookings', label: 'My bookings', icon: Ticket },
  { href: '/account/payments', label: 'Payments', icon: CreditCard },
  { href: '/account/invoices', label: 'Invoices', icon: FileText },
  { href: '/account/requests', label: 'My requests', icon: Send },
  { href: '/account/support', label: 'Support', icon: LifeBuoy },
  { href: '/account/messages', label: 'Messages', icon: MessageSquare },
  { href: '/account/notifications', label: 'Notifications', icon: Bell, badge: true },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account/reviews', label: 'My reviews', icon: Star },
  { href: '/account/profile', label: 'Profile', icon: User },
];

export function AccountNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-24">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {LINKS.map(({ href, label, icon: Icon, exact, badge }) => (
          <li key={href} className="shrink-0 lg:shrink">
            <Link
              href={href}
              aria-current={isActive(href, exact) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-field px-3 py-2.5 text-sm transition-colors',
                isActive(href, exact)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
              {badge && unreadCount > 0 && (
                <span
                  className={cn(
                    'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                    isActive(href, exact)
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-destructive text-white',
                  )}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </li>
        ))}
        <li className="shrink-0 lg:mt-2 lg:shrink lg:border-t lg:border-border lg:pt-2">
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-field px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive-soft"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Sign out</span>
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
