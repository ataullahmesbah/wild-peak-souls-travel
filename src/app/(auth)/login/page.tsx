import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/forms/login-form';
import { FormSkeleton } from '@/components/ui/skeleton';
import { getCurrentUser } from '@/lib/auth/session';
import { isGoogleOAuthConfigured } from '@/lib/env';
import { SETTING_KEYS, getPublicSettings, settingBool } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Wild Peak Souls account.',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getPublicSettings()]);
  if (user) redirect('/account');

  // Google appears only when both the dashboard toggle is on AND credentials
  // are actually configured — a button that cannot work is worse than none.
  const googleEnabled =
    settingBool(settings, SETTING_KEYS.AUTH_GOOGLE_ENABLED) && isGoogleOAuthConfigured();

  return (
    <Suspense fallback={<FormSkeleton fields={2} />}>
      <LoginForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
