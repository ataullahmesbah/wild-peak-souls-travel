import 'server-only';

import { redirect } from 'next/navigation';

import { getCurrentUser, type SessionUser } from '@/lib/auth/session';
import { PERMISSIONS, type PermissionKey } from '@/lib/rbac/permissions';
import { RoleName } from '@/generated/prisma';

/** Raised by API-layer guards; mapped to a safe HTTP response by `apiHandler`. */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function hasPermission(
  user: SessionUser | null,
  permission: PermissionKey,
): boolean {
  if (!user) return false;
  if (user.roles.includes(RoleName.SUPER_ADMIN)) return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: SessionUser | null,
  permissions: PermissionKey[],
): boolean {
  if (permissions.length === 0) return true;
  return permissions.some((p) => hasPermission(user, p));
}

export function isStaff(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.roles.some((r) => r !== RoleName.CUSTOMER);
}

// --- API guards (throw) -----------------------------------------------------

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('Authentication required', 401);
  return user;
}

export async function requirePermission(
  permission: PermissionKey,
): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) {
    throw new AuthError('You do not have access to this resource', 403);
  }
  return user;
}

export async function requireAnyPermission(
  permissions: PermissionKey[],
): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasAnyPermission(user, permissions)) {
    throw new AuthError('You do not have access to this resource', 403);
  }
  return user;
}

/**
 * Object-level check. A customer may hold `bookings.read` for their own
 * records, but must never resolve another customer's row — staff with the
 * permission may.
 */
export function assertOwnershipOrPermission(
  user: SessionUser,
  ownerId: string,
  staffPermission: PermissionKey,
): void {
  if (user.id === ownerId) return;
  if (hasPermission(user, staffPermission)) return;
  // 404 rather than 403 so the existence of another customer's record is not
  // confirmed to a probing client.
  throw new AuthError('Not found', 404);
}

// --- Page guards (redirect) -------------------------------------------------

export async function requireUserPage(
  redirectTo = '/login',
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function requirePermissionPage(
  permission: PermissionKey,
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');
  if (!hasPermission(user, permission)) redirect('/dashboard/forbidden');
  return user;
}

export async function requireStaffPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');
  if (!hasPermission(user, PERMISSIONS.DASHBOARD_VIEW)) {
    redirect('/dashboard/forbidden');
  }
  return user;
}
