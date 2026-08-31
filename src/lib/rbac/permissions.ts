// src/lib/rbac/permissions.ts
import { RoleName } from '@/generated/prisma';

/**
 * The complete permission catalogue. Permissions are `module.action` strings
 * and are the ONLY thing authorization code should test against — never a
 * role name directly, so that role composition stays configurable.
 */
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Users & access control
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_SUSPEND: 'users.suspend',
  USERS_ROLE_UPDATE: 'users.role.update',
  ROLES_MANAGE: 'roles.manage',

  // Travel catalogue
  DESTINATIONS_READ: 'destinations.read',
  DESTINATIONS_MANAGE: 'destinations.manage',
  DESTINATIONS_DELETE: 'destinations.delete',
  EVENTS_READ: 'events.read',
  EVENTS_CREATE: 'events.create',
  EVENTS_UPDATE: 'events.update',
  EVENTS_PUBLISH: 'events.publish',
  EVENTS_DELETE: 'events.delete',
  TOURS_READ: 'tours.read',
  TOURS_MANAGE: 'tours.manage',
  TOURS_DELETE: 'tours.delete',
  ACTIVITIES_READ: 'activities.read',
  ACTIVITIES_MANAGE: 'activities.manage',
  ACTIVITIES_DELETE: 'activities.delete',
  STAYS_READ: 'stays.read',
  STAYS_MANAGE: 'stays.manage',
  STAYS_DELETE: 'stays.delete',

  // Commerce
  BOOKINGS_READ: 'bookings.read',
  BOOKINGS_UPDATE: 'bookings.update',
  BOOKINGS_CANCEL: 'bookings.cancel',
  PAYMENTS_READ: 'payments.read',
  PAYMENTS_VERIFY: 'payments.verify',
  PAYMENTS_REFUND: 'payments.refund',
  COUPONS_MANAGE: 'coupons.manage',

  // Services & leads
  VISA_READ: 'visa.read',
  VISA_MANAGE: 'visa.manage',
  VISA_DELETE: 'visa.delete',
  VISA_REQUESTS_MANAGE: 'visa.requests.manage',
  FLIGHTS_MANAGE: 'flights.manage',
  TRAINS_MANAGE: 'trains.manage',
  LEADS_READ: 'leads.read',
  LEADS_MANAGE: 'leads.manage',

  // Customer care
  CUSTOMERS_READ: 'customers.read',
  MESSAGES_READ: 'messages.read',
  MESSAGES_REPLY: 'messages.reply',
  SUPPORT_READ: 'support.read',
  SUPPORT_MANAGE: 'support.manage',
  REVIEWS_READ: 'reviews.read',
  REVIEWS_MODERATE: 'reviews.moderate',

  // Blog
  BLOG_READ: 'blog.read',
  BLOG_MANAGE: 'blog.manage',
  BLOG_PUBLISH: 'blog.publish',
  BLOG_DELETE: 'blog.delete',
  BLOG_CATEGORIES_MANAGE: 'blog.categories.manage',
  COMMENTS_READ: 'comments.read',
  COMMENTS_MODERATE: 'comments.moderate',
  COMMENTS_DELETE: 'comments.delete',

  // Contests
  CONTEST_READ: 'contest.read',
  CONTEST_MANAGE: 'contest.manage',
  CONTEST_PUBLISH: 'contest.publish',
  CONTEST_DELETE: 'contest.delete',
  CONTEST_ENTRIES_MODERATE: 'contest.entries.moderate',
  CONTEST_JUDGE: 'contest.judge',

  // Content & marketing
  CONTENT_MANAGE: 'content.manage',
  MEDIA_READ: 'media.read',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',
  NOTICES_MANAGE: 'notices.manage',
  NOTICES_DELETE: 'notices.delete',
  ADS_MANAGE: 'ads.manage',
  ADS_DELETE: 'ads.delete',
  HERO_MANAGE: 'hero.manage',

  // Finance
  FINANCE_READ: 'finance.read',
  FINANCE_TRANSACTION_CREATE: 'finance.transaction.create',
  FINANCE_EXPENSE_CREATE: 'finance.expense.create',
  FINANCE_EXPENSE_APPROVE: 'finance.expense.approve',
  FINANCE_SALARY_MANAGE: 'finance.salary.manage',
  REPORTS_READ: 'reports.read',

  // System
  ANALYTICS_MANAGE: 'analytics.manage',
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  MAINTENANCE_TOGGLE: 'maintenance.toggle',
  PAGE_ACCESS_MANAGE: 'pages.access.manage',
  AUDIT_READ: 'audit.read',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export function permissionModule(key: string): string {
  return key.split('.')[0] ?? 'general';
}

