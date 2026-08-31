import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarDays, Lightbulb, MapPin } from 'lucide-react';

import { ActivityCard, EventCard, StayCard, TourCard } from '@/components/cards';
import { CoverImage } from '@/components/ui/media';
import { Breadcrumbs } from '@/components/ui/page-header';
import { Container, Section, SectionHeading } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/states';
import {
  getDestinationBySlug,
  listActivities,
  listEvents,
  listStays,
  listTours,
} from '@/lib/data/public';
import { siteUrl } from '@/lib/env';
import { toLines, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) return { title: 'Destination not found' };

  const description =
    destination.seoDescription ??
    destination.shortDescription ??
    truncate(destination.description ?? '', 155);

  return {
    title: destination.seoTitle ?? `${destination.name} Travel Guide`,
    description,
    alternates: { canonical: `/destinations/${destination.slug}` },
    openGraph: {
      title: destination.seoTitle ?? destination.name,
      description,
      url: `${siteUrl()}/destinations/${destination.slug}`,
      images: destination.coverMedia?.secureUrl
        ? [{ url: destination.coverMedia.secureUrl }]
        : undefined,
    },
  };
}

export default async function DestinationDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  // Everything on this page is pulled live, so publishing a new trip in the
  // dashboard surfaces it here with no code change.
  const [events, tours, activities, stays] = await Promise.all([
    listEvents({ destination: slug, page: 1 }),
    listTours({ destination: slug, page: 1 }),
    listActivities({ destination: slug, page: 1 }),
    listStays({ destination: slug, page: 1 }),
  ]);

  const hasContent =
    events.items.length + tours.items.length + activities.items.length + stays.items.length >
    0;

  return (
    <>
      <section className="relative h-[46vh] min-h-80 w-full overflow-hidden sm:h-[54vh]">
        <CoverImage
          media={destination.coverMedia}
          alt={destination.name}
          priority
          sizes="100vw"
          className="h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <Container className="absolute inset-x-0 bottom-0 pb-8">
          <Breadcrumbs
            items={[
              { label: 'Destinations', href: '/destinations' },
              { label: destination.name },
            ]}
          />
          <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-5xl">
            {destination.name}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {destination.region ? `${destination.region}, ` : ''}
            {destination.country}
          </p>
        </Container>
      </section>

      <Section className="py-10 sm:py-14">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
            <div className="min-w-0">
              {destination.description ? (
                <div className="wps-prose text-sm sm:text-base">
                  {destination.description.split(/\n\n+/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : (
                destination.shortDescription && (
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {destination.shortDescription}
                  </p>
                )
              )}

              {destination.gallery.length > 0 && (
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {destination.gallery.map((item, i) => (
                    <div
                      key={i}
                      className="relative aspect-[4/3] overflow-hidden rounded-field"
                    >
                      <CoverImage
                        media={item.media}
                        alt={`${destination.name} photo ${i + 1}`}
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              {destination.bestTimeToVisit && (
                <div className="wps-card p-5">
                  <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
                    <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                    Best time to visit
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {destination.bestTimeToVisit}
                  </p>
                </div>
              )}
              {destination.travelTips && (
                <div className="wps-card p-5">
                  <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
                    <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
                    Travel tips
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {toLines(destination.travelTips).map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </Container>
      </Section>

      {!hasContent && (
        <Section className="pt-0">
          <Container>
            <EmptyState
              title={`Trips to ${destination.name} are being planned`}
              description="Nothing is published for this destination yet. Tell us your dates and we will put something together."
              actionLabel="Request a custom trip"
              actionHref="/custom-tour"
            />
          </Container>
        </Section>
      )}

      {events.items.length > 0 && (
        <Section className="bg-card/40 pt-10">
          <Container>
            <SectionHeading
              eyebrow="Fixed departures"
              title={`Group events in ${destination.name}`}
              href={`/events?destination=${destination.slug}`}
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.items.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      {tours.items.length > 0 && (
        <Section>
          <Container>
            <SectionHeading
              eyebrow="Tour packages"
              title={`Tours in ${destination.name}`}
              href={`/tours?destination=${destination.slug}`}
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tours.items.slice(0, 3).map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      {activities.items.length > 0 && (
        <Section className="bg-card/40">
          <Container>
            <SectionHeading
              eyebrow="Experiences"
              title={`Things to do in ${destination.name}`}
              href={`/activities?destination=${destination.slug}`}
            />
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {activities.items.slice(0, 4).map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      {stays.items.length > 0 && (
        <Section>
          <Container>
            <SectionHeading
              eyebrow="Where to stay"
              title={`Stays in ${destination.name}`}
              href={`/stays?destination=${destination.slug}`}
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stays.items.slice(0, 3).map((stay) => (
                <StayCard key={stay.id} stay={stay} />
              ))}
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
