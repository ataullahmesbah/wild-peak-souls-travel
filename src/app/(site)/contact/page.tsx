import type { Metadata } from 'next';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

import { ContactForm } from '@/components/forms/contact-form';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { ButtonLink } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/session';
import { SETTING_KEYS, getPublicSettings, settingString } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Talk to the Wild Peak Souls team about trips, bookings, visas or support.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const [settings, user] = await Promise.all([getPublicSettings(), getCurrentUser()]);

  const email = settingString(settings, SETTING_KEYS.CONTACT_EMAIL);
  const phone = settingString(settings, SETTING_KEYS.CONTACT_PHONE);
  const address = settingString(settings, SETTING_KEYS.CONTACT_ADDRESS);
  const whatsapp = settings[SETTING_KEYS.SOCIAL_WHATSAPP];

  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title="Contact us"
        description="Questions about a trip, an existing booking, a visa, or something we have not listed — this reaches the team directly and lands in our dashboard as a tracked request."
        breadcrumbs={[{ label: 'Contact' }]}
      />

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
            <ContactForm
              defaults={
                user ? { name: user.name, email: user.email, phone: user.phone ?? '' } : null
              }
            />

            <aside className="space-y-4">
              <div className="wps-card p-6">
                <h2 className="font-display text-base font-semibold">Reach us directly</h2>
                <ul className="mt-4 space-y-4 text-sm">
                  {phone && (
                    <li>
                      <a
                        href={`tel:${phone.replace(/\s/g, '')}`}
                        className="flex items-start gap-3 hover:text-primary"
                      >
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>
                          <span className="block text-xs text-muted-foreground">Phone</span>
                          {phone}
                        </span>
                      </a>
                    </li>
                  )}
                  {email && (
                    <li>
                      <a href={`mailto:${email}`} className="flex items-start gap-3 hover:text-primary">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>
                          <span className="block text-xs text-muted-foreground">Email</span>
                          {email}
                        </span>
                      </a>
                    </li>
                  )}
                  {address && (
                    <li className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        <span className="block text-xs text-muted-foreground">Office</span>
                        {address}
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                      <span className="block text-xs text-muted-foreground">Hours</span>
                      Saturday – Thursday, 10:00 – 19:00 (BST)
                    </span>
                  </li>
                </ul>
                {whatsapp && (
                  <ButtonLink href={whatsapp} variant="outline" className="mt-5 w-full" size="sm">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Chat on WhatsApp
                  </ButtonLink>
                )}
              </div>

              <div className="wps-card p-6">
                <h2 className="font-display text-base font-semibold">Already booked with us?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Open a support token from your account instead — it is tracked, assigned
                  to a specific agent, and you can see the whole thread.
                </p>
                <ButtonLink href="/account/support" className="mt-4 w-full" size="sm">
                  Open a support token
                </ButtonLink>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