const CONTENT_PERMS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.DESTINATIONS_READ,
  PERMISSIONS.DESTINATIONS_MANAGE,
  PERMISSIONS.EVENTS_READ,
  PERMISSIONS.EVENTS_CREATE,
  PERMISSIONS.EVENTS_UPDATE,
  PERMISSIONS.EVENTS_PUBLISH,
  PERMISSIONS.TOURS_READ,
  PERMISSIONS.TOURS_MANAGE,
  PERMISSIONS.ACTIVITIES_READ,
  PERMISSIONS.ACTIVITIES_MANAGE,
  PERMISSIONS.STAYS_READ,
  PERMISSIONS.STAYS_MANAGE,
  PERMISSIONS.CONTENT_MANAGE,
  PERMISSIONS.BLOG_READ,
  PERMISSIONS.BLOG_MANAGE,
  PERMISSIONS.BLOG_PUBLISH,
  PERMISSIONS.BLOG_CATEGORIES_MANAGE,
  PERMISSIONS.COMMENTS_READ,
  PERMISSIONS.COMMENTS_MODERATE,
  PERMISSIONS.CONTEST_READ,
  PERMISSIONS.CONTEST_MANAGE,
  PERMISSIONS.CONTEST_PUBLISH,
  PERMISSIONS.CONTEST_ENTRIES_MODERATE,
  PERMISSIONS.CONTEST_JUDGE,
  PERMISSIONS.HERO_MANAGE,
  PERMISSIONS.NOTICES_MANAGE,
  PERMISSIONS.MEDIA_READ,
  PERMISSIONS.MEDIA_UPLOAD,
  PERMISSIONS.VISA_READ,
];

const SUPPORT_PERMS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.CUSTOMERS_READ,
  PERMISSIONS.MESSAGES_READ,
  PERMISSIONS.MESSAGES_REPLY,
  PERMISSIONS.SUPPORT_READ,
  PERMISSIONS.SUPPORT_MANAGE,
  PERMISSIONS.LEADS_READ,
  PERMISSIONS.LEADS_MANAGE,
  PERMISSIONS.VISA_READ,
  PERMISSIONS.VISA_REQUESTS_MANAGE,
  PERMISSIONS.BOOKINGS_READ,
  PERMISSIONS.EVENTS_READ,
  PERMISSIONS.TOURS_READ,
  PERMISSIONS.CONTEST_READ,
];

const FINANCE_PERMS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.FINANCE_READ,
  PERMISSIONS.FINANCE_TRANSACTION_CREATE,
  PERMISSIONS.FINANCE_EXPENSE_CREATE,
  PERMISSIONS.FINANCE_EXPENSE_APPROVE,
  PERMISSIONS.FINANCE_SALARY_MANAGE,
  PERMISSIONS.PAYMENTS_READ,
  PERMISSIONS.PAYMENTS_VERIFY,
  PERMISSIONS.PAYMENTS_REFUND,
  PERMISSIONS.BOOKINGS_READ,
  PERMISSIONS.REPORTS_READ,
];

const MODERATOR_PERMS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.CUSTOMERS_READ,
  PERMISSIONS.REVIEWS_READ,
  PERMISSIONS.REVIEWS_MODERATE,
  PERMISSIONS.SUPPORT_READ,
  PERMISSIONS.SUPPORT_MANAGE,
  PERMISSIONS.MESSAGES_READ,
  PERMISSIONS.MESSAGES_REPLY,
  PERMISSIONS.LEADS_READ,
  PERMISSIONS.LEADS_MANAGE,
  PERMISSIONS.EVENTS_READ,
  PERMISSIONS.TOURS_READ,
  PERMISSIONS.BOOKINGS_READ,
  PERMISSIONS.MEDIA_READ,
  PERMISSIONS.MEDIA_UPLOAD,
  PERMISSIONS.BLOG_READ,
  PERMISSIONS.BLOG_MANAGE,
  PERMISSIONS.BLOG_PUBLISH,
  PERMISSIONS.BLOG_CATEGORIES_MANAGE,
  PERMISSIONS.COMMENTS_READ,
  PERMISSIONS.COMMENTS_MODERATE,
  PERMISSIONS.CONTEST_READ,
  PERMISSIONS.CONTEST_ENTRIES_MODERATE,
];

