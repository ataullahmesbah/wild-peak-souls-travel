// src/app/(site)/page.tsx
import Link from 'next/link';
import { Suspense } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  HeadphonesIcon,
  Plane,
  ShieldCheck,
  Train,
  Wallet,
} from 'lucide-react';

import { BlogCard } from '@/components/blog/blog-card';
import { HomeContestBanner } from '@/components/contest/home-contest-banner';
import { HeroBanner, HeroFallback } from '@/components/home/hero-banner';
import { HomeFaq } from '@/components/home/faq-section';
import { AdSlot } from '@/components/ads/ad-slot';
import { getLatestPosts } from '@/lib/data/blog';
import { StatsBand } from '@/components/home/stats-band';
import {
  ActivityCard,
  DestinationCard,
  EventCard,
  ReviewCard,
  StayCard,
  TourCard,
} from '@/components/cards';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Container, Section, SectionHeading } from '@/components/ui/section';
import {
  getActiveAds,
  getApprovedReviews,
  getFeaturedDestinations,
  getFeaturedTours,
  getFaqItems,
  getHeroSlides,
  getHomeSections,
  getPlatformStats,
  getHotels,
  getPopularStays,
  getTrendingActivities,
  getUpcomingEvents,
} from '@/lib/data/public';
import { JsonLd } from '@/components/seo/json-ld';
import {
  SETTING_KEYS,
  getPublicSettings,
  settingBool,
  settingString,
} from '@/lib/settings';

export const dynamic = 'force-dynamic';

const WHY_US = [
  {
    icon: BadgeCheck,
    title: 'Agency-run, not resold',
    body: 'Every event, tour and stay on this site is operated or vetted by our own team — no anonymous middlemen.',
  },
  {
    icon: ShieldCheck,
    title: 'Payments you can verify',
    body: 'Bookings hold your price, and every payment is confirmed by a person on our side before your seat is final.',
  },
  {
    icon: HeadphonesIcon,
    title: 'One team, end to end',
    body: 'Visa paperwork, transport, stays and on-trip support come from the same people who planned your journey.',
  },
  {
    icon: Wallet,
    title: 'Honest, snapshot pricing',
    body: 'The price you book is the price we hold. Inclusions and exclusions are listed in full before you pay.',
  },
];

