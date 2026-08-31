'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox, FormMessage, Input, Select, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';
import { formatCurrency } from '@/lib/utils';

export interface RoomOption {
  id: string;
  name: string;
  price: number;
  capacity: number;
  totalUnits: number;
}

export function StayBookingForm({
  rooms,
  isSignedIn,
  defaults,
  returnPath,
}: {
  rooms: RoomOption[];
  isSignedIn: boolean;
  defaults: { name: string; email: string; phone: string } | null;
  returnPath: string;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = React.useState(rooms[0]?.id ?? '');
  const [checkIn, setCheckIn] = React.useState('');
  const [checkOut, setCheckOut] = React.useState('');
  const [units, setUnits] = React.useState(1);

  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/bookings/stay',
    {
      resetForm: false,
      onSuccess: (data) => {
        const booking = data as { id?: string } | undefined;
        if (booking?.id) router.push(`/checkout/${booking.id}`);
      },
    },
  );

  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];

  const nights = React.useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = Date.parse(checkOut) - Date.parse(checkIn);
    return diff > 0 ? Math.round(diff / 86_400_000) : 0;
  }, [checkIn, checkOut]);

  const total = room ? room.price * units * nights : 0;
  // Computed once on mount rather than on every render (see above).
  const [today] = React.useState(() => new Date().toISOString().slice(0, 10));
  const minCheckOut = checkIn
    ? new Date(Date.parse(checkIn) + 86_400_000).toISOString().slice(0, 10)
    : today;

  if (rooms.length === 0) {
    return (
      <div className="wps-card p-6">
        <h2 className="font-display text-base font-semibold">Rooms not yet listed</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact us and we will check availability at this property for your dates.
        </p>
        <Link
          href="/contact"
          className="mt-4 flex h-11 items-center justify-center rounded-field bg-primary text-sm font-medium text-primary-foreground"
        >
          Enquire about this stay
        </Link>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="wps-card p-6">
        <p className="text-xs text-muted-foreground">From</p>
        <p className="font-display text-2xl font-semibold">
          {formatCurrency(rooms[0]!.price)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/ night</span>
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-field bg-primary text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          Sign in to book
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="wps-card p-6" noValidate>
      <div className="space-y-4">
        <Select
          label="Room type"
          name="roomTypeId"
          required
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          error={fieldErrors.roomTypeId}
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {formatCurrency(r.price)}/night (sleeps {r.capacity})
            </option>
          ))}
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Check-in"
            name="checkIn"
            type="date"
            required
            min={today}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            error={fieldErrors.checkIn}
          />
          <Input
            label="Check-out"
            name="checkOut"
            type="date"
            required
            min={minCheckOut}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            error={fieldErrors.checkOut}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Rooms"
            name="units"
            type="number"
            min={1}
            max={room?.totalUnits ?? 10}
            required
            value={units}
            onChange={(e) =>
              setUnits(
                Math.max(1, Math.min(Number(e.target.value) || 1, room?.totalUnits ?? 10)),
              )
            }
            error={fieldErrors.units}
          />
          <Input
            label="Guests"
            name="guests"
            type="number"
            min={1}
            max={(room?.capacity ?? 2) * units}
            defaultValue={2}
            required
            error={fieldErrors.guests}
            hint={room ? `Each room sleeps ${room.capacity}` : undefined}
          />
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <Input
            label="Lead guest name"
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
          <Textarea label="Special requests" name="notes" rows={3} error={fieldErrors.notes} />
        </div>

        {nights > 0 && room && (
          <dl className="space-y-2 rounded-field bg-muted/60 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {formatCurrency(room.price)} × {nights} night{nights === 1 ? '' : 's'} ×{' '}
                {units} room{units === 1 ? '' : 's'}
              </dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-display text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
          </dl>
        )}

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
          Check availability & book
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Availability is confirmed per night on our server before the booking is created.
        </p>
      </div>
    </form>
  );
}