/**
 * Admin gets broad operational access but explicitly NOT role administration,
 * secret/system configuration, or maintenance toggling — those stay with
 * SUPER_ADMIN per the RBAC PRD.
 */
const ADMIN_EXCLUDED: PermissionKey[] = [
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.MAINTENANCE_TOGGLE,
  PERMISSIONS.PAGE_ACCESS_MANAGE,
  PERMISSIONS.SETTINGS_UPDATE,
  PERMISSIONS.ANALYTICS_MANAGE,
  PERMISSIONS.FINANCE_SALARY_MANAGE,
];

const ADMIN_PERMS: PermissionKey[] = ALL_PERMISSIONS.filter(
  (p) => !ADMIN_EXCLUDED.includes(p),
);

/** Default role → permission mapping applied by the seed script. */
export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ADMIN_PERMS,
  MODERATOR: MODERATOR_PERMS,
  CONTENT_MANAGER: CONTENT_PERMS,
  SUPPORT_AGENT: SUPPORT_PERMS,
  FINANCE_MANAGER: FINANCE_PERMS,
  CUSTOMER: [],
};

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  CONTENT_MANAGER: 'Content Manager',
  SUPPORT_AGENT: 'Support Agent',
  FINANCE_MANAGER: 'Finance Manager',
  CUSTOMER: 'Customer',
};

export const STAFF_ROLES: RoleName[] = [
  RoleName.SUPER_ADMIN,
  RoleName.ADMIN,
  RoleName.MODERATOR,
  RoleName.CONTENT_MANAGER,
  RoleName.SUPPORT_AGENT,
  RoleName.FINANCE_MANAGER,
];

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

/**
 * Rank orders the roles for user-management decisions.
 *
 * Permissions answer "may this actor perform this kind of action?". Rank
 * answers the question permissions cannot: "may this actor perform it *on this
 * particular person*?" Without it, an ADMIN holding `users.suspend` could
 * suspend the platform owner — the permission is satisfied, but the action is
 * plainly illegitimate.
 */
export const ROLE_RANK: Record<RoleName, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  MODERATOR: 60,
  CONTENT_MANAGER: 50,
  SUPPORT_AGENT: 50,
  FINANCE_MANAGER: 50,
  CUSTOMER: 10,
};

/** A user's rank is that of their highest role. */
export function rankOf(roles: RoleName[]): number {
  if (roles.length === 0) return 0;
  return Math.max(...roles.map((role) => ROLE_RANK[role] ?? 0));
}

/**
 * May `actorRoles` act on a user holding `targetRoles`?
 *
 * Strictly lower: an ADMIN cannot act on another ADMIN, which stops two peers
 * from suspending each other. SUPER_ADMIN is the sole exception — it may act on
 * its peers so a second owner can still be managed.
 */
export function canActOnUser(
  actorRoles: RoleName[],
  targetRoles: RoleName[],
): boolean {
  const actor = rankOf(actorRoles);
  const target = rankOf(targetRoles);
  if (actorRoles.includes(RoleName.SUPER_ADMIN)) return true;
  return actor > target;
}

/**
 * May `actorRoles` assign `role` to someone?
 *
 * An actor can never mint a peer or a superior. Only SUPER_ADMIN may grant
 * SUPER_ADMIN.
 */
export function canAssignRole(actorRoles: RoleName[], role: RoleName): boolean {
  if (actorRoles.includes(RoleName.SUPER_ADMIN)) return true;
  return rankOf(actorRoles) > ROLE_RANK[role];
}

/** Roles this actor is allowed to hand out — drives the role dropdown. */
export function assignableRoles(actorRoles: RoleName[]): RoleName[] {
  return (Object.keys(ROLE_RANK) as RoleName[]).filter((role) =>
    canAssignRole(actorRoles, role),
  );
}
