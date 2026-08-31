import 'server-only';

import { siteUrl } from '@/lib/env';
import { SETTING_KEYS, type SettingsMap, settingString } from '@/lib/settings';

/**
 * Structured data describing the business itself.
 *
 * This is what lets a search engine — and increasingly an assistant answering
 * "who runs trips to Bandarban?" — state the agency's name, contact details and
 * social presence without guessing. Everything here is already public on the
 * page; nothing is asserted that a visitor could not read.
 *
 * The site's owner is named through `author`, separately from the organisation
 * itself: the agency is the brand, the person who built and maintains the site
 * is not the same entity and should not be conflated with it.
 */
export function organizationJsonLd(settings: SettingsMap) {
  const base = siteUrl();
  const brand = settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls');

  const socials = [
    settings[SETTING_KEYS.SOCIAL_FACEBOOK],
    settings[SETTING_KEYS.SOCIAL_INSTAGRAM],
    settings[SETTING_KEYS.SOCIAL_YOUTUBE],
    settings[SETTING_KEYS.SOCIAL_LINKEDIN],
    settings[SETTING_KEYS.SOCIAL_X],
    settings[SETTING_KEYS.SOCIAL_TIKTOK],
  ].filter((url): url is string => Boolean(url));

  const email = settingString(settings, SETTING_KEYS.CONTACT_EMAIL);
  const phone = settingString(settings, SETTING_KEYS.CONTACT_PHONE);
  const address = settingString(settings, SETTING_KEYS.CONTACT_ADDRESS);
  const ownerName = settingString(settings, SETTING_KEYS.OWNER_NAME);
  const ownerUrl = settingString(settings, SETTING_KEYS.OWNER_URL);
  const legalName = settingString(settings, SETTING_KEYS.BUSINESS_REGISTERED_NAME);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TravelAgency',
        '@id': `${base}/#organization`,
        name: brand,
        legalName: legalName || undefined,
        url: base,
        description: settingString(settings, SETTING_KEYS.SEO_SITE_DESCRIPTION) || undefined,
        slogan: settingString(settings, SETTING_KEYS.BRAND_TAGLINE) || undefined,
        image: settings[SETTING_KEYS.SEO_DEFAULT_OG_IMAGE] || undefined,
        email: email || undefined,
        telephone: phone || undefined,
        address: address
          ? { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'BD' }
          : undefined,
        openingHours: settingString(settings, SETTING_KEYS.BUSINESS_HOURS) || undefined,
        sameAs: socials.length > 0 ? socials : undefined,
        areaServed: { '@type': 'Country', name: 'Bangladesh' },
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: brand,
        publisher: { '@id': `${base}/#organization` },
        inLanguage: 'en',
        // Declares the site search so results can carry a search box.
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${base}/events?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
        ...(ownerName
          ? {
              author: {
                '@type': 'Person',
                name: ownerName,
                url: ownerUrl || undefined,
              },
            }
          : {}),
      },
    ],
  };
}

/** Breadcrumb trail, so search results show the path rather than a bare URL. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${base}${item.path}`,
    })),
  };
}
