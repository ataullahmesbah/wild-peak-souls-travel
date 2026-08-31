import 'server-only';

import { headers } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { clientIpFromHeaders } from '@/lib/auth/session';

export interface AuditInput {
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an immutable audit record. Audit failures must never break the
 * business operation that triggered them, so errors are swallowed after
 * being logged server-side.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const headerList = await headers();
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorLabel: input.actorLabel ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: clientIpFromHeaders(headerList),
        userAgent: headerList.get('user-agent')?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] failed to record entry', input.action, error);
  }
}

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILED: 'auth.login.failed',
  LOGOUT: 'auth.logout',
  SIGNUP: 'auth.signup',
  OTP_ISSUED: 'auth.otp.issued',
  OTP_VERIFIED: 'auth.otp.verified',
  PASSWORD_RESET: 'auth.password.reset',
  USER_ROLE_UPDATED: 'users.role.updated',
  USER_STATUS_UPDATED: 'users.status.updated',
  EVENT_CREATED: 'events.created',
  EVENT_UPDATED: 'events.updated',
  EVENT_DELETED: 'events.deleted',
  BOOKING_CREATED: 'bookings.created',
  BOOKING_STATUS_UPDATED: 'bookings.status.updated',
  PAYMENT_SUBMITTED: 'payments.submitted',
  PAYMENT_VERIFIED: 'payments.verified',
  PAYMENT_REJECTED: 'payments.rejected',
  REFUND_ISSUED: 'payments.refunded',
  SETTINGS_UPDATED: 'settings.updated',
  MAINTENANCE_TOGGLED: 'settings.maintenance.toggled',
  REVIEW_MODERATED: 'reviews.moderated',
  MEDIA_DELETED: 'media.deleted',
} as const;
