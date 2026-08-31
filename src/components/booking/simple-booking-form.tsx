'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox, FormMessage, Input, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';
import { formatCurrency } from '@/lib/utils';

/** Booking widget for tours and single activities — no live seat inventory. */
export function SimpleBookingForm({
  kind,
  productId,
  unitPrice,
  listPrice,
  maxQuantity,
  isSignedIn,
  defaults,
  returnPath,
  quantityLabel = 'Travellers',
  priceSuffix = '/ person',
}: {
  kind: 'tour' | 'activity';
  productId: string;
  unitPrice: number;
  listPrice: number;
  maxQuantity: number;
  isSignedIn: boolean;
  defaults: { name: string; email: string; phone: string } | null;
  returnPath: string;
  quantityLabel?: string;
  priceSuffix?: string;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = React.useState(1);

  const { loading, error, success, fieldErrors, submit } = useApiForm(
    `/api/bookings/${kind}`,
    {
      resetForm: false,
      onSuccess: (data) => {
        const booking = data as { id?: string } | undefined;
        if (booking?.id) router.push(`/checkout/${booking.id}`);
      },
    },
  );

  const total = unitPrice * quantity;
  const savings = (listPrice - unitPrice) * quantity;
  // Computed once on mount: calling Date.now() during render is impure and
  // would produce a different minimum on every re-render.
  const [tomorrow] = React.useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  );

  if (!isSignedIn) {
    return (
      <div className="wps-card p-6">
        <p className="font-display text-2xl font-semibold">
          {formatCurrency(unitPrice)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">{priceSuffix}</span>
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
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
      <input
        type="hidden"
        name={kind === 'tour' ? 'tourId' : 'activityId'}
        value={productId}
      />

      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-2xl font-semibold">
          {formatCurrency(unitPrice)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">{priceSuffix}</span>
        </p>
        {listPrice > unitPrice && (
          <span className="text-sm text-muted-foreground line-through">
            {formatCurrency(listPrice)}
          </span>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <Input
          label={kind === 'tour' ? 'Preferred start date' : 'Date'}
          name="startDate"
          type="date"
          required
          min={tomorrow}
          error={fieldErrors.startDate}
          hint={
            kind === 'tour'
              ? 'We confirm the exact departure with you before payment is verified.'
              : undefined
          }
        />
        <Input
          label={quantityLabel}
          name={kind === 'tour' ? 'travelers' : 'quantity'}
          type="number"
          min={1}
          max={maxQuantity}
          required
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, Math.min(Number(e.target.value) || 1, maxQuantity)))
          }
          error={fieldErrors.travelers ?? fieldErrors.quantity}
        />

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
            label="Requests or requirements"
            name="notes"
            rows={3}
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
                booking policy
              </Link>
              .
            </>
          }
          error={fieldErrors.acceptTerms}
        />

        {error && <FormMessage tone="error">{error}</FormMessage>}
        {success && <FormMessage tone="success">{success}</FormMessage>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Request booking
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Totals are recalculated on our server from the live catalogue price.
        </p>
      </div>
    </form>
  );
}
