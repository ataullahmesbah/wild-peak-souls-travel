import type { Metadata } from 'next';
import Link from 'next/link';
import { Mountain, Wrench } from 'lucide-react';

import { Container } from '@/components/ui/section';
import { ThemeToggle } from '@/components/layout/theme-provider';
import {
  SETTING_KEYS,
  getPublicSettings,
  settingBool,
  settingString,
} from '@/lib/settings';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'We will be back shortly',
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const settings = await getPublicSettings();
  const brand = settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls');
  const enabled = settingBool(settings, SETTING_KEYS.MAINTENANCE_ENABLED);
  const message = settingString(
    settings,
    SETTING_KEYS.MAINTENANCE_MESSAGE,
    'We are making some improvements and will be back very soon. Existing bookings are unaffected.',
  );
  const returnAt = settings[SETTING_KEYS.MAINTENANCE_RETURN_AT];
  const email = settingString(settings, SETTING_KEYS.CONTACT_EMAIL);
  const phone = settingString(settings, SETTING_KEYS.CONTACT_PHONE);

  return (
    <div className="wps-aurora flex min-h-dvh flex-col">
      <header className="flex items-center justify-between p-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mountain className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-semibold">{brand}</span>
        </Link>
        <ThemeToggle />
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-5 py-12">
        <Container className="max-w-xl text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-soft text-warning">
            <Wrench className="h-8 w-8" aria-hidden="true" />
          </span>

          <h1 className="mt-6 font-display text-3xl font-semibold sm:text-4xl">
            {enabled ? 'We will be back shortly' : 'Everything is running'}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {enabled
              ? message
              : 'Maintenance mode is off — the site is available as normal.'}
          </p>

          {enabled && returnAt && (
            <p className="mt-4 inline-block rounded-full bg-card px-4 py-2 text-sm">
              Expected back by{' '}
              <strong className="font-medium">{formatDateTime(returnAt)}</strong>
            </p>
          )}

          <div className="mt-8 rounded-card border border-border bg-card p-6 text-left">
            <h2 className="font-display text-sm font-semibold">
              Need something urgently?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If you are travelling with us right now, or have a booking in the next
              48 hours, reach us directly:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-primary hover:underline">
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="text-primary hover:underline">
                    {email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {!enabled && (
            <Link
              href="/"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-field bg-primary px-6 text-sm font-medium text-primary-foreground"
            >
              Back to the site
            </Link>
          )}
        </Container>
      </main>
    </div>
  );
}
