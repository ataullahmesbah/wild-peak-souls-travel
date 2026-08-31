'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Search, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tab = 'tours' | 'events' | 'stays' | 'flights';

const TABS: Array<{ id: Tab; label: string; destinationLabel: string }> = [
  { id: 'tours', label: 'Tours', destinationLabel: 'Where to?' },
  { id: 'events', label: 'Events', destinationLabel: 'Destination' },
  { id: 'stays', label: 'Stays', destinationLabel: 'City or area' },
  { id: 'flights', label: 'Flights', destinationLabel: 'To (city or IATA)' },
];

/**
 * The primary travel search. It only builds a URL and navigates — all
 * filtering happens server-side on the destination listing page, so results
 * are shareable, crawlable and cheap to render.
 */
export function HeroSearch() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>('tours');
  const [query, setQuery] = React.useState('');
  const [date, setDate] = React.useState('');
  const [guests, setGuests] = React.useState('2');
  const [origin, setOrigin] = React.useState('');

  const active = TABS.find((t) => t.id === tab)!;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();

    if (tab === 'flights') {
      if (origin) params.set('from', origin);
      if (query) params.set('to', query);
      if (date) params.set('date', date);
      params.set('passengers', guests);
      router.push(`/flights?${params.toString()}`);
      return;
    }

    if (query) params.set('q', query);
    if (date) params.set('date', date);
    if (tab === 'stays') params.set('guests', guests);
    router.push(`/${tab}?${params.toString()}`);
  };

  const [today] = React.useState(() => new Date().toISOString().slice(0, 10));

  return (
    <div className="wps-card wps-glow p-2 sm:p-3">
      <div
        role="tablist"
        aria-label="Search type"
        className="flex gap-1 overflow-x-auto px-1 pb-2"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              tab === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-2 md:grid-cols-[1fr_auto]">
        <div
          className={cn(
            'grid gap-2',
            tab === 'flights' ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
          )}
        >
          {tab === 'flights' && (
            <SearchField
              id="search-origin"
              label="From"
              icon={MapPin}
              value={origin}
              onChange={setOrigin}
              placeholder="DAC"
            />
          )}
          <SearchField
            id="search-query"
            label={active.destinationLabel}
            icon={MapPin}
            value={query}
            onChange={setQuery}
            placeholder={tab === 'flights' ? 'CXB' : 'Bandarban, Sajek…'}
          />
          <SearchField
            id="search-date"
            label={tab === 'stays' ? 'Check-in' : 'Date'}
            icon={CalendarDays}
            value={date}
            onChange={setDate}
            type="date"
            min={today}
          />
          <SearchField
            id="search-guests"
            label={tab === 'flights' ? 'Passengers' : 'Travellers'}
            icon={Users}
            value={guests}
            onChange={setGuests}
            type="number"
            min="1"
            max="30"
          />
        </div>
        <Button type="submit" size="lg" className="md:w-auto">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </Button>
      </form>
    </div>
  );
}

function SearchField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  ...props
}: {
  id: string;
  label: string;
  icon: typeof MapPin;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'>) {
  return (
    <div className="rounded-field bg-muted/60 px-3.5 py-2 transition-colors focus-within:bg-muted">
      <label htmlFor={id} className="block text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          {...props}
        />
      </div>
    </div>
  );
}
