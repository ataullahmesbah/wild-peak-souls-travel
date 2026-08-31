import Link from 'next/link';

import { SiteHeader } from '@/components/layout/site-header';
import { AccountNav } from '@/components/account/account-nav';
import { Container } from '@/components/ui/section';
import { requireUserPage } from '@/lib/rbac/guard';
import { isStaff } from '@/lib/rbac/guard';
import { unreadNotificationCount } from '@/lib/notifications';
import { SETTING_KEYS, getPublicSettings, settingString } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard. The nav below is a convenience, not the protection —
  // every account page and API route checks the session independently.
  const user = await requireUserPage('/login?next=/account');
  const [settings, unread] = await Promise.all([
    getPublicSettings(),
    unreadNotificationCount(user.id),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        brandName={settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls')}
        user={{
          name: user.name,
          email: user.email,
          isStaff: isStaff(user),
          unreadCount: unread,
        }}
      />

      <main id="main" className="flex-1 bg-muted/25 py-8">
        <Container>
          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold">My account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {user.email}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
            <AccountNav unreadCount={unread} />
            <div className="min-w-0">{children}</div>
          </div>
        </Container>
      </main>

      <footer className="border-t border-border bg-card py-6">
        <Container className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>
            Need help?{' '}
            <Link href="/account/support" className="text-primary hover:underline">
              Open a support token
            </Link>
          </p>
          <Link href="/" className="hover:text-foreground">
            Back to website
          </Link>
        </Container>
      </footer>
    </div>
  );
}
