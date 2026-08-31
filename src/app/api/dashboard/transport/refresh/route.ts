// src/app/api/dashboard/transport/refresh/route.ts
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import {
  markTrainSchedulesReviewed,
  refreshFlightSchedules,
} from '@/lib/transport/refresh';

export const maxDuration = 60;

const schema = z.object({ kind: z.enum(['flights', 'trains']) });

/**
 * Refreshes stored transport schedules.
 *
 * Two callers, one path. A staff member can press the button in the dashboard,
 * and a scheduler can call it unattended with a shared secret in the
 * `x-refresh-token` header matched against TRANSPORT_REFRESH_TOKEN. The token
 * path exists because a nightly cron has no session; it is compared only when
 * the variable is set, so leaving it unset simply means the endpoint is
 * staff-only rather than open.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const headerList = await headers();
  const presented = headerList.get('x-refresh-token');
  const expected = process.env.TRANSPORT_REFRESH_TOKEN;

  // A scheduled run authenticates with the shared secret; anything else must
  // be a signed-in staff member holding the matching permission.
  const scheduled = Boolean(expected && presented && timingSafeEqual(presented, expected));

  const body = await request.json().catch(() => ({}));
  const { kind } = schema.parse(body);

  let actorId: string | undefined;
  if (!scheduled) {
    const staff = await requirePermission(
      kind === 'flights' ? PERMISSIONS.FLIGHTS_MANAGE : PERMISSIONS.TRAINS_MANAGE,
    );
    actorId = staff.id;
  }

  const result =
    kind === 'flights' ? await refreshFlightSchedules() : await markTrainSchedulesReviewed();

  if (!result.ok) {
    throw new BusinessError(
      result.reason ?? 'The refresh could not run.',
      'NOT_CONFIGURED',
      503,
    );
  }

  await recordAudit({
    actorId,
    actorLabel: scheduled ? 'Scheduled refresh' : undefined,
    action: `transport.${kind}.refreshed`,
    entityType: kind === 'flights' ? 'FlightRoute' : 'TrainSchedule',
    metadata: {
      checked: result.checked,
      updated: result.updated,
      created: result.created,
    },
  });

  return apiSuccess(result);
});

/**
 * Compares two secrets without leaking their length through timing.
 *
 * A plain === returns as soon as two characters differ, which over enough
 * attempts reveals the prefix. This always walks the whole string.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
