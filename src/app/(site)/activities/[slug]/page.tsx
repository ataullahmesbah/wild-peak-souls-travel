import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, Clock, MapPin, Mountain, ShieldAlert, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/components/ui/media';
import { Breadcrumbs } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { SimpleBookingForm } from '@/components/booking/simple-booking-form';
import { ButtonLink } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/session';
import { getActivityBySlug } from '@/lib/data/public';
import { siteUrl } from '@/lib/env';
import { toLines, toNumber, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) return { title: 'Activity not found' };

  const description =
    activity.shortDescription ?? truncate(activity.description ?? '', 155);

  return {
    title: activity.name,
    description,
    alternates: { canonical: `/activities/${activity.slug}` },
    openGraph: {
      title: activity.name,
      description,
      url: `${siteUrl()}/activities/${activity.slug}`,
      images: activity.coverMedia?.secureUrl
        ? [{ url: activity.coverMedia.secureUrl }]
        : undefined,
    },
  };
}

export default async function ActivityDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [activity, user] = await Promise.all([getActivityBySlug(slug), getCurrentUser()]);

  if (!activity) notFound();

  const price = toNumber(activity.price);
  const ageRange =
    activity.minAge && activity.maxAge
      ? `${activity.minAge}–${activity.maxAge} years`
      : activity.minAge
        ? `${activity.minAge}+ years`
        : null;

  return (
    <>
      <section className="relative h-[38vh] min-h-64 w-full overflow-hidden sm:h-[46vh]">
        <CoverImage media={activity.coverMedia} alt={activity.name} priority sizes="100vw" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <Container className="absolute inset-x-0 bottom-0 pb-8">
          <Breadcrumbs
            items={[{ label: 'Activities', href: '/activities' }, { label: activity.name }]}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {activity.destination && <Badge tone="primary">{activity.destination.name}</Badge>}
            <Badge tone="accent">{activity.difficulty.toLowerCase()}</Badge>
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold text-white sm:text-4xl">
            {activity.name}
          </h1>
        </Container>
      </section>

      <Section className="py-10 sm:py-14">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
            <div className="min-w-0 space-y-10">
              <div className="grid grid-cols-2 gap-4 rounded-card border border-border bg-card p-5 sm:grid-cols-4">
                {activity.duration && (
                  <Fact icon={Clock} label="Duration" value={activity.duration} />
                )}
                <Fact
                  icon={Mountain}
                  label="Difficulty"
                  value={activity.difficulty.charAt(0) + activity.difficulty.slice(1).toLowerCase()}
                />
                {activity.destination && (
                  <Fact icon={MapPin} label="Location" value={activity.destination.name} />
                )}
                {ageRange && <Fact icon={ShieldAlert} label="Age" value={ageRange} />}
              </div>

              {activity.description && (
                <Block title="About this activity">
                  <div className="wps-prose text-sm sm:text-base">
                    {activity.description.split(/\n\n+/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </Block>
              )}

              {(activity.included || activity.excluded) && (
                <Block title="What's included">
                  <div className="grid gap-6 sm:grid-cols-2">
                    {activity.included && (
                      <div className="rounded-field border border-success/25 bg-success-soft p-5">
                        <h3 className="font-display text-sm font-semibold text-success">Included</h3>
                        <ul className="mt-3 space-y-2">
                          {toLines(activity.included).map((line, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground/85">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activity.excluded && (
                      <div className="rounded-field border border-destructive/25 bg-destructive-soft p-5">
                        <h3 className="font-display text-sm font-semibold text-destructive">
                          Not included
                        </h3>
                        <ul className="mt-3 space-y-2">
                          {toLines(activity.excluded).map((line, i) => (
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

              {activity.safetyInfo && (
                <Block title="Safety information">
                  <div className="rounded-field border border-warning/30 bg-warning-soft p-5">
                    <ul className="space-y-2">
                      {toLines(activity.safetyInfo).map((line, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-foreground/85">
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Block>
              )}
            </div>

            <aside className="lg:sticky lg:top-24">
              {activity.bookable && price > 0 ? (
                <SimpleBookingForm
                  kind="activity"
                  productId={activity.id}
                  unitPrice={price}
                  listPrice={price}
                  maxQuantity={30}
                  quantityLabel="Participants"
                  isSignedIn={Boolean(user)}
                  returnPath={`/activities/${activity.slug}`}
                  defaults={
                    user ? { name: user.name, email: user.email, phone: user.phone ?? '' } : null
                  }
                />
              ) : (
                <div className="wps-card p-6">
                  <h2 className="font-display text-base font-semibold">
                    Part of our guided trips
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This activity is not sold on its own. It is included in several of our
                    tours and group events — or we can build a trip around it.
                  </p>
                  <div className="mt-5 space-y-2">
                    <ButtonLink href="/tours" className="w-full">
                      Browse tours
                    </ButtonLink>
                    <ButtonLink href="/custom-tour" variant="outline" className="w-full">
                      Request a custom trip
                    </ButtonLink>
                  </div>
                </div>
              )}
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

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
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
