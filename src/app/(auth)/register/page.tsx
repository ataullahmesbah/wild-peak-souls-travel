import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { RegisterForm } from '@/components/forms/register-form';
import { FormSkeleton } from '@/components/ui/skeleton';
import { StateMessage } from '@/components/ui/states';
import { getCurrentUser } from '@/lib/auth/session';
import { isGoogleOAuthConfigured } from '@/lib/env';
import { SETTING_KEYS, getPublicSettings, settingBool } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create an Account',
  description: 'Create your Wild Peak Souls account to book trips and track requests.',
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getPublicSettings()]);
  if (user) redirect('/account');

  if (!settingBool(settings, SETTING_KEYS.AUTH_SIGNUP_ENABLED, true)) {
    return (
      <StateMessage
        title="Registration is paused"
        description="New account creation is temporarily disabled. Contact our team and we will help you directly."
        actionLabel="Contact us"
        actionHref="/contact"
        tone="warning"
      />
    );
  }

  const googleEnabled =
    settingBool(settings, SETTING_KEYS.AUTH_GOOGLE_ENABLED) && isGoogleOAuthConfigured();

  return (
    <Suspense fallback={<FormSkeleton fields={5} />}>
      <RegisterForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
