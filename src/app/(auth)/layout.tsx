import Link from 'next/link';
import { Mountain } from 'lucide-react';

import { ThemeToggle } from '@/components/layout/theme-provider';
import { SETTING_KEYS, getPublicSettings, settingString } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getPublicSettings();
  const brand = settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls');
  const tagline = settingString(settings, SETTING_KEYS.BRAND_TAGLINE);

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — decorative, hidden on small screens. */}
      <aside className="wps-aurora relative hidden flex-col justify-between overflow-hidden bg-card p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mountain className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold">{brand}</span>
        </Link>

        <div className="max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            {tagline || 'Journeys crafted for wandering souls'}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            One account for your bookings, payments, invoices, visa requests and
            support conversations — all in one place.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {[
              'Track every booking and its payment status',
              'Download invoices when payment is verified',
              'Follow visa and custom-trip requests end to end',
              'Message our support team with full history',
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {brand}
        </p>
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mountain className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-base font-semibold">{brand}</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
