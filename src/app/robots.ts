import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/env';
import { SETTING_KEYS, getPublicSettings, settingBool } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getPublicSettings();
  const indexable = settingBool(settings, SETTING_KEYS.SEO_ROBOTS_INDEX, true);
  const base = siteUrl();

  if (!indexable) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private and transactional areas are never crawlable, regardless of
        // whether a link to them leaks somewhere.
        disallow: [
          '/dashboard',
          '/dashboard/',
          // The old paths still 308 to /dashboard. Listing them costs nothing
          // and closes the gap for a crawler that does not follow redirects
          // before deciding what it is allowed to fetch.
          '/admin',
          '/admin/',
          '/account',
          '/account/',
          '/checkout',
          '/checkout/',
          '/api/',
          '/login',
          '/register',
          '/verify-otp',
          '/forgot-password',
          '/reset-password',
          '/maintenance',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
