// src/lib/settings-keys.ts
/**
 * Setting keys, defaults, and which keys must never reach a browser.
 *
 * Pure declaration, deliberately in its own module with no `server-only` and
 * no database import. The upgrade script is a plain node process, and it needs
 * to read this list to create the rows v2 introduced — a guard meant to keep
 * queries off the client should not also keep a constant off a CLI.
 */

export const SETTING_KEYS = {
  BRAND_NAME: 'general.brandName',
  BRAND_TAGLINE: 'general.brandTagline',
  CONTACT_EMAIL: 'general.contactEmail',
  CONTACT_PHONE: 'general.contactPhone',
  CONTACT_ADDRESS: 'general.contactAddress',
  SOCIAL_FACEBOOK: 'general.social.facebook',
  SOCIAL_INSTAGRAM: 'general.social.instagram',
  SOCIAL_YOUTUBE: 'general.social.youtube',
  SOCIAL_WHATSAPP: 'general.social.whatsapp',
  CURRENCY: 'general.currency',
  TIMEZONE: 'general.timezone',

  AUTH_GOOGLE_ENABLED: 'auth.googleEnabled',
  AUTH_OTP_ENABLED: 'auth.otpEnabled',
  AUTH_SIGNUP_ENABLED: 'auth.signupEnabled',

  PAYMENT_BKASH_ENABLED: 'payment.bkash.enabled',
  PAYMENT_BKASH_NUMBER: 'payment.bkash.number',
  PAYMENT_BKASH_INSTRUCTIONS: 'payment.bkash.instructions',
  PAYMENT_NAGAD_ENABLED: 'payment.nagad.enabled',
  PAYMENT_NAGAD_NUMBER: 'payment.nagad.number',
  PAYMENT_NAGAD_INSTRUCTIONS: 'payment.nagad.instructions',
  PAYMENT_SSLCOMMERZ_ENABLED: 'payment.sslcommerz.enabled',

  SEO_SITE_TITLE: 'seo.siteTitle',
  SEO_SITE_DESCRIPTION: 'seo.siteDescription',
  SEO_DEFAULT_OG_IMAGE: 'seo.defaultOgImage',
  SEO_ROBOTS_INDEX: 'seo.robotsIndex',

  ANALYTICS_GA4_ID: 'analytics.ga4Id',
  ANALYTICS_GTM_ID: 'analytics.gtmId',
  ANALYTICS_META_PIXEL_ID: 'analytics.metaPixelId',
  ANALYTICS_META_CAPI_TOKEN: 'analytics.metaCapiToken',

  MAINTENANCE_ENABLED: 'maintenance.enabled',
  MAINTENANCE_MESSAGE: 'maintenance.message',
  MAINTENANCE_RETURN_AT: 'maintenance.returnAt',

  BUSINESS_BOOKING_TERMS: 'business.bookingTerms',
  BUSINESS_CANCELLATION_WINDOW_HOURS: 'business.cancellationWindowHours',
  BUSINESS_MIN_ADVANCE_HOURS: 'business.minAdvanceHours',
  BUSINESS_HOURS: 'business.openingHours',
  BUSINESS_TRADE_LICENCE: 'business.tradeLicence',
  BUSINESS_REGISTERED_NAME: 'business.registeredName',

  SOCIAL_LINKEDIN: 'general.social.linkedin',
  SOCIAL_X: 'general.social.x',
  SOCIAL_TIKTOK: 'general.social.tiktok',
  SUPPORT_EMAIL: 'general.supportEmail',
  SUPPORT_PHONE: 'general.supportPhone',

  // Attribution for whoever built and maintains the site, kept separate from
  // the brand: the site belongs to Wild Peak Souls, the build does not.
  OWNER_NAME: 'owner.name',
  OWNER_URL: 'owner.url',
  OWNER_CREDIT_ENABLED: 'owner.creditEnabled',

  HOME_FAQ_ENABLED: 'home.faqEnabled',
  HOME_HERO_FALLBACK_TITLE: 'home.heroFallbackTitle',
  HOME_HERO_FALLBACK_SUBTITLE: 'home.heroFallbackSubtitle',

  AI_ASSISTANT_ENABLED: 'ai.assistantEnabled',
  AI_ASSISTANT_GREETING: 'ai.assistantGreeting',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Keys that must never be serialized into a public/browser response. */
export const SECRET_SETTING_KEYS: string[] = [
  SETTING_KEYS.ANALYTICS_META_CAPI_TOKEN,
];

export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTING_KEYS.BRAND_NAME]: 'Wild Peak Souls',
  [SETTING_KEYS.BRAND_TAGLINE]: 'Journeys crafted for wandering souls',
  [SETTING_KEYS.CONTACT_EMAIL]: 'hello@wildpeaksouls.com',
  [SETTING_KEYS.CONTACT_PHONE]: '+880 1700 000000',
  [SETTING_KEYS.CONTACT_ADDRESS]: 'Dhaka, Bangladesh',
  [SETTING_KEYS.CURRENCY]: 'BDT',
  [SETTING_KEYS.TIMEZONE]: 'Asia/Dhaka',
  [SETTING_KEYS.AUTH_GOOGLE_ENABLED]: 'false',
  [SETTING_KEYS.AUTH_OTP_ENABLED]: 'false',
  [SETTING_KEYS.AUTH_SIGNUP_ENABLED]: 'true',
  [SETTING_KEYS.PAYMENT_BKASH_ENABLED]: 'true',
  [SETTING_KEYS.PAYMENT_NAGAD_ENABLED]: 'true',
  [SETTING_KEYS.PAYMENT_SSLCOMMERZ_ENABLED]: 'false',
  [SETTING_KEYS.SEO_SITE_TITLE]: 'Wild Peak Souls — Premium Travel Experiences',
  [SETTING_KEYS.SEO_ROBOTS_INDEX]: 'true',
  [SETTING_KEYS.MAINTENANCE_ENABLED]: 'false',
  [SETTING_KEYS.BUSINESS_CANCELLATION_WINDOW_HOURS]: '72',
  [SETTING_KEYS.BUSINESS_MIN_ADVANCE_HOURS]: '24',
};

