import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Mountain, Star } from 'lucide-react';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { CoverImage } from '@/components/ui/media';
import { cn, formatCurrency, formatDate, formatDateRange, toNumber } from '@/lib/utils';
import type {
  ActivityCard as ActivityCardType,
  DestinationCard as DestinationCardType,
  EventCard as EventCardType,
  StayCard as StayCardType,
  TourCard as TourCardType,
} from '@/lib/data/public';

function PriceTag({
  price,
  discount,
  suffix,
}: {
  price: unknown;
  discount?: unknown;
  suffix?: string;
}) {
  const base = toNumber(price as never);
  const sale = discount ? toNumber(discount as never) : null;
  const hasDiscount = sale !== null && sale > 0 && sale < base;

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-display text-lg font-semibold text-foreground">
        {formatCurrency(hasDiscount ? sale : base)}
      </span>
      {hasDiscount && (
        <span className="text-sm text-muted-foreground line-through">
          {formatCurrency(base)}
        </span>
      )}
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

const shell =
  'wps-card wps-card-interactive group flex flex-col focus-within:ring-2 focus-within:ring-ring/40';

export function DestinationCard({ destination }: { destination: DestinationCardType }) {
  const count =
    destination._count.events + destination._count.tours + destination._count.activities;
  return (
    <article className={shell}>
      <Link href={`/destinations/${destination.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        <CoverImage
          media={destination.coverMedia}
          alt={destination.name}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-lg font-semibold text-white">{destination.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {destination.region ? `${destination.region}, ` : ''}
            {destination.country}
          </p>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {destination.shortDescription && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {destination.shortDescription}
          </p>
        )}
        <p className="mt-3 text-xs font-medium text-primary">
          {count > 0 ? `${count} experience${count === 1 ? '' : 's'} available` : 'Coming soon'}
        </p>
      </div>
    </article>
  );
}

export function EventCard({ event }: { event: EventCardType }) {
  const available = Math.max(0, event.capacity - event.reservedSeats);
  const soldOut = available === 0 || event.status === 'SOLD_OUT';

  return (
    <article className={shell}>
      <Link href={`/events/${event.slug}`} className="relative block aspect-[16/10] overflow-hidden">
        <CoverImage
          media={event.coverMedia}
          alt={event.title}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {soldOut ? (
            <Badge tone="destructive">Sold out</Badge>
          ) : available <= 5 ? (
            <Badge tone="warning">{available} seats left</Badge>
          ) : (
            <Badge tone="primary">{available} seats</Badge>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {event.destination && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {event.destination.name}
          </p>
        )}
        <h3 className="mt-1.5 font-display text-base font-semibold">
          <Link href={`/events/${event.slug}`} className="hover:text-primary">
            {event.title}
          </Link>
        </h3>
        {event.shortDescription && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {event.shortDescription}
          </p>
        )}
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <dd>{formatDateRange(event.startAt, event.endAt)}</dd>
          </div>
          {event.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <dd>{event.duration}</dd>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Mountain className="h-3.5 w-3.5" aria-hidden="true" />
            <dd className="capitalize">{event.difficulty.toLowerCase()}</dd>
          </div>
        </dl>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <PriceTag price={event.price} discount={event.discountPrice} suffix="/ person" />
          <span
            className={cn(
              'text-sm font-medium',
              soldOut ? 'text-muted-foreground' : 'text-primary group-hover:underline',
            )}
          >
            {soldOut ? 'Join waitlist' : 'View details'}
          </span>
        </div>
      </div>
    </article>
  );
}

export function TourCard({ tour }: { tour: TourCardType }) {
  return (
    <article className={shell}>
      <Link href={`/tours/${tour.slug}`} className="relative block aspect-[16/10] overflow-hidden">
        <CoverImage
          media={tour.coverMedia}
          alt={tour.title}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {tour.duration && (
          <span className="absolute left-3 top-3">
            <Badge tone="primary">{tour.duration}</Badge>
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {tour.destination && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {tour.destination.name}
          </p>
        )}
        <h3 className="mt-1.5 font-display text-base font-semibold">
          <Link href={`/tours/${tour.slug}`} className="hover:text-primary">
            {tour.title}
          </Link>
        </h3>
        {tour.shortDescription && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {tour.shortDescription}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <PriceTag price={tour.basePrice} discount={tour.discountPrice} suffix="/ person" />
          <span className="text-sm font-medium text-primary group-hover:underline">
            View tour
          </span>
        </div>
      </div>
    </article>
  );
}

export function ActivityCard({ activity }: { activity: ActivityCardType }) {
  return (
    <article className={shell}>
      <Link href={`/activities/${activity.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        <CoverImage
          media={activity.coverMedia}
          alt={activity.name}
          className="transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 25vw"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-sm font-semibold">
          <Link href={`/activities/${activity.slug}`} className="hover:text-primary">
            {activity.name}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {activity.destination && <span>{activity.destination.name}</span>}
          {activity.duration && <span>{activity.duration}</span>}
          <span className="capitalize">{activity.difficulty.toLowerCase()}</span>
        </p>
        <div className="mt-auto pt-3">
          {toNumber(activity.price) > 0 ? (
            <PriceTag price={activity.price} />
          ) : (
            <span className="text-sm font-medium text-primary">Included in trips</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function StayCard({ stay }: { stay: StayCardType }) {
  const from = stay.roomTypes[0];
  return (
    <article className={shell}>
      <Link href={`/stays/${stay.slug}`} className="relative block aspect-[16/10] overflow-hidden">
        <CoverImage
          media={stay.coverMedia}
          alt={stay.name}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3">
          <Badge tone="accent">{stay.type.replace(/_/g, ' ').toLowerCase()}</Badge>
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-semibold">
          <Link href={`/stays/${stay.slug}`} className="hover:text-primary">
            {stay.name}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {stay.destination?.name ?? stay.address ?? 'Bangladesh'}
        </p>
        {stay.shortDescription && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {stay.shortDescription}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          {from ? (
            <div>
              <span className="text-xs text-muted-foreground">From</span>
              <PriceTag price={from.price} suffix="/ night" />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Enquire for rates</span>
          )}
          <span className="text-sm font-medium text-primary group-hover:underline">
            View stay
          </span>
        </div>
      </div>
    </article>
  );
}

export function ReviewCard({
  review,
}: {
  review: {
    id: string;
    rating: number;
    title: string | null;
    body: string;
    createdAt: Date;
    user: { name: string; image: string | null };
    booking: { productTitle: string } | null;
  };
}) {
  return (
    <figure className="wps-card flex h-full flex-col p-6">
      <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'h-4 w-4',
              i < review.rating ? 'fill-accent text-accent' : 'text-border',
            )}
            aria-hidden="true"
          />
        ))}
      </div>
      {review.title && (
        <figcaption className="mt-3 font-display text-base font-semibold">
          {review.title}
        </figcaption>
      )}
      <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        “{review.body}”
      </blockquote>
      <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          {review.user.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{review.user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {review.booking?.productTitle ?? formatDate(review.createdAt)}
          </p>
        </div>
      </div>
    </figure>
  );
}

export { StatusBadge };
