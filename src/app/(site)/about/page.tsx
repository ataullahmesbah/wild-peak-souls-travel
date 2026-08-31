import type { Metadata } from 'next';
import { Compass, HeartHandshake, Leaf, ShieldCheck } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section, SectionHeading } from '@/components/ui/section';
import { StatsBand } from '@/components/home/stats-band';
import { getPlatformStats } from '@/lib/data/public';
import { SETTING_KEYS, getPublicSettings, settingString } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Who Wild Peak Souls is, how we operate our own trips, and what we hold ourselves to.',
  alternates: { canonical: '/about' },
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'We say what is actually true',
    body: 'If a fare is indicative, we label it indicative. If seats are gone, the site says so. We would rather lose a booking than mislead you into one.',
  },
  {
    icon: HeartHandshake,
    title: 'Local operators, fairly paid',
    body: 'Guides, drivers and homestay hosts are people we work with repeatedly and pay properly. That is why our trips run smoothly.',
  },
  {
    icon: Leaf,
    title: 'Small groups, light footprint',
    body: 'We cap group sizes deliberately. It keeps trails, villages and hosts from being overwhelmed, and it makes the trip better.',
  },
  {
    icon: Compass,
    title: 'Plans that survive contact with reality',
    body: 'Weather turns, roads close, permits change. Our itineraries have room in them and our team is reachable while you travel.',
  },
];

export default async function AboutPage() {
  const [settings, stats] = await Promise.all([getPublicSettings(), getPlatformStats()]);
  const brand = settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls');

  return (
    <>
      <PageHeader
        eyebrow="About"
        title={`We are ${brand}`}
        description="A travel agency that runs its own trips. Not a booking aggregator, not a reseller — the people who plan your journey are the people who operate it."
        breadcrumbs={[{ label: 'About' }]}
      />

      <Section>
        <Container>
          <div className="mx-auto max-w-3xl">
            <div className="wps-prose text-base">
              <p>
                {brand} started with a straightforward frustration: travel in this region
                is either arranged through informal group chats with no accountability,
                or through listing sites that sell you a package and disappear the moment
                something goes wrong.
              </p>
              <p>
                We built the alternative we wanted to use. Every event, tour, stay and
                activity on this site is one we operate or have personally vetted. When
                you book, the price is snapshotted and held. When you pay, a person on
                our team verifies it. When you travel, the same team is reachable.
              </p>
              <p>
                The platform behind this site is ours too — capacity, payments, visa
                paperwork and support all run through one system, which is why availability
                here is real rather than a guess, and why we can answer a question about
                your booking without asking you to forward an email chain.
              </p>
            </div>
          </div>

          <div className="mt-14">
            <StatsBand stats={stats} />
          </div>
        </Container>
      </Section>

      <Section className="bg-card/40">
        <Container>
          <SectionHeading
            eyebrow="How we work"
            title="What we hold ourselves to"
            align="center"
          />
          <div className="grid gap-6 sm:grid-cols-2">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="wps-aurora rounded-card border border-border bg-card p-8 text-center sm:p-12">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              Come travel with us
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Join a fixed departure, book a package, or tell us what you actually want
              and we will build it.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/events" size="lg">
                See upcoming departures
              </ButtonLink>
              <ButtonLink href="/custom-tour" variant="outline" size="lg">
                Plan something custom
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
