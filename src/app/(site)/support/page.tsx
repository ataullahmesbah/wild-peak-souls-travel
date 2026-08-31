import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, LifeBuoy, Mail, MessageSquare, Phone, Ticket } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { getCurrentUser } from '@/lib/auth/session';
import { getFaqItems } from '@/lib/data/public';
import { SETTING_KEYS, getPublicSettings, settingString } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Support',
  description:
    'Get help with a booking, a payment or a visa application. Open a support ticket, or reach the team by phone or email.',
  alternates: { canonical: '/support' },
};

/**
 * The public help page.
 *
 * It was linked from the footer of every page and did not exist — a 404 on a
 * link people follow when something has already gone wrong. Signed-in visitors
 * are sent to their ticket list; everyone else gets the direct contact routes
 * and the questions that answer most of what support is asked.
 */
export default async function SupportPage() {
  const [settings, user, faqs] = await Promise.all([
    getPublicSettings(),
    getCurrentUser(),
    getFaqItems(),
  ]);

  const email =
    settingString(settings, SETTING_KEYS.SUPPORT_EMAIL, '') ||
    settingString(settings, SETTING_KEYS.CONTACT_EMAIL, 'hello@wildpeaksouls.com');
  const phone =
    settingString(settings, SETTING_KEYS.SUPPORT_PHONE, '') ||
    settingString(settings, SETTING_KEYS.CONTACT_PHONE, '');
  const hours = settingString(settings, SETTING_KEYS.BUSINESS_HOURS, '');

  const bookingFaqs = faqs
    .filter((item) => ['BOOKING', 'PAYMENT', 'CANCELLATION'].includes(item.category))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Help"
        title="Support"
        description="Something wrong with a booking, a payment or a visa application? Start here — a real person answers every ticket."
      />

      <Section>
        <Container>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="wps-card flex flex-col p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-field bg-primary-soft text-primary">
                <Ticket className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">
                Open a support ticket
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                The fastest route for anything tied to a booking. Your ticket carries the
                booking reference, so nobody has to ask you for it twice.
              </p>
              <div className="mt-5">
                {user ? (
                  <ButtonLink href="/account/support">Go to my tickets</ButtonLink>
                ) : (
                  <ButtonLink href="/login?next=/account/support">
                    Sign in to open a ticket
                  </ButtonLink>
                )}
              </div>
            </div>

            <div className="wps-card flex flex-col p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-field bg-info-soft text-info">
                <MessageSquare className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">
                Not booked with us yet?
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Questions about a trip, a visa or a custom itinerary do not need an
                account. Send them straight to the team.
              </p>
              <div className="mt-5">
                <ButtonLink href="/contact" variant="outline">
                  Send a message
                </ButtonLink>
              </div>
            </div>

            <div className="wps-card flex flex-col p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-field bg-success-soft text-success">
                <LifeBuoy className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">Reach us directly</h2>
              <ul className="mt-3 flex-1 space-y-2.5 text-sm">
                {phone && (
                  <li>
                    <a
                      href={`tel:${phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {phone}
                    </a>
                  </li>
                )}
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {email}
                  </a>
                </li>
                {hours && (
                  <li className="flex items-start gap-2.5 text-muted-foreground">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {hours}
                  </li>
                )}
              </ul>
            </div>
          </div>

          {bookingFaqs.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-xl font-semibold">
                Answers to what we are asked most
              </h2>
              <ul className="mt-5 divide-y divide-border rounded-card border border-border bg-card">
                {bookingFaqs.map((item) => (
                  <li key={item.id}>
                    <details className="group px-5 py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                        {item.question}
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted-foreground">
                More on the{' '}
                <Link href="/faq" className="font-medium text-primary hover:underline">
                  full FAQ
                </Link>
                , including visas, group bookings and what happens if a trip is cancelled.
              </p>
            </section>
          )}
        </Container>
      </Section>
    </>
  );
}
