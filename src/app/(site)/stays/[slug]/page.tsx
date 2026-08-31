import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Clock, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/components/ui/media';
import { Breadcrumbs } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { StayBookingForm } from '@/components/booking/stay-booking-form';
import { getCurrentUser } from '@/lib/auth/session';
import { getStayBySlug } from '@/lib/data/public';
import { siteUrl } from '@/lib/env';
import { formatCurrency, toLines, toNumber, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const stay = await getStayBySlug(slug);
  if (!stay) return { title: 'Stay not found' };

  const description =
    stay.seoDescription ?? stay.shortDescription ?? truncate(stay.description ?? '', 155);

  return {
    title: stay.seoTitle ?? stay.name,
    description,
    alternates: { canonical: `/stays/${stay.slug}` },
    openGraph: {
      type: 'website',
      title: stay.seoTitle ?? stay.name,
      description,
      url: `${siteUrl()}/stays/${stay.slug}`,
      images: stay.coverMedia?.secureUrl ? [{ url: stay.coverMedia.secureUrl }] : undefined,
    },
  };
}

export default async function StayDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [stay, user] = await Promise.all([getStayBySlug(slug), getCurrentUser()]);

  if (!stay) notFound();

  const amenities = toLines(stay.amenities);

  return (
    <>
      <section className="relative h-[42vh] min-h-72 w-full overflow-hidden sm:h-[50vh]">
        <CoverImage media={stay.coverMedia} alt={stay.name} priority sizes="100vw" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <Container className="absolute inset-x-0 bottom-0 pb-8">
          <Breadcrumbs items={[{ label: 'Stays', href: '/stays' }, { label: stay.name }]} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="accent">{stay.type.replace(/_/g, ' ').toLowerCase()}</Badge>
            {stay.destination && <Badge tone="primary">{stay.destination.name}</Badge>}
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold text-white sm:text-4xl">
            {stay.name}
          </h1>
          {stay.address && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {stay.address}
            </p>
          )}
        </Container>
      </section>

      <Section className="py-10 sm:py-14">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
            <div className="min-w-0 space-y-10">
              <div className="flex flex-wrap gap-6 rounded-card border border-border bg-card p-5">
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    Check-in
                  </p>
                  <p className="mt-1 text-sm font-medium">{stay.checkInTime}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    Check-out
                  </p>
                  <p className="mt-1 text-sm font-medium">{stay.checkOutTime}</p>
                </div>
              </div>

              {stay.description && (
                <Block title="About this property">
                  <div className="wps-prose text-sm sm:text-base">
                    {stay.description.split(/\n\n+/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </Block>
              )}

              {amenities.length > 0 && (
                <Block title="Amenities">
                  <ul className="flex flex-wrap gap-2">
                    {amenities.map((amenity, i) => (
                      <li
                        key={i}
                        className="rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground"
                      >
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              {stay.roomTypes.length > 0 && (
                <Block title="Rooms">
                  <div className="space-y-4">
                    {stay.roomTypes.map((room) => (
                      <article
                        key={room.id}
                        className="flex flex-col gap-4 rounded-card border border-border bg-card p-4 sm:flex-row"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-field sm:w-52 sm:shrink-0">
                          <CoverImage
                            media={room.coverMedia}
                            alt={room.name}
                            sizes="(max-width: 640px) 100vw, 208px"
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <h3 className="font-display text-base font-semibold">{room.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Sleeps {room.capacity} · {room.totalUnits} unit
                            {room.totalUnits === 1 ? '' : 's'} available
                          </p>
                          {room.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {room.description}
                            </p>
                          )}
                          {room.amenities && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {toLines(room.amenities).slice(0, 4).join(' · ')}
                            </p>
                          )}
                          <p className="mt-auto pt-3 font-display text-lg font-semibold">
                            {formatCurrency(room.price)}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              / night
                            </span>
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </Block>
              )}

              {stay.rules && (
                <Block title="House rules">
                  <ul className="space-y-2">
                    {toLines(stay.rules).map((rule, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              {stay.policies && (
                <Block title="Policies">
                  <div className="wps-prose text-sm text-muted-foreground">
                    {stay.policies.split(/\n\n+/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </Block>
              )}
            </div>

            <aside className="lg:sticky lg:top-24">
              <StayBookingForm
                rooms={stay.roomTypes.map((r) => ({
                  id: r.id,
                  name: r.name,
                  price: toNumber(r.price),
                  capacity: r.capacity,
                  totalUnits: r.totalUnits,
                }))}
                isSignedIn={Boolean(user)}
                returnPath={`/stays/${stay.slug}`}
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
