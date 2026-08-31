// src/app/(site)/layout.tsx
import { redirect } from 'next/navigation';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { NoticeBar } from '@/components/layout/notice-bar';
import { TravelAssistant } from '@/components/assistant/travel-assistant';
import { getCurrentUser } from '@/lib/auth/session';
import { isStaff } from '@/lib/rbac/guard';
import { getActiveNotices } from '@/lib/data/public';
import { getCurrentContest } from '@/lib/data/contest';
import { unreadNotificationCount } from '@/lib/notifications';
import {
  SETTING_KEYS,
  getPublicSettings,
  settingBool,
  settingString,
} from '@/lib/settings';

// Session, notices and settings are per-request, so the public shell is
// rendered dynamically rather than cached at build time.
export const dynamic = 'force-dynamic';

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, settings, notices, contest] = await Promise.all([
    getCurrentUser(),
    getPublicSettings(),
    getActiveNotices(),
    // Drives the Contest link in the navbar. It appears while a contest is
    // published and running, and goes away on its own afterwards.
    getCurrentContest(),
  ]);

  // Only signed-in visitors have a feed, so this is not a query on every
  // anonymous page view.
  const unread = user ? await unreadNotificationCount(user.id) : 0;

  // Maintenance mode blocks the public site but never staff, so an
  // administrator cannot lock themselves out of the dashboard.
  if (settingBool(settings, SETTING_KEYS.MAINTENANCE_ENABLED) && !isStaff(user)) {
    redirect('/maintenance');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <NoticeBar notices={notices} />
      <SiteHeader
        brandName={settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls')}
        contestSlug={contest?.slug ?? null}
        user={
          user
            ? {
                name: user.name,
                email: user.email,
                isStaff: isStaff(user),
                unreadCount: unread,
              }
            : null
        }
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      {settingBool(settings, SETTING_KEYS.AI_ASSISTANT_ENABLED, true) && (
        <TravelAssistant
          greeting={settingString(
            settings,
            SETTING_KEYS.AI_ASSISTANT_GREETING,
            'Hello. Ask me about any trip, destination or visa on this site and I will find it for you.',
          )}
        />
      )}
      <SiteFooter />
    </div>
  );
}
