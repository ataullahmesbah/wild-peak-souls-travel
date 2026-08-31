'use client';

import * as React from 'react';
import { Clock, Plane, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage, Input, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';
import { formatCurrency, formatDate, minutesToDuration, relativeTime } from '@/lib/utils';

export interface FlightRouteView {
  id: string;
  airline: string;
  airlineIata: string | null;
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  originAirport: string | null;
  destinationAirport: string | null;
  departureTime: string;
  arrivalTime: string;
  departureEstimated: string | null;
  arrivalEstimated: string | null;
  departureTerminal: string | null;
  departureGate: string | null;
  arrivalTerminal: string | null;
  arrivalGate: string | null;
  arrivalBaggageBelt: string | null;
  departureDelayMinutes: number | null;
  arrivalDelayMinutes: number | null;
  status: string | null;
  aircraftType: string | null;
  flightDate: string | null;
  operatedBy: string | null;
  durationMinutes: number;
  stops: number;
  baggage: string | null;
  indicativePrice: number | null;
  source: string;
  sourceUpdatedAt: string;
}

/** Colour and wording for the provider's status codes. */
function statusLabel(
  status: string | null,
): { text: string; tone: 'success' | 'warning' | 'destructive' | 'neutral' } | null {
  if (!status) return null;
  switch (status.toLowerCase()) {
    case 'active':
      return { text: 'In the air', tone: 'success' };
    case 'landed':
      return { text: 'Landed', tone: 'success' };
    case 'scheduled':
      return { text: 'Scheduled', tone: 'neutral' };
    case 'delayed':
      return { text: 'Delayed', tone: 'warning' };
    case 'cancelled':
      return { text: 'Cancelled', tone: 'destructive' };
    case 'diverted':
      return { text: 'Diverted', tone: 'destructive' };
    default:
      return { text: status, tone: 'neutral' };
  }
}

export function FlightResults({
  routes,
  searchDate,
  passengers,
}: {
  routes: FlightRouteView[];
  searchDate: string | null;
  passengers: number;
}) {
  const [selected, setSelected] = React.useState<FlightRouteView | null>(null);

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        {routes.length} route{routes.length === 1 ? '' : 's'}
        {searchDate ? ` for ${formatDate(searchDate)}` : ''}
      </p>

      <ul className="space-y-3">
        {routes.map((route) => (
          <li key={route.id}>
            <article className="wps-card wps-card-interactive p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Plane className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold">{route.airline}</p>
                    <p className="text-xs text-muted-foreground">
                      {route.flightNumber}
                      {route.aircraftType ? ` · ${route.aircraftType}` : ''}
                    </p>
                    {route.operatedBy && (
                      <p className="text-xs text-muted-foreground">
                        Operated by {route.operatedBy}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <p className="font-display text-lg font-semibold">{route.departureTime}</p>
                    <p className="text-xs text-muted-foreground">{route.originIata}</p>
                    {/* Only rendered when the provider expects a different time
                        from the published one — otherwise it is noise. */}
                    {route.departureEstimated && (
                      <p className="text-xs font-medium text-warning">
                        now {route.departureEstimated}
                      </p>
                    )}
                    {route.departureTerminal && (
                      <p className="text-xs text-muted-foreground">
                        T{route.departureTerminal}
                        {route.departureGate ? ` · Gate ${route.departureGate}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex min-w-24 flex-col items-center">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {minutesToDuration(route.durationMinutes)}
                    </p>
                    <div className="my-1 h-px w-full bg-border" />
                    <p className="text-xs text-muted-foreground">
                      {route.stops === 0
                        ? 'Non-stop'
                        : `${route.stops} stop${route.stops === 1 ? '' : 's'}`}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="font-display text-lg font-semibold">{route.arrivalTime}</p>
                    <p className="text-xs text-muted-foreground">{route.destinationIata}</p>
                    {route.arrivalEstimated && (
                      <p className="text-xs font-medium text-warning">
                        now {route.arrivalEstimated}
                      </p>
                    )}
                    {route.arrivalTerminal && (
                      <p className="text-xs text-muted-foreground">
                        T{route.arrivalTerminal}
                        {route.arrivalGate ? ` · Gate ${route.arrivalGate}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  {route.indicativePrice ? (
                    <div className="text-right">
                      <p className="font-display text-lg font-semibold">
                        {formatCurrency(route.indicativePrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">indicative / person</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Price on request</p>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setSelected(route)}
                    disabled={route.status?.toLowerCase() === 'cancelled'}
                  >
                    Request to book
                  </Button>
                </div>
              </div>

              {/* Airport names, spelled out. IATA codes are unreadable to most
                  travellers, and BCN/JFK tells them nothing on its own. */}
              {(route.originAirport || route.destinationAirport) && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {route.originAirport ?? route.originIata} →{' '}
                  {route.destinationAirport ?? route.destinationIata}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                {(() => {
                  const status = statusLabel(route.status);
                  if (!status) return null;
                  return <Badge tone={status.tone}>{status.text}</Badge>;
                })()}

                {typeof route.departureDelayMinutes === 'number' &&
                  route.departureDelayMinutes > 0 && (
                    <span className="font-medium text-warning">
                      Departing {route.departureDelayMinutes} min late
                    </span>
                  )}

                {route.flightDate && <span>Date: {formatDate(route.flightDate)}</span>}
                {route.arrivalBaggageBelt && <span>Belt {route.arrivalBaggageBelt}</span>}
                {route.baggage && <span>Baggage: {route.baggage}</span>}
                <span>Source: {route.source === 'live' ? 'airline feed' : 'agency schedule'}</span>
                <span>Updated {relativeTime(route.sourceUpdatedAt)}</span>
                <Badge tone="warning">Not live inventory</Badge>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {selected && (
        <FlightInquiryDialog
          route={selected}
          searchDate={searchDate}
          passengers={passengers}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function FlightInquiryDialog({
  route,
  searchDate,
  passengers,
  onClose,
}: {
  route: FlightRouteView;
  searchDate: string | null;
  passengers: number;
  onClose: () => void;
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/flights/inquiries',
    {
      successMessage:
        'Request received. Our team will confirm the live fare and get back to you shortly.',
    },
  );

  // Escape closes, and focus moves into the dialog on open, so keyboard users
  // are not stranded behind the overlay.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.querySelector<HTMLElement>('input,button')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flight-inquiry-title"
        className="wps-animate-in max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-card bg-card p-6 sm:rounded-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="flight-inquiry-title" className="font-display text-lg font-semibold">
              Request to book
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {route.airline} {route.flightNumber} · {route.originIata} →{' '}
              {route.destinationIata} · {route.departureTime}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          {/* Flight facts travel with the inquiry so staff can see exactly what
              the customer was shown, including the price and its source. */}
          <input type="hidden" name="airline" value={route.airline} />
          <input type="hidden" name="flightNumber" value={route.flightNumber} />
          <input type="hidden" name="origin" value={route.originIata} />
          <input type="hidden" name="destination" value={route.destinationIata} />
          <input type="hidden" name="source" value={route.source} />
          {searchDate && <input type="hidden" name="departureDate" value={searchDate} />}
          {route.indicativePrice !== null && (
            <input type="hidden" name="displayedPrice" value={route.indicativePrice} />
          )}

          <Input label="Full name" name="name" required autoComplete="name" error={fieldErrors.name} />
          <Input label="Email" name="email" type="email" required autoComplete="email" error={fieldErrors.email} />
          <Input label="Phone" name="phone" type="tel" required autoComplete="tel" error={fieldErrors.phone} />
          <Input
            label="Passengers"
            name="passengers"
            type="number"
            min={1}
            max={20}
            defaultValue={passengers}
            required
            error={fieldErrors.passengers}
          />
          <Textarea
            label="Notes"
            name="message"
            rows={3}
            placeholder="Return date, seat preference, flexible dates…"
            error={fieldErrors.message}
          />
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-0 w-0 opacity-0"
          />

          <p className="rounded-field bg-muted/60 p-3 text-xs text-muted-foreground">
            Submitting this does not reserve a seat. It creates an inquiry — our team
            checks the live fare with the airline and replies with a confirmed quote.
          </p>

          {error && <FormMessage tone="error">{error}</FormMessage>}
          {success && <FormMessage tone="success">{success}</FormMessage>}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Send request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
