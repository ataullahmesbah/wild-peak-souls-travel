import type { Metadata } from 'next';

import { Panel, DetailRow } from '@/components/account/panels';
import { ProfileForm, PasswordForm } from '@/components/account/profile-forms';
import { requireUserPage } from '@/lib/rbac/guard';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profile & Security',
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await requireUserPage();

  const [account, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        image: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
      },
    }),
    prisma.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, lastSeenAt: true, createdAt: true },
      orderBy: { lastSeenAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!account) return null;

  return (
    <div className="space-y-6">
      <Panel title="Your details" description="Used on bookings and for contacting you.">
        <ProfileForm
          defaults={{
            name: account.name,
            phone: account.phone ?? '',
            image: account.image ?? '',
          }}
        />
      </Panel>

      <Panel title="Account">
        <dl className="divide-y divide-border">
          <DetailRow label="Email">{account.email}</DetailRow>
          <DetailRow label="Email verified">
            {account.emailVerifiedAt ? formatDateTime(account.emailVerifiedAt) : 'Not verified'}
          </DetailRow>
          <DetailRow label="Role">
            {user.roles.map((r) => ROLE_LABELS[r]).join(', ')}
          </DetailRow>
          <DetailRow label="Member since">{formatDateTime(account.createdAt)}</DetailRow>
          <DetailRow label="Last sign-in">
            {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : '—'}
          </DetailRow>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          To change the email on your account, contact our support team — we verify
          the change to protect your bookings.
        </p>
      </Panel>

      <Panel
        title="Change password"
        description="You need your current password to set a new one."
      >
        <PasswordForm />
      </Panel>

      <Panel
        title="Active sessions"
        description="Devices currently signed in to this account."
      >
        <ul className="divide-y divide-border">
          {sessions.map((session) => (
            <li key={session.id} className="py-3.5">
              <p className="truncate text-sm">
                {session.userAgent ?? 'Unknown device'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last active {formatDateTime(session.lastSeenAt)} · signed in{' '}
                {formatDateTime(session.createdAt)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Changing your password signs out every other session automatically.
        </p>
      </Panel>
    </div>
  );
}
