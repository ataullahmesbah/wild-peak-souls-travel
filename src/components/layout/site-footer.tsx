import Link from 'next/link';
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Mountain,
  Phone,
  Twitter,
  Youtube,
} from 'lucide-react';

import { Container } from '@/components/ui/section';
import { NewsletterForm } from '@/components/forms/newsletter-form';
import {
  SETTING_KEYS,
  getPublicSettings,
  settingBool,
  settingString,
} from '@/lib/settings';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { label: 'Destinations', href: '/destinations' },
      { label: 'Tours & Packages', href: '/tours' },
      { label: 'Events', href: '/events' },
      { label: 'Activities', href: '/activities' },
      { label: 'Stays', href: '/stays' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Visa Assistance', href: '/visa' },
      { label: 'Flight Explorer', href: '/flights' },
      { label: 'Train Schedule', href: '/train-schedule' },
      { label: 'Custom Tour', href: '/custom-tour' },
      { label: 'All Services', href: '/services' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
      { label: 'Support', href: '/support' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { label: 'Terms & Conditions', href: '/policies/terms' },
      { label: 'Privacy Policy', href: '/policies/privacy' },
      { label: 'Refund Policy', href: '/policies/refund' },
      { label: 'Cancellation Policy', href: '/policies/cancellation' },
      { label: 'Booking Policy', href: '/policies/booking' },
      { label: 'Visa Policy', href: '/policies/visa' },
    ],
  },
];

export async function SiteFooter() {
  const settings = await getPublicSettings();
  const brandName = settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls');
  const tagline = settingString(settings, SETTING_KEYS.BRAND_TAGLINE);
  const email = settingString(settings, SETTING_KEYS.CONTACT_EMAIL);
  const phone = settingString(settings, SETTING_KEYS.CONTACT_PHONE);
  const address = settingString(settings, SETTING_KEYS.CONTACT_ADDRESS);
  const ownerName = settingString(settings, SETTING_KEYS.OWNER_NAME);
  const ownerUrl = settingString(settings, SETTING_KEYS.OWNER_URL);
  // Read once rather than per render pass, so the footer year cannot differ
  // between the two copyright lines if a render straddles midnight.
  const year = new Date().getFullYear();

  const socials = [
    { href: settings[SETTING_KEYS.SOCIAL_FACEBOOK], label: 'Facebook', Icon: Facebook },
    { href: settings[SETTING_KEYS.SOCIAL_INSTAGRAM], label: 'Instagram', Icon: Instagram },
    { href: settings[SETTING_KEYS.SOCIAL_YOUTUBE], label: 'YouTube', Icon: Youtube },
    { href: settings[SETTING_KEYS.SOCIAL_LINKEDIN], label: 'LinkedIn', Icon: Linkedin },
    { href: settings[SETTING_KEYS.SOCIAL_X], label: 'X', Icon: Twitter },
  ].filter((s): s is { href: string; label: string; Icon: typeof Facebook } =>
    Boolean(s.href),
  );

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Mountain className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-semibold">{brandName}</span>
            </Link>
            {tagline && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{tagline}</p>
            )}

            <address className="mt-5 space-y-2.5 text-sm not-italic text-muted-foreground">
              {address && (
                <span className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {address}
                </span>
              )}
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-2.5 hover:text-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2.5 hover:text-foreground">
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {email}
                </a>
              )}
            </address>

            {socials.length > 0 && (
              <div className="mt-5 flex gap-2">
                {socials.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-display text-sm font-semibold">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 grid gap-6 border-t border-border pt-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-base font-semibold">Travel notes, twice a month</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New departures, quiet-season deals and honest destination guides. No spam.
            </p>
          </div>
          <NewsletterForm />
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {brandName}. All rights reserved.
          </p>
          <p>
            Flight and train information is provided for guidance only and must be
            confirmed with {brandName} before travel.
          </p>
        </div>

        {/*
          Site credit. Deliberately separate from the brand line above: the site
          belongs to {brandName}, the build does not. Both the name and the link
          come from Settings, and the whole line can be switched off there.
        */}
        {settingBool(settings, SETTING_KEYS.OWNER_CREDIT_ENABLED, true) && ownerName && (
          <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            Designed, built and maintained by{' '}
            {ownerUrl ? (
              <a
                href={ownerUrl}
                target="_blank"
                rel="noopener author"
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                {ownerName}
              </a>
            ) : (
              <span className="font-medium text-foreground">{ownerName}</span>
            )}
            .
          </p>
        )}
      </Container>
    </footer>
  );
}
