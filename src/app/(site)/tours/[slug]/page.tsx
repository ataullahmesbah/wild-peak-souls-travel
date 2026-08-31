import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, Clock, MapPin, Mountain, Users, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/components/ui/media';
import { Breadcrumbs } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { SimpleBookingForm } from '@/components/booking/simple-booking-form';
import { getCurrentUser } from '@/lib/auth/session';
import { getTourBySlug } from '@/lib/data/public';
import { siteUrl } from '@/lib/env';
import { toLines, toNumber, truncate } from '@/lib/utils';
import { JsonLd } from '@/components/seo/json-ld';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourBySlug(slug);
  if (!tour) return { title: 'Tour not found' };

  const description =
    tour.seoDescription ?? tour.shortDescription ?? truncate(tour.description ?? '', 155);

  return {
    title: tour.seoTitle ?? tour.title,
    description,
    alternates: { canonical: `/tours/${tour.slug}` },
    openGraph: {
      type: 'article',
      title: tour.seoTitle ?? tour.title,
      description,
      url: `${siteUrl()}/tours/${tour.slug}`,
      images: tour.coverMedia?.secureUrl ? [{ url: tour.coverMedia.secureUrl }] : undefined,
    },
  };
}

export default async function TourDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [tour, user] = await Promise.all([getTourBySlug(slug), getCurrentUser()]);

  if (!tour) notFound();

  const unitPrice = toNumber(tour.discountPrice ?? tour.basePrice);
  const listPrice = toNumber(tour.basePrice);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: tour.title,
    description: tour.shortDescription ?? undefined,
    image: tour.coverMedia?.secureUrl ?? undefined,
    offers: {
      '@type': 'Offer',
      price: unitPrice,
      priceCurrency: 'BDT',
      availability: 'https://schema.org/InStock',
      url: `${siteUrl()}/tours/${tour.slug}`,
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <section className="relative h-[42vh] min-h-72 w-full overflow-hidden sm:h-[52vh]">
        <CoverImage media={tour.coverMedia} alt={tour.title} priority sizes="100vw" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <Container className="absolute inset-x-0 bottom-0 pb-8">
          <Breadcrumbs items={[{ label: 'Tours', href: '/tours' }, { label: tour.title }]} />
          <div className="mt-3 flex flex-wrap gap-2">
            {tour.destination && <Badge tone="primary">{tour.destination.name}</Badge>}
            <Badge tone="accent">{tour.tourType.replace(/_/g, ' ').toLowerCase()}</Badge>
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            {tour.title}
          </h1>
          {tour.shortDescription && (
            <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
              {tour.shortDescription}
            </p>
          )}
        </Container>
      </section>

      <Section className="py-10 sm:py-14">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
            <div className="min-w-0 space-y-10">
              <div className="grid grid-cols-2 gap-4 rounded-card border border-border bg-card p-5 sm:grid-cols-4">
                <Fact icon={Clock} label="Duration" value={tour.duration ?? `${tour.durationDays} days`} />
                <Fact icon={Users} label="Max group" value={`${tour.maxGroupSize} people`} />
                <Fact
                  icon={Mountain}
                  label="Difficulty"
                  value={tour.difficulty.charAt(0) + tour.difficulty.slice(1).toLowerCase()}
                />
                <Fact
                  icon={MapPin}
                  label="Destination"
                  value={tour.destination?.name ?? '—'}
                />
              </div>

              {tour.description && (
                <Block title="About this tour">
                  <div className="wps-prose text-sm sm:text-base">
                    {tour.description.split(/\n\n+/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </Block>
              )}

              {tour.highlights && (
                <Block title="Highlights">
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {toLines(tour.highlights).map((line, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              {tour.itinerary.length > 0 && (
                <Block title="Day-by-day itinerary">
                  <ol className="space-y-4">
                    {tour.itinerary.map((day) => (
                      <li key={day.id} className="relative border-l-2 border-border pl-6">
                        <span className="absolute -left-[9px] top-1 flex h-4 w-4 rounded-full border-2 border-background bg-primary" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Day {day.dayNumber}
                        </p>
                        <h3 className="mt-0.5 font-display text-base font-semibold">{day.title}</h3>
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

              {(tour.inclusions || tour.exclusions) && (
                <Block title="What's included">
                  <div className="grid gap-6 sm:grid-cols-2">
                    {tour.inclusions && (
                      <div className="rounded-field border border-success/25 bg-success-soft p-5">
                        <h3 className="font-display text-sm font-semibold text-success">Included</h3>
                        <ul className="mt-3 space-y-2">
                          {toLines(tour.inclusions).map((line, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground/85">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {tour.exclusions && (
                      <div className="rounded-field border border-destructive/25 bg-destructive-soft p-5">
                        <h3 className="font-display text-sm font-semibold text-destructive">
                          Not included
                        </h3>
                        <ul className="mt-3 space-y-2">
                          {toLines(tour.exclusions).map((line, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground/85">
                              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Block>
              )}

              {(tour.accommodation || tour.transport) && (
                <Block title="Logistics">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {tour.accommodation && (
                      <div className="rounded-field bg-muted/50 p-4">
                        <dt className="text-xs text-muted-foreground">Accommodation</dt>
                        <dd className="mt-1 text-sm">{tour.accommodation}</dd>
                      </div>
                    )}
                    {tour.transport && (
                      <div className="rounded-field bg-muted/50 p-4">
                        <dt className="text-xs text-muted-foreground">Transport</dt>
                        <dd className="mt-1 text-sm">{tour.transport}</dd>
                      </div>
                    )}
                  </dl>
                </Block>
              )}

              {tour.policies && (
                <Block title="Policies">
                  <div className="wps-prose text-sm text-muted-foreground">
                    {tour.policies.split(/\n\n+/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </Block>
              )}
            </div>

            <aside className="lg:sticky lg:top-24">
              <SimpleBookingForm
                kind="tour"
                productId={tour.id}
                unitPrice={unitPrice}
                listPrice={listPrice}
                maxQuantity={tour.maxGroupSize}
                isSignedIn={Boolean(user)}
                returnPath={`/tours/${tour.slug}`}
                defaults={
                  user ? { name: user.name, email: user.email, phone: user.phone ?? '' } : null
                }
              />
            </aside>
          </div>
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

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
