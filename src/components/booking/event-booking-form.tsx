'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Lock, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox, FormMessage, Input, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';
import { formatCurrency, formatDateRange } from '@/lib/utils';

export interface EventOptionSummary {
  id: string;
  title: string;
  description: string | null;
  price: number;
}

export function EventBookingForm({
  eventId,
  unitPrice,
  listPrice,
  available,
  startAt,
  endAt,
  options,
  isSignedIn,
  defaults,
  slug,
}: {
  eventId: string;
  unitPrice: number;
  listPrice: number;
  available: number;
  startAt: string;
  endAt: string;
  options: EventOptionSummary[];
  isSignedIn: boolean;
  defaults: { name: string; email: string; phone: string } | null;
  slug: string;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = React.useState(1);
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>([]);

  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/bookings/event',
    {
      resetForm: false,
      onSuccess: (data) => {
        const booking = data as { id?: string } | undefined;
        if (booking?.id) router.push(`/checkout/${booking.id}`);
      },
    },
  );

  // Mirrors the server's calculation so the customer sees the same figure —
  // but the server recomputes it independently and its number is the one used.
  const optionsTotal = options
    .filter((o) => selectedOptions.includes(o.id))
    .reduce((sum, o) => sum + o.price, 0);
  const total = (unitPrice + optionsTotal) * quantity;
  const savings = (listPrice - unitPrice) * quantity;
  const maxQuantity = Math.min(available, 20);

  if (available <= 0) {
    return (
      <div className="wps-card p-6">
        <h2 className="font-display text-lg font-semibold">This departure is full</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every seat has been booked. Send us a message and we will tell you about
          the next date on this route.
        </p>
        <Link
          href="/contact"
          className="mt-4 flex h-11 w-full items-center justify-center rounded-field bg-primary text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          Ask about the next date
        </Link>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="wps-card p-6">
        <p className="font-display text-2xl font-semibold">
          {formatCurrency(unitPrice)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/ person</span>
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {formatDateRange(startAt, endAt)}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden="true" />
          {available} seat{available === 1 ? '' : 's'} remaining
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/events/${slug}`)}`}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-field bg-primary text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          Sign in to book
        </Link>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          New here?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="wps-card p-6" noValidate>
      <input type="hidden" name="eventId" value={eventId} />
      {selectedOptions.map((id) => (
        <input key={id} type="hidden" name="optionIds" value={id} />
      ))}

      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-2xl font-semibold">
          {formatCurrency(unitPrice)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/ person</span>
        </p>
        {listPrice > unitPrice && (
          <span className="text-sm text-muted-foreground line-through">
            {formatCurrency(listPrice)}
          </span>
        )}
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        {formatDateRange(startAt, endAt)}
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium">
            Travellers <span className="text-destructive">*</span>
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease travellers"
              className="flex h-11 w-11 items-center justify-center rounded-field border border-border text-lg hover:bg-muted disabled:opacity-40"
            >
              −
            </button>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(Number(e.target.value) || 1, maxQuantity)))
              }
              className="h-11 w-full rounded-field border border-border bg-input text-center text-sm"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              aria-label="Increase travellers"
              className="flex h-11 w-11 items-center justify-center rounded-field border border-border text-lg hover:bg-muted disabled:opacity-40"
            >
              +
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {available} seat{available === 1 ? '' : 's'} left on this departure
          </p>
        </div>

        {options.length > 0 && (
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium">Optional add-ons</legend>
            {options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-start gap-2.5 rounded-field border border-border p-3 transition-colors hover:bg-muted/60 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option.id)}
                  onChange={(e) =>
                    setSelectedOptions((prev) =>
                      e.target.checked
                        ? [...prev, option.id]
                        : prev.filter((id) => id !== option.id),
                    )
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{option.title}</span>
                    <span className="shrink-0 text-sm text-primary">
                      +{formatCurrency(option.price)}
                    </span>
                  </span>
                  {option.description && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="space-y-4 border-t border-border pt-4">
          <Input
            label="Lead traveller name"
            name="contactName"
            required
            defaultValue={defaults?.name}
            autoComplete="name"
            error={fieldErrors.contactName}
          />
          <Input
            label="Email"
            name="contactEmail"
            type="email"
            required
            defaultValue={defaults?.email}
            autoComplete="email"
            error={fieldErrors.contactEmail}
          />
          <Input
            label="Phone"
            name="contactPhone"
            type="tel"
            required
            defaultValue={defaults?.phone}
            autoComplete="tel"
            error={fieldErrors.contactPhone}
          />
          <Textarea
            label="Anything we should know?"
            name="notes"
            rows={3}
            placeholder="Dietary needs, medical conditions, room preferences…"
            error={fieldErrors.notes}
          />
        </div>

        <dl className="space-y-2 rounded-field bg-muted/60 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {formatCurrency(unitPrice)} × {quantity}
            </dt>
            <dd>{formatCurrency(unitPrice * quantity)}</dd>
          </div>
          {optionsTotal > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Add-ons × {quantity}</dt>
              <dd>{formatCurrency(optionsTotal * quantity)}</dd>
            </div>
          )}
          {savings > 0 && (
            <div className="flex justify-between text-success">
              <dt>You save</dt>
              <dd>−{formatCurrency(savings)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 font-display text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatCurrency(total)}</dd>
          </div>
        </dl>

        <Checkbox
          name="acceptTerms"
          label={
            <>
              I accept the{' '}
              <Link href="/policies/booking" className="text-primary hover:underline">
                booking
              </Link>{' '}
              and{' '}
              <Link href="/policies/cancellation" className="text-primary hover:underline">
                cancellation
              </Link>{' '}
              policies.
            </>
          }
          error={fieldErrors.acceptTerms}
        />

        {error && <FormMessage tone="error">{error}</FormMessage>}
        {success && <FormMessage tone="success">{success}</FormMessage>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Reserve {quantity} seat{quantity === 1 ? '' : 's'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Your seat is held once you complete payment. Prices and availability are
          re-checked on our server before the booking is created.
        </p>
      </div>
    </form>
  );
}
