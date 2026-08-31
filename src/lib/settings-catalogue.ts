// src/lib/settings-catalogue.ts
import { prisma } from '@/lib/prisma';
import { SETTING_KEYS } from '@/lib/settings-keys';
import { SettingType } from '@/generated/prisma';

/**
 * Every setting the dashboard exposes, declared in code.
 *
 * The settings screen used to render whatever rows happened to be in the
 * database, which meant a new setting was invisible until someone remembered to
 * seed it, and an unseeded one showed as a bare key with no explanation. The
 * catalogue is the source of truth for what exists and how it is described;
 * the database holds only the values.
 *
 * Descriptions are written for the person running the agency, not for whoever
 * wrote the code — "customers see this at checkout", not "string, nullable".
 */
export interface SettingSpec {
  key: string;
  label: string;
  description?: string;
  type?: SettingType;
  placeholder?: string;
  /** Long-form text gets a textarea and the full width. */
  multiline?: boolean;
  isSecret?: boolean;
  /** Changing this needs a permission beyond settings.update. */
  guardedBy?: 'maintenance';
}

export interface SettingGroup {
  category: string;
  title: string;
  description: string;
  fields: SettingSpec[];
}

const B = SettingType.BOOLEAN;
const N = SettingType.NUMBER;

export const SETTINGS_CATALOGUE: SettingGroup[] = [
  {
    category: 'general',
    title: 'Identity and contact',
    description:
      'The name, tagline and contact details shown across the public site, in emails and in search results.',
    fields: [
      { key: SETTING_KEYS.BRAND_NAME, label: 'Brand name', description: 'Shown in the header, the footer and every page title.' },
      { key: SETTING_KEYS.BRAND_TAGLINE, label: 'Tagline', description: 'One line under the brand name.' },
      { key: SETTING_KEYS.CONTACT_EMAIL, label: 'Contact email', placeholder: 'hello@wildpeaksouls.com' },
      { key: SETTING_KEYS.CONTACT_PHONE, label: 'Contact phone', placeholder: '+880 1700 000000' },
      { key: SETTING_KEYS.SUPPORT_EMAIL, label: 'Support email', description: 'Used for booking and payment questions when it differs from the general address.' },
      { key: SETTING_KEYS.SUPPORT_PHONE, label: 'Support phone' },
      { key: SETTING_KEYS.CONTACT_ADDRESS, label: 'Office address', multiline: true },
      { key: SETTING_KEYS.CURRENCY, label: 'Currency code', description: 'Three letters, for example BDT. Prices are shown in this currency.' },
      { key: SETTING_KEYS.TIMEZONE, label: 'Timezone', description: 'Departure times and reports are shown in this zone.' },
    ],
  },
  {
    category: 'social',
    title: 'Social links',
    description:
      'Leave a field blank to hide that icon. These appear in the footer and in the structured data search engines read.',
    fields: [
      { key: SETTING_KEYS.SOCIAL_FACEBOOK, label: 'Facebook', placeholder: 'https://facebook.com/…' },
      { key: SETTING_KEYS.SOCIAL_INSTAGRAM, label: 'Instagram', placeholder: 'https://instagram.com/…' },
      { key: SETTING_KEYS.SOCIAL_YOUTUBE, label: 'YouTube', placeholder: 'https://youtube.com/@…' },
      { key: SETTING_KEYS.SOCIAL_LINKEDIN, label: 'LinkedIn', placeholder: 'https://linkedin.com/company/…' },
      { key: SETTING_KEYS.SOCIAL_X, label: 'X', placeholder: 'https://x.com/…' },
      { key: SETTING_KEYS.SOCIAL_TIKTOK, label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
      { key: SETTING_KEYS.SOCIAL_WHATSAPP, label: 'WhatsApp number', description: 'Digits only, with the country code. Becomes a click-to-chat link.' },
    ],
  },
  {
    category: 'home',
    title: 'Home page',
    description:
      'The banner falls back to this wording whenever no slide is scheduled, so the home page is never headline-less.',
    fields: [
      { key: SETTING_KEYS.HOME_HERO_FALLBACK_TITLE, label: 'Fallback headline' },
      { key: SETTING_KEYS.HOME_HERO_FALLBACK_SUBTITLE, label: 'Fallback subheading', multiline: true },
      { key: SETTING_KEYS.HOME_FAQ_ENABLED, label: 'Show the FAQ section', type: B, description: 'Answers common questions on the home page and feeds the same questions to search engines.' },
    ],
  },
  {
    category: 'auth',
    title: 'Sign-in',
    description: 'How people get into their account, and whether new accounts can be created at all.',
    fields: [
      { key: SETTING_KEYS.AUTH_SIGNUP_ENABLED, label: 'Allow new registrations', type: B },
      { key: SETTING_KEYS.AUTH_GOOGLE_ENABLED, label: 'Allow Google sign-in', type: B },
      { key: SETTING_KEYS.AUTH_OTP_ENABLED, label: 'Require a one-time code', type: B, description: 'Adds a code sent by email on every sign-in.' },
    ],
  },
  {
    category: 'payment',
    title: 'Payment methods',
    description:
      'Turn a method off and it disappears from checkout. The numbers and instructions here are exactly what customers are shown.',
    fields: [
      { key: SETTING_KEYS.PAYMENT_BKASH_ENABLED, label: 'Accept bKash', type: B },
      { key: SETTING_KEYS.PAYMENT_BKASH_NUMBER, label: 'bKash number' },
      { key: SETTING_KEYS.PAYMENT_BKASH_INSTRUCTIONS, label: 'bKash instructions', multiline: true },
      { key: SETTING_KEYS.PAYMENT_NAGAD_ENABLED, label: 'Accept Nagad', type: B },
      { key: SETTING_KEYS.PAYMENT_NAGAD_NUMBER, label: 'Nagad number' },
      { key: SETTING_KEYS.PAYMENT_NAGAD_INSTRUCTIONS, label: 'Nagad instructions', multiline: true },
      { key: SETTING_KEYS.PAYMENT_SSLCOMMERZ_ENABLED, label: 'Accept cards via SSLCommerz', type: B },
    ],
  },
  {
    category: 'business',
    title: 'Booking rules',
    description: 'The operating rules the booking engine enforces, and the legal details shown on invoices.',
    fields: [
      { key: SETTING_KEYS.BUSINESS_MIN_ADVANCE_HOURS, label: 'Minimum notice (hours)', type: N, description: 'How far ahead of departure a booking may still be made.' },
      { key: SETTING_KEYS.BUSINESS_CANCELLATION_WINDOW_HOURS, label: 'Free cancellation window (hours)', type: N },
      { key: SETTING_KEYS.BUSINESS_BOOKING_TERMS, label: 'Booking terms', multiline: true, description: 'Shown before a customer confirms and repeated on their invoice.' },
      { key: SETTING_KEYS.BUSINESS_HOURS, label: 'Opening hours', multiline: true, placeholder: 'Sat–Thu 10:00–19:00' },
      { key: SETTING_KEYS.BUSINESS_REGISTERED_NAME, label: 'Registered company name' },
      { key: SETTING_KEYS.BUSINESS_TRADE_LICENCE, label: 'Trade licence number' },
    ],
  },
  {
    category: 'seo',
    title: 'Search engines',
    description:
      'Defaults used wherever a page has not set its own. Turning off indexing hides the whole site from search results.',
    fields: [
      { key: SETTING_KEYS.SEO_SITE_TITLE, label: 'Default page title' },
      { key: SETTING_KEYS.SEO_SITE_DESCRIPTION, label: 'Default description', multiline: true },
      { key: SETTING_KEYS.SEO_DEFAULT_OG_IMAGE, label: 'Default share image URL', description: 'Shown when a page is shared on social media.' },
      { key: SETTING_KEYS.SEO_ROBOTS_INDEX, label: 'Allow search engines to index the site', type: B },
    ],
  },
  {
    category: 'owner',
    title: 'Site credit',
    description:
      'Who built and maintains the site. This is separate from the brand — the credit line in the footer names the maker, the site stays Wild Peak Souls.',
    fields: [
      { key: SETTING_KEYS.OWNER_NAME, label: 'Built and maintained by' },
      { key: SETTING_KEYS.OWNER_URL, label: 'Their website', placeholder: 'https://www.example.com' },
      { key: SETTING_KEYS.OWNER_CREDIT_ENABLED, label: 'Show the credit line in the footer', type: B },
    ],
  },
  {
    category: 'ai',
    title: 'Travel assistant',
    description:
      'The assistant answers from published pages only — it has no access to accounts, bookings, payments or settings.',
    fields: [
      { key: SETTING_KEYS.AI_ASSISTANT_ENABLED, label: 'Show the assistant on the public site', type: B },
      { key: SETTING_KEYS.AI_ASSISTANT_GREETING, label: 'Opening message', multiline: true },
    ],
  },
  {
    category: 'analytics',
    title: 'Analytics',
    description:
      'Identifiers for your measurement tools. The access token is stored but never sent to a browser.',
    fields: [
      { key: SETTING_KEYS.ANALYTICS_GA4_ID, label: 'Google Analytics 4 ID', placeholder: 'G-XXXXXXXXXX' },
      { key: SETTING_KEYS.ANALYTICS_GTM_ID, label: 'Google Tag Manager ID', placeholder: 'GTM-XXXXXXX' },
      { key: SETTING_KEYS.ANALYTICS_META_PIXEL_ID, label: 'Meta Pixel ID' },
      { key: SETTING_KEYS.ANALYTICS_META_CAPI_TOKEN, label: 'Meta Conversions API token', isSecret: true },
    ],
  },
  {
    category: 'maintenance',
    title: 'Maintenance mode',
    description:
      'Takes the public site offline while leaving the dashboard reachable, so turning this on cannot lock you out.',
    fields: [
      { key: SETTING_KEYS.MAINTENANCE_ENABLED, label: 'Take the public site offline', type: B, guardedBy: 'maintenance' },
      { key: SETTING_KEYS.MAINTENANCE_MESSAGE, label: 'Message visitors see', multiline: true },
      { key: SETTING_KEYS.MAINTENANCE_RETURN_AT, label: 'Expected return', placeholder: 'Saturday 09:00' },
    ],
  },
];

/**
 * Creates rows for any declared setting that has none yet.
 *
 * The write endpoint deliberately refuses to create settings — a crafted
 * payload must not be able to invent configuration — so a newly declared key
 * needs a row before it can be saved. Doing it here keeps that guard intact
 * while making a new setting appear the moment it is declared.
 */
export async function ensureDeclaredSettings(): Promise<void> {
  const declared = SETTINGS_CATALOGUE.flatMap((group) =>
    group.fields.map((field) => ({ ...field, category: group.category })),
  );

  const existing = await prisma.setting.findMany({
    where: { key: { in: declared.map((field) => field.key) } },
    select: { key: true },
  });
  const present = new Set(existing.map((row) => row.key));
  const missing = declared.filter((field) => !present.has(field.key));
  if (missing.length === 0) return;

  await prisma.setting.createMany({
    data: missing.map((field) => ({
      key: field.key,
      value: DECLARED_DEFAULTS[field.key] ?? (field.type === B ? 'false' : ''),
      type: field.type ?? SettingType.STRING,
      category: field.category,
      isSecret: field.isSecret ?? false,
      label: field.label,
      description: field.description ?? null,
    })),
    skipDuplicates: true,
  });
}

/** Starting values for settings that should not begin empty. */
const DECLARED_DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.HOME_FAQ_ENABLED]: 'true',
  [SETTING_KEYS.HOME_HERO_FALLBACK_TITLE]: 'Find your next journey',
  [SETTING_KEYS.HOME_HERO_FALLBACK_SUBTITLE]:
    'Curated trips across Bangladesh and beyond, run by people who have walked every route.',
  [SETTING_KEYS.OWNER_NAME]: 'Ataullah Mesbah',
  [SETTING_KEYS.OWNER_URL]: 'https://www.ataullahmesbah.com',
  [SETTING_KEYS.OWNER_CREDIT_ENABLED]: 'true',
  [SETTING_KEYS.AI_ASSISTANT_ENABLED]: 'true',
  [SETTING_KEYS.AI_ASSISTANT_GREETING]:
    'Hello. Ask me about any trip, destination or visa on this site and I will find it for you.',
  [SETTING_KEYS.BUSINESS_HOURS]: 'Saturday to Thursday, 10:00–19:00',
};
