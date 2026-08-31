'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

export function FlightSearchForm({
  airports,
  defaults,
}: {
  airports: Airport[];
  defaults: { from?: string; to?: string; date?: string; passengers?: string };
}) {
  const router = useRouter();
  const [from, setFrom] = React.useState(defaults.from ?? '');
  const [to, setTo] = React.useState(defaults.to ?? '');
  const [date, setDate] = React.useState(defaults.date ?? '');
  const [passengers, setPassengers] = React.useState(defaults.passengers ?? '1');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (date) params.set('date', date);
    params.set('passengers', passengers);
    router.push(`/flights?${params.toString()}`);
  };

  const today = new Date().toISOString().slice(0, 10);
  const fieldClass =
    'mt-1.5 h-11 w-full rounded-field border border-border bg-input px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25';

  return (
    <form
      onSubmit={handleSubmit}
      className="wps-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end"
    >
      <div>
        <label htmlFor="flight-from" className="block text-sm font-medium">
          From
        </label>
        <select id="flight-from" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass}>
          <option value="">Select origin</option>
          {airports.map((a) => (
            <option key={a.iata} value={a.iata}>
              {a.city} ({a.iata}) — {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="flight-to" className="block text-sm font-medium">
          To
        </label>
        <select id="flight-to" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass}>
          <option value="">Select destination</option>
          {airports
            .filter((a) => a.iata !== from)
            .map((a) => (
              <option key={a.iata} value={a.iata}>
                {a.city} ({a.iata}) — {a.name}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label htmlFor="flight-date" className="block text-sm font-medium">
          Departure date
        </label>
        <input
          id="flight-date"
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="flight-pax" className="block text-sm font-medium">
          Passengers
        </label>
        <input
          id="flight-pax"
          type="number"
          min={1}
          max={20}
          value={passengers}
          onChange={(e) => setPassengers(e.target.value)}
          className={`${fieldClass} lg:w-24`}
        />
      </div>

      <Button type="submit" size="lg" disabled={!from || !to}>
        <Search className="h-4 w-4" aria-hidden="true" />
        Search
      </Button>
    </form>
  );
}