export default async function HomePage() {
  const [settings, sections, heroSlides] = await Promise.all([
    getPublicSettings(),
    getHomeSections(),
    getHeroSlides(),
  ]);

  const brand = settingString(settings, SETTING_KEYS.BRAND_NAME, 'Wild Peak Souls');
  const hero = sections.get('hero');

  return (
    <>
      {/* --- Hero: driven from Marketing → Home banner in the dashboard --- */}
      {heroSlides.length > 0 ? (
        <HeroBanner
          slides={heroSlides.map((slide) => ({
            id: slide.id,
            title: slide.title,
            subtitle: slide.subtitle,
            body: slide.body,
            overlayOpacity: slide.overlayOpacity,
            textAlign: slide.textAlign,
            primaryCtaText: slide.primaryCtaText,
            primaryCtaUrl: slide.primaryCtaUrl,
            secondaryCtaText: slide.secondaryCtaText,
            secondaryCtaUrl: slide.secondaryCtaUrl,
            showSearch: slide.showSearch,
            imageUrl: slide.media?.secureUrl ?? slide.media?.url ?? null,
          }))}
        />
      ) : (
        <HeroFallback
          title={
            hero?.title ??
            settingString(
              settings,
              SETTING_KEYS.HOME_HERO_FALLBACK_TITLE,
              'Journeys crafted for wandering souls',
            )
          }
          subtitle={
            hero?.body ??
            settingString(
              settings,
              SETTING_KEYS.HOME_HERO_FALLBACK_SUBTITLE,
              `${brand} plans, operates and supports the whole trip so you only have to show up.`,
            )
          }
        >
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Server-verified payments
            </span>
            <span className="flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Live seat availability
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Price held at booking
            </span>
          </div>
        </HeroFallback>
      )}

      {/* --- Featured destinations --------------------------------------- */}
      <Section className="pt-4">
        <Container>
          <SectionHeading
            eyebrow="Destinations"
            title="Places our travellers keep returning to"
            description="Hand-picked regions with the trips, stays and activities we actually run there."
            href="/destinations"
          />
          <Suspense fallback={<CardGridSkeleton count={3} />}>
            <FeaturedDestinations />
          </Suspense>
        </Container>
      </Section>

      {/* --- Upcoming events --------------------------------------------- */}
      <Section className="bg-card/40 py-14 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Fixed departures"
            title="Upcoming group events"
            description="Set dates, set price, limited seats. Availability below is checked against live capacity."
            href="/events"
          />
          <Suspense fallback={<CardGridSkeleton count={3} />}>
            <UpcomingEvents />
          </Suspense>
        </Container>
      </Section>

      {/* --- Trending activities ----------------------------------------- */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Experiences"
            title="Trending activities"
            description="Treks, camps, waterfalls and cultural experiences you can add to any trip."
            href="/activities"
          />
          <Suspense fallback={<CardGridSkeleton count={4} />}>
            <TrendingActivities />
          </Suspense>
        </Container>
      </Section>

      {/* --- Featured tours ---------------------------------------------- */}
      <Section className="bg-card/40">
        <Container>
          <SectionHeading
            eyebrow="Tour packages"
            title="Ready-made journeys"
            description="Multi-day itineraries with transport, stays and guides already arranged."
            href="/tours"
          />
          <Suspense fallback={<CardGridSkeleton count={3} />}>
            <FeaturedTours />
          </Suspense>
        </Container>
      </Section>

      {/* --- Stays and hotels: each omitted entirely when empty --------- */}
      <Suspense fallback={null}>
        <PopularStays />
      </Suspense>

      <Suspense fallback={null}>
        <Hotels />
      </Suspense>

      {/* --- Service triptych: visa / flights / train --------------------- */}
      <Section className="bg-card/40">
        <Container>
          <SectionHeading
            eyebrow="Beyond the trip"
            title="Everything else the journey needs"
            align="center"
          />
          <div className="grid gap-6 lg:grid-cols-3">
            <ServiceTile
              icon={BadgeCheck}
              title="Visa assistance"
              body="Country-by-country document checklists, prepared by the team that files them every week. Request assistance and a specialist picks it up."
              href="/visa"
              cta="Check visa requirements"
            />
            <ServiceTile
              icon={Plane}
              title="Flight explorer"
              body="Browse routes and indicative timings, then send us a booking request. Final fare and availability are always confirmed by us before you pay."
              href="/flights"
              cta="Explore flights"
            />
            <ServiceTile
              icon={Train}
              title="Bangladesh train schedule"
              body="Intercity timings, off-days and route stops for planning overland legs. Informational only — we do not issue rail tickets."
              href="/train-schedule"
              cta="View train times"
            />
          </div>
        </Container>
      </Section>

      {/* --- Custom tour CTA --------------------------------------------- */}
      <Section>
        <Container>
          <div className="wps-aurora relative overflow-hidden rounded-card border border-border bg-card p-8 sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Custom tours
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
                  Nothing here fits? Tell us the trip you actually want.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Share your dates, budget, group size and travel style. A planner
                  reads every request and comes back with a real itinerary and a
                  quote — not an automated brochure.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <ButtonLink href="/custom-tour" size="lg">
                  Plan a custom trip
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/contact" variant="outline" size="lg">
                  Talk to the team
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* --- Why us + stats ---------------------------------------------- */}
      <Section className="bg-card/40">
        <Container>
          <SectionHeading
            eyebrow={`Why ${brand}`}
            title="What you get that a listing site cannot give you"
            align="center"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
          <div className="mt-10">
            <Suspense fallback={<div className="wps-skeleton h-40 w-full" />}>
              <PlatformStats />
            </Suspense>
          </div>
        </Container>
      </Section>

      {/* --- Reviews ------------------------------------------------------ */}
      <Suspense fallback={null}>
        <Reviews />
      </Suspense>

      {/* --- FAQ ---------------------------------------------------------- */}
      {settingBool(settings, SETTING_KEYS.HOME_FAQ_ENABLED, true) && (
        <Suspense fallback={null}>
          <HomeFaqSection />
        </Suspense>
      )}

      {/* --- Contest ------------------------------------------------------
          Renders nothing unless a contest is published, running and marked to
          feature, so this section appears and disappears on its own. */}
      <Suspense fallback={null}>
        <HomeContestBanner />
      </Suspense>

      {/* --- Guides ------------------------------------------------------- */}
      <Suspense fallback={null}>
        <Guides />
      </Suspense>

      {/* --- Advertisement slot ------------------------------------------ */}
      <Suspense fallback={null}>
        <HomeBillboard />
      </Suspense>
    </>
  );
}

// --- Async sections ---------------------------------------------------------

