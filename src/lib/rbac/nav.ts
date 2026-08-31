// src/lib/rbac/nav.ts
import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  Bell,
  CalendarRange,
  ClipboardList,
  FileBarChart,
  FileCheck2,
  Image,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Megaphone,
  MessageSquare,
  Mountain,
  Plane,
  Presentation,
  Receipt,
  Newspaper,
  ScrollText,
  Trophy,
  Settings,
  Star,
  Ticket,
  Train,
  Users,
  Wallet,
  Waves,
} from 'lucide-react';

import { PERMISSIONS, type PermissionKey } from '@/lib/rbac/permissions';

export interface NavChild {
  label: string;
  href: string;
  /** Any one of these grants visibility. Empty means always visible. */
  permissions: PermissionKey[];
  exact?: boolean;
}

export interface NavItem extends NavChild {
  icon: LucideIcon;
  /** Sub-pages shown when the section is open. */
  children?: NavChild[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * The dashboard sidebar is derived from permissions, not from role names, so
 * adding a permission to a role immediately opens the matching module. This is
 * presentation only — each page re-checks server-side.
 */
export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        permissions: [PERMISSIONS.DASHBOARD_VIEW],
        exact: true,
      },
      {
        label: 'Notifications',
        href: '/dashboard/notifications',
        icon: Bell,
        permissions: [PERMISSIONS.DASHBOARD_VIEW],
      },
    ],
  },
  {
    label: 'Travel',
    items: [
      {
        label: 'Destinations',
        href: '/dashboard/destinations',
        icon: MapPin,
        permissions: [PERMISSIONS.DESTINATIONS_READ],
      },
      {
        label: 'Events',
        href: '/dashboard/events',
        icon: CalendarRange,
        permissions: [PERMISSIONS.EVENTS_READ],
      },
      {
        label: 'Tours',
        href: '/dashboard/tours',
        icon: Mountain,
        permissions: [PERMISSIONS.TOURS_READ],
      },
      {
        label: 'Activities',
        href: '/dashboard/activities',
        icon: Waves,
        permissions: [PERMISSIONS.ACTIVITIES_READ],
      },
      {
        label: 'Stays',
        href: '/dashboard/stays',
        icon: Ticket,
        permissions: [PERMISSIONS.STAYS_READ],
      },
    ],
  },
  {
    label: 'Commerce',
    items: [
      {
        label: 'Bookings',
        href: '/dashboard/bookings',
        icon: ClipboardList,
        permissions: [PERMISSIONS.BOOKINGS_READ],
      },
      {
        label: 'Payments',
        href: '/dashboard/payments',
        icon: Receipt,
        permissions: [PERMISSIONS.PAYMENTS_READ],
      },
    ],
  },
  {
    label: 'Services',
    items: [
      {
        label: 'Visa',
        href: '/dashboard/visa',
        icon: FileCheck2,
        permissions: [PERMISSIONS.VISA_READ, PERMISSIONS.VISA_REQUESTS_MANAGE],
        exact: true,
        children: [
          {
            label: 'Countries',
            href: '/dashboard/visa/countries',
            permissions: [PERMISSIONS.VISA_READ],
          },
          {
            label: 'Visa types',
            href: '/dashboard/visa/types',
            permissions: [PERMISSIONS.VISA_READ],
          },
          {
            label: 'Requests',
            href: '/dashboard/visa/requests',
            permissions: [PERMISSIONS.VISA_REQUESTS_MANAGE],
          },
        ],
      },
      {
        label: 'Flights',
        href: '/dashboard/flights',
        icon: Plane,
        permissions: [PERMISSIONS.FLIGHTS_MANAGE],
      },
      {
        label: 'Train schedule',
        href: '/dashboard/trains',
        icon: Train,
        permissions: [PERMISSIONS.TRAINS_MANAGE],
      },
      {
        label: 'Leads',
        href: '/dashboard/leads',
        icon: MessageSquare,
        permissions: [PERMISSIONS.LEADS_READ],
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        label: 'Users & roles',
        href: '/dashboard/users',
        icon: Users,
        permissions: [PERMISSIONS.USERS_READ],
      },
      {
        label: 'Support',
        href: '/dashboard/support',
        icon: LifeBuoy,
        permissions: [PERMISSIONS.SUPPORT_READ],
      },
      {
        label: 'Reviews',
        href: '/dashboard/reviews',
        icon: Star,
        permissions: [PERMISSIONS.REVIEWS_READ],
      },
    ],
  },
  {
    label: 'Marketing',
    items: [
      {
        label: 'Blog',
        href: '/dashboard/blog',
        icon: Newspaper,
        permissions: [PERMISSIONS.BLOG_READ, PERMISSIONS.COMMENTS_READ],
        exact: true,
        children: [
          {
            label: 'Categories',
            href: '/dashboard/blog/categories',
            permissions: [PERMISSIONS.BLOG_CATEGORIES_MANAGE],
          },
          {
            label: 'Comments',
            href: '/dashboard/blog/comments',
            permissions: [PERMISSIONS.COMMENTS_READ],
          },
        ],
      },
      {
        label: 'Contests',
        href: '/dashboard/contests',
        icon: Trophy,
        permissions: [PERMISSIONS.CONTEST_READ],
      },
      {
        label: 'Home banner',
        href: '/dashboard/hero',
        icon: Presentation,
        permissions: [PERMISSIONS.HERO_MANAGE],
      },
      {
        label: 'Notices',
        href: '/dashboard/notices',
        icon: Megaphone,
        permissions: [PERMISSIONS.NOTICES_MANAGE],
      },
      {
        label: 'Advertisements',
        href: '/dashboard/ads',
        icon: Image,
        permissions: [PERMISSIONS.ADS_MANAGE],
      },
    ],
  },
  {
    label: 'Business',
    items: [
      {
        label: 'Accounts',
        href: '/dashboard/accounts',
        icon: Wallet,
        permissions: [PERMISSIONS.FINANCE_READ],
      },
      {
        label: 'Finance',
        href: '/dashboard/finance',
        icon: BadgeDollarSign,
        permissions: [PERMISSIONS.FINANCE_READ],
      },
      {
        label: 'Reports',
        href: '/dashboard/reports',
        icon: FileBarChart,
        permissions: [PERMISSIONS.REPORTS_READ],
      },
      {
        label: 'Media',
        href: '/dashboard/media',
        icon: Image,
        permissions: [PERMISSIONS.MEDIA_READ],
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Audit log',
        href: '/dashboard/audit',
        icon: ScrollText,
        permissions: [PERMISSIONS.AUDIT_READ],
      },
      {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
        permissions: [PERMISSIONS.SETTINGS_READ],
      },
    ],
  },
];
