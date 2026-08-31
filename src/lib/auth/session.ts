import 'server-only';

import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';

import { prisma } from '@/lib/prisma';
import { serverEnv } from '@/lib/env';
import { generateOpaqueToken, hashToken } from '@/lib/auth/tokens';
import type { PermissionKey } from '@/lib/rbac/permissions';
import { RoleName, UserStatus } from '@/generated/prisma';

export const SESSION_COOKIE = 'wps_session';
const SESSION_TTL_DAYS = 14;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  status: UserStatus;
  roles: RoleName[];
  permissions: PermissionKey[];
}

interface SessionJwtPayload {
  sub: string;
  sid: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(serverEnv().AUTH_SECRET);
}

async function signSessionJwt(payload: SessionJwtPayload): Promise<string> {
  return new SignJWT({ sid: payload.sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer('wild-peak-souls')
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secretKey());
}

async function verifySessionJwt(
  token: string,
): Promise<SessionJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'wild-peak-souls',
    });
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      return null;
    }
    return { sub: payload.sub, sid: payload.sid };
  } catch {
    return null;
  }
}

/**
 * Creates a database-backed session and sets the signed, HTTP-only cookie.
 * The JWT alone is not sufficient to authenticate — the referenced Session row
 * must still exist and be unrevoked, so logout and suspension take effect
 * immediately rather than waiting for token expiry.
 */
export async function createSession(userId: string): Promise<void> {
  const headerList = await headers();
  const rawToken = generateOpaqueToken();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      userAgent: headerList.get('user-agent')?.slice(0, 500) ?? null,
      ipAddress: clientIpFromHeaders(headerList),
      expiresAt,
    },
  });

  const jwt = await signSessionJwt({ sub: userId, sid: session.id });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await verifySessionJwt(token);
    if (payload) {
      await prisma.session
        .updateMany({
          where: { id: payload.sid, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => undefined);
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Revokes every session for a user (used on suspension / password change). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Resolves the current user from the session cookie.
 * Memoized per request via React `cache` so a page that checks auth in the
 * layout, the page and a child component still issues a single query.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionJwt(token);
  if (!payload) return null;

  const session = await prisma.session
    .findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            status: true,
            roles: {
              select: {
                role: {
                  select: {
                    name: true,
                    permissions: {
                      select: { permission: { select: { key: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
    .catch(() => null);

  if (!session) return null;
  const user = session.user;
  if (user.status !== UserStatus.ACTIVE) return null;

  const roles = user.roles.map((r) => r.role.name);
  const permissions = Array.from(
    new Set(
      user.roles.flatMap((r) =>
        r.role.permissions.map((p) => p.permission.key as PermissionKey),
      ),
    ),
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image,
    status: user.status,
    roles,
    permissions,
  };
});

export function clientIpFromHeaders(h: Headers): string | null {
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return h.get('x-real-ip');
}
