import { NextResponse } from 'next/server';

import { apiHandler, apiSuccess } from '@/lib/api';
import { getCurrentUser, destroySession } from '@/lib/auth/session';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { siteUrl } from '@/lib/env';

/**
 * Logout is POST-only: a GET would let a third-party page sign users out via
 * an <img> tag.
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getCurrentUser();
  await destroySession();

  if (user) {
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: 'User',
      entityId: user.id,
    });
  }

  // The mobile menu posts a plain HTML form, which expects a redirect;
  // fetch callers get JSON.
  const accepts = request.headers.get('accept') ?? '';
  if (accepts.includes('text/html')) {
    return NextResponse.redirect(new URL('/', siteUrl()), 303);
  }

  return apiSuccess({ signedOut: true });
});
