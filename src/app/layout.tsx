import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';

import { ThemeProvider, themeScript } from '@/components/layout/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { siteUrl } from '@/lib/env';
import { organizationJsonLd } from '@/lib/seo';
import {
  SETTING_KEYS,
  getPublicSettings,
  settingBool,
  settingString,
} from '@/lib/settings';

import './globals.css';
import { JsonLd } from '@/components/seo/json-ld';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const brand = settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls');
  const title = settingString(
    settings,
    SETTING_KEYS.SEO_SITE_TITLE,
    `${brand} — Premium Travel Experiences`,
  );
  const description = settingString(
    settings,
    SETTING_KEYS.SEO_SITE_DESCRIPTION,
    'Curated tours, group events, stays, visa assistance and custom journeys across Bangladesh and beyond.',
  );
  const indexable = settingBool(settings, SETTING_KEYS.SEO_ROBOTS_INDEX, true);
  const ogImage = settings[SETTING_KEYS.SEO_DEFAULT_OG_IMAGE];

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s — ${brand}` },
    description,
    applicationName: brand,
    keywords: [
      'travel agency Bangladesh',
      'tour packages',
      'group travel events',
      'visa assistance',
      'Bandarban tours',
      'Sajek tours',
    ],
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: brand,
      title,
      description,
      url: siteUrl(),
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f9f6' },
    { media: '(prefers-color-scheme: dark)', color: '#07120c' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicSettings();
  const jsonLd = organizationJsonLd(settings);

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/*
          Who the business is, in a form search engines and assistants can read.
          Emitted once on every page rather than per route so it is never
          missing from wherever someone happens to land.
        */}
        <JsonLd data={jsonLd} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
