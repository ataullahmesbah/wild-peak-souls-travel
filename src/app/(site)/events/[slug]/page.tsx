import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Bed,
  Bus,
  CalendarDays,
  Clock,
  MapPin,
  Mountain,
  Users,
  Utensils,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/components/ui/media';
import { Breadcrumbs } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { EventBookingForm } from '@/components/booking/event-booking-form';
import { ProductReviews } from '@/components/reviews/product-reviews';
import { getCurrentUser } from '@/lib/auth/session';
import { getEventBySlug, getProductReviews } from '@/lib/data/public';
import { siteUrl } from '@/lib/env';
import { formatDate, formatDateRange, toLines, toNumber, truncate } from '@/lib/utils';
import { JsonLd } from '@/components/seo/json-ld';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Event not found' };

  const description =
    event.seoDescription ??
    event.shortDescription ??
    truncate(event.description ?? '', 155);

  return {
    title: event.seoTitle ?? event.title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      type: 'article',
      title: event.seoTitle ?? event.title,
      description,
      url: `${siteUrl()}/events/${event.slug}`,
      images: event.coverMedia?.secureUrl
        ? [{ url: event.coverMedia.secureUrl }]
        : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [event, user] = await Promise.all([getEventBySlug(slug), getCurrentUser()]);

  if (!event) notFound();

  // Loaded after the event, because it needs the event's id.
  const { reviews, count: reviewCount, average } = await getProductReviews(
    'EVENT',
    event.id,
  );

  const available = Math.max(0, event.capacity - event.reservedSeats);
  const unitPrice = toNumber(event.discountPrice ?? event.price);
  const listPrice = toNumber(event.price);

  // Structured data helps the event surface in search results with its dates
  // and price. Only public catalogue values go in here.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.shortDescription ?? undefined,
    startDate: event.startAt.toISOString(),
    endDate: event.endAt.toISOString(),
    eventStatus:
      event.status === 'SOLD_OUT'
        ? 'https://schema.org/EventScheduled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.destination?.name ?? event.meetingPoint ?? 'Bangladesh',
      address: event.destination?.country ?? 'Bangladesh',
    },
    image: event.coverMedia?.secureUrl ?? undefined,
    // Only claimed when there is something to aggregate. A rating asserted
    // over zero reviews is a false claim to a search engine, not an empty one.
    aggregateRating:
      reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: Number(average.toFixed(1)),
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    offers: {
      '@type': 'Offer',
      price: unitPrice,
      priceCurrency: 'BDT',
      availability:
        available > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
      url: `${siteUrl()}/events/${event.slug}`,
    },
  };

  const quickFacts = [
    { icon: CalendarDays, label: 'Dates', value: formatDateRange(event.startAt, event.endAt) },
    { icon: Clock, label: 'Duration', value: event.duration ?? '—' },
    { icon: Users, label: 'Seats left', value: `${available} of ${event.capacity}` },
    {
      icon: Mountain,
      label: 'Difficulty',
      value: event.difficulty.charAt(0) + event.difficulty.slice(1).toLowerCase(),
    },
    { icon: MapPin, label: 'Meeting point', value: event.meetingPoint ?? '—' },
    { icon: Bus, label: 'Transport', value: event.transport ?? '—' },
    { icon: Bed, label: 'Accommodation', value: event.accommodation ?? '—' },
    { icon: Utensils, label: 'Meals', value: event.meals ?? '—' },
  ].filter((fact) => fact.value !== '—');

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="relative h-[46vh] min-h-80 w-full overflow-hidden sm:h-[56vh]">
        <CoverImage
          media={event.coverMedia}
          alt={event.title}
          priority
          sizes="100vw"
          className="h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <Container className="absolute inset-x-0 bottom-0 pb-8">
          <Breadcrumbs
            items={[{ label: 'Events', href: '/events' }, { label: event.title }]}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {event.destination && (
              <Badge tone="primary">{event.destination.name}</Badge>
            )}
            {event.eventType && <Badge tone="accent">{event.eventType}</Badge>}
            {available === 0 && <Badge tone="destructive">Sold out</Badge>}
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            {event.title}
          </h1>
          {event.shortDescription && (
            <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
              {event.shortDescription}
            </p>
          )}
        </Container>
      </section>

      <Section className="py-10 sm:py-14">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
            <div className="min-w-0 space-y-10">
              {/* Quick facts */}
              <div className="grid grid-cols-2 gap-4 rounded-card border border-border bg-card p-5 sm:grid-cols-4">
                {quickFacts.slice(0, 4).map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {event.description && (
                <Block title="Overview">
                  <div className="wps-prose text-sm sm:text-base">
                    {event.description.split(/\n\n+/).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </Block>
              )}

              {event.gallery.length > 0 && (
                <Block title="Gallery">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {event.gallery.map((item, i) => (
                      <div
                        key={i}
                        className="relative aspect-[4/3] overflow-hidden rounded-field"
                      >
                        <CoverImage
                          media={item.media}
                          alt={`${event.title} photo ${i + 1}`}
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      </div>
                    ))}
                  </div>
                </Block>
              )}

              {event.itinerary.length > 0 && (
                <Block title="Itinerary">
                  <ol className="space-y-4">
                    {event.itinerary.map((day) => (
                      <li key={day.id} className="relative border-l-2 border-border pl-6">
                        <span className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-primary" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Day {day.dayNumber}
                        </p>
                        <h3 className="mt-0.5 font-display text-base font-semibold">
                          {day.title}
                        </h3>
                        {day.description && (
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            {day.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </Block>
              )}

              {event.eventActivities.length > 0 && (
                <Block title="Activities included">
                  <div className="flex flex-wrap gap-2">
                    {event.eventActivities.map(({ activity }) => (
                      <Link
                        key={activity.id}
                        href={`/activities/${activity.slug}`}
                        className="rounded-full border border-border px-3.5 py-1.5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        {activity.name}
                        {activity.duration && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {activity.duration}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </Block>
              )}

              {quickFacts.length > 4 && (
                <Block title="Trip details">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {quickFacts.slice(4).map(({ icon: Icon, label, value }) => (
                      <div key={label} className="rounded-field bg-muted/50 p-4">
                        <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          {label}
                        </dt>
                        <dd className="mt-1 text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </Block>
              )}

              {event.travelTips && (
                <Block title="Travel tips">
                  <BulletList text={event.travelTips} />
                </Block>
              )}

              {event.additionalInfo && (
                <Block title="Additional information">
                  <BulletList text={event.additionalInfo} />
                </Block>
              )}

              {event.policies.length > 0 && (
                <Block title="Policies">
                  <div className="space-y-3">
                    {event.policies.map((policy) => (
                      <details
                        key={policy.id}
                        className="group rounded-field border border-border"
                      >
                        <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium">
                          {policy.title}
                          <span className="text-muted-foreground transition-transform group-open:rotate-180">
                            ▾
                          </span>
                        </summary>
                        <p className="border-t border-border p-4 text-sm leading-relaxed text-muted-foreground">
                          {policy.content}
                        </p>
                      </details>
                    ))}
                  </div>
                </Block>
              )}

              {event.bookingDeadline && (
                <p className="rounded-field border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
                  Bookings for this departure close on {formatDate(event.bookingDeadline)}.
                </p>
              )}
            </div>

            {/* Booking sidebar */}
            <aside className="lg:sticky lg:top-24">
              <EventBookingForm
                eventId={event.id}
                slug={event.slug}
                unitPrice={unitPrice}
                listPrice={listPrice}
                available={available}
                startAt={event.startAt.toISOString()}
                endAt={event.endAt.toISOString()}
                options={event.options.map((o) => ({
                  id: o.id,
                  title: o.title,
                  description: o.description,
                  price: toNumber(o.price),
                }))}
                isSignedIn={Boolean(user)}
                defaults={
                  user
                    ? { name: user.name, email: user.email, phone: user.phone ?? '' }
                    : null
                }
              />
            </aside>
          </div>

          <ProductReviews
            reviews={reviews}
            count={reviewCount}
            average={average}
            emptyMessage={`No reviews for ${event.title} yet. They appear here once travellers who joined this departure write one.`}
          />
        </Container>
      </Section>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold sm:text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ text }: { text: string }) {
  const lines = toLines(text);
  if (lines.length <= 1) {
    return <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>;
  }
  return (
    <ul className="space-y-2">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          {line}
        </li>
      ))}
    </ul>
  );
}