async function FeaturedDestinations() {
  const destinations = await getFeaturedDestinations(6);
  if (destinations.length === 0) {
    return (
      <EmptyState
        title="Destinations are being curated"
        description="Our team is publishing the first set of destinations. Check back shortly."
        actionLabel="Browse tours instead"
        actionHref="/tours"
      />
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {destinations.map((destination) => (
        <DestinationCard key={destination.id} destination={destination} />
      ))}
    </div>
  );
}

async function UpcomingEvents() {
  const events = await getUpcomingEvents(6);
  if (events.length === 0) {
    return (
      <EmptyState
        title="No departures scheduled yet"
        description="New group events are announced regularly. Join the newsletter or request a custom trip in the meantime."
        actionLabel="Plan a custom trip"
        actionHref="/custom-tour"
      />
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

async function TrendingActivities() {
  const activities = await getTrendingActivities(8);
  if (activities.length === 0) return null;
  return (
    <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

async function FeaturedTours() {
  const tours = await getFeaturedTours(6);
  if (tours.length === 0) {
    return (
      <EmptyState
        title="Tour packages coming soon"
        description="We are finalising the next season of itineraries."
        actionLabel="Request a custom tour"
        actionHref="/custom-tour"
      />
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tours.map((tour) => (
        <TourCard key={tour.id} tour={tour} />
      ))}
    </div>
  );
}

async function PopularStays() {
  const stays = await getPopularStays(6);
  if (stays.length === 0) return null;

  return (
    <Section>
      <Container>
        <SectionHeading
          eyebrow="Where you sleep"
          title="Popular stays"
          description="Homestays, treehouses, cottages and camps we book into regularly."
          href="/stays"
        />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stays.map((stay) => (
            <StayCard key={stay.id} stay={stay} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

/**
 * Hotels get their own strip, but only when there are hotels to show. A
 * heading over an empty row reads as a broken page rather than an empty one.
 */
async function Hotels() {
  const hotels = await getHotels(6);
  if (hotels.length === 0) return null;

  return (
    <Section className="bg-card/40">
      <Container>
        <SectionHeading
          eyebrow="Hotels and resorts"
          title="Rooms we book into"
          description="Properties we have stayed in ourselves, with rates held at the price you book."
          href="/stays?type=HOTEL"
        />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <StayCard key={hotel.id} stay={hotel} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

/**
 * The six most-asked questions. The full set stays on /faq; this is the
 * shortlist, and the FAQPage structured data it emits is what lets a search
 * engine or an assistant answer these without anyone visiting the site.
 */
async function HomeFaqSection() {
  const items = await getFaqItems();
  const shortlist = items.slice(0, 6);
  if (shortlist.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: shortlist.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <HomeFaq items={shortlist} />
    </>
  );
}

async function PlatformStats() {
  const stats = await getPlatformStats();
  return <StatsBand stats={stats} />;
}

async function Reviews() {
  const reviews = await getApprovedReviews(3);
  if (reviews.length === 0) return null;
  return (
    <Section>
      <Container>
        <SectionHeading
          eyebrow="Travellers"
          title="What people say after the trip"
          description="Reviews come only from travellers with a completed booking, and each one is moderated before it appears."
          align="center"
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

async function Guides() {
  const posts = await getLatestPosts(3);
  if (posts.length === 0) return null;
  return (
    <Section className="bg-card/40">
      <Container>
        <SectionHeading
          eyebrow="From the blog"
          title="Read before you go"
          description="Route notes, packing lists and seasonal advice from our guides."
          href="/blog"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

async function HomeBillboard() {
  const ads = await getActiveAds('HOME_BILLBOARD');
  const ad = ads[0];
  if (!ad) return null;

  const image = ad.media?.secureUrl ?? ad.media?.url ?? ad.imageUrl;

  return (
    <Section className="pt-0">
      <Container>
        <AdSlot adId={ad.id} frequency={ad.frequency} window={ad.frequencyWindow}>
        <div className="overflow-hidden rounded-card border border-border bg-primary-soft">
          <div className="grid gap-6 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Sponsored
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold sm:text-2xl">
                {ad.title}
              </h2>
              {ad.description && (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {ad.description}
                </p>
              )}
            </div>
            {ad.ctaUrl && ad.ctaText && (
              <ButtonLink href={ad.ctaUrl} size="lg">
                {ad.ctaText}
              </ButtonLink>
            )}
          </div>
          {image && (
            // Ad creatives are arbitrary external URLs, so a plain img avoids
            // requiring every advertiser host in next.config remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-48 w-full object-cover" loading="lazy" />
          )}
        </div>
        </AdSlot>
      </Container>
    </Section>
  );
}

function ServiceTile({
  icon: Icon,
  title,
  body,
  href,
  cta,
}: {
  icon: typeof Plane;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Card interactive className="flex flex-col p-7">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}
